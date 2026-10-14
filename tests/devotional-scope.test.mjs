import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { loadReadingInputs, validateReading, estimateTrailReading } from '../scripts/reading-content.mjs'

const english = loadReadingInputs()
const italian = JSON.parse(readFileSync(new URL('../content/source/it/corpus.json', import.meta.url), 'utf8'))
const hash = text => createHash('sha256').update(text).digest('hex')

// Exercise both languages through the complete validator without depending on
// uncommitted Italian authoring. Only these in-memory source fixtures change.
function fixture(locale) {
  const data = structuredClone(english)
  const record = data.coverage.records.find(r => r.paragraphId === 'p241')
  const fragment = record.exclusions[0]
  fragment.matchScope = 'source-location'
  if (locale === 'it') {
    const paragraph = data.corpus.paragraphs.find(p => p.id === 'p241')
    const official = italian.paragraphs.find(p => p.id === 'p241')
    const start = paragraph.text.length + 1 + official.text.indexOf('preghiera e')
    assert.ok(official.text.includes('preghiera e'))
    paragraph.text += ` ${official.text}`
    paragraph.sha256 = record.sourceSha256 = hash(paragraph.text)
    fragment.sourceSpan = { kind: 'quotation', paragraphId: 'p241', start, end: start + 'preghiera e'.length, text: 'preghiera e' }
    fragment.sentenceContexts = [{ ...fragment.sourceSpan }]
  }
  return { data, fragment }
}

function setNote(data, text, paragraphIds = ['p244']) {
  const note = data.corpus.footnotes.find(n => n.id === 'n223')
  Object.assign(note, { text, sha256: hash(text), paragraphIds })
  data.reading.reviewedNotes.find(n => n.id === note.id).sourceSha256 = note.sha256
}

function reestimate(data) {
  for (const trail of data.reading.trails) trail.readingEstimate = estimateTrailReading(trail, data.reading)
}

for (const locale of ['en', 'it']) {
  test(`${locale}: a source-local fragment permits unrelated bibliographic titles and authored discussion`, () => {
    const { data, fragment } = fixture(locale)
    const title = locale === 'it' ? italian.footnotes.find(n => n.id === 'n223').text : 'Bibliographic fixture: prayer and civic responsibility.'
    assert.ok(title.includes(fragment.sourceSpan.text))
    setNote(data, title)
    data.reading.concepts[0].reasoning[0].text += ` ${title}`
    assert.ok(!data.reading.concepts[0].reasoning[0].sourceRefs.includes('p241'))
    reestimate(data)
    assert.deepEqual(validateReading(data), [])
  })

  test(`${locale}: a source-local fragment still fails in its authored paragraph and associated note`, () => {
    const { data, fragment } = fixture(locale)
    data.reading.contexts.find(c => c.paragraphId === 'p241').explanation.text += ` ${fragment.sourceSpan.text}`
    assert.ok(validateReading(data).includes('p241: prose contains an excluded devotional form'))
    const notes = fixture(locale)
    setNote(notes.data, `Bibliographic fixture: ${notes.fragment.sourceSpan.text}`, ['p241'])
    assert.ok(validateReading(notes.data).includes('n223: note contains an excluded devotional form'))
    for (const paragraphIds of [undefined, [], ['unknown-paragraph']]) {
      setNote(notes.data, notes.fragment.sourceSpan.text)
      notes.data.corpus.footnotes.find(n => n.id === 'n223').paragraphIds = paragraphIds
      assert.ok(validateReading(notes.data).includes('n223: note contains an excluded devotional form'), 'unknown note location must fail closed')
    }
  })

  test(`${locale}: source-local matching preserves exact quotation intersections, offsets and hashes`, () => {
    const { data, fragment } = fixture(locale)
    data.reading.concepts[0].sourceQuotation = { ...fragment.sourceSpan }
    assert.ok(validateReading(data).some(error => error.endsWith('quotation intersects devotional exclusion')))
    fragment.sourceSpan.start++
    assert.ok(validateReading(data).some(error => error.includes('quotation differs from exact contiguous source')))
    data.coverage.records.find(r => r.paragraphId === 'p241').sourceSha256 = 'stale'
    assert.ok(validateReading(data).some(error => error.includes('active source hash mismatch')))
  })

  test(`${locale}: complete invocations, blessings and responses remain globally rejected in prose and notes`, () => {
    for (const [id, text, scope] of locale === 'it' ? [
      ['p016', 'preghiamo,', 'clause'],
      ['p228', '«La pace sia con voi! Questa è la pace del Cristo Risorto, una pace disarmata e una pace disarmante, umile e perseverante».', 'liturgical-formula'],
      ['p234', 'A ciò che siete rispondete: Amen e rispondendo lo sottoscrivete. Ti si dice infatti: Il Corpo di Cristo, e tu rispondi: Amen. Sii membro del corpo di Cristo, perché sia veritiero il tuo Amen».', 'liturgical-formula'],
    ] : ['p016', 'p228', 'p234'].map(id => {
      const e = english.coverage.records.find(r => r.paragraphId === id).exclusions[0]
      return [id, e.sourceSpan.text, e.scope]
    })) {
      const { data } = fixture(locale)
      if (locale === 'it') {
        assert.ok(italian.paragraphs.find(p => p.id === id).text.includes(text))
        const paragraph = data.corpus.paragraphs.find(p => p.id === id)
        const record = data.coverage.records.find(r => r.paragraphId === id)
        const start = paragraph.text.length + 1
        paragraph.text += ` ${text}`
        paragraph.sha256 = record.sourceSha256 = hash(paragraph.text)
        const sourceSpan = { kind: 'quotation', paragraphId: id, start, end: start + text.length, text }
        record.exclusions.push({ ...structuredClone(record.exclusions[0]), id: `${id}-exclusion-${record.exclusions.length + 1}`, scope, sourceSpan, sentenceContexts: [{ ...sourceSpan }] })
      }
      data.reading.concepts[0].reasoning[0].text += ` ${text}`
      setNote(data, text, ['p052'])
      const errors = validateReading(data)
      assert.ok(errors.some(error => error.endsWith('prose contains an excluded devotional form')), `${id}: complete form in unrelated prose`)
      assert.ok(errors.includes('n223: note contains an excluded devotional form'), `${id}: complete form in unrelated note`)
    }
  })
}

test('exclusion matching metadata rejects unknown scopes and cannot localize complete formulas', () => {
  const { data, fragment } = fixture('en')
  fragment.matchScope = 'ignore'
  assert.match(validateReading(data).join('\n'), /invalid exclusion match scope/)
  fragment.matchScope = 'source-location'
  data.coverage.records.find(r => r.paragraphId === 'p228').exclusions[0].matchScope = 'source-location'
  assert.match(validateReading(data).join('\n'), /source-location matching requires a clause fragment/)
})

test('explicit global matching rejects a fragment even at an unrelated source location', () => {
  const { data, fragment } = fixture('en')
  fragment.matchScope = 'global'
  setNote(data, fragment.sourceSpan.text, ['p244'])
  assert.ok(validateReading(data).includes('n223: note contains an excluded devotional form'))
})
