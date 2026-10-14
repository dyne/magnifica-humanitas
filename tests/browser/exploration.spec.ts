import { test, expect } from '@playwright/test'
import reading from '../../content/reading/en.json' with { type: 'json' }
const baseKind = process.env.VITE_BASE === '/' ? 'root' : 'subpath'

test('all Question regions concepts and directed relationships have keyboard destinations', async ({ page }) => {
  await page.goto('./#/en/atlas')
  expect(await page.locator('.regions .concept-links a').count()).toBe(27)
  for (const c of reading.concepts) await expect(page.locator(`#atlas-${c.id}`)).toHaveAttribute('href', new RegExp(`/en/concepts/${c.id}$`))
  expect(await page.locator('.relationships > li').count()).toBe(44)
  for (const r of reading.relations) {
    await expect(page.locator(`#atlas-relation-${r.id}`)).toHaveAttribute('href', new RegExp(`/en/relations/${r.id}$`))
    if (r.placement === 'optional-foundations') await expect(page.locator(`[data-relation="${r.id}"]`)).toContainText('Optional theological foundations')
  }
  await page.getByLabel('Focus on a concept').selectOption('dignity')
  const edges = reading.relations.filter(r => r.from === 'dignity' || r.to === 'dignity')
  expect(await page.locator('.relationships > li').count()).toBe(edges.length)
  const diagram = page.locator('svg a')
  expect(await diagram.count()).toBe(edges.length)
  for (const r of edges) {
    expect(await page.locator(`svg a[data-relation="${r.id}"]`).getAttribute('href')).toBe(await page.locator(`#atlas-relation-${r.id}`).getAttribute('href'))
    await expect(page.locator(`svg a[data-relation="${r.id}"]`)).toHaveAttribute('tabindex', '-1')
  }
  await page.locator('#atlas-relation-rel-002').focus(); await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Human dignity grounds Human rights')
  await page.goBack(); await expect(page.locator('#atlas-relation-rel-002')).toBeFocused()
  await expect(page.getByLabel('Focus on a concept')).toHaveValue('dignity')
})

test('search query, glossary, paragraph lookup, no-results and clear survive history', async ({ page }) => {
  await page.goto('./#/en/search')
  await expect(page.getByText(/Try “dignity”/)).toBeVisible()
  const input = page.getByLabel('Term or paragraph number')
  await input.pressSequentially('DÍGNITY', { delay: 40 }); await expect(input).toBeFocused()
  await expect(input).toHaveValue('DÍGNITY'); await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.locator('#search-concept-dignity').focus(); await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Human dignity')
  await page.goBack(); await expect(page.locator('#search-concept-dignity')).toBeFocused()
  await expect(input).toHaveValue('DÍGNITY')
  await input.fill('§176')
  await page.locator('#search-read-p176').click()
  await expect(page.locator('#read-p176')).toBeFocused()
  await page.goBack(); await expect(page.locator('#search-read-p176')).toBeFocused()
  await input.fill('zz-unmatched-term-zz'); await expect(page.getByText('No results for this query.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear search' }).click(); await expect(input).toHaveValue(''); await expect(input).toBeFocused()
  await expect(page.getByText(/Try “dignity”/)).toBeVisible()
  await input.fill('subsidiarity'); await page.reload(); await expect(page.locator('#search-concept-subsidiarity')).toBeVisible()
})

test('complete source-ordered adaptation preserves main, context and foundation destinations', async ({ page }) => {
  await page.goto('./#/en/read?at=read-p245')
  await expect(page.locator('#read-p245')).toBeFocused()
  expect(await page.locator('article[data-placement="main"]').count()).toBe(203)
  expect(await page.locator('article[data-placement="optional-context"]').count()).toBe(42)
  expect(await page.locator('article[data-placement]').evaluateAll(items => items.map(item => item.id))).toEqual(reading.readingSequence.map(b => b.id))
  for (const b of reading.readingSequence) {
    await expect(page.locator(`#${b.id}-context`)).toHaveAttribute('href', new RegExp(`/en/source/${b.contextId}$`))
    if (b.explanation) await expect(page.getByText(b.explanation.text, { exact: true })).toBeAttached()
    if (b.foundationContextId && b.placement === 'main') await expect(page.locator(`#${b.id}-foundation`)).toHaveAttribute('href', new RegExp(`/en/source/${b.foundationContextId}$`))
  }
  await page.reload(); await expect(page.locator('#read-p245')).toBeFocused()
  await page.locator('#read-p245-context').click(); await expect(page.getByRole('heading', { level: 1 })).toHaveText('Source context · §245')
  await page.getByRole('link', { name: 'Return to Read continuously', exact: true }).click(); await expect(page.locator('#read-p245-context')).toBeFocused()
})

test('deferred reading/search failure recovers without losing access to concepts', async ({ page }) => {
  await page.route(/reading-sequence.*\.js/, route => route.abort())
  await page.goto('./#/en/read?at=read-p052')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Continuous reading could not load')
  await page.unroute(/reading-sequence.*\.js/)
  await page.getByRole('button', { name: 'Retry continuous reading' }).click()
  await expect(page.locator('#read-p052')).toBeFocused()
})

test('failed paragraph search keeps glossary usable and retries with the query intact', async ({ page }) => {
  await page.route(/reading-sequence.*\.js/, route => route.abort())
  await page.goto('./#/en/search?q=subsidiarity')
  await expect(page.getByText(/Adapted paragraph search could not load/)).toBeVisible()
  await expect(page.locator('#search-concept-subsidiarity')).toBeVisible()
  await page.unroute(/reading-sequence.*\.js/)
  await page.getByRole('button', { name: 'Retry paragraph search' }).click()
  await expect(page.getByLabel('Term or paragraph number')).toBeFocused()
  await page.getByLabel('Term or paragraph number').fill('§52')
  await expect(page.locator('#search-read-p052')).toBeVisible()
})

test('atlas entry does not request inactive paragraph or source content', async ({ page }) => {
  const requested: string[] = []
  page.on('request', request => requested.push(request.url()))
  await page.goto('./#/en/atlas')
  await expect(page.locator('#atlas-history')).toBeVisible()
  expect(requested.filter(url => /reading-sequence|reviewed-reading-context/.test(url))).toEqual([])
})

for (const viewport of [{ width: 360, height: 800 }, { width: 1440, height: 1000 }]) {
  test(`exploration matrix ${viewport.width} both appearances and enlarged text`, async ({ page }) => {
    await page.setViewportSize(viewport)
    for (const surface of ['atlas?focus=dignity', 'search?q=subsidiarity', 'read?at=read-p176']) {
      await page.goto(`./#/en/${surface}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      if (surface.startsWith('search')) await expect(page.locator('#search-concept-subsidiarity')).toBeVisible()
      if (surface.startsWith('read')) await expect(page.locator('#read-p176')).toBeFocused()
      for (const size of ['100', '200']) for (const appearance of ['light', 'dark']) {
        await page.getByLabel('Text size', { exact: true }).selectOption(size)
        await page.getByLabel('Appearance', { exact: true }).selectOption(appearance)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        await page.evaluate(() => document.fonts.ready)
        await page.evaluate(() => scrollTo(0, 0))
        await page.screenshot({ path: `output/l5/l51/${surface.split('?')[0]}-${baseKind}-${viewport.width}-${size}-${appearance}.png`, fullPage: !surface.startsWith('read') })
        if (surface.startsWith('atlas')) {
          if (viewport.width === 1440) await page.locator('.neighborhood-diagram summary').click()
          await page.locator('#connections').scrollIntoViewIfNeeded()
          await page.screenshot({ path: `output/l5/l51/neighborhood-${baseKind}-${viewport.width}-${size}-${appearance}.png` })
          if (viewport.width === 1440) await page.locator('.neighborhood-diagram summary').click()
        }
        if (surface.startsWith('read')) {
          await page.locator('#read-p176').scrollIntoViewIfNeeded()
          await page.screenshot({ path: `output/l5/l51/paragraph-${baseKind}-${viewport.width}-${size}-${appearance}.png` })
        }
      }
    }
  })
}
