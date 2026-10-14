import type { Concept, Relation, Trail, ReadingEntry } from '../src/reading-types'
export interface SearchResult { id: string; type: string; title: string; preview: string; sourceRefs: string[]; to: string; rank: number }
export function normalizeQuery(value: unknown, locale?: string): string
export function searchPublished(library: { concepts: Concept[]; relations: Relation[]; trails: Trail[] }, sequence: ReadingEntry[], query: unknown, options?: { locale?: string; messages?: Record<string, string> }): SearchResult[]

export function relationLabel(type: string, messages?: Record<string, string>): string
