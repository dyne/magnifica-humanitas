import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

// Production-only integration contract: every shipped edition takes the same journeys.
const locales = ['en', 'it', 'de', 'es', 'fr', 'pt', 'pl', 'be', 'ru', 'ar']
const json = (path: string) => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'))
const messages = Object.fromEntries(locales.map(locale => [locale, json(`content/messages/${locale}.json`)]))
const readings = Object.fromEntries(locales.map(locale => [locale, json(`content/reading/${locale}.json`)]))
const ui = (locale: string, key: string) => messages[locale][key] as string
const title = (locale: string) => readings[locale].concepts.find((c: { id: string }) => c.id === 'dignity').title as string
function pageTitle(locale: string, route: string) {
  const surface = route.split(/[/?]/)[0]
  const template = (key: string, value: string) => ui(locale, key).replace('{value1}', value)
  const number = (value: number) => {
    const text = new Intl.NumberFormat(locale, locale === 'ar' ? { numberingSystem: 'arab' } : {}).format(value)
    return locale === 'ar' ? `\u2068${text}\u2069` : text
  }
  const trail = readings[locale].trails.find((t: { id: string }) => t.id === 'worth-not-reward')
  let heading: string
  if (surface === 'concepts' || route.includes('/steps/')) heading = title(locale)
  else if (surface === 'foundations') heading = template('foundation.optional_foundations_value', title(locale))
  else if (route.startsWith('trails/') && route.includes('/end')) heading = template('trailend.trail_ending_value', trail.title)
  else if (surface === 'source') heading = template('source.source_context_value', number(52))
  else if (surface === 'notes') heading = template('source.source_note_value', number(124))
  else if (surface === 'relations') {
    const relation = readings[locale].relations.find((r: { id: string }) => r.id === 'rel-002')
    const name = (id: string) => readings[locale].concepts.find((c: { id: string }) => c.id === id).title
    heading = `${name(relation.from)} ${ui(locale, `relation.${relation.type}`)} ${name(relation.to)}`
  } else {
    const key: Record<string, string> = { atlas: 'explore_the_ideas', trails: 'question-led_trails', read: 'read_continuously', search: 'search_this_reading', saved: 'saved_places_and_recent_path', about: 'about_this_reading' }
    heading = ui(locale, `route.${key[surface]}`)
  }
  return template('concept.value_magnifica_humanitas', heading)
}
const routes = [
  'atlas?focus=dignity#overview', 'concepts/dignity?from=atlas#dignity-idea',
  'relations/rel-002?via=atlas#relation', 'foundations/dignity?via=concept#foundation',
  'trails?via=nav#questions', 'trails/worth-not-reward/steps/intrinsic-worth?via=trails#step',
  'trails/worth-not-reward/end?via=trails#ending', 'read?at=read-p052#read-p052',
  'source/p052?via=read#paragraph', 'notes/n124?via=source#note',
  'search?q=%C2%A752#term', 'saved?via=nav#places', 'about?via=footer#method',
]
async function shell(page: Page, locale: string, selected: string | null = locale) {
  await expect(page.locator('html')).toHaveAttribute('lang', locale)
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
  await expect(page.getByRole('navigation', { name: ui(locale, 'app.main_navigation'), exact: true })).toBeVisible()
  if (selected !== null) await expect(page.getByLabel(ui(locale, 'locale.language'), { exact: true })).toHaveValue(selected)
  await expect(page.getByLabel(ui(locale, 'app.appearance'), { exact: true })).toBeVisible()
  await expect(page.getByLabel(ui(locale, 'app.text_size'), { exact: true })).toBeVisible()
  await expect(page.locator('footer a[href*="vatican.va"]')).toHaveAttribute('href', new RegExp(`/leo-xiv/${locale}/encyclicals/`))
}

for (const [index, locale] of locales.entries()) {
  const other = locales[(index + 1) % locales.length]
  test(`${locale}: ordered regional defaults, explicit links and fresh neutral entry`, async ({ page }) => {
    await page.addInitScript(({ locale, other }) => {
      Object.defineProperty(navigator, 'languages', { get: () => ['zz-ZZ', `${locale.toUpperCase()}-ZZ`, `${other}-ZZ`] })
      Object.defineProperty(navigator, 'language', { get: () => `${other}-ZZ` })
    }, { locale, other })
    await page.goto('./')
    await expect(page).toHaveURL(new RegExp(`#/${locale}/atlas$`))
    await shell(page, locale)
    await page.goto(`./#/${other}/concepts/dignity`)
    await expect(page.locator('h1')).toHaveText(title(other))
    await shell(page, other)
    await page.locator('#language').selectOption(locale)
    await expect(page.locator('h1')).toHaveText(title(locale))
    await page.locator('#language').selectOption(other)
    await expect(page.locator('h1')).toHaveText(title(other))
    await page.goto('./')
    await expect(page).toHaveURL(new RegExp(`#/${locale}/atlas$`))
    await shell(page, locale)
    await page.goto('./#/en/concepts/dignity')
    await expect(page.locator('h1')).toHaveText(title('en'))
  })

  test(`${locale}: every main route switches stable IDs, query and anchor to ${other}`, async ({ page }) => {
    test.setTimeout(120_000)
    for (const route of routes) {
      await page.goto(`./#/${locale}/${route}`)
      await shell(page, locale)
      await expect(page.locator('main h1')).toBeVisible()
      await expect(page).toHaveTitle(pageTitle(locale, route))
      await page.locator('#language').selectOption(other)
      await expect(page).toHaveURL(url => url.hash === `#/${other}/${route}`)
      await shell(page, other)
      await expect(page.locator('main h1')).toBeVisible()
      await expect(page).toHaveTitle(pageTitle(other, route))
      await expect(page.locator('#language')).toBeFocused()
      expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
      if (route.startsWith('source/') || route.startsWith('notes/')) {
        await expect(page.locator('main')).toContainText(readings[other].editionId)
        const links = await page.locator('main a[href*="/source/"], main a[href*="/notes/"]').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')))
        expect(links.length).toBeGreaterThan(0)
        expect(links.every(href => href?.includes(`#/${other}/`))).toBe(true)
      }
    }
  })

  test(`${locale}: history restores localized title and exact source/note edition`, async ({ page }) => {
    await page.goto(`./#/${locale}/source/p101?via=matrix#paragraph`)
    await expect(page.locator('main')).toContainText(readings[locale].editionId)
    await shell(page, locale)
    const beforeTitle = await page.title()
    const explanation = readings[locale].contexts.find((c: { paragraphId: string }) => c.paragraphId === 'p101').explanation.text
    await expect(page.locator('main > p').filter({ hasText: explanation })).toHaveText(explanation)
    await page.locator('#p101-note-n124').click()
    await expect(page).toHaveURL(new RegExp(`#/${locale}/notes/n124`))
    await expect(page.locator('main')).toContainText(readings[locale].editionId)
    await expect(page.locator('#n124-paragraph-p101')).toHaveAttribute('href', new RegExp(`#/${locale}/source/p101$`))
    const noteTitle = await page.title()
    const noteQuote = await page.locator('blockquote').innerText()
    await page.locator('#language').selectOption(other)
    await expect(page.locator('main')).toContainText(readings[other].editionId)
    const otherTitle = await page.title()
    expect(otherTitle).not.toBe(noteTitle)
    await page.goBack()
    await shell(page, locale)
    await expect(page).toHaveTitle(noteTitle)
    await expect(page.locator('blockquote')).toHaveText(noteQuote)
    await page.goBack()
    await expect(page).toHaveTitle(beforeTitle)
    await expect(page.locator('main > p').filter({ hasText: explanation })).toHaveText(explanation)
    await page.goForward()
    await expect(page).toHaveTitle(noteTitle)
    await page.goForward()
    await expect(page.locator('html')).toHaveAttribute('lang', other)
    await expect(page).toHaveTitle(otherTitle)
  })

  for (const storage of ['available', 'read-denied', 'write-denied']) test(`${locale}: saved paragraph isolation and resume with storage ${storage}`, async ({ page }) => {
    const denied = storage !== 'available'
    if (storage === 'read-denied') await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError') } }))
    if (storage === 'write-denied') await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError') } })
    await page.goto(`./#/${locale}/read?at=read-p176`)
    await expect(page.locator('#read-p176')).toBeFocused()
    await page.locator('#read-p176').getByRole('button', { name: ui(locale, 'saveplace.save_this_paragraph'), exact: true }).click()
    if (denied) await expect(page.locator('.local-status')).toHaveText(ui(locale, 'state.save_failed'))
    await page.locator('#nav-saved').click()
    await expect(page.locator('#saved-0')).toHaveAttribute('href', new RegExp(`#/${locale}/read\\?at=read-p176$`))
    await page.locator('#saved-0').click()
    await expect(page.locator('#read-p176')).toBeFocused()
    await page.locator('#language').selectOption(other)
    await shell(page, other)
    await page.locator('#nav-saved').click()
    await expect(page.locator('#saved-0')).toHaveCount(0)
    await page.locator('#language').selectOption(locale)
    await expect(page.locator('#saved-0')).toBeVisible()
    if (!denied) {
      await page.reload()
      await expect(page.locator('#saved-0')).toBeVisible()
    }
    await page.locator('#saved-0').click()
    await expect(page.locator('#read-p176')).toBeFocused()
  })

  test(`${locale}: failed and delayed library activation retain the current edition atomically`, async ({ page }) => {
    await page.goto(`./#/${other}/concepts/dignity`)
    await expect(page.locator('h1')).toHaveText(title(other))
    const beforeTitle = await page.title()
    const beforeURL = page.url()
    const pattern = new RegExp(`reading-library-${locale}.*\\.js`)
    await page.route(pattern, route => route.abort())
    await page.locator('#language').selectOption(locale)
    await expect(page.locator('.local-status')).toHaveText(ui(other, 'load.locale_error'))
    await shell(page, other)
    await expect(page).toHaveTitle(beforeTitle)
    expect(page.url()).toBe(beforeURL)
    await expect(page.locator('h1')).toHaveText(title(other))
    await page.unroute(pattern)
    let release!: () => void
    let requested!: () => void
    const held = new Promise<void>(resolve => { release = resolve })
    const seen = new Promise<void>(resolve => { requested = resolve })
    await page.route(pattern, async route => { requested(); await held; await route.continue() })
    await page.locator('#language').selectOption(locale)
    await seen
    await shell(page, other, null)
    await expect(page.locator('h1')).toHaveText(title(other))
    await expect(page).toHaveTitle(beforeTitle)
    expect(page.url()).toBe(beforeURL)
    release()
    await shell(page, locale)
    await expect(page.locator('h1')).toHaveText(title(locale))
    await expect(page).toHaveTitle(ui(locale, 'concept.value_magnifica_humanitas').replace('{value1}', title(locale)))
  })

  test(`${locale}: context failure, retry and unavailable identities remain localized`, async ({ page }) => {
    const pattern = new RegExp(`reviewed-reading-context-${locale}.*\\.js`)
    await page.route(pattern, route => route.abort())
    await page.goto(`./#/${locale}/source/p052`)
    await shell(page, locale)
    await expect(page.locator('h1')).toHaveText(ui(locale, 'source.source_context_could_not_load'))
    await expect(page.locator('blockquote')).toHaveCount(0)
    await page.unroute(pattern)
    await page.getByRole('button', { name: ui(locale, 'source.retry_source_context'), exact: true }).click()
    await expect(page.locator('main')).toContainText(readings[locale].editionId)
    await expect(page.locator('blockquote')).toBeVisible()
    for (const route of ['concepts/matrix-missing', 'source/p999', 'notes/n999', 'unknown/route']) {
      await page.goto(`./#/${locale}/${route}`)
      await shell(page, locale)
      await expect(page.locator('h1')).toHaveText(ui(locale, 'note.this_link_is_unavailable'))
      await expect(page.locator('blockquote')).toHaveCount(0)
    }
  })

  test(`${locale}: a delayed source response cannot replace the newer ${other} source`, async ({ page }) => {
    await page.goto(`./#/${other}/source/p052`)
    await expect(page.locator('main')).toContainText(readings[other].editionId)
    const beforeTitle = await page.title()
    const beforeQuote = (await page.locator('blockquote').textContent())!
    const pattern = new RegExp(`reviewed-reading-context-${locale}.*\\.js`)
    let release!: () => void
    let requested!: () => void
    const held = new Promise<void>(resolve => { release = resolve })
    const seen = new Promise<void>(resolve => { requested = resolve })
    await page.route(pattern, async route => { requested(); await held; await route.continue() })
    await page.locator('#language').selectOption(locale)
    await seen
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    await expect(page.locator('h1')).toHaveText(ui(locale, 'source.opening_source_context'))
    await expect(page.locator('blockquote')).toHaveCount(0)
    await expect(page.locator('main')).not.toContainText(readings[other].editionId)
    await page.locator('#language').selectOption(other)
    await expect(page.locator('main')).toContainText(readings[other].editionId)
    const response = page.waitForResponse(pattern)
    release()
    await response
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await shell(page, other)
    await expect(page).toHaveTitle(beforeTitle)
    await expect(page.locator('blockquote')).toHaveText(beforeQuote)
  })
}

test('temporary per-edition saves can be cleared and recovered to device storage', async ({ page }) => {
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError') }
    window.addEventListener('matrix:restore-storage', () => { Storage.prototype.setItem = setItem })
  })
  await page.goto('./#/en/concepts/dignity')
  await page.getByRole('button', { name: ui('en', 'saveplace.save_this_place'), exact: true }).click()
  await page.locator('#language').selectOption('ar')
  await shell(page, 'ar')
  await page.locator('#language').selectOption('en')
  await page.locator('#nav-saved').click()
  await expect(page.locator('#saved-0')).toBeVisible()
  await page.getByRole('button', { name: ui('en', 'saved.clear_local_data'), exact: true }).click()
  await page.getByRole('button', { name: ui('en', 'saved.confirm_clear_all_local_data'), exact: true }).click()
  await page.locator('#language').selectOption('ar')
  await shell(page, 'ar')
  await page.locator('#language').selectOption('en')
  await expect(page.locator('#saved-0')).toHaveCount(0)
  await page.locator('#nav-atlas').click()
  await page.locator('#atlas-dignity').click()
  await page.getByRole('button', { name: ui('en', 'saveplace.save_this_place'), exact: true }).click()
  await page.evaluate(() => window.dispatchEvent(new Event('matrix:restore-storage')))
  await page.getByRole('button', { name: ui('en', 'app.retry_device_storage'), exact: true }).click()
  await expect(page.locator('.local-status')).toHaveText(ui('en', 'state.persisted'))
  await page.reload()
  await page.locator('#nav-saved').click()
  await expect(page.locator('#saved-0')).toBeVisible()
})

for (const [languages, language, expected] of [
  [[], 'ru-RU', 'ru'], [['zz-ZZ', 'xx'], 'ar-EG', 'ar'],
  [['zz-ZZ', 'xx'], 'zz-ZZ', 'en'], [[], '', 'en'],
] as [string[], string, string][]) test(`navigator backup/fallback ${JSON.stringify(languages)} / ${language || '(empty)'} → ${expected}`, async ({ page }) => {
  await page.addInitScript(({ languages, language }) => {
    Object.defineProperty(navigator, 'languages', { get: () => languages })
    Object.defineProperty(navigator, 'language', { get: () => language })
  }, { languages, language })
  await page.goto('./')
  await expect(page).toHaveURL(new RegExp(`#/${expected}/atlas$`))
  await shell(page, expected)
  await page.goto('./#/zz/concepts/dignity?via=fallback#dignity-idea')
  await expect(page).toHaveURL(/#\/en\/concepts\/dignity\?via=fallback#dignity-idea$/)
  await expect(page.locator('h1')).toHaveText(title('en'))
})
