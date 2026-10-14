import test from 'node:test'
import assert from 'node:assert/strict'
import { loadReadingInputs, validateReading, estimateTrailReading } from '../scripts/reading-content.mjs'

const inputs = loadReadingInputs()
const expectedPaths = {
  'worth-not-reward': ['dignity', 'rights', 'embodiment', 'care', 'work'],
  'ai-purpose': ['technology-power', 'shared-goods', 'subsidiarity', 'ai-governance', 'institutional-accountability', 'justice'],
  'work-and-a-future': ['work', 'care', 'distribution', 'exploitation', 'family'],
  'forming-judgment': ['truth', 'technology-power', 'freedom', 'education', 'institutional-accountability'],
  'justice-in-structures': ['shared-goods', 'solidarity', 'justice', 'memory', 'institutional-accountability'],
  'peace-and-responsibility': ['technology-power', 'ai-governance', 'institutional-accountability', 'memory', 'dialogue', 'peace'],
}

test('six research questions have coherent finite paths and preserve opening trail identities', () => {
  assert.deepEqual(validateReading(inputs), [])
  assert.equal(inputs.reading.trails.length, 6)
  for (const t of inputs.reading.trails) {
    assert.deepEqual(t.steps.map(s => s.conceptId), expectedPaths[t.id])
    assert.ok(t.qualification.text && t.ending.text && t.relatedTrailIds.length)
    for (const s of t.steps) {
      assert.ok(s.transition.sourceRefs.every(id => inputs.reading.contexts.some(c => c.paragraphId === id)))
    }
    assert.ok(t.steps.every(s => s.conceptId !== 'faith-foundations'), 'Theological foundations must remain optional companions')
  }
  assert.deepEqual(inputs.reading.trails[0].steps.slice(0, 2).map(s => s.id), ['intrinsic-worth', 'rights-in-practice'])
})

test('optional source-grounded reflection has no answers required for progress or agreement scores', () => {
  for (const t of inputs.reading.trails) {
    assert.equal(t.reflection.optional, true)
    assert.equal(t.reflection.responseFormat, 'think-then-reveal')
    assert.ok(t.reflection.prompt.sourceRefs.length && t.reflection.feedback.sourceRefs.length)
    if (t.reflection.scenario) {
      assert.equal(t.reflection.scenario.kind, 'editorial-scenario')
      assert.match(t.reflection.scenario.text, /^Editorial scenario — fictional:/)
    }
  }
  for (const mutate of [
    d => d.reading.trails[0].reflection.optional = false,
    d => d.reading.trails[0].reflection.agreementScore = 1,
    d => d.reading.trails[0].requiresReflectionToUnlock = true,
    d => d.reading.trails[0].mastered = true,
  ]) {
    const data = structuredClone(inputs)
    mutate(data)
    assert.match(validateReading(data).join('\n'), /optional and unscored|cannot score agreement|cannot require answers or claim mastery/)
  }
})

test('feedback protects the distinctions rather than marking the reader as correct or aligned', () => {
  const feedback = id => inputs.reading.trails.find(t => t.id === id).reflection.feedback.text
  assert.match(feedback('worth-not-reward'), /first three can change without reducing the fourth/)
  assert.match(feedback('worth-not-reward'), /disagree with the source’s theological grounding/)
  assert.match(feedback('ai-purpose'), /genuine accountability measure/)
  assert.match(feedback('ai-purpose'), /does not itself let workers or applicants question the objectives/)
  assert.match(feedback('work-and-a-future'), /Income support.*necessary in an emergency/)
  assert.match(feedback('work-and-a-future'), /intrinsic dignity remains unchanged/)
  assert.match(feedback('forming-judgment'), /not reasons to abandon fact-checking/)
  assert.match(feedback('forming-judgment'), /distinct from verifying facts/)
  assert.match(feedback('justice-in-structures'), /context matters but does not cancel admitted complicity/)
  assert.match(feedback('justice-in-structures'), /reparation or material support/)
  assert.match(feedback('peace-and-responsibility'), /approval button does not show/)
  assert.match(feedback('peace-and-responsibility'), /time for moral judgment; civilian protection; and effective, self-aware human control/)
  assert.match(feedback('peace-and-responsibility'), /Values and boundaries.*do not lift that prohibition/)
})

test('broken paths, invented scenario attribution and inaccessible feedback evidence are rejected', () => {
  for (const [mutate, expected] of [
    [d => d.reading.trails[0].steps[1].id = d.reading.trails[0].steps[0].id, /finite unique steps/],
    [d => d.reading.trails[0].relatedTrailIds = ['missing-trail'], /related trail unavailable/],
    [d => d.reading.trails[0].optionalConceptIds = ['missing-concept'], /optional destination unavailable/],
    [d => d.reading.trails[1].reflection.scenario.kind = 'quotation', /separate editorial kind/],
    [d => d.reading.trails[1].reflection.scenario.text = 'A real employer proved this happens.', /explicitly fictional/],
    [d => d.reading.trails[1].reflection.feedback.sourceRefs = ['p999'], /inaccessible source p999/],
    [d => d.reading.trails.pop(), /Complete six-trail library/],
  ]) {
    const data = structuredClone(inputs)
    mutate(data)
    assert.match(validateReading(data).join('\n'), expected)
  }
})

test('reading estimates track displayed prose while source and optional foundation detours remain excluded', () => {
  const data = structuredClone(inputs)
  const trail = data.reading.trails[0]
  const before = estimateTrailReading(trail, data.reading)
  assert.equal(before.kind, 'estimate')
  assert.equal(before.label, 'Estimated reading time')
  assert.equal(before.wordsPerMinute, 200)
  assert.match(before.method, /assumed 200 words per minute.*Actual reading and reflection time varies/)
  data.reading.concepts.find(c => c.id === 'dignity').reasoning[0].text += ' Additional words.'
  assert.equal(estimateTrailReading(trail, data.reading).words, before.words + 2)
  assert.match(validateReading(data).join('\n'), /reading estimate must derive/)
  data.reading.concepts.find(c => c.id === 'dignity').foundation.text += ' Optional foundation detour with additional explanation.'
  data.reading.contexts[0].explanation.text += ' Optional source detour with additional explanation.'
  assert.equal(estimateTrailReading(trail, data.reading).words, before.words + 2)
  trail.readingEstimate = estimateTrailReading(trail, data.reading)
  assert.equal(trail.readingEstimate.minutes, Math.ceil(trail.readingEstimate.words / 200))
})

test('qualification and scenario prose cannot reintroduce performed devotional forms', () => {
  const excluded = inputs.coverage.records.find(r => r.paragraphId === 'p228').exclusions[0].sourceSpan.text
  for (const mutate of [
    d => d.reading.trails[0].qualification.text += excluded,
    d => d.reading.trails[1].reflection.scenario.text += excluded,
    d => d.reading.trails[1].reflection.feedback.text += excluded,
  ]) {
    const data = structuredClone(inputs)
    mutate(data)
    assert.match(validateReading(data).join('\n'), /excluded devotional form/)
  }
})
