import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'
import { buildReadingIndex } from './scripts/reading-content.mjs'

const base = process.env.VITE_BASE ?? '/magnifica-humanitas/'
if (!base.startsWith('/') || !base.endsWith('/') || base.includes('..')) {
  throw new Error('VITE_BASE must be an absolute path ending in /')
}
export default defineConfig({
  plugins: [vue(), {
    name: 'reviewed-reading-context',
    resolveId(id) { if (id === 'virtual:reading-context') return '\0reviewed-reading-context' },
    load(id) { if (id === '\0reviewed-reading-context') return `export default ${JSON.stringify(buildReadingIndex())}` },
  }, {
    name: 'published-reading-delivery',
    resolveId(id) { if (['virtual:reading-library', 'virtual:reading-sequence'].includes(id)) return `\0${id.slice(8)}` },
    load(id) {
      if (!['\0reading-library', '\0reading-sequence'].includes(id)) return
      const path = new URL('./content/reading/en.json', import.meta.url)
      this.addWatchFile(path.pathname)
      const data = JSON.parse(readFileSync(path, 'utf8'))
      const published = id === '\0reading-sequence' ? data.readingSequence : {
        editionId: data.editionId, revision: data.revision,
        concepts: data.concepts, relations: data.relations, trails: data.trails,
      }
      return `export default ${JSON.stringify(published)}`
    },
  }], base,
})
