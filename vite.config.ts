import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
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
  }], base,
})
