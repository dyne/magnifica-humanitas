import test from 'node:test'
import assert from 'node:assert/strict'
import { loadReadingInputs, validateReading, buildReadingIndex } from '../scripts/reading-content.mjs'

const inputs = loadReadingInputs()
const context = (id, data = inputs) => data.reading.contexts.find(c => c.paragraphId === id)?.explanation.text ?? ''

test('every disposition has a source-ordered main adaptation or labelled optional context', () => {
  const { reading, corpus, coverage } = inputs
  assert.deepEqual(reading.readingSequence.map(b => b.contextId), corpus.paragraphs.map(p => p.id))
  assert.deepEqual(reading.concepts.map(c => c.id), inputs.concepts.concepts.map(c => c.id))
  assert.deepEqual(reading.relations, inputs.relations.relations)
  for (const record of coverage.records) {
    const block = reading.readingSequence.find(b => b.contextId === record.paragraphId)
    assert.equal(block.placement, record.disposition === 'context' ? 'optional-context' : 'main')
    assert.ok(context(block.contextId))
    if (block.placement === 'main') assert.deepEqual(block.explanation.sourceRefs, [record.paragraphId])
    else assert.match(block.contextLinkLabel, /Optional source context/)
    if (record.faithPremises.length) assert.equal(block.foundationContextId, record.paragraphId)
  }
})

test('partial libraries, reversed coverage, missing theological premises and moved context are rejected', () => {
  for (const [mutate, expected] of [
    [d => d.reading.concepts.pop(), /Complete concept library/],
    [d => d.reading.relations.pop(), /Complete relationship library/],
    [d => d.reading.readingSequence.reverse(), /Reading sequence order/],
    [d => delete d.reading.readingSequence[0].foundationContextId, /theological premise context missing/],
    [d => d.reading.readingSequence.find(b => b.contextId === 'p234').placement = 'main', /editorial placement changed/],
    [d => d.reading.reviewedNotes.find(n => n.id === 'n175').sourceSha256 = 'stale', /exact source note requires reader review/],
    [d => d.corpus.footnotes.find(n => n.id === 'n175').text = 'Slavery was always unequivocally condemned.', /exact source note requires reader review/],
  ]) {
    const data = structuredClone(inputs)
    mutate(data)
    assert.match(validateReading(data).join('\n'), expected)
  }
})

// These are review anchors for the most consequential meanings, not an
// automated proof of fidelity. Ordinary semantic review remains necessary.
const anchors = {
  p052: [/Moral dignity/, /social dignity/, /existential dignity/, /Ontological dignity/, /cannot erase/],
  p055: [/conception/, /natural end/, /abortion/, /euthanasia/, /Church.*normative position/],
  p069: [/public intervention/, /expressly does not justify withdrawal/],
  p073: [/without solidarity/i, /without subsidiarity/i, /participation/i],
  p099: [/speed/, /categorically denying/, /claims belong to the author/, /rather than presented as scientific consensus/],
  p109: [/before standards are fixed/, /hidden workers/, /initial design/, /not merely repair/],
  p116: [/varied archipelago/, /more radical/, /rather than attributing the most radical version to every current/],
  p118: [/alleviating suffering is right/, /not a refusal of care/],
  p138: [/Church communities have failed/, /journalists/, /before outsiders compel/],
  p149: [/necessary in emergencies/, /unable to work lose worth or should be refused support/],
  p152: [/dangerous work can be welcome/, /protection of employment/, /systematically sacrificing/],
  p154: [/relationships/, /Unemployment must not jeopardize social participation/, /intrinsic human worth/],
  p162: [/redistribution/, /does not begin only after/, /finance/, /consumption/],
  p165: [/enduring union between a man and a woman/, /contested definition/, /normative position/],
  p173: [/data labelers/, /extractive workers/, /child labor/, /traffickers/, /remain distinct/],
  p176: [/owned slaves/, /legitimized/, /nineteenth century/, /asks pardon/, /not.*exclude/],
  p178: [/both the data/, /ability to decide/, /copy alone does not satisfy/],
  p192: [/self-defense in the strictest sense/, /just-war theory outdated/, /Both.*qualification remain attributed/],
  p197: [/last resort in legitimate self-defense/, /rigorous ethical limits/],
  p198: [/rejects entrusting lethal/, /irreversible/, /recognizes possible work on values/, /does not authorize/],
  p199: [/Designers, trainers, authorizers and users/, /time for moral judgment/, /Civilians/, /non-combatants/],
  p200: [/reconstructable/, /effective, self-aware and responsible/, /nominal approval button does not satisfy/],
  p228: [/unarmed, disarming, humble and persevering/, /relationships and society/],
  p232: [/dignify and sanctify/, /human weakness/, /theological reasoning/],
  p234: [/liturgical responses/, /membership creates obligations of solidarity/],
  p235: [/justice, sharing/, /poor or marginalized/, /excludes liturgical formulas/],
  p236: [/expressly rejects refuge in spiritual sentimentality/, /public responsibility/],
  p243: [/external conditions remain oppressive/, /omits the performed praise/, /changed perception/],
  p244: [/sufferers, widows, orphans, strangers, wounded children, exiles and fugitives/, /main argument/],
  p245: [/share who they are and what they possess/, /daily fidelity/, /excludes the entrusting prayer/],
}

test('difficult source qualifications survive in the complete paragraph adaptations', () => {
  for (const [id, patterns] of Object.entries(anchors)) {
    for (const pattern of patterns) assert.match(context(id), pattern, `${id}: lost review anchor ${pattern}`)
  }
  for (const c of inputs.reading.concepts) {
    assert.ok(c.reasoning.length >= 3, `${c.id}: missing connected reasoning`)
    assert.ok(c.necessaryDistinction.text)
    for (const b of c.reasoning) assert.ok(b.sourceRefs.length)
  }
})

test('notes with substantive arguments remain exact and separately identifiable from citation-only notes', () => {
  const index = buildReadingIndex(inputs)
  assert.equal(index.notes.length, 224)
  for (const id of ['n132', 'n174', 'n175', 'n182']) {
    assert.equal(inputs.reading.reviewedNotes.find(n => n.id === id).classification, 'source-argument-and-citation')
    assert.equal(index.notes.find(n => n.id === id).text, inputs.corpus.footnotes.find(n => n.id === id).text)
  }
  assert.match(index.notes.find(n => n.id === 'n175').text, /as late as 1866.*without fully condemning it/)
})

test('a location-specific connective is not a global prayer blacklist; performed forms still fail in foundations and main blocks', () => {
  assert.deepEqual(validateReading(inputs), [])
  for (const mutate of [
    d => d.reading.concepts.find(c => c.id === 'faith-foundations').foundation.text += ' let us pray,',
    d => d.reading.readingSequence.find(b => b.contextId === 'p228').explanation.text += ' ' + d.coverage.records.find(r => r.paragraphId === 'p228').exclusions[0].sourceSpan.text,
  ]) {
    const data = structuredClone(inputs)
    mutate(data)
    assert.match(validateReading(data).join('\n'), /excluded devotional form/)
  }
})
