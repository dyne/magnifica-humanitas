import test from 'node:test'
import assert from 'node:assert/strict'
import { loadReadingInputs, validateReading, buildReadingIndex } from '../scripts/reading-content.mjs'
const inputs = loadReadingInputs()

test('published reading has reachable evidence, fixed qualifications and complete finite trails', () => {
  assert.deepEqual(validateReading(inputs), [])
  const { reading } = inputs
  assert.ok(reading.trails.some(t => t.steps.length >= 2))
  for (const t of reading.trails) {
    assert.ok(t.introduction.text && t.ending.text)
    for (const s of t.steps) assert.ok(reading.concepts.find(c => c.id === s.conceptId)?.reasoning.length)
  }
})

test('context index preserves edition, provenance and exact note text without raw paragraph bodies', () => {
  const index = buildReadingIndex(inputs)
  assert.equal(index.editionId, inputs.corpus.editionId)
  for (const p of index.paragraphs) {
    const original = inputs.corpus.paragraphs.find(c => c.id === p.paragraphId)
    assert.equal(p.sourceSha256, original.sha256)
    assert.deepEqual(p.pages, original.pages)
    assert.ok(!('text' in p))
    for (const id of p.footnoteIds) assert.ok(index.notes.some(n => n.id === id && n.paragraphIds.includes(p.paragraphId)))
    for (const q of p.quotations) assert.equal(q.text, original.text.slice(q.start, q.end))
  }
  for (const n of index.notes) {
    assert.equal(n.kind, 'quotation')
    assert.equal(n.text, inputs.corpus.footnotes.find(o => o.id === n.id).text)
  }
})

test('reader validation rejects missing contexts, qualification erasure and spliced source quotations', () => {
  let data = structuredClone(inputs)
  data.reading.contexts = data.reading.contexts.filter(c => c.paragraphId !== 'p052')
  assert.match(validateReading(data).join('\n'), /inaccessible source p052/)
  data = structuredClone(inputs)
  data.reading.concepts.find(c => c.id === 'rights').necessaryDistinction.text = 'Everyone accepts these positions.'
  assert.match(validateReading(data).join('\n'), /necessary qualification changed/)
  data = structuredClone(inputs)
  data.reading.concepts[0].sourceQuotation.text += ' invented addition'
  assert.match(validateReading(data).join('\n'), /exact and contiguous/)
})

test('reader validation rejects excluded forms, broken trail steps and unpublished relationships', () => {
  let data = structuredClone(inputs)
  const excluded = data.coverage.records.flatMap(r => r.exclusions)[0].sourceSpan.text
  data.reading.concepts[0].reasoning[0].text += excluded
  assert.match(validateReading(data).join('\n'), /excluded devotional form/)
  data = structuredClone(inputs)
  data.reading.trails[0].steps[0].conceptId = 'unpublished'
  assert.match(validateReading(data).join('\n'), /unpublished step/)
  data = structuredClone(inputs)
  data.reading.relations[0].to = 'unpublished'
  assert.match(validateReading(data).join('\n'), /unpublished endpoint/)
})
