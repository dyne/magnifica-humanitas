import { test, expect } from '@playwright/test'
const enHeading = 'Explore the ideas in Magnifica Humanitas'
for (const width of [390, 1440]) for (const size of ['100', '200']) {
  test(`nonshipping RTL surfaces ${width} text ${size}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('./#/qps/atlas')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('.fixture-notice')).toContainText('Nonshipping RTL test fixture')
    await page.locator('#text-size').selectOption(size)
    await page.locator('header').screenshot({ path: `output/locale-layout/rtl-${width}-${size}-selector.png` })
    for (const [name, route] of Object.entries({ atlas: 'atlas', read: 'read', source: 'source/p052', saved: 'saved', search: 'search?q=نص' })) {
      await page.goto(`./#/qps/${route}`)
      if (name === 'read') await expect(page.locator('#read-p052')).toBeAttached()
      if (name === 'source') await expect(page.locator('main')).toContainText('nonshipping-rtl-fixture')
      await page.locator('h1').scrollIntoViewIfNeeded()
      await page.evaluate(() => document.fonts.ready)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      expect(await page.locator('main').innerText()).not.toContain('Human dignity')
      await page.screenshot({ path: `output/locale-layout/rtl-${width}-${size}-${name}.png` })
    }
    // Chromium exposes which installed font actually painted the Arabic glyphs.
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('DOM.enable')
    await cdp.send('CSS.enable')
    const { root } = await cdp.send('DOM.getDocument')
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'h1' })
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
    expect(fonts.some(font => font.glyphCount > 0)).toBe(true)
    await test.info().attach('script-fonts', { body: JSON.stringify(fonts), contentType: 'application/json' })
  })
}

test('keyboard switching preserves equivalent query/anchor and selector focus; neutral entry rechecks browser', async ({ page }) => {
  await page.goto('./#/en/search?q=care#stable-anchor')
  await page.locator('#language').focus()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/qps\/search\?q=care#stable-anchor$/)
  await expect(page.locator('#language')).toBeFocused()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.keyboard.press('Home')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/en\/search\?q=care#stable-anchor$/)
  await expect(page.locator('#language')).toBeFocused()
  await page.goto('./')
  await expect(page).toHaveURL(/#\/en\/atlas$/)
})

test('failed language switch preserves the exact source title and reading state, then retries without old caller labels', async ({ page }) => {
  await page.goto('./#/en/concepts/dignity')
  await page.locator('.sources a').first().click()
  await expect(page.locator('h1')).toContainText('Source context · §')
  expect(await page.evaluate(() => history.state.mhCaller.label)).toBe('Human dignity')
  const title = await page.title()
  const path = page.url().split('#')[1]
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  await page.route(/reading-library-qps.*\.js/, route => route.abort())
  await page.locator('#language').selectOption('qps')
  await expect(page.locator('.local-status')).toContainText('This language could not load')
  await expect(page).toHaveTitle(title)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('#language')).toHaveValue('en')
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  expect(retained.last).toEqual(state.last)
  expect(retained.recent).toEqual(state.recent)
  expect(retained.visited).toEqual(state.visited)
  expect(retained.saved).toEqual(state.saved)
  await page.unroute(/reading-library-qps.*\.js/)
  await page.locator('#language').selectOption('qps')
  await expect(page).toHaveURL(new RegExp('#' + path.replace('/en/', '/qps/') + '$'))
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
})

test('pending source context cannot overwrite the edition after a rapid return switch', async ({ page }) => {
  await page.goto('./#/en/source/p052')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  let release!: () => void
  let requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reviewed-reading-context-qps.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('qps')
  await seen
  await page.locator('#language').selectOption('en')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  release()
  await expect(page).toHaveURL(/#\/en\/source\/p052$/)
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  await expect(page.locator('main')).not.toContainText('nonshipping-rtl-fixture')
})

test('choosing the current language cancels a still-pending switch before its library can publish', async ({ page }) => {
  await page.goto('./#/en/atlas')
  await expect(page.locator('h1')).toHaveText(enHeading)
  let release!: () => void
  let requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reading-library-qps.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('qps')
  await seen
  await page.locator('#language').selectOption('en')
  const response = page.waitForResponse(/reading-library-qps.*\.js/)
  release()
  await response
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(page).toHaveURL(/#\/en\/atlas$/)
  await expect(page.locator('h1')).toHaveText(enHeading)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('#language')).toHaveAttribute('aria-busy', 'false')
})


test('a cancelled slow language navigation cannot overwrite a newer concept title, current place or recent path', async ({ page }) => {
  await page.goto('./#/en/source/p052')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  let release!: () => void
  let requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reading-library-qps.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('qps')
  await seen
  await page.locator('#nav-atlas').click()
  await page.locator('#atlas-care').click()
  await expect(page.locator('h1')).toHaveText('Care and human presence')
  const title = await page.title()
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  const response = page.waitForResponse(/reading-library-qps.*\.js/)
  release()
  await response
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(page).toHaveURL(/#\/en\/concepts\/care$/)
  await expect(page).toHaveTitle(title)
  await expect(page.locator('h1')).toHaveText('Care and human presence')
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  expect(retained.last).toEqual(state.last)
  expect(retained.recent).toEqual(state.recent)
  expect(retained.visited).toEqual(state.visited)
  await page.getByRole('button', { name: 'Save this place', exact: true }).click()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  expect(saved.saved[0]).toMatchObject({ kind: 'concept', entityId: 'care' })
  expect(saved.last).toMatchObject({ kind: 'concept', entityId: 'care' })
  expect(saved.recent[0]).toMatchObject({ kind: 'concept', entityId: 'care' })
})

test('failed history traversal rolls back without suppressing subsequent reading-position capture', async ({ page }) => {
  await page.goto('./#/en/read')
  await expect(page.locator('#read-p001')).toBeAttached()
  // Model a restored session's previous locale entry without warming its module cache.
  // The current entry keeps Vue Router's existing position and location identity.
  await page.evaluate(() => {
    const current = { ...history.state }
    history.replaceState({ ...current, current: '/qps/source/p052', position: current.position - 1, back: null, forward: '/en/read' }, '', '#/qps/source/p052')
    history.pushState({ ...current, back: '/qps/source/p052' }, '', '#/en/read')
  })
  await page.route(/reading-library-qps.*\.js/, route => route.abort())
  await page.goBack()
  await expect(page.locator('.local-status')).toContainText('This language could not load')
  await expect(page).toHaveURL(/#\/en\/read$/)
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await page.locator('#read-p052').evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 16))
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!).last.blockId)).toBe('read-p052')
  await page.locator('#read-p052').getByRole('button', { name: 'Save this paragraph' }).click()
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  expect(state.saved[0]).toMatchObject({ kind: 'read', entityId: 'continuous', blockId: 'read-p052' })
})

test('duplicating the current route cancels an outstanding language activation without changing its edition', async ({ page }) => {
  await page.goto('./#/en/atlas')
  await expect(page.locator('h1')).toHaveText(enHeading)
  let release!: () => void
  let requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reading-library-qps.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('qps')
  await seen
  await page.locator('#nav-atlas').click()
  const response = page.waitForResponse(/reading-library-qps.*\.js/)
  release()
  await response
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(page).toHaveURL(/#\/en\/atlas$/)
  await expect(page.locator('h1')).toHaveText(enHeading)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('#language')).toHaveValue('en')
})
