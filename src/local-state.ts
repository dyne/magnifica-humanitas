import { reactive, ref } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import { concepts, relations, trails, edition, revision, concept, relation, trail } from './reading'
import { STORAGE_KEY, LIMITS, decodeReadingState, isAvailable, locationKey, locationRoute, newReadingState } from '../scripts/reading-state.mjs'
import type { ReaderLocation, LocationCatalog } from '../scripts/reading-state.mjs'
export type { ReaderLocation }
const conceptBlocks = (id: string) => { const c = concept(id)!; return [`${id}-idea`, `${id}-distinction`, `${id}-connections`, ...c.reasoning.map(b => b.id!)] }
const readBlocks = [...Array.from({ length: 245 }, (_, i) => `read-p${String(i + 1).padStart(3, '0')}`), ...concepts.flatMap(c => conceptBlocks(c.id))]
export const catalog: LocationCatalog = {
  concept: concepts.map(c => ({ id: c.id, blocks: conceptBlocks(c.id) })),
  foundation: concepts.filter(c => c.foundation).map(c => ({ id: c.id })),
  relation: relations.map(r => ({ id: r.id })),
  source: Array.from({ length: 245 }, (_, i) => ({ id: `p${String(i + 1).padStart(3, '0')}` })),
  note: Array.from({ length: 224 }, (_, i) => ({ id: `n${String(i + 1).padStart(3, '0')}` })),
  read: [{ id: 'continuous', blocks: readBlocks }],
  trail: trails.flatMap(t => t.steps.map(s => ({ id: t.id, steps: [s.id], blocks: conceptBlocks(s.conceptId) }))),
  trailEnd: trails.map(t => ({ id: t.id })),
}
let initial = { state: newReadingState(revision, edition), notice: '' }
let storageFailed = false
try { initial = decodeReadingState(localStorage.getItem(STORAGE_KEY), revision, edition, catalog) }
catch { storageFailed = true; initial.notice = 'Reading data is temporary in this tab because device storage is unavailable.' }
export const localData = reactive(initial.state)
export const storageUnavailable = ref(storageFailed)
export const dataNotice = ref(initial.notice)
export const localStatus = ref('')
export const activeLocation = ref<ReaderLocation | null>(null)
export const undoSaved = ref<{ location: ReaderLocation; index: number } | null>(null)
export const available = (location: ReaderLocation) => isAvailable(location, catalog)
export { locationKey, locationRoute }
const blocksFor = (location: ReaderLocation) => catalog[location.kind]?.find(entry => entry.id === location.entityId && (location.kind !== 'trail' || entry.steps?.includes(location.stepId ?? '')))?.blocks ?? []
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localData))
    storageUnavailable.value = false
    return true
  } catch {
    storageUnavailable.value = true
    localStatus.value = 'This place could not be saved on this device. Reading data is temporary in this tab.'
    return false
  }
}
if (initial.notice && !storageFailed) persist()
export function retryStorage() {
  if (persist()) {
    if (dataNotice.value === 'Reading data is temporary in this tab because device storage is unavailable.') dataNotice.value = ''
    localStatus.value = 'Reading data saved on this device.'
  }
}
export function setAppearance(value: string) { localData.appearance = value; persist() }
export function describeLocation(location: ReaderLocation) {
  if (!available(location)) return `Unavailable saved place · ${location.entityId}${location.stepId ? ` / ${location.stepId}` : ''}`
  const labels = {
    concept: concept(location.entityId)?.title,
    foundation: `Optional foundations · ${concept(location.entityId)?.title}`,
    relation: relation(location.entityId) ? `${concept(relation(location.entityId)!.from)?.title} ${relation(location.entityId)!.type.replaceAll('-', ' ')} ${concept(relation(location.entityId)!.to)?.title}` : '',
    source: `Source context · §${Number(location.entityId.slice(1))}`,
    note: `Source note ${Number(location.entityId.slice(1))}`,
    read: 'Continuous reading',
    trail: `${trail(location.entityId)?.title} · ${concept(trail(location.entityId)?.steps.find(s => s.id === location.stepId)?.conceptId)?.title}`,
    trailEnd: `${trail(location.entityId)?.title} · ending`,
  }
  const block = location.blockId?.startsWith('read-p') ? ` · §${Number(location.blockId.slice(6))}` : location.blockId ? ` · ${location.blockId.replaceAll('-', ' ')}` : ''
  return `${labels[location.kind]}${block}`
}
export function routeLocation(route: RouteLocationNormalized): ReaderLocation | null {
  let location: ReaderLocation | null = null
  const base = { offset: 0 }
  if (route.path === '/en/read') location = { ...base, kind: 'read', entityId: 'continuous', ...(typeof route.query.at === 'string' ? { blockId: route.query.at } : {}) }
  else if (route.params.conceptId) location = { ...base, kind: route.path.includes('/foundations/') ? 'foundation' : 'concept', entityId: String(route.params.conceptId) }
  else if (route.params.relationId) location = { ...base, kind: 'relation', entityId: String(route.params.relationId) }
  else if (route.params.paragraphId) location = { ...base, kind: 'source', entityId: String(route.params.paragraphId) }
  else if (route.params.noteId) location = { ...base, kind: 'note', entityId: String(route.params.noteId) }
  else if (route.params.trailId) location = { ...base, kind: route.params.stepId ? 'trail' : 'trailEnd', entityId: String(route.params.trailId), ...(route.params.stepId ? { stepId: String(route.params.stepId) } : {}) }
  if (!location || !available(location)) return null
  if (location.blockId && !blocksFor(location).includes(location.blockId)) return null
  return location
}
export function enterLocation(route: RouteLocationNormalized) {
  activeLocation.value = routeLocation(route)
  if (!activeLocation.value) return
  const location = { ...activeLocation.value }
  localData.last = location
  localData.recent = [location, ...localData.recent.filter(item => locationKey(item, false) !== locationKey(location, false))].slice(0, LIMITS.recent)
  localData.visited = [location, ...localData.visited.filter(item => locationKey(item, false) !== locationKey(location, false))].slice(0, LIMITS.visited)
  persist()
}
export function captureLocation(blockId?: string): ReaderLocation | null {
  if (!activeLocation.value) return null
  const location = { ...activeLocation.value }
  const block = blockId ? document.getElementById(blockId) : [...document.querySelectorAll<HTMLElement>('main [data-reading-block]')].filter(block => block.getBoundingClientRect().top <= 120 && block.getBoundingClientRect().bottom > 0).at(-1)
  if (block && blocksFor(location).includes(block.id)) {
    location.blockId = block.id
    location.offset = Math.min(LIMITS.offset, Math.max(0, Math.round(-block.getBoundingClientRect().top)))
  }
  return location
}
export function settleLocation() {
  const location = captureLocation()
  if (!location) return
  localData.last = location
  const recent = localData.recent.findIndex(item => locationKey(item, false) === locationKey(location, false))
  if (recent >= 0) localData.recent[recent] = location
  persist()
}
export function savedIndex(location: ReaderLocation) { return localData.saved.findIndex(item => locationKey(item) === locationKey(location)) }
export function toggleSaved(blockId?: string) {
  const location = captureLocation(blockId)
  if (!location) return
  const index = savedIndex(location)
  if (index >= 0) { removeSaved(index); return }
  if (localData.saved.length >= LIMITS.saved) { localStatus.value = 'You have 50 saved places. Remove a place before saving another.'; return }
  undoSaved.value = null
  localData.saved.unshift(location)
  localData.last = location
  const stored = persist()
  if (stored) localStatus.value = 'Saved on this device.'
}
export function removeSaved(index: number) {
  const [location] = localData.saved.splice(index, 1)
  if (!location) return
  undoSaved.value = { location, index }
  const stored = persist()
  if (stored) localStatus.value = 'Saved place removed. You can Undo this removal.'
}
export function undoRemoval() {
  if (!undoSaved.value) return
  const { location, index } = undoSaved.value
  localData.saved.splice(index, 0, location)
  undoSaved.value = null
  const stored = persist()
  if (stored) localStatus.value = 'Saved place restored.'
}
export function clearLocalData() {
  Object.assign(localData, newReadingState(revision, edition))
  undoSaved.value = null
  dataNotice.value = ''
  activeLocation.value = null
  try { localStorage.removeItem(STORAGE_KEY); storageUnavailable.value = false; localStatus.value = 'Local reading data cleared.' }
  catch { storageUnavailable.value = true; localStatus.value = 'Temporary reading data cleared. Device storage is unavailable.' }
}
export function wasVisited(kind: ReaderLocation['kind'], entityId: string, stepId?: string) {
  return localData.visited.some(item => item.kind === kind && item.entityId === entityId && item.stepId === stepId)
}
