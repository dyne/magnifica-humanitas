import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const locales = ['en', 'it', 'de', 'es', 'fr', 'pt', 'pl', 'be', 'ru', 'ar']
const data = (locale: string) => JSON.parse(readFileSync(new URL(`../../content/reading/${locale}.json`, import.meta.url), 'utf8'))
const base = process.env.VITE_BASE === '/' ? 'root' : 'subpath'

for (const locale of locales) test(`${locale}: production atlas defers other libraries, source context and sequence`, async ({ page }) => {
  const requested: string[] = []
  page.on('request', request => requested.push(request.url()))
  await page.goto(`./#/${locale}/atlas`)
  await expect(page.locator('#atlas-dignity')).toBeVisible()
  const libraries = requested.filter(url => /reading-library-.*\.js/.test(url)).map(url => url.match(/reading-library-([a-z]+)-/)![1])
  expect(libraries).toEqual([locale])
  expect(requested.filter(url => /(?:reading-sequence|reviewed-reading-context)-.*\.js/.test(url))).toEqual([])
  await test.info().attach('entry-requests', { body: JSON.stringify(requested), contentType: 'application/json' })
})

// Longest public concept and trail titles by code-point count are recorded by
// the release audit. Include both Latin witnesses rather than choosing a locale
// from intuition; Arabic and Russian provide distinct shaping/wrapping cases.
for (const locale of ['ar', 'es', 'fr', 'ru']) for (const width of [390, 1440]) for (const size of ['100', '200']) {
  test(`release long-copy review ${locale} ${width} text ${size}`, async ({ page }) => {
    const reading = data(locale)
    const longest = <T extends { title: string }>(items: T[]) => [...items].sort((a, b) => [...b.title].length - [...a.title].length)[0]
    const concept = longest(reading.concepts) as { id: string; title: string }
    const trail = longest(reading.trails) as { id: string; title: string }
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`./#/${locale}/atlas`)
    await page.locator('#text-size').selectOption(size)
    const painted: unknown[] = []
    for (const [name, route, expected] of [
      ['concept', `concepts/${concept.id}`, concept.title],
      ['trails', 'trails', trail.title],
      ['ending', `trails/${trail.id}/end`, trail.title],
    ]) {
      await page.goto(`./#/${locale}/${route}`)
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
      await expect(page.locator('html')).toHaveCSS('font-size', size === '200' ? '32px' : '16px')
      await expect(page.locator('main')).toContainText(expected)
      await page.evaluate(() => document.fonts.ready)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.locator('h1').scrollIntoViewIfNeeded()
      await page.screenshot({ path: `output/release/visual/${base}-${locale}-${width}-${size}-${name}.png` })
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('DOM.enable'); await cdp.send('CSS.enable')
      const { root } = await cdp.send('DOM.getDocument')
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'h1' })
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
      expect(fonts.some(f => f.isCustomFont && f.glyphCount > 0)).toBe(true)
      expect(fonts.every(f => f.isCustomFont)).toBe(true)
      painted.push({ name, fonts })
      await cdp.detach()
      if (width === 390 && size === '100') {
        await page.addScriptTag({ content: axe })
        const violations = await page.evaluate(async () => {
          const result = await (window as unknown as { axe: { run: (options: unknown) => Promise<{ violations: { id: string; impact: string }[] }> } }).axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })
          return result.violations.map(({ id, impact }) => ({ id, impact }))
        })
        expect(violations, `${locale}/${route}`).toEqual([])
      }
    }
    await page.locator('#language').focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('#appearance')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('#text-size')).toBeFocused()
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
    await test.info().attach('long-copy-and-painted-fonts', { body: JSON.stringify({ locale, concept, trail, painted }), contentType: 'application/json' })
  })
}
