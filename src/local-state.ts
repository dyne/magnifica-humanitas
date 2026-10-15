import { formatSavedBlock } from '../scripts/messages.mjs'
import { activeLocale, localePath, number } from './locale'
import { t, messages } from './messages'
import { reactive, ref } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import { concepts, relations, trails, edition, revision, concept, relation, trail, relationLabel } from './reading'
import { STORAGE_KEY, LIMITS, decodeReadingState, isAvailable, locationKey, locationRoute as savedLocationRoute, newReadingState } from '../scripts/reading-state.mjs'
import type { ReaderLocation, LocationCatalog } from '../scripts/reading-state.mjs'
export type { ReaderLocation }
const conceptBlocks = (id: string) => { const c = concept(id)!; return [`${id}-idea`, `${id}-distinction`, `${id}-connections`, ...c.reasoning.map(b => b.id!)] }
export let catalog: LocationCatalog = {}
function createCatalog(): LocationCatalog { return {
  concept: concepts.map(c => ({ id: c.id, blocks: conceptBlocks(c.id) })),
  foundation: concepts.filter(c => c.foundation).map(c => ({ id: c.id })),
  relation: relations.map(r => ({ id: r.id })),
  source: Array.from({ length: 245 }, (_, i) => ({ id: `p${String(i + 1).padStart(3, '0')}` })),
  note: Array.from({ length: 224 }, (_, i) => ({ id: `n${String(i + 1).padStart(3, '0')}` })),
  read: [{ id: 'continuous', blocks: [...Array.from({ length: 245 }, (_, i) => `read-p${String(i + 1).padStart(3, '0')}`), ...concepts.flatMap(c => conceptBlocks(c.id))] }],
  trail: trails.flatMap(t => t.steps.map(s => ({ id: t.id, steps: [s.id], blocks: conceptBlocks(s.conceptId) }))),
  trailEnd: trails.map(t => ({ id: t.id })),
} }

export const localData = reactive(newReadingState('', ''))
export const storageUnavailable = ref(false)
export const dataNotice = ref('')
let stateLocale = ''
// Failed writes must survive edition changes for the lifetime of this tab.
const temporaryStates = new Map<string, string>()
const storageKey = () => activeLocale.value === 'en' ? STORAGE_KEY : `${STORAGE_KEY}-${activeLocale.value}`
export function initializeReadingState() {
  if (stateLocale === activeLocale.value) return
  catalog = createCatalog()
  stateLocale = activeLocale.value
  try {
    const temporary = temporaryStates.get(stateLocale)
    const initial = decodeReadingState(temporary ?? localStorage.getItem(storageKey()), revision, edition, catalog, activeLocale.value, messages.value)
    Object.assign(localData, initial.state)
    dataNotice.value = temporary ? t('state.temporary') : initial.notice
    storageUnavailable.value = temporary !== undefined
  } catch {
    Object.assign(localData, newReadingState(revision, edition, activeLocale.value))
    storageUnavailable.value = true
    dataNotice.value = t('state.temporary')
  }
  if (dataNotice.value && !storageUnavailable.value) persist()
  undoSaved.value = null
  localStatus.value = ''
}
export const localStatus = ref('')
export const activeLocation = ref<ReaderLocation | null>(null)
export const undoSaved = ref<{ location: ReaderLocation; index: number } | null>(null)
export const available = (location: ReaderLocation) => isAvailable(location, catalog)
export { locationKey }
export const locationRoute = (location: ReaderLocation) => savedLocationRoute(location, activeLocale.value)
const blocksFor = (location: ReaderLocation) => catalog[location.kind]?.find(entry => entry.id === location.entityId && (location.kind !== 'trail' || entry.steps?.includes(location.stepId ?? '')))?.blocks ?? []
function persist() {
  const raw = JSON.stringify(localData)
  temporaryStates.set(activeLocale.value, raw)
  try {
    localStorage.setItem(storageKey(), raw)
    temporaryStates.delete(activeLocale.value)
    storageUnavailable.value = false
    return true
  } catch {
    storageUnavailable.value = true
    localStatus.value = t('state.save_failed')
    return false
  }
}

export function retryStorage() {
  if (persist()) {
    if (dataNotice.value === t('state.temporary')) dataNotice.value = ''
    localStatus.value = t('state.persisted')
  }
}
export function setAppearance(value: string) { localData.appearance = value; persist() }
export function describeLocation(location: ReaderLocation) {
  if (!available(location)) return t('state.unavailable', { id: location.entityId, step: location.stepId ? ` / ${location.stepId}` : '' })
  const labels = {
    concept: concept(location.entityId)?.title,
    foundation: t('state.foundation', { title: concept(location.entityId)?.title }),
    relation: relation(location.entityId) ? `${concept(relation(location.entityId)!.from)?.title} ${relationLabel(relation(location.entityId)!.type)} ${concept(relation(location.entityId)!.to)?.title}` : '',
    source: t('state.source', { number: number(Number(location.entityId.slice(1))) }),
    note: t('state.note', { number: number(Number(location.entityId.slice(1))) }),
    read: t('state.read'),
    trail: `${trail(location.entityId)?.title} · ${concept(trail(location.entityId)?.steps.find(s => s.id === location.stepId)?.conceptId)?.title}`,
    trailEnd: t('state.end', { title: trail(location.entityId)?.title }),
  }
  const block = location.blockId ? ` · ${formatSavedBlock(location.blockId, concepts, activeLocale.value, messages.value)}` : ''
  return `${labels[location.kind]}${block}`
}
export function routeLocation(route: RouteLocationNormalized): ReaderLocation | null {
  let location: ReaderLocation | null = null
  const base = { offset: 0 }
  if (route.path === localePath('/read')) location = { ...base, kind: 'read', entityId: 'continuous', ...(typeof route.query.at === 'string' ? { blockId: route.query.at } : {}) }
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
  if (localData.saved.length >= LIMITS.saved) { localStatus.value = t('state.limit'); return }
  undoSaved.value = null
  localData.saved.unshift(location)
  localData.last = location
  const stored = persist()
  if (stored) localStatus.value = t('state.saved')
}
export function removeSaved(index: number) {
  const [location] = localData.saved.splice(index, 1)
  if (!location) return
  undoSaved.value = { location, index }
  const stored = persist()
  if (stored) localStatus.value = t('state.removed')
}
export function undoRemoval() {
  if (!undoSaved.value) return
  const { location, index } = undoSaved.value
  localData.saved.splice(index, 0, location)
  undoSaved.value = null
  const stored = persist()
  if (stored) localStatus.value = t('state.restored')
}
export function clearLocalData() {
  Object.assign(localData, newReadingState(revision, edition, activeLocale.value))
  undoSaved.value = null
  dataNotice.value = ''
  activeLocation.value = null
  try { localStorage.removeItem(storageKey()); temporaryStates.delete(activeLocale.value); storageUnavailable.value = false; localStatus.value = t('state.cleared') }
  catch { temporaryStates.set(activeLocale.value, JSON.stringify(localData)); storageUnavailable.value = true; localStatus.value = t('state.cleared_temporary') }
}
export function wasVisited(kind: ReaderLocation['kind'], entityId: string, stepId?: string) {
  return localData.visited.some(item => item.kind === kind && item.entityId === entityId && item.stepId === stepId)
}
