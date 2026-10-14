export interface ReaderLocation { kind: 'concept' | 'relation' | 'foundation' | 'source' | 'note' | 'read' | 'trail' | 'trailEnd'; entityId: string; stepId?: string; blockId?: string; offset: number }
export interface ReadingState { schemaVersion: number; contentRevision: string; locale: string; edition: string; last: ReaderLocation | null; saved: ReaderLocation[]; recent: ReaderLocation[]; visited: ReaderLocation[]; appearance: string }
export type LocationCatalog = Record<string, { id: string; blocks?: string[]; steps?: string[] }[]>
export const STORAGE_KEY: string
export const LIMITS: { saved: number; recent: number; visited: number; offset: number; bytes: number }
export function newReadingState(revision: string, edition: string): ReadingState
export function locationKey(location: ReaderLocation, includeBlock?: boolean): string
export function validLocationShape(location: unknown): boolean
export function isAvailable(location: ReaderLocation, catalog: LocationCatalog): boolean
export function hasBlock(location: ReaderLocation, catalog: LocationCatalog): boolean
export function decodeReadingState(raw: string | null, revision: string, edition: string, catalog: LocationCatalog): { state: ReadingState; notice: string }
export function locationRoute(location: ReaderLocation): string
