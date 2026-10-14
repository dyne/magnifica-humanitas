import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))
export function loadReadingInputs() {
  return { reading: read('content/reading/en.json'), corpus: read('content/source/en/corpus.json'), coverage: read('content/editorial/coverage.json'), concepts: read('content/editorial/concepts.json'), relations: read('content/editorial/relations.json') }
}
export function validateReading({ reading, corpus, coverage, concepts, relations }) {
  const errors = []
  const check = (condition, message) => { if (!condition) errors.push(message) }
  const source = new Map(corpus.paragraphs.map(p => [p.id, p]))
  const contexts = new Set(reading.contexts.map(c => c.paragraphId))
  const conceptIds = new Set(reading.concepts.map(c => c.id))
  check(reading.editionId === corpus.editionId && reading.locale === 'en' && reading.schemaVersion === 1, 'Reading edition must match source')
  for (const [list, key] of [[reading.concepts, 'id'], [reading.contexts, 'paragraphId'], [reading.relations, 'id'], [reading.trails, 'id']]) {
    check(new Set(list.map(x => x[key])).size === list.length, 'Duplicate published identity')
  }
  function block(b, label) {
    check(['paraphrase', 'editorial-interpretation'].includes(b?.kind), `${label}: prose must have a separate editorial kind`)
    check(typeof b?.text === 'string' && b.text.trim().length > 0, `${label}: empty prose`)
    check(Array.isArray(b?.sourceRefs) && b.sourceRefs.length > 0, `${label}: source references required`)
    for (const id of b?.sourceRefs ?? []) check(source.has(id) && contexts.has(id), `${label}: inaccessible source ${id}`)
    for (const r of coverage.records) for (const e of r.exclusions) {
      check(!b?.text?.includes(e.sourceSpan.text), `${label}: prose contains an excluded devotional form`)
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
  for (const r of reading.relations) {
    check(JSON.stringify(r) === JSON.stringify(relations.relations.find(m => m.id === r.id)), `${r.id}: accepted relationship changed`)
    check(conceptIds.has(r.from) && conceptIds.has(r.to), `${r.id}: unpublished endpoint`)
    block(r.explanation, r.id)
  }
  for (const t of reading.trails) {
    block(t.introduction, t.id); block(t.ending, t.id)
    check(t.steps.length > 0 && new Set(t.steps.map(s => s.id)).size === t.steps.length, `${t.id}: finite unique steps required`)
    for (const s of t.steps) { check(conceptIds.has(s.conceptId), `${t.id}: unpublished step`); block(s.transition, t.id) }
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
  // These bibliographic notes were read against the frozen source for this edition.
  const approved = new Set(['n055','n056','n057','n058','n059','n060','n061','n062','n063','n064','n065','n066','n067','n068','n069','n070','n071','n072','n073','n074','n075','n076','n077','n078','n079','n080','n081','n082','n083','n084','n096','n097','n109','n125','n126','n127','n155','n183','n184'])
  for (const id of noteIds) if (!approved.has(id)) throw new Error(`Source note ${id} requires reader review`)
  const notes = corpus.footnotes.filter(n => noteIds.has(n.id)).map(n => ({ ...n, paragraphIds: n.paragraphIds.filter(id => paragraphs.some(p => p.paragraphId === id)), kind: 'quotation' }))
  return { editionId: corpus.editionId, paragraphs, notes }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = buildReadingIndex()
  console.log(`${index.paragraphs.length} reviewed contexts; ${index.notes.length} bibliographic notes: valid`)
}
