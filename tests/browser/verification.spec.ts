import { test, expect } from '@playwright/test'
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import reading from '../../content/reading/en.json' with { type: 'json' }

const require = createRequire(import.meta.url)
const kind = process.env.VITE_BASE === '/' ? 'root' : 'subpath'
const directory = `${process.env.RELEASE_EVIDENCE_DIR ?? 'output/playwright/l6'}/${kind}`
const surfaces = ['atlas', 'concepts/dignity', 'relations/rel-002', 'source/p052', 'notes/n174', 'foundations/dignity', 'trails', 'trails/worth-not-reward/steps/intrinsic-worth', 'trails/worth-not-reward/end', 'search?q=dignity', 'read?at=read-p176', 'saved', 'about']
mkdirSync(directory, { recursive: true })

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 1000 }]) {
  test(`release screenshot and semantics matrix ${viewport.width}`, async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const matrix = []
    for (const surface of surfaces) {
      await page.goto(`./#/en/${surface}`)
      await expect(page.locator('main h1')).toHaveCount(1)
      await expect(page.locator('main h1')).not.toHaveText('This link is unavailable')
      if (surface.startsWith('read?')) await expect(page.locator('article[data-reading-block]')).toHaveCount(245)
      if (surface.startsWith('source/')) await expect(page.locator('main h1')).toHaveText('Source context · §52')
      if (surface === 'about') await expect(page.getByText(/The complete reading includes 27 concepts, six finite trails/)).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      for (const appearance of ['light', 'dark']) for (const textSize of ['100', '200']) {
        await page.getByLabel('Appearance', { exact: true }).selectOption(appearance)
        await page.getByLabel('Text size', { exact: true }).selectOption(textSize)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        expect(await page.locator('main').count()).toBe(1)
        expect(await page.locator('[tabindex]').evaluateAll(nodes => nodes.filter(node => Number(node.getAttribute('tabindex')) > 0).length)).toBe(0)
        await page.locator('main h1').scrollIntoViewIfNeeded()
        const artifact = `${directory}/${surface.replaceAll(/[^a-z0-9-]/g, '-')}-${viewport.width}-${appearance}-${textSize}.png`
        await page.screenshot({ path: artifact })
        matrix.push({ surface, viewport, appearance, textSize, artifact, overflow: false })
      }
      if (viewport.width === 390) writeFileSync(`${directory}/${surface.replaceAll(/[^a-z0-9-]/g, '-')}-semantics.yml`, await page.locator('main').ariaSnapshot())
    }
    writeFileSync(`${directory}/matrix-${viewport.width}.json`, JSON.stringify(matrix, null, 2))
  })
}

test('WCAG automated scans across representative routes and both themes', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 390, height: 844 })
  const results = []
  for (const surface of surfaces) for (const appearance of ['light', 'dark']) {
    await page.goto(`./#/en/${surface}`)
    await page.getByLabel('Appearance', { exact: true }).selectOption(appearance)
    await page.evaluate(() => document.fonts.ready)
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
    const result = await page.evaluate(async () => {
      const axe = (window as any).axe
      const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } })
      return { violations: result.violations, incomplete: result.incomplete.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) })), passed: result.passes.length }
    })
    results.push({ surface, appearance, ...result })
    writeFileSync(`${directory}/accessibility.json`, JSON.stringify(results, null, 2))
    expect(result.violations, `${surface} ${appearance}`).toEqual([])
  }
})

test('320px enlarged-text reflow and every relationship/foundation destination', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 320, height: 800 })
  for (const surface of surfaces) {
    await page.goto(`./#/en/${surface}`)
    await page.getByLabel('Text size', { exact: true }).selectOption('200')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  for (const relation of reading.relations) {
    await page.goto(`./#/en/relations/${relation.id}`)
    await expect(page.locator('main h1')).not.toHaveText('This link is unavailable')
    await expect(page.getByText(relation.explanation.text, { exact: true })).toBeAttached()
  }
  for (const concept of reading.concepts.filter(concept => concept.foundation)) {
    await page.goto(`./#/en/foundations/${concept.id}`)
    await expect(page.locator('main h1')).toContainText('Optional theological foundations')
  }
})

test('measured production entry, delayed chunks and long tasks', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => {
    ;(window as any).releaseLongTasks = []
    new PerformanceObserver(list => (window as any).releaseLongTasks.push(...list.getEntries().map(entry => ({ startTime: entry.startTime, duration: entry.duration })))).observe({ type: 'longtask', buffered: true })
  })
  const session = await page.context().newCDPSession(page)
  await session.send('Network.enable')
  await session.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 100_000 })
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('./#/en/atlas')
  await expect(page.locator('main h1')).toBeVisible()
  const entry = await page.evaluate(() => ({ navigation: performance.getEntriesByType('navigation')[0]?.toJSON(), paints: performance.getEntriesByType('paint').map(item => item.toJSON()), resources: performance.getEntriesByType('resource').map(item => item.toJSON()), longTasks: (window as any).releaseLongTasks }))
  expect(JSON.stringify(entry.resources)).not.toContain('_reading-sequence')
  expect(JSON.stringify(entry.resources)).not.toContain('_reviewed-reading-context')
  await page.route(/_reading-sequence.*\.js/, async route => { await new Promise(resolve => setTimeout(resolve, 1200)); await route.continue() })
  await page.goto('./#/en/read')
  await expect(page.getByRole('status').filter({ hasText: 'Loading the source-ordered adaptation' })).toBeVisible()
  await expect(page.locator('article[data-reading-block]')).toHaveCount(245)
  await page.goto('./#/en/source/p052')
  await expect(page.locator('main h1')).toHaveText('Source context · §52')
  const final = await page.evaluate(() => ({ longTasks: (window as any).releaseLongTasks, resources: performance.getEntriesByType('resource').map(item => item.toJSON()) }))
  const bundles = readdirSync('dist/assets').filter(name => name.endsWith('.js')).map(name => ({ name, bytes: readFileSync(`dist/assets/${name}`).length, gzipBytes: gzipSync(readFileSync(`dist/assets/${name}`)).length }))
  const initial = bundles.filter(bundle => bundle.name.startsWith('index-')).reduce((sum, bundle) => sum + bundle.gzipBytes, 0)
  expect(initial).toBeLessThanOrEqual(150 * 1024)
  expect(errors).toEqual([])
  writeFileSync(`${directory}/performance.json`, JSON.stringify({ measuredAt: new Date().toISOString(), browserName, browserVersion: page.context().browser()?.version(), node: process.version, throttling: { latencyMs: 150, downloadBytesPerSecond: 200_000, uploadBytesPerSecond: 100_000, cpuRate: 4 }, entry, final, bundles, initialGzipBytes: initial, errors }, null, 2))
})
