import data from '../content/reading/en.json'
import type { Concept, Relation, Trail } from './reading-types'
export const edition = data.editionId
export const concepts: Concept[] = data.concepts
export const relations: Relation[] = data.relations
export const trails: Trail[] = data.trails
export const concept = (id: unknown) => concepts.find(c => c.id === id)
export const relation = (id: unknown) => relations.find(r => r.id === id)
export const trail = (id: unknown) => trails.find(t => t.id === id)
export const labelKind = (kind: string) => kind === 'paraphrase' ? 'Source-linked paraphrase' : 'Editorial interpretation'
export const paragraphLabel = (id: string) => `§${Number(id.slice(1))}`
