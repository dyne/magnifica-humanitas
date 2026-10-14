/// <reference types="vite/client" />
declare module 'virtual:reading-library' {
  const library: { editionId: string; revision: string; concepts: import('./reading-types').Concept[]; relations: import('./reading-types').Relation[]; trails: import('./reading-types').Trail[] }
  export default library
}
declare module 'virtual:reading-sequence' {
  const sequence: import('./reading-types').ReadingEntry[]
  export default sequence
}
declare module 'virtual:reading-context' {
  const index: import('./reading-types').ReadingContextIndex
  export default index
}
