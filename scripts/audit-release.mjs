// Read-only release audit; its JSON report is generated evidence, never authored content.
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, relative, dirname, join } from 'node:path'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { availableLocales } from './locales.mjs'
import { loadReadingInputs, validateReading } from './reading-content.mjs'
import { validateMessages } from './messages.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const artifact = resolve(process.argv[2] ?? join(root, 'dist'))
const destination = resolve(process.argv[3] ?? join(root, 'output/release/audit.json'))
const read = path => readFileSync(resolve(root, path))
const json = path => JSON.parse(read(path))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const hash = path => sha(read(path))
const inventory = path => readdirSync(path).sort().flatMap(name => {
  const item = join(path, name)
  return statSync(item).isDirectory() ? inventory(item) : [item]
})
assert.deepEqual(availableLocales.map(l => l.id).sort(), ['ar', 'be', 'de', 'en', 'es', 'fr', 'it', 'pl', 'pt', 'ru'])
const editions = availableLocales.map(({ id }) => {
  const inputs = loadReadingInputs(id)
  assert.deepEqual(validateReading(inputs), [], `${id}: content validation`)
  const readingPath = `content/reading/${id}.json`, catalogPath = `content/messages/${id}.json`
  assert.deepEqual(validateMessages(json(catalogPath)), [], `${id}: messages`)
  const counts = Object.fromEntries(['concepts', 'relations', 'contexts', 'readingSequence', 'reviewedNotes', 'trails'].map(key => [key, inputs.reading[key].length]))
  const entry = { locale: id, editionId: inputs.reading.editionId, revision: inputs.reading.revision, counts,
    readingSha256: hash(readingPath), catalogSha256: hash(catalogPath), corpusSha256: hash(`content/source/${id}/corpus.json`) }
  const longest = items => [...items].sort((a, b) => [...b.title].length - [...a.title].length)[0]
  entry.longestTitles = Object.fromEntries(['concepts', 'trails'].map(group => {
    const { id, title } = longest(inputs.reading[group])
    return [group, { id, title, codePoints: [...title].length }]
  }))
  if (id === 'en') {
    entry.sourceManifest = { path: 'research/source-manifest.json', sha256: hash('research/source-manifest.json') }
    entry.reviewRecords = ['content/reading/SEMANTIC-REVIEW.md', 'content/reading/TRAIL-REVIEW.md'].map(path => ({ path, sha256: hash(path) }))
    entry.ownerInputs = json('research/source-manifest.json').inputs.map(input => {
      const path = resolve(root, '..', input.workspacePath)
      if (existsSync(path)) assert.equal(sha(readFileSync(path)), input.sha256, `Owner original: ${input.workspacePath}`)
      return { name: input.workspacePath, expectedSha256: input.sha256, availableAndMatched: existsSync(path) }
    })
  } else {
    const prefix = `content/editorial/${id}`
    const alignment = json(`${prefix}/alignment-review.json`), semantic = json(`${prefix}/semantic-review.json`), ui = json(`${prefix}/interface-review.json`)
    for (const review of [alignment, semantic, ui]) {
      assert.equal(review.locale, id)
      if (review.editionId) assert.equal(review.editionId, entry.editionId)
      if (review.sourceHtmlSha256) assert.equal(review.sourceHtmlSha256, hash(`content/source/${id}/official.html`))
    }
    assert.equal(semantic.revision, entry.revision)
    assert.equal(ui.readingRevision, entry.revision)
    assert.equal(ui.catalogSha256, entry.catalogSha256)
    if (ui.readingSha256) assert.equal(ui.readingSha256, entry.readingSha256)
    for (const [path, expected] of Object.entries(semantic.artifacts)) assert.equal(hash(path), expected, `Review artifact: ${path}`)
    assert.equal(alignment.coverage.length, inputs.corpus.paragraphs.length)
    assert.equal(alignment.terms.length, counts.concepts)
    assert.equal(alignment.notes.length, inputs.corpus.footnotes.length)
    assert.equal(semantic.notes.length, counts.reviewedNotes)
    entry.reviewCounts = { alignedParagraphs: alignment.coverage.length, terms: alignment.terms.length,
      alignedNotes: alignment.notes.length, publicBlocks: semantic.blocks.length, reviewedNotes: semantic.notes.length }
    entry.reviewRecords = ['alignment-review', 'semantic-review', 'interface-review'].map(name => ({ path: `${prefix}/${name}.json`, sha256: hash(`${prefix}/${name}.json`), historicalStatus: json(`${prefix}/${name}.json`).status ?? null }))
    const manifestPath = `content/source/${id}/manifest.json`, manifest = json(manifestPath)
    assert.equal(manifest.locale, id)
    assert.equal(manifest.selectedFormat, 'HTML')
    for (const item of manifest.artifacts) {
      const bytes = read(`content/source/${id}/${item.path}`)
      assert.equal(sha(bytes), item.sha256)
      assert.equal(bytes.length, item.bytes)
    }
    entry.sourceManifest = { path: manifestPath, sha256: hash(manifestPath), canonicalUrl: manifest.canonicalUrl, selectedFormat: manifest.selectedFormat,
      artifacts: manifest.artifacts.map(({ path, sha256, bytes, finalUrl }) => ({ path, sha256, bytes, finalUrl })) }
  }
  return entry
})

const files = inventory(artifact).map(path => {
  const bytes = readFileSync(path), name = relative(artifact, path).split('\\').join('/')
  assert(!name.endsWith('.org') && !name.includes('.gestalt/'), `Coordination file in artifact: ${name}`)
  if (name.endsWith('.js')) {
    assert(!name.includes('-qps-') && !bytes.includes(Buffer.from('nonshipping-rtl-fixture')), `Synthetic locale in artifact: ${name}`)
  }
  return { path: name, bytes: bytes.length, sha256: sha(bytes), ...(name.endsWith('.js') ? { gzipBytes: gzipSync(bytes).length } : {}) }
})
for (const edition of editions) {
  edition.chunks = ['reading-library', 'reading-messages', 'reading-sequence', 'reviewed-reading-context'].map(resource => {
    const matches = files.filter(file => file.path.startsWith(`assets/_virtual_${resource}-${edition.locale}-`) && file.path.endsWith('.js'))
    assert.equal(matches.length, 1, `${edition.locale}: exactly one ${resource} chunk`)
    return matches[0]
  })
}
const notices = ['NOTICE.txt', ...inventory(join(root, 'public/licenses')).map(path => relative(join(root, 'public'), path)), ...inventory(join(root, 'public/fonts')).map(path => relative(join(root, 'public'), path))]
for (const path of notices) assert.equal(sha(readFileSync(join(artifact, path))), hash(`public/${path}`), `Artifact notice/font: ${path}`)
const dependencyNotices = [
  ['Inter-OFL.txt', '@fontsource-variable/inter/LICENSE'], ['Syne-OFL.txt', '@fontsource/syne/LICENSE'],
  ['JetBrains-Mono-OFL.txt', '@fontsource/jetbrains-mono/LICENSE'],
  ['dyne-vite-theme-MIT.txt', '@dyne/vite-theme/LICENSE'], ['dyne-vite-theme-NOTICE.md', '@dyne/vite-theme/NOTICE.md'],
].map(([name, source]) => {
  const path = `public/licenses/${name}`, dependency = `node_modules/${source}`
  assert.equal(hash(path), hash(dependency), `Dependency notice: ${name}`)
  return { path, source: dependency, sha256: hash(path) }
})
const fontSources = ['@fontsource-variable/inter', '@fontsource/syne', '@fontsource/jetbrains-mono'].flatMap(name => inventory(join(root, 'node_modules', name, 'files')).filter(path => /\.woff2?$/.test(path)).map(path => ({ path: relative(root, path), sha256: sha(readFileSync(path)) })))
const bundledFonts = files.filter(file => /\.woff2?$/.test(file.path)).map(file => {
  const source = fontSources.find(font => font.sha256 === file.sha256)
  assert(source, `Bundled font differs from pinned dependency: ${file.path}`)
  return { ...file, source: source.path }
})
const report = { schemaVersion: 1, observedAt: new Date().toISOString(), artifact: relative(root, artifact), editions, files,
  noticesMatchedByteForByte: notices, dependencyNotices, bundledFonts, limitations: ['Structural and hash audit only; no new semantic or native-speaker review.', 'Historical review statuses are preserved; acceptance belongs to the supervised review workflow.', 'Local artifact audit does not establish deployment or publication.'] }
mkdirSync(dirname(destination), { recursive: true })
writeFileSync(destination, JSON.stringify(report, null, 2) + '\n')
console.log(`PASS: ${editions.length} editions, ${editions.length * 4} locale chunks, ${files.length} artifact files; notices/fonts match. Report: ${relative(root, destination)}`)
