import { test, expect } from '@playwright/test'
import reading from '../../content/reading/en.json' with { type: 'json' }

const baseKind = process.env.VITE_BASE === '/' ? 'root' : 'subpath'

test('source-linked reader, exact span, bibliographic note and named return', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('./#/en/concepts/dignity')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Human dignity')
  await expect(page.getByText('Moral conduct, social conditions and experienced worth can change; ontological dignity cannot be lost. The source grounds it in divine creation and love.', { exact: true })).toBeVisible()
  await page.locator('#dignity-idea-source-p052').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Source context · §52')
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
  await expect(page.getByText('These aspects of dignity can be enhanced or diminished.', { exact: true })).toBeVisible()
  await expect(page.getByText(/Original PDF page 12/)).toBeVisible()
  await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({ path: `output/source-${baseKind}-360.png`, fullPage: true })
  await page.locator('#p052-note-n061').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Source note 61')
  await expect(page.getByText('Cf. ibid., 8: AAS 116 (2024), 593-594.', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Open source note 60', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Source note 60')
  await page.goBack()
  await expect(page.locator('#n061-previous')).toBeFocused()
  await page.getByRole('link', { name: 'Return to Source context · §52', exact: true }).click()
  await expect(page).toHaveURL(/#\/en\/source\/p052$/)
  await expect(page.locator('#p052-note-n061')).toBeFocused()
  await page.getByRole('link', { name: 'Return to Human dignity', exact: true }).click()
  await expect(page.locator('#dignity-idea-source-p052')).toBeFocused()
  await page.locator('#dignity-foundation').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Optional theological foundations · Human dignity')
  await expect(page.getByText(/Attributed premises of Leo XIV/)).toBeVisible()
})

test('Back and Forward restore both invoking focus and settled scroll', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('./#/en/concepts/dignity')
  const link = page.locator('#dignity-dignity-participation-source-p154')
  await link.scrollIntoViewIfNeeded()
  const conceptTop = await page.evaluate(() => scrollY)
  await link.click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Source context · §154')
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
  await page.evaluate(() => scrollTo(0, 280))
  await page.waitForTimeout(150)
  const sourceTop = await page.evaluate(() => scrollY)
  expect(sourceTop).toBeGreaterThan(0)
  await page.goBack()
  await expect(link).toBeFocused()
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(conceptTop, 0)
  await page.goForward()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Source context · §154')
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(sourceTop, 0)
})

test('relationship direction and endpoint survive deep links and refresh', async ({ page }) => {
  await page.goto('./#/en/relations/rel-002')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Human dignity grounds Human rights')
  await page.reload()
  await page.getByRole('link', { name: 'Open Human rights', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Human rights')
  await expect(page.getByText(/life-from-conception-to-natural-end position/)).toBeVisible()
  await expect(page.getByText(/induced abortion, killing the innocent and euthanasia/)).toBeVisible()
  await page.goBack()
  await expect(page.locator('#rel-002-to')).toBeFocused()
})

test('finite authored trail reaches a real ending with optional exits and skip', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('./#/en/trails')
  await page.getByRole('link', { name: 'Start Why is worth not a reward?', exact: true }).click()
  await expect(page.getByText('Step 1 of 2 · Why is worth not a reward?', { exact: true })).toBeVisible()
  await page.screenshot({ path: `output/trail-${baseKind}-1440.png`, fullPage: true })
  await page.getByRole('link', { name: 'Open full concept: Human dignity', exact: true }).click()
  await page.getByRole('link', { name: 'Return to Human dignity', exact: true }).click()
  await expect(page).toHaveURL(/\/steps\/intrinsic-worth$/)
  await page.getByRole('link', { name: 'Skip this step', exact: true }).click()
  await expect(page.getByText('Step 2 of 2 · Why is worth not a reward?', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Previous: Human dignity', exact: true }).click()
  await page.getByRole('link', { name: 'Next: Human rights', exact: true }).click()
  await page.getByRole('link', { name: 'Reach the trail ending', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A place to stop')
  await expect(page.getByRole('link', { name: 'Human dignity', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Human rights', exact: true })).toBeVisible()
  await expect(page.getByText(/Visits are not evidence of understanding/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Restart this trail', exact: true })).toBeVisible()
})

test('continuous reading stable blocks and invalid links recover without substitution', async ({ page }) => {
  await page.goto('./#/en/read?at=rights-protection')
  await expect(page.locator('#rights-protection')).toBeFocused()
  await page.reload()
  await expect(page.locator('#rights-protection')).toBeFocused()
  await page.goto('./#/en/read?at=unknown-block')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This link is unavailable')
  await page.getByRole('link', { name: 'Start the opening reading', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Read the opening argument')
  for (const url of ['/en/source/p246', '/en/notes/n999', '/en/relations/missing', '/en/trails/worth-not-reward/steps/missing']) {
    await page.goto(`./#${url}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This link is unavailable')
  }
})

test('source chunk failure offers retry, original-source access and recovery', async ({ page }) => {
  await page.route(/reviewed-reading-context.*\.js/, route => route.abort())
  await page.goto('./#/en/source/p052')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Source context could not load')
  await expect(page.getByRole('button', { name: 'Retry source context', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Read the full original at the Holy See', exact: true })).toBeVisible()
  await page.unroute(/reviewed-reading-context.*\.js/)
  await page.getByRole('button', { name: 'Retry source context', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Source context · §52')
})

for (const viewport of [{ width: 360, height: 800 }, { width: 1440, height: 1000 }, { width: 320, height: 800 }]) {
  test(`reader reflow, text settings and keyboard ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const failures: string[] = []
    page.on('pageerror', error => failures.push(error.message))
    page.on('response', response => { if (response.status() >= 400) failures.push(response.url()) })
    await page.goto('./#/en/concepts/dignity')
    for (const size of ['100', '200']) {
      await page.getByLabel('Text size', { exact: true }).selectOption(size)
      for (const appearance of ['light', 'dark']) {
        await page.getByLabel('Appearance', { exact: true }).selectOption(appearance)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      }
      if (size === '100' || viewport.width === 320) await page.screenshot({ path: `output/reader-${baseKind}-${viewport.width}-${size}.png`, fullPage: true })
    }
    await page.locator('#dignity-idea-source-p052').focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Source context · §52')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('link', { name: 'Return to Human dignity', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('#dignity-idea-source-p052')).toBeFocused()
    const duplicates = await page.locator('[id]').evaluateAll(elements => elements.map(e => e.id).filter((id, index, ids) => ids.indexOf(id) !== index))
    expect(duplicates).toEqual([])
    expect(failures).toEqual([])
  })
}


test('every published paragraph reference has reviewed context and reachable source notes', async ({ page }) => {
  for (const context of reading.contexts) {
    await page.goto(`./#/en/source/${context.paragraphId}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Source context · §${Number(context.paragraphId.slice(1))}`)
    await expect(page.getByText(context.explanation.text, { exact: true })).toBeVisible()
    const notes = page.locator('main a[id*="-note-n"]')
    const count = await notes.count()
    for (let i = 0; i < count; i++) {
      const label = await notes.nth(i).textContent()
      await notes.nth(i).click()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(label!)
      await expect(page.getByText('Exact source quotation · bibliographic note', { exact: true })).toBeVisible()
      await page.goBack()
      await expect(notes.nth(i)).toBeFocused()
    }
  }
})


test('deferred orientation preserves deliberate keyboard recovery focus', async ({ page }) => {
  await page.addInitScript(() => {
    const frame = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = callback => frame(time => { setTimeout(() => callback(time), 100) })
  })
  await page.goto('./#/en/atlas')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Explore the ideas in Magnifica Humanitas')
  await page.goto('./#/it/atlas')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This link is unavailable')
  const recovery = page.getByRole('link', { name: 'Explore the atlas', exact: true })
  await recovery.focus()
  await page.waitForTimeout(150)
  await expect(recovery).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/en\/atlas$/)
})
