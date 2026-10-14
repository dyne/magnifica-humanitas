import { test, expect } from '@playwright/test'
import reading from '../../content/reading/en.json' with { type: 'json' }
const key = 'mh-reading-v1'
const baseKind = process.env.VITE_BASE === '/' ? 'root' : 'subpath'
const emptyState = { schemaVersion: 1, contentRevision: reading.revision, locale: 'en', edition: reading.editionId, last: null, saved: [], recent: [], visited: [], appearance: 'system' }

for (const trail of reading.trails) {
  test(`optional reflection ${trail.id} reveals sourced explanation and can be skipped or revisited`, async ({ page }) => {
    await page.goto('./#/en/trails')
    await expect(page.getByRole('heading', { name: trail.question, exact: true })).toBeVisible()
    await expect(page.getByText(trail.qualification.text, { exact: true })).toBeVisible()
    await expect(page.getByText(new RegExp(`Estimated reading time · ${trail.readingEstimate.minutes} minutes`)).first()).toBeVisible()
    for (const id of trail.optionalConceptIds) await expect(page.locator(`#${trail.id}-optional-${id}`)).toHaveAttribute('href', new RegExp(`/en/concepts/${id}$`))
    await page.goto(`./#/en/trails/${trail.id}/end`)
    await expect(page.getByText(/No trail steps are recorded/)).toBeVisible()
    await expect(page.getByText(trail.reflection.prompt.text, { exact: true })).toBeVisible()
    if (trail.reflection.scenario) {
      await expect(page.getByText('Fictional editorial scenario', { exact: true })).toBeVisible()
      await expect(page.getByText(trail.reflection.scenario.text, { exact: true })).toBeVisible()
    }
    await expect(page.locator(`#${trail.reflection.id}-feedback`)).toHaveCount(0)
    await page.getByRole('button', { name: 'Skip reflection', exact: true }).click()
    await expect(page.getByText('Reflection skipped. You can continue or return to it.', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Restart this trail', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Think again' }).click()
    await expect(page.getByRole('button', { name: 'Reveal explanation', exact: true })).toBeFocused()
    await page.getByRole('button', { name: 'Reveal explanation', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: 'Reveal explanation', exact: true })).toBeFocused()
    await expect(page.getByRole('button', { name: 'Reveal explanation', exact: true })).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('button', { name: 'Reveal explanation', exact: true })).toHaveAttribute('aria-controls', `${trail.reflection.id}-feedback`)
    await expect(page.locator('.reflection .actions + section > h3')).toHaveText('A distinction to compare with your thought')
    await expect(page.getByText(trail.reflection.feedback.text, { exact: true })).toBeVisible()
    for (const id of trail.reflection.feedback.sourceRefs) await expect(page.locator(`#${trail.reflection.id}-feedback-source-${id}`)).toBeAttached()
    const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
    expect(Object.keys(state).sort()).toEqual(Object.keys(emptyState).sort())
    expect(JSON.stringify(state)).not.toContain(trail.reflection.prompt.text)
    expect(JSON.stringify(state)).not.toContain('reflection')
    await page.reload()
    await expect(page.locator(`#${trail.reflection.id}-feedback`)).toHaveCount(0)
    for (const id of trail.relatedTrailIds) await expect(page.locator(`#${trail.id}-end-related-${id}`)).toHaveAttribute('href', new RegExp(`/en/trails/${id}/steps/`))
  })
}

test('saved paragraph resumes exact stable position in a new session with appearance and Undo', async ({ page, browser, baseURL }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('./#/en/read?at=read-p176')
  await expect(page.locator('#read-p176')).toBeFocused()
  await page.getByLabel('Appearance', { exact: true }).selectOption('dark')
  await page.locator('#read-p176').getByRole('button', { name: 'Save this paragraph' }).click()
  await expect(page.locator('#read-p176').getByText('Saved on this device', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Saved', exact: true }).click()
  await expect(page.locator('#saved-0')).toContainText('§176')
  const storageState = await page.context().storageState()
  const session = await browser.newContext({ storageState, viewport: { width: 360, height: 800 } })
  const reopened = await session.newPage()
  await reopened.goto(`${baseURL}#/en/atlas`)
  await expect(reopened.locator('html')).toHaveAttribute('data-dyne-theme', 'dark')
  await expect(reopened.getByRole('heading', { level: 1 })).toHaveText('Explore the ideas in Magnifica Humanitas')
  await reopened.getByRole('link', { name: 'Saved', exact: true }).click()
  await reopened.locator('#saved-0').click()
  await expect(reopened.locator('#read-p176')).toBeFocused()
  await expect(reopened.getByText(/Returned to Continuous reading · §176/)).toBeVisible()
  const position = await reopened.evaluate(() => scrollY)
  expect(position).toBeGreaterThan(0)
  await reopened.goBack(); await expect(reopened.locator('#saved-0')).toBeFocused()
  await reopened.goForward(); await expect(reopened.locator('#read-p176')).toBeFocused()
  await expect.poll(() => reopened.evaluate(() => scrollY)).toBeCloseTo(position, 0)
  await reopened.getByRole('link', { name: 'Saved', exact: true }).click()
  await reopened.getByRole('button', { name: /Remove Continuous reading · §176/ }).click()
  await expect(reopened.getByRole('button', { name: 'Undo removal' })).toBeFocused()
  await expect(reopened.getByText(/No saved places yet/)).toBeVisible()
  await reopened.getByRole('button', { name: 'Undo removal' }).click()
  await expect(reopened.locator('#saved-0')).toBeFocused()
  await session.close()
})

test('visited labels survive refresh; recent path is bounded and queries are never stored', async ({ page }) => {
  await page.goto('./#/en/concepts/dignity')
  await page.getByRole('link', { name: 'Atlas', exact: true }).first().click()
  await expect(page.locator('#atlas-dignity').locator('..')).toContainText('Visited')
  await page.reload(); await expect(page.locator('#atlas-dignity').locator('..')).toContainText('Visited')
  const trail = reading.trails[0]
  await page.goto(`./#/en/trails/${trail.id}/steps/${trail.steps[0].id}`)
  await page.goto('./#/en/trails')
  await expect(page.locator(`#${trail.id}-overview-${trail.steps[0].id}`).locator('..')).toContainText('Visited')
  for (const c of reading.concepts.slice(0, 12)) await page.goto(`./#/en/concepts/${c.id}`)
  await page.goto('./#/en/search?q=private-search-query')
  await page.goto('./#/en/saved')
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  expect(state.recent.length).toBe(10)
  expect(state.visited.length).toBeGreaterThan(10)
  expect(JSON.stringify(state)).not.toContain('private-search-query')
  await page.getByRole('button', { name: 'Clear local data', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Confirm clear all local data' })).toBeFocused()
  await page.getByRole('button', { name: 'Cancel clearing' }).click()
  await expect(page.getByRole('button', { name: 'Clear local data', exact: true })).toBeFocused()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).recent.length, key)).toBe(10)
  await page.getByRole('button', { name: 'Clear local data', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm clear all local data' }).click()
  await expect(page.getByText('No recent places yet.', { exact: true })).toBeVisible()
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull()
  await page.reload(); await expect(page.getByText('No recent places yet.', { exact: true })).toBeVisible()
})

for (const failure of ['blocked', 'quota']) {
  test(`${failure} storage uses temporary saves, resume and clear without blocking reading`, async ({ page }) => {
    await page.addInitScript(failure => {
      if (failure === 'blocked') Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError') } })
      else Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError') }
    }, failure)
    await page.goto('./#/en/concepts/dignity')
    await page.getByRole('button', { name: 'Save this place', exact: true }).click()
    await expect(page.getByText('Saved temporarily in this tab', { exact: true })).toBeVisible()
    await expect(page.getByText(/This place could not be saved on this device/)).toBeVisible()
    await page.getByRole('link', { name: 'Saved', exact: true }).click()
    await expect(page.locator('#saved-0')).toContainText('Human dignity')
    await page.locator('#saved-0').click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Human dignity')
    await page.getByRole('link', { name: 'Saved', exact: true }).click()
    await page.getByRole('button', { name: 'Clear local data', exact: true }).click()
    await page.getByRole('button', { name: 'Confirm clear all local data' }).click()
    await expect(page.getByText(/No saved places yet/)).toBeVisible()
    await expect(page.getByText('No recent places yet.', { exact: true })).toBeVisible()
  })
}

test('recoverable storage failure offers retry and persists the temporary saved place', async ({ page }) => {
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem
    Storage.prototype.setItem = function(key, value) { if (!(window as unknown as { storageRepaired: boolean }).storageRepaired) throw new DOMException('Full', 'QuotaExceededError'); return set.call(this, key, value) }
  })
  await page.goto('./#/en/concepts/dignity')
  await page.getByRole('button', { name: 'Save this place', exact: true }).click()
  await page.evaluate(() => { (window as unknown as { storageRepaired: boolean }).storageRepaired = true })
  await page.getByRole('button', { name: 'Retry device storage' }).click()
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible()
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  expect(state.saved[0].entityId).toBe('dignity')
})

test('corrupt records are discarded and older content keeps valid places while missing ones remain explicit', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{broken'), key)
  await page.goto('./#/en/saved')
  await expect(page.getByText(/Stored reading data could not be read and was discarded/)).toBeVisible()
  await expect(page.getByText(/No saved places yet/)).toBeVisible()
  const known = { kind: 'concept', entityId: 'dignity', blockId: 'dignity-idea', offset: 100000 }
  const changed = { ...known, blockId: 'removed-block', offset: 42 }
  const missing = { kind: 'concept', entityId: 'removed-concept', offset: 0 }
  await page.evaluate(({key, state}) => localStorage.setItem(key, JSON.stringify(state)), { key, state: { ...emptyState, contentRevision: 'older', saved: [known, changed, missing] } })
  // A new navigation avoids rerunning the corrupt-record fixture on reload.
  await page.context().clearCookies()
  const snapshot = await page.context().storageState()
  const fresh = await page.context().browser()!.newContext({ storageState: snapshot })
  const other = await fresh.newPage()
  await other.goto(page.url())
  await expect(other.getByText(/The reading edition was updated/)).toBeVisible()
  await expect(other.getByText('Unavailable saved place · removed-concept', { exact: true })).toBeVisible()
  expect(await other.locator('#saved-2').count()).toBe(0)
  const stored = await other.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  expect(stored.saved[1].blockId).toBeUndefined(); expect(stored.saved[1].offset).toBe(0)
  await other.getByRole('button', { name: 'Remove Unavailable saved place · removed-concept', exact: true }).click()
  expect(await other.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved.length, key)).toBe(2)
  await other.locator('#saved-0').click()
  await expect(other.locator('#dignity-idea')).toBeFocused()
  expect(await other.evaluate(() => { const b = document.getElementById('dignity-idea')!; return -b.getBoundingClientRect().top < b.offsetHeight })).toBe(true)
  await fresh.close()
})

for (const viewport of [{ width: 360, height: 800 }, { width: 1440, height: 1000 }]) {
  test(`return/reflection surfaces reflow ${viewport.width} and respect reduced motion`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('./#/en/concepts/dignity')
    await page.getByRole('button', { name: 'Save this place', exact: true }).click()
    for (const route of ['saved', 'trails', 'trails/ai-purpose/end']) {
      await page.goto(`./#/en/${route}`)
      for (const size of ['100', '200']) for (const appearance of ['light', 'dark']) {
        await page.getByLabel('Text size', { exact: true }).selectOption(size)
        await page.getByLabel('Appearance', { exact: true }).selectOption(appearance)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        await page.evaluate(() => document.fonts.ready)
        if (route.endsWith('end')) await page.getByRole('heading', { name: 'Optional reflection', exact: true }).scrollIntoViewIfNeeded()
        else await page.evaluate(() => scrollTo(0, 0))
        await page.screenshot({ path: `output/l5/l52/${route.replaceAll('/', '-')}-${baseKind}-${viewport.width}-${size}-${appearance}.png` })
        if (route === 'saved') {
          await page.locator('.saved-places').scrollIntoViewIfNeeded()
          await page.screenshot({ path: `output/l5/l52/saved-controls-${baseKind}-${viewport.width}-${size}-${appearance}.png` })
        }
        if (route.endsWith('end')) {
          await page.locator('.reflection .actions').scrollIntoViewIfNeeded()
          await page.screenshot({ path: `output/l5/l52/reflection-controls-${baseKind}-${viewport.width}-${size}-${appearance}.png` })
          await page.getByRole('button', { name: 'Reveal explanation', exact: true }).click()
          await expect(page.getByRole('button', { name: 'Reveal explanation', exact: true })).toBeFocused()
          await page.locator(`#${reading.trails[1].reflection.id}-feedback`).scrollIntoViewIfNeeded()
          await page.screenshot({ path: `output/l5/l52/reflection-feedback-${baseKind}-${viewport.width}-${size}-${appearance}.png` })
          expect(await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0)
          await page.getByRole('button', { name: 'Think again', exact: true }).click()
        }
      }
    }
  })
}

test('removing a place while reading has immediate Undo and a keyboard return', async ({ page }) => {
  await page.goto('./#/en/concepts/dignity')
  const save = page.getByRole('button', { name: 'Save this place', exact: true })
  await save.click()
  await page.getByRole('button', { name: 'Remove saved place', exact: true }).click()
  await page.getByRole('button', { name: 'Undo removal', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Remove saved place', exact: true })).toBeFocused()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved.length, key)).toBe(1)
})

test('fifty explicit saved places are retained without silently evicting one', async ({ page }) => {
  const saved = Array.from({ length: 50 }, (_, i) => ({ kind: 'source', entityId: `p${String(i + 1).padStart(3, '0')}`, offset: 0 }))
  await page.addInitScript(({key, state}) => localStorage.setItem(key, JSON.stringify(state)), { key, state: { ...emptyState, saved } })
  await page.goto('./#/en/concepts/dignity')
  await page.getByRole('button', { name: 'Save this place', exact: true }).click()
  await expect(page.getByText('You have 50 saved places. Remove a place before saving another.', { exact: true })).toBeVisible()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved.length, key)).toBe(50)
  await page.getByRole('link', { name: 'Saved', exact: true }).click()
  await expect(page.locator('#saved-49')).toContainText('§50')
})
