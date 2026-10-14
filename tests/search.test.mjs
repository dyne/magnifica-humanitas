import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeQuery, searchPublished } from '../scripts/search.mjs'
const reading = JSON.parse(readFileSync(new URL('../content/reading/en.json', import.meta.url)))
const search = q => searchPublished(reading, reading.readingSequence, q)
test('empty and cleared queries produce instructions rather than arbitrary results', () => {
  assert.deepEqual(search(''), []); assert.deepEqual(search(' \n '), [])
  assert.equal(normalizeQuery('  DíGnity  '), 'dignity')
})
test('known concept and glossary queries rank titles before authored body matches', () => {
  assert.equal(search('Human dignity')[0].to, '/en/concepts/dignity')
  assert.equal(search('subsidiarity')[0].to, '/en/concepts/subsidiarity')
  assert.deepEqual(search('DÍGNITY'), search('dignity'))
  assert.ok(search('hidden labor').some(r => r.to === '/en/concepts/exploitation'))
  assert.deepEqual(search('zz-unmatched-term-zz'), [])
})
test('paragraph lookup covers every source position without wrong-content substitution', () => {
  for (const n of [1, 52, 176, 245]) for (const q of [`${n}`, `§${n}`, `paragraph ${n}`, `p${String(n).padStart(3, '0')}`]) {
    assert.equal(search(q)[0].to, `/en/read?at=read-p${String(n).padStart(3, '0')}`)
  }
  assert.deepEqual(search('246'), []); assert.deepEqual(search('0'), [])
})
test('search destinations and previews are published source-backed prose with deterministic ties', () => {
  const result = search('responsibility')
  assert.ok(result.length > 1)
  assert.deepEqual(result, search('responsibility'))
  assert.ok(result.every(r => r.sourceRefs.length && r.to.startsWith('/en/')))
  assert.ok(search('theological').some(r => r.type.includes('Optional')))
  assert.deepEqual(search('Hail Mary'), [])
})
