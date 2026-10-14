import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'
import { buildReadingIndex, loadReadingInputs, validateReading } from './scripts/reading-content.mjs'
import { availableLocales } from './scripts/locales.mjs'
import { createRtlFixture } from './tests/fixtures/rtl-runtime.mjs'
import { english, validateMessages } from './scripts/messages.mjs'

const base = process.env.VITE_BASE ?? '/magnifica-humanitas/'
if (!base.startsWith('/') || !base.endsWith('/') || base.includes('..')) throw new Error('VITE_BASE must be an absolute path ending in /')
export default defineConfig(({ mode }) => {
  const fixture = process.env.MAGNIFICA_RTL_FIXTURE === '1'
  if (fixture && mode !== 'locale-fixture') throw new Error('RTL fixtures require the explicit locale-fixture build mode')
  const locales = fixture ? [...availableLocales, { id: 'qps', autonym: 'اختبار RTL fixture', dir: 'rtl', lang: 'ar', fixture: true }] : availableLocales
  const inputs = fixture ? loadReadingInputs() : undefined
  const fixtureData = inputs ? createRtlFixture(inputs.reading, buildReadingIndex(inputs), english) : undefined
  return {
  plugins: [vue(), {
    name: 'published-locale-delivery',
    resolveId(id) { if (id === 'virtual:locale-registry' || id === 'virtual:locale-loaders' || /^virtual:reading-(library|sequence|context|messages)\/[a-z]{2,3}$/.test(id)) return `\0${id.replace('/', '-').replace('reading-context', 'reviewed-reading-context')}` },
    load(id) {
      if (id === '\0virtual:locale-registry') return `export default ${JSON.stringify(locales)}`
      if (id === '\0virtual:locale-loaders') return `export default {${locales.map(({ id }) => `${JSON.stringify(id)}: {${['library', 'sequence', 'context', 'messages'].map(resource => `${resource}: () => import('virtual:reading-${resource}/${id}')`).join(',')}}`).join(',')}}`
      const match = id.match(/^\0virtual:(?:reviewed-)?reading-(library|sequence|context|messages)-([a-z]{2,3})$/)
      if (!match) return
      const [, resource, locale] = match
      if (fixtureData && locale === 'qps') return `export default ${JSON.stringify(fixtureData[resource as keyof typeof fixtureData])}`
      if (!availableLocales.some(entry => entry.id === locale)) throw new Error(`Unreviewed locale ${locale}`)
      this.addWatchFile(new URL(`./content/reading/${locale}.json`, import.meta.url).pathname)
      this.addWatchFile(new URL(`./content/messages/${locale}.json`, import.meta.url).pathname)
      const editorial = locale === 'en' ? 'content/editorial' : `content/editorial/${locale}`
      for (const path of [`content/source/${locale}/corpus.json`, ...['coverage', 'concepts', 'relations'].map(name => `${editorial}/${name}.json`)]) this.addWatchFile(new URL(`./${path}`, import.meta.url).pathname)
      const inputs = loadReadingInputs(locale)
      const errors = validateReading(inputs)
      if (errors.length) throw new Error(errors.join('\n'))
      const messages = JSON.parse(readFileSync(new URL(`./content/messages/${locale}.json`, import.meta.url), 'utf8'))
      const messageErrors = validateMessages(messages)
      if (messageErrors.length) throw new Error(messageErrors.join('\n'))
      const data = inputs.reading
      const published = resource === 'context' ? buildReadingIndex(inputs) : resource === 'sequence' ? data.readingSequence : resource === 'messages' ? messages : {
        editionId: data.editionId, revision: data.revision, concepts: data.concepts, relations: data.relations, trails: data.trails,
      }
      return `export default ${JSON.stringify(published)}`
    },
  }], base, build: fixture ? { outDir: '/tmp/magnifica-locale-fixture-dist', emptyOutDir: true } : undefined,
  }
})
