/// <reference types="vite/client" />
declare module 'virtual:locale-loaders' {
  const loaders: Record<string, Record<string, () => Promise<unknown>>>
  export default loaders
}
declare module 'virtual:locale-registry' {
  const locales: readonly (import('../scripts/locales.mjs').Locale & { lang?: string; fixture?: boolean })[]
  export default locales
}
