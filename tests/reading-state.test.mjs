import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decodeReadingState, newReadingState, isAvailable, locationRoute, LIMITS } from '../scripts/reading-state.mjs'
const catalog = { concept: [{ id: 'dignity', blocks: ['dignity-idea'] }], read: [{ id: 'continuous', blocks: ['read-p052'] }], trail: [{ id: 'worth-not-reward', steps: ['intrinsic-worth'], blocks: ['dignity-idea'] }] }
const decode = value => decodeReadingState(value === null ? null : typeof value === 'string' ? value : JSON.stringify(value), 'new-content', 'mh-en-owner-2026', catalog)
const location = { kind: 'concept', entityId: 'dignity', blockId: 'dignity-idea', offset: 125 }
const state = () => ({ ...newReadingState('new-content', 'mh-en-owner-2026'), last: location, saved: [location], recent: [location], visited: [location] })
test('validated bounded record round-trips places and contains no responses or query', () => {
  assert.deepEqual(decode(state()).state, state())
  assert.equal(locationRoute(location), '/en/concepts/dignity?at=dignity-idea')
  assert.equal(locationRoute({ kind: 'trail', entityId: 'worth-not-reward', stepId: 'intrinsic-worth', offset: 0 }), '/en/trails/worth-not-reward/steps/intrinsic-worth')
  assert.equal(decode(null).state.last, null)
})
test('malformed, unsupported, extra and prototype fields are discarded', () => {
  for (const raw of ['{broken', 'null', '[]', '{"__proto__":{"polluted":true}}', JSON.stringify({ ...state(), schemaVersion: 2 }), JSON.stringify({ ...state(), edition: 'another-edition' }), JSON.stringify({ ...state(), query: 'private thought' }), JSON.stringify({ ...state(), saved: [{ ...location, answer: 'yes' }] }), JSON.stringify({ ...state(), last: { ...location, offset: -1 } }), JSON.stringify({ ...state(), appearance: 'invalid' }), JSON.stringify({ ...state(), saved: [location, location] })]) {
    assert.match(decode(raw).notice, /discarded/)
    assert.deepEqual(decode(raw).state, newReadingState('new-content', 'mh-en-owner-2026'))
  }
  assert.equal({}.polluted, undefined)
})
test('oversize arrays, stale offset and invalid locations fail without truncating into false validity', () => {
  for (const field of ['saved', 'recent', 'visited']) assert.match(decode({ ...state(), [field]: Array(LIMITS[field] + 1).fill(location) }).notice, /discarded/)
  assert.match(decode({ ...state(), last: { ...location, offset: LIMITS.offset + 1 } }).notice, /discarded/)
  assert.match(decode(' '.repeat(LIMITS.bytes + 1)).notice, /discarded/)
  assert.match(decode({ ...state(), last: { kind: 'trail', entityId: 'worth-not-reward', offset: 0 } }).notice, /discarded/)
})
test('content changes retain stable IDs, reset missing blocks and label unknown destinations', () => {
  const unknown = { kind: 'concept', entityId: 'removed-concept', offset: 0 }
  const old = { ...state(), contentRevision: 'old-content', saved: [location, { ...location, blockId: 'removed-block', offset: 200 }, unknown] }
  const result = decode(old)
  assert.match(result.notice, /updated/)
  assert.equal(result.state.contentRevision, 'new-content')
  assert.deepEqual(result.state.saved[0], location)
  assert.deepEqual(result.state.saved[1], { kind: 'concept', entityId: 'dignity', offset: 0 })
  assert.deepEqual(result.state.saved[2], unknown)
  assert.equal(isAvailable(unknown, catalog), false)
  assert.equal(isAvailable({ kind: 'trail', entityId: 'worth-not-reward', stepId: 'missing', offset: 0 }, catalog), false)
})
