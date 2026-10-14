import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
export function loadReadingInputs() {
  return { reading: read('content/reading/en.json'), corpus: read('content/source/en/corpus.json'), coverage: read('content/editorial/coverage.json'), concepts: read('content/editorial/concepts.json'), relations: read('content/editorial/relations.json') }
}

/** Count whitespace-separated words in the authored prose, not navigation or source pages.
 * Concept and relationship prose is counted at each occurrence because the
 * current trail step renders a complete ConceptBody. Optional reflection is
 * included; optional foundation and source destinations are excluded.
 */
export function estimateTrailReading(trail, reading) {
  const texts = [trail.introduction?.text, trail.qualification?.text, trail.ending?.text,
    trail.reflection?.prompt?.text, trail.reflection?.feedback?.text, trail.reflection?.scenario?.text]
  for (const step of trail.steps) {
    texts.push(step.transition?.text)
    const concept = reading.concepts.find(c => c.id === step.conceptId)
    if (concept) {
      texts.push(concept.definition.text, concept.necessaryDistinction.text, ...concept.reasoning.map(b => b.text))
      texts.push(...reading.relations.filter(r => r.from === concept.id || r.to === concept.id).map(r => r.explanation.text))
    }
  }
  const words = texts.filter(text => typeof text === 'string' && text.trim()).reduce((sum, text) => sum + text.trim().split(/\s+/u).length, 0)
  return { kind: 'estimate', label: 'Estimated reading time', words, wordsPerMinute: 200, minutes: Math.ceil(words / 200),
    method: 'Whitespace-separated authored words at an assumed 200 words per minute, rounded up. Includes full concept and relationship prose, transitions, introduction, qualification, ending and optional reflection. Excludes navigation, optional foundations and source detours. Actual reading and reflection time varies.' }
}

export function validateReading({ reading, corpus, coverage, concepts, relations }) {
  const errors = []
  const check = (condition, message) => { if (!condition) errors.push(message) }
  const source = new Map(corpus.paragraphs.map(p => [p.id, p]))
  const contexts = new Set(reading.contexts.map(c => c.paragraphId))
  const conceptIds = new Set(reading.concepts.map(c => c.id))
  check(concepts.concepts.every(c => conceptIds.has(c.id)), 'Complete concept library required')
  check(relations.relations.every(r => reading.relations.some(p => p.id === r.id)), 'Complete relationship library required')
  check(contexts.size === source.size && [...source.keys()].every(id => contexts.has(id)), 'Complete paragraph adaptation required')
  check(reading.editionId === corpus.editionId && reading.locale === 'en' && reading.schemaVersion === 1, 'Reading edition must match source')
  for (const [list, key] of [[reading.concepts, 'id'], [reading.contexts, 'paragraphId'], [reading.relations, 'id'], [reading.trails, 'id']]) {
    check(new Set(list.map(x => x[key])).size === list.length, 'Duplicate published identity')
  }
  function block(b, label, kinds = ['paraphrase', 'editorial-interpretation']) {
    check(kinds.includes(b?.kind), `${label}: prose must have a separate editorial kind`)
    check(typeof b?.text === 'string' && b.text.trim().length > 0, `${label}: empty prose`)
    check(Array.isArray(b?.sourceRefs) && b.sourceRefs.length > 0, `${label}: source references required`)
    for (const id of b?.sourceRefs ?? []) check(source.has(id) && contexts.has(id), `${label}: inaccessible source ${id}`)
    for (const r of coverage.records) for (const e of r.exclusions) {
      // §241's two-word connective is an exact location-specific fragment,
      // also used by the accepted model to explain what is excluded. It is
      // not a globally forbidden formula. Keep its check at that source;
      // complete invocations, blessings and responses remain global checks.
      const inScope = e.sourceSpan.text !== 'prayer and' || b?.sourceRefs?.includes(r.paragraphId)
      check(!inScope || !b?.text?.includes(e.sourceSpan.text), `${label}: prose contains an excluded devotional form`)
    }
  }
  for (const c of reading.concepts) {
    const model = concepts.concepts.find(m => m.id === c.id)
    check(Boolean(model), `Unknown concept ${c.id}`)
    check(JSON.stringify(c.definition) === JSON.stringify(model?.definition), `${c.id}: accepted definition changed`)
    check(JSON.stringify(c.necessaryDistinction) === JSON.stringify(model?.necessaryDistinction), `${c.id}: necessary qualification changed`)
    block(c.definition, c.id); block(c.necessaryDistinction, c.id)
    check(c.reasoning.length > 0, `${c.id}: reasoning missing`)
    check(new Set(c.reasoning.map(b => b.id)).size === c.reasoning.length && c.reasoning.every(b => typeof b.id === 'string' && b.id.startsWith(`${c.id}-`)), `${c.id}: stable reasoning block identities required`)
    for (const b of c.reasoning) block(b, c.id)
    if (c.foundation) block(c.foundation, c.id)
    check(c.foundationRefs.every(id => source.has(id) && contexts.has(id)), `${c.id}: inaccessible foundation`)
    check(c.foundationRefs.length === 0 || Boolean(c.foundation), `${c.id}: attributed foundation missing`)
    if (c.sourceQuotation) {
      const q = c.sourceQuotation
      const p = source.get(q.paragraphId)
      check(q.kind === 'quotation' && Number.isInteger(q.start) && Number.isInteger(q.end) && q.start >= 0 && q.end > q.start && p?.text.slice(q.start, q.end) === q.text, `${c.id}: quotation must be exact and contiguous`)
      const ledger = coverage.records.find(r => r.paragraphId === q.paragraphId)
      check(!ledger?.exclusions.some(e => e.sourceSpan.start < q.end && q.start < e.sourceSpan.end), `${c.id}: quotation intersects devotional exclusion`)
      check(contexts.has(q.paragraphId), `${c.id}: quotation context missing`)
    }
  }
  for (const c of reading.contexts) {
    check(source.has(c.paragraphId), `Unknown context ${c.paragraphId}`)
    block(c.explanation, c.paragraphId)
    check(c.explanation.sourceRefs.length === 1 && c.explanation.sourceRefs[0] === c.paragraphId, `${c.paragraphId}: context needs its own reference`)
  }
  const sequence = reading.readingSequence ?? []
  check(sequence.length === corpus.paragraphs.length, 'Complete source-ordered reading sequence required')
  for (const [i, entry] of sequence.entries()) {
    const paragraph = corpus.paragraphs[i]
    const ledger = coverage.records.find(r => r.paragraphId === entry.contextId)
    check(entry.contextId === paragraph?.id && entry.id === `read-${paragraph?.id}`, 'Reading sequence order or stable identity changed')
    check(typeof entry.title === 'string' && entry.title.trim().length > 0, `${entry.id}: reading heading required`)
    check(entry.placement === (ledger?.disposition === 'context' ? 'optional-context' : 'main'), `${entry.id}: editorial placement changed`)
    check(JSON.stringify(entry.sourceRefs) === JSON.stringify([entry.contextId]), `${entry.id}: coverage reference missing`)
    check(JSON.stringify(entry.conceptIds) === JSON.stringify(ledger?.conceptIds), `${entry.id}: coverage concepts changed`)
    check(entry.conceptIds?.every(id => conceptIds.has(id)), `${entry.id}: unpublished concept`)
    if (entry.placement === 'main') block(entry.explanation, entry.id)
    else check(!entry.explanation && entry.contextLinkLabel?.startsWith('Optional source context'), `${entry.id}: context must remain a labelled optional destination`)
    check(!ledger?.faithPremises.length || entry.foundationContextId === entry.contextId, `${entry.id}: theological premise context missing`)
    check(!entry.foundationContextId || contexts.has(entry.foundationContextId), `${entry.id}: inaccessible theological premise`)
  }
  const approvedNotes = new Map((reading.reviewedNotes ?? []).map(n => [n.id, n]))
  check(approvedNotes.size === reading.reviewedNotes?.length, 'Duplicate note review identity')
  for (const note of corpus.footnotes) {
    const approved = approvedNotes.get(note.id)
    check(approved?.sourceSha256 === note.sha256 && note.sha256 === createHash('sha256').update(note.text).digest('hex'), `${note.id}: exact source note requires reader review`)
    check(['bibliographic-citation', 'source-argument-and-citation'].includes(approved?.classification), `${note.id}: note review classification missing`)
    for (const record of coverage.records) for (const excluded of record.exclusions) {
      check(!note.text.includes(excluded.sourceSpan.text), `${note.id}: note contains an excluded devotional form`)
    }
  }
  check([...approvedNotes.keys()].every(id => corpus.footnotes.some(n => n.id === id)), 'Unknown note review identity')
  for (const r of reading.relations) {
    check(JSON.stringify(r) === JSON.stringify(relations.relations.find(m => m.id === r.id)), `${r.id}: accepted relationship changed`)
    check(conceptIds.has(r.from) && conceptIds.has(r.to), `${r.id}: unpublished endpoint`)
    block(r.explanation, r.id)
  }
  const trailIds = new Set(reading.trails.map(t => t.id))
  check(reading.trails.length === 6, 'Complete six-trail library required')
  const reflectionIds = new Set()
  for (const t of reading.trails) {
    block(t.introduction, t.id); block(t.qualification, t.id); block(t.ending, t.id)
    check(typeof t.question === 'string' && t.question.endsWith('?'), `${t.id}: guiding question required`)
    check(t.steps.length > 0 && new Set(t.steps.map(s => s.id)).size === t.steps.length, `${t.id}: finite unique steps required`)
    for (const s of t.steps) {
      check(typeof s.id === 'string' && /^[a-z][a-z0-9-]*$/.test(s.id), `${t.id}: stable step identity required`)
      check(conceptIds.has(s.conceptId), `${t.id}: unpublished step`); block(s.transition, t.id)
    }
    check(Array.isArray(t.relatedTrailIds) && t.relatedTrailIds.length > 0 && new Set(t.relatedTrailIds).size === t.relatedTrailIds.length && t.relatedTrailIds.every(id => id !== t.id && trailIds.has(id)), `${t.id}: related trail unavailable`)
    check(Array.isArray(t.optionalConceptIds) && t.optionalConceptIds.every(id => conceptIds.has(id)), `${t.id}: optional destination unavailable`)
    const r = t.reflection
    check(r && typeof r.id === 'string' && !reflectionIds.has(r.id), `${t.id}: unique reflection identity required`)
    reflectionIds.add(r?.id)
    check(r?.optional === true && r?.responseFormat === 'think-then-reveal' && ['retrieval', 'transfer'].includes(r?.kind), `${t.id}: reflection must remain optional and unscored`)
    check(r && Object.keys(r).every(key => ['id','kind','optional','responseFormat','prompt','feedback','scenario'].includes(key)), `${t.id}: reflection cannot score agreement or unlock content`)
    check(Object.keys(t).every(key => ['id','title','question','introduction','qualification','steps','reflection','ending','relatedTrailIds','optionalConceptIds','readingEstimate'].includes(key)), `${t.id}: trail cannot require answers or claim mastery`)
    block(r?.prompt, `${t.id}: reflection prompt`); block(r?.feedback, `${t.id}: reflection feedback`)
    if (r?.scenario) {
      block(r.scenario, `${t.id}: scenario`, ['editorial-scenario'])
      check(r.scenario.text?.startsWith('Editorial scenario — fictional:'), `${t.id}: invented situation must be explicitly fictional`)
    }
    check(JSON.stringify(t.readingEstimate) === JSON.stringify(estimateTrailReading(t, reading)), `${t.id}: reading estimate must derive from displayed authored prose`)
  }
  return errors
}

/** A bounded build-time index. Raw paragraph bodies and exclusion forms never enter the reader bundle. */
export function buildReadingIndex(inputs = loadReadingInputs()) {
  const errors = validateReading(inputs)
  if (errors.length) throw new Error(errors.join('\n'))
  const { reading, corpus, coverage } = inputs
  const paragraphs = reading.contexts.map(context => {
    const p = corpus.paragraphs.find(p => p.id === context.paragraphId)
    const ledger = coverage.records.find(r => r.paragraphId === p.id)
    return { paragraphId: context.paragraphId, explanation: context.explanation, number: p.number, pages: p.pages, footnoteIds: p.footnoteIds, sourceSha256: p.sha256,
      disposition: ledger.disposition, placementExplanation: ledger.rationale, exclusionCount: ledger.exclusions.length,
      quotations: reading.concepts.flatMap(c => c.sourceQuotation?.paragraphId === p.id ? [c.sourceQuotation] : []) }
  })
  const noteIds = new Set(paragraphs.flatMap(p => p.footnoteIds))
  // The explicit review manifest binds every screened note to its frozen wording.
  const approved = new Map(reading.reviewedNotes.map(n => [n.id, n]))
  for (const id of noteIds) if (!approved.has(id)) throw new Error(`Source note ${id} requires reader review`)
  const notes = corpus.footnotes.filter(n => noteIds.has(n.id)).map(n => ({ ...n, paragraphIds: n.paragraphIds.filter(id => paragraphs.some(p => p.paragraphId === id)), kind: 'quotation', classification: approved.get(n.id).classification }))
  return { editionId: corpus.editionId, paragraphs, notes }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = buildReadingIndex()
  console.log(`${index.paragraphs.length} reviewed contexts; ${index.notes.length} screened source notes: valid`)
}
