import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { validateContent } from './validate-editorial.mjs'
import { localeRegistry } from './locales.mjs'
import { pathToFileURL } from 'node:url'
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
export function loadReadingInputs(locale = 'en') {
  if (!localeRegistry.some(entry => entry.id === locale)) throw new Error(`Unknown locale ${locale}`)
  const editorial = locale === 'en' ? 'content/editorial' : `content/editorial/${locale}`
  return { reading: read(`content/reading/${locale}.json`), corpus: read(`content/source/${locale}/corpus.json`), coverage: read(`${editorial}/coverage.json`), concepts: read(`${editorial}/concepts.json`), relations: read(`${editorial}/relations.json`) }
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
  const errors = validateContent({ corpus, coverage, concepts, relations })
  const check = (condition, message) => { if (!condition) errors.push(message) }
  if (reading.locale !== 'en') {
    const canonical = read('content/reading/en.json')
    const same = (a, b, label) => check(JSON.stringify(a) === JSON.stringify(b), `Stable localized ${label} identities required`)
    same(reading.concepts.map(c => [c.id, c.reasoning.map(b => b.id)]), canonical.concepts.map(c => [c.id, c.reasoning.map(b => b.id)]), 'concept/block')
    same(reading.relations.map(r => [r.id, r.from, r.to, r.type, r.placement]), canonical.relations.map(r => [r.id, r.from, r.to, r.type, r.placement]), 'relation')
    same(reading.trails.map(t => [t.id, t.steps.map(s => [s.id, s.conceptId]), t.reflection.id]), canonical.trails.map(t => [t.id, t.steps.map(s => [s.id, s.conceptId]), t.reflection.id]), 'trail/step/reflection')
    same(reading.readingSequence.map(b => [b.id, b.contextId, b.placement]), canonical.readingSequence.map(b => [b.id, b.contextId, b.placement]), 'sequential reading')
  }
  const source = new Map(corpus.paragraphs.map(p => [p.id, p]))
  check([coverage, concepts, relations].every(data => data.editionId === corpus.editionId), 'Editorial inputs must match active source edition')
  for (const record of coverage.records) {
    const p = source.get(record.paragraphId)
    check(p && record.sourceSha256 === p.sha256 && createHash('sha256').update(p.text).digest('hex') === p.sha256, `${record.paragraphId}: active source hash mismatch`)
  }
  const contexts = new Set(reading.contexts.map(c => c.paragraphId))
  const conceptIds = new Set(reading.concepts.map(c => c.id))
  check(concepts.concepts.every(c => conceptIds.has(c.id)), 'Complete concept library required')
  check(relations.relations.every(r => reading.relations.some(p => p.id === r.id)), 'Complete relationship library required')
  check(contexts.size === source.size && [...source.keys()].every(id => contexts.has(id)), 'Complete paragraph adaptation required')
  check(reading.editionId === corpus.editionId && localeRegistry.some(locale => locale.id === reading.locale) && reading.locale === (corpus.locale ?? corpus.language ?? 'en') && reading.schemaVersion === 1, 'Reading edition must match source')
  for (const [list, key] of [[reading.concepts, 'id'], [reading.contexts, 'paragraphId'], [reading.relations, 'id'], [reading.trails, 'id']]) {
    check(new Set(list.map(x => x[key])).size === list.length, 'Duplicate published identity')
  }
  // Matching reach is reviewed independently from grammatical scope. Complete
  // forms remain global by default; only explicitly marked incomplete fragments
  // use their source location. Unknown locations must not bypass the check.
  const containsExcludedForm = (text, sourceRefs) => coverage.records.some(record => record.exclusions.some(excluded => {
    const inScope = excluded.matchScope !== 'source-location' || !Array.isArray(sourceRefs) ||
      sourceRefs.length === 0 || sourceRefs.some(id => !source.has(id)) || sourceRefs.includes(record.paragraphId)
    return inScope && text?.includes(excluded.sourceSpan.text)
  }))
  function block(b, label, kinds = ['paraphrase', 'editorial-interpretation']) {
    check(kinds.includes(b?.kind), `${label}: prose must have a separate editorial kind`)
    check(typeof b?.text === 'string' && b.text.trim().length > 0, `${label}: empty prose`)
    check(Array.isArray(b?.sourceRefs) && b.sourceRefs.length > 0, `${label}: source references required`)
    for (const id of b?.sourceRefs ?? []) check(source.has(id) && contexts.has(id), `${label}: inaccessible source ${id}`)
    check(!containsExcludedForm(b?.text, b?.sourceRefs), `${label}: prose contains an excluded devotional form`)
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
    else check(!entry.explanation && (reading.locale === 'en' ? entry.contextLinkLabel?.startsWith('Optional source context') : typeof entry.contextLinkLabel === 'string' && entry.contextLinkLabel.trim().length > 0), `${entry.id}: context must remain a labelled optional destination`)
    check(!ledger?.faithPremises.length || entry.foundationContextId === entry.contextId, `${entry.id}: theological premise context missing`)
    check(!entry.foundationContextId || contexts.has(entry.foundationContextId), `${entry.id}: inaccessible theological premise`)
  }
  const approvedNotes = new Map((reading.reviewedNotes ?? []).map(n => [n.id, n]))
  check(approvedNotes.size === reading.reviewedNotes?.length, 'Duplicate note review identity')
  for (const note of corpus.footnotes) {
    const approved = approvedNotes.get(note.id)
    check(approved?.sourceSha256 === note.sha256 && note.sha256 === createHash('sha256').update(note.text).digest('hex'), `${note.id}: exact source note requires reader review`)
    check(!approved?.previousNoteId || corpus.footnotes.some(n => n.id === approved.previousNoteId && n.number < note.number), `${note.id}: unavailable preceding note context`)
    check(['bibliographic-citation', 'source-argument-and-citation'].includes(approved?.classification), `${note.id}: note review classification missing`)
    check(!containsExcludedForm(note.text, note.paragraphIds), `${note.id}: note contains an excluded devotional form`)
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
    check(typeof t.question === 'string' && (reading.locale === 'en' ? t.question.endsWith('?') : t.question.trim().length > 0), `${t.id}: guiding question required`)
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
      check(r.scenario.text?.startsWith(reading.locale === 'en' ? 'Editorial scenario — fictional:' : reading.localeMetadata?.scenarioPrefix) && (reading.locale === 'en' || Boolean(reading.localeMetadata?.scenarioPrefix)), `${t.id}: invented situation must be explicitly fictional`)
    }
    check(JSON.stringify(reading.locale === 'en' ? t.readingEstimate : { ...t.readingEstimate, label: 'Estimated reading time', method: estimateTrailReading(t, reading).method }) === JSON.stringify(estimateTrailReading(t, reading)), `${t.id}: reading estimate must derive from displayed authored prose`)
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
  const notes = corpus.footnotes.filter(n => noteIds.has(n.id)).map(n => ({ ...n, paragraphIds: n.paragraphIds.filter(id => paragraphs.some(p => p.paragraphId === id)), kind: 'quotation', classification: approved.get(n.id).classification, ...(approved.get(n.id).previousNoteId ? { previousNoteId: approved.get(n.id).previousNoteId } : {}) }))
  return { editionId: corpus.editionId, paragraphs, notes }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = buildReadingIndex()
  console.log(`${index.paragraphs.length} reviewed contexts; ${index.notes.length} screened source notes: valid`)
}
