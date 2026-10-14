import { reactive } from 'vue'
import loaders from 'virtual:locale-loaders'
import { createLocaleLoader } from '../scripts/locale-loader.mjs'
import { activeLocale, number, applyLocaleDocument } from './locale'
import { setMessages, t, type Messages, type MessageKey } from './messages'
import type { Concept, Relation, Trail } from './reading-types'
export interface ReadingLibrary { editionId: string; revision: string; concepts: Concept[]; relations: Relation[]; trails: Trail[] }
export let edition = ''
export let revision = ''
export const concepts = reactive<Concept[]>([])
export const relations = reactive<Relation[]>([])
export const trails = reactive<Trail[]>([])
export const delivery = createLocaleLoader(loaders)
export const cancelReadingActivation = () => delivery.cancelActivation()
export async function activateReading(locale: string) {
  return delivery.activate(locale, value => {
    if (edition && locale === activeLocale.value) return
    const library = value.library as ReadingLibrary
    setMessages(value.messages as Messages)
    applyLocaleDocument(locale)
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('metadata.description'))
    edition = library.editionId; revision = library.revision
    concepts.splice(0, concepts.length, ...library.concepts)
    relations.splice(0, relations.length, ...library.relations)
    trails.splice(0, trails.length, ...library.trails)
    activeLocale.value = locale
  })
}
export const concept = (id: unknown) => concepts.find(c => c.id === id)
export const relation = (id: unknown) => relations.find(r => r.id === id)
export const trail = (id: unknown) => trails.find(t => t.id === id)
export const labelKind = (kind: string) => t((kind === 'paraphrase' ? 'kind.paraphrase' : kind === 'editorial-scenario' ? 'kind.scenario' : 'kind.interpretation'))
export const paragraphLabel = (id: string) => `§${number(Number(id.slice(1)))}`
export const relationLabel = (type: string) => t(`relation.${type}` as MessageKey)
