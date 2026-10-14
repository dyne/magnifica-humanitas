import { english, formatMessage } from './messages.mjs'
export const STORAGE_KEY = 'mh-reading-v1'
export const LIMITS = Object.freeze({ saved: 50, recent: 10, visited: 300, offset: 100000, bytes: 300000 })
const kinds = ['concept', 'relation', 'foundation', 'source', 'note', 'read', 'trail', 'trailEnd']
const safeId = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(value)
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype
const exactKeys = (value, allowed) => object(value) && Object.keys(value).every(key => allowed.includes(key))
export function newReadingState(revision, edition, locale = 'en') {
  return { schemaVersion: 1, contentRevision: revision, locale, edition, last: null, saved: [], recent: [], visited: [], appearance: 'system' }
}
export function locationKey(location, includeBlock = true) {
  return `${location.kind}:${location.entityId}:${location.stepId ?? ''}${includeBlock ? `:${location.blockId ?? ''}` : ''}`
}
export function validLocationShape(location) {
  return exactKeys(location, ['kind', 'entityId', 'stepId', 'blockId', 'offset']) &&
    kinds.includes(location.kind) && safeId(location.entityId) &&
    (location.stepId === undefined || safeId(location.stepId)) &&
    (location.blockId === undefined || safeId(location.blockId)) &&
    (location.kind === 'trail' ? !!location.stepId : location.stepId === undefined) &&
    Number.isInteger(location.offset) && location.offset >= 0 && location.offset <= LIMITS.offset &&
    (location.blockId !== undefined || location.offset === 0)
}
export function isAvailable(location, catalog) {
  if (!validLocationShape(location)) return false
  return catalog[location.kind]?.some(entry => entry.id === location.entityId && (location.kind !== 'trail' || entry.steps?.includes(location.stepId))) ?? false
}
export function hasBlock(location, catalog) {
  return !location.blockId || !!catalog[location.kind]?.find(entry => entry.id === location.entityId && (location.kind !== 'trail' || entry.steps?.includes(location.stepId)))?.blocks?.includes(location.blockId)
}
export function decodeReadingState(raw, revision, edition, catalog, locale = 'en', messages = english) {
  const empty = newReadingState(revision, edition, locale)
  if (raw === null) return { state: empty, notice: '' }
  try {
    if (typeof raw !== 'string' || raw.length > LIMITS.bytes) throw new Error('size')
    const value = JSON.parse(raw)
    const keys = Object.keys(empty)
    if (!exactKeys(value, keys) || Object.keys(value).length !== keys.length || value.schemaVersion !== 1 || value.locale !== locale || value.edition !== edition || typeof value.contentRevision !== 'string' || value.contentRevision.length > 100 || !['system', 'light', 'dark'].includes(value.appearance)) throw new Error('record')
    if (value.last !== null && !validLocationShape(value.last)) throw new Error('last')
    for (const field of ['saved', 'recent', 'visited']) {
      if (!Array.isArray(value[field]) || value[field].length > LIMITS[field] || !value[field].every(validLocationShape)) throw new Error(field)
      const keys = value[field].map(location => locationKey(location, field !== 'visited'))
      if (new Set(keys).size !== keys.length) throw new Error('duplicates')
    }
    let reset = false
    const migrate = location => {
      if (!location || !isAvailable(location, catalog) || hasBlock(location, catalog)) return location
      reset = true
      const { blockId: _blockId, ...remaining } = location
      return { ...remaining, offset: 0 }
    }
    const changed = value.contentRevision !== revision
    const state = { ...value, contentRevision: revision, last: migrate(value.last), saved: value.saved.map(migrate), recent: value.recent.map(migrate), visited: value.visited.map(migrate) }
    // Different missing blocks can converge on one valid destination.
    for (const field of ['saved', 'recent', 'visited']) state[field] = state[field].filter((location, index, items) => items.findIndex(item => locationKey(item, field !== 'visited') === locationKey(location, field !== 'visited')) === index)
    return { state, notice: changed ? formatMessage(messages, 'state.updated') : reset ? formatMessage(messages, 'state.blocks_reset') : '' }
  } catch {
    return { state: empty, notice: formatMessage(messages, 'state.discarded') }
  }
}
export function locationRoute(location, locale = 'en') {
  const id = encodeURIComponent(location.entityId)
  const paths = { concept: `/${locale}/concepts/${id}`, relation: `/${locale}/relations/${id}`, foundation: `/${locale}/foundations/${id}`, source: `/${locale}/source/${id}`, note: `/${locale}/notes/${id}`, read: `/${locale}/read`, trail: `/${locale}/trails/${id}/steps/${encodeURIComponent(location.stepId ?? '')}`, trailEnd: `/${locale}/trails/${id}/end` }
  const path = paths[location.kind]
  return path && location.blockId ? `${path}?at=${encodeURIComponent(location.blockId)}` : path
}
