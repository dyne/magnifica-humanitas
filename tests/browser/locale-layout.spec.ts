import { test, expect } from '@playwright/test'
const routes = { atlas: 'atlas', read: 'read', source: 'source/p052', saved: 'saved', search: 'search?q=dignity' }
for (const width of [390, 1440]) for (const size of ['100', '200']) {
  test(`English locale surfaces ${width} text ${size}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('./#/en/atlas')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    await expect(page.locator('#language option')).toHaveText(['English'])
    await page.locator('#language').focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('#appearance')).toBeFocused()
    await page.locator('#text-size').selectOption(size)
    await page.locator('header').screenshot({ path: `output/locale-layout/en-${width}-${size}-selector.png` })
    for (const [name, route] of Object.entries(routes)) {
      await page.goto(`./#/en/${route}`)
      if (name === 'read') await expect(page.locator('#read-p052')).toBeAttached()
      if (name === 'source') await expect(page.locator('h1')).toHaveText('Source context · §52')
      await page.locator('h1').scrollIntoViewIfNeeded()
      await page.evaluate(() => document.fonts.ready)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: `output/locale-layout/en-${width}-${size}-${name}.png` })
    }
  })
}
