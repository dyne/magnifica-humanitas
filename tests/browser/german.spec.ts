import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import reading from '../../content/reading/de.json' with { type: 'json' }
const require = createRequire(import.meta.url)
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const baseKind = process.env.VITE_BASE === '/' ? 'root' : 'subpath'
const key = 'mh-reading-v1-de'
const surfaces = {
  atlas: ['atlas', 'Ideen erkunden'],
  concept: ['concepts/dignity', 'Menschenwürde'],
  trail: ['trails/worth-not-reward/steps/intrinsic-worth', 'Menschenwürde'],
  read: ['read?at=read-p052', 'Fortlaufend lesen'],
  source: ['source/p052', 'Quellenkontext · §52'],
  note: ['notes/n174', 'Quellennote 174'],
  search: ['search?q=Subsidiarit%C3%A4t', 'Diese Lektüre durchsuchen'],
  saved: ['saved', 'Gespeicherte Punkte und letzter Leseweg'],
  about: ['about', 'Über diese Lektüre'],
}

for (const width of [390, 1440]) for (const size of ['100', '200']) {
  test(`German nine-surface review ${width} text ${size}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('./#/de/atlas')
    await expect(page.locator('#language option')).toHaveText(['English', 'Italiano', 'Deutsch', 'Español', 'Français'])
    await page.locator('#language').focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('#appearance')).toBeFocused()
    await page.locator('#text-size').selectOption(size)
    await page.locator('header').screenshot({ path: `output/german/${baseKind}-${width}-${size}-selector.png` })
    const fontsBySurface: Record<string, unknown> = {}
    for (const [name, [route, heading]] of Object.entries(surfaces)) {
      await page.goto(`./#/de/${route}`)
      if (name === 'read') await expect(page.locator('#read-p052')).toBeFocused()
      if (name === 'trail') await expect(page.locator('h1')).toContainText(heading)
      else await expect(page.locator('h1')).toHaveText(heading)
      await expect(page.locator('html')).toHaveAttribute('lang', 'de')
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
      await page.evaluate(() => document.fonts.ready)
      await expect(page.locator('html')).toHaveCSS('font-size', size === '200' ? '32px' : '16px')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (name === 'source' || name === 'note') await expect(page.locator('main')).toContainText(reading.editionId)
      await page.locator('h1').scrollIntoViewIfNeeded()
      await page.screenshot({ path: `output/german/${baseKind}-${width}-${size}-${name}.png` })
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('DOM.enable'); await cdp.send('CSS.enable')
      const { root } = await cdp.send('DOM.getDocument')
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'h1' })
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
      expect(fonts.some(font => font.isCustomFont && font.glyphCount > 0)).toBe(true)
      const { nodeId: bodyId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'main p:not(.local-status)' })
      const { fonts: bodyFonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: bodyId })
      expect(bodyFonts.some(font => font.isCustomFont && font.glyphCount > 0)).toBe(true)
      fontsBySurface[name] = { heading: fonts, body: bodyFonts }
      await cdp.detach()
      if (width === 390 && size === '100') {
        await page.addScriptTag({ content: axe })
        const violations = await page.evaluate(async () => {
          const result = await (window as unknown as { axe: { run: (options: unknown) => Promise<{ violations: { id: string; impact: string }[] }> } }).axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })
          return result.violations.map(v => ({ id: v.id, impact: v.impact }))
        })
        expect(violations, name).toEqual([])
      }
    }
    await page.locator('#appearance').selectOption('dark')
    await expect(page.locator('html')).toHaveAttribute('data-dyne-theme', 'dark')
    await page.locator('h1').scrollIntoViewIfNeeded()
    await page.screenshot({ path: `output/german/${baseKind}-${width}-${size}-about-dark.png` })
    await test.info().attach('German painted fonts', { body: JSON.stringify(fontsBySurface), contentType: 'application/json' })
  })
}

for (const [preferences, expected] of [
  [['pl-PL', 'de-DE', 'it-IT'], 'de'], [['DE-ch', 'en'], 'de'], [['it-IT', 'de-DE'], 'it'], [['en-GB', 'de-DE'], 'en'], [['ar', 'ru-RU'], 'en'],
] as const) {
  test(`browser defaults ${preferences.join(',')} choose ${expected}; explicit English remains stable`, async ({ page }) => {
    await page.addInitScript(languages => {
      Object.defineProperty(navigator, 'languages', { get: () => languages })
      Object.defineProperty(navigator, 'language', { get: () => languages[0] })
    }, [...preferences])
    await page.goto('./')
    await expect(page).toHaveURL(new RegExp(`#/${expected}/atlas$`))
    await expect(page.locator('html')).toHaveAttribute('lang', expected)
    await page.goto('./#/en/concepts/dignity')
    await expect(page.locator('h1')).toHaveText('Human dignity')
    await expect(page).toHaveURL(/#\/en\/concepts\/dignity$/)
  })
}

test('German keyboard switching preserves query, anchor, selector focus and fresh neutral defaults', async ({ page }) => {
  await page.goto('./#/en/search?q=care#stable-anchor')
  await page.locator('#language').focus()
  await page.keyboard.press('d'); await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/de\/search\?q=care#stable-anchor$/)
  await expect(page.locator('#language')).toBeFocused()
  await expect(page.locator('h1')).toHaveText('Diese Lektüre durchsuchen')
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
  await page.goto('./')
  await expect(page).toHaveURL(/#\/en\/atlas$/)
})

test('German search handles accent folding, paragraph keywords, unavailable IDs and empty results', async ({ page }) => {
  await page.goto('./#/de/search?q=WÜRDE')
  await expect(page.locator('#search-concept-dignity')).toHaveText('Menschenwürde')
  await page.getByLabel('Begriff oder Absatznummer').fill('Absatz 52')
  await expect(page.locator('#search-read-p052')).toHaveText('§52 · Vier Bedeutungen von Würde')
  await page.locator('#search-read-p052').click()
  await expect(page.locator('#read-p052')).toBeFocused()
  await page.goto('./#/de/search?q=zzzzkeintreffer')
  await expect(page.getByText('Keine Ergebnisse für diese Suche.', { exact: true })).toBeVisible()
  await page.goto('./#/de/concepts/nicht-vorhanden')
  await expect(page.locator('main')).toContainText('Die angefragte Seite ist in dieser deutschen Ausgabe nicht verfügbar.')
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
})

test('German saved places resume exact paragraph, preserve caller return and remain separate from English', async ({ page }) => {
  await page.goto('./#/de/read?at=read-p176')
  await expect(page.locator('#read-p176')).toBeFocused()
  await page.locator('#read-p176').getByRole('button', { name: 'Diesen Absatz speichern' }).click()
  await page.locator('#nav-saved').click()
  await expect(page.locator('#saved-0')).toContainText('§176')
  await page.locator('#saved-0').click()
  await expect(page.locator('#read-p176')).toBeFocused()
  await expect(page.locator('.local-status')).toContainText('Zurück zu')
  await page.locator('#read-p176 .sources a').first().click()
  await expect(page.locator('h1')).toHaveText('Quellenkontext · §176')
  await expect(page.locator('#return-to-reading')).toContainText('Fortlaufend lesen')
  await page.locator('#p176-note-n174').click()
  await expect(page.locator('h1')).toHaveText('Quellennote 174')
  await expect(page.locator('blockquote')).toContainText('Politische und zuweilen sogar wirtschaftliche Erfordernisse')
  await page.locator('#return-to-reading').click()
  await expect(page.locator('h1')).toHaveText('Quellenkontext · §176')
  await page.locator('#return-to-reading').click()
  await expect(page.locator('#read-p176 .sources a').first()).toBeFocused()
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved, key)
  expect(saved[0]).toMatchObject({ kind: 'read', entityId: 'continuous', blockId: 'read-p176' })
  await page.goto('./#/en/saved')
  await expect(page.getByText(/No saved places yet/)).toBeVisible()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved, key)).toEqual(saved)
  await page.goto('./#/de/saved')
  await page.reload()
  await expect(page.locator('#saved-0')).toContainText('§176')
})

test('German source quotations, bibliography, note backlinks and official links use the German edition', async ({ page }) => {
  await page.goto('./#/de/source/p052')
  await expect(page.locator('blockquote')).toContainText('ontologische Würde')
  await expect(page.locator('main')).not.toContainText('These aspects of dignity')
  await expect(page.locator('footer a[href*="vatican.va"]')).toHaveAttribute('href', /\/de\/encyclicals\//)
  await page.goto('./#/de/notes/n124')
  await expect(page.locator('#n124-paragraph-p101')).toHaveAttribute('href', /#\/de\/source\/p101$/)
  await page.goto('./#/de/notes/n211')
  await expect(page.locator('#n211-previous')).toHaveAttribute('href', /#\/de\/notes\/n210$/)
  await page.goto('./#/de/notes/n223')
  await expect(page.locator('blockquote')).toContainText('Gebetsvigil und des Rosenkranzes für den Frieden')
})

test('failed German activation preserves exact English source title and saved state then retries without stale caller labels', async ({ page }) => {
  await page.goto('./#/en/concepts/dignity')
  await page.locator('.sources a').first().click()
  await expect(page.locator('h1')).toContainText('Source context · §')
  const title = await page.title()
  const path = page.url().split('#')[1]
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  await page.route(/reading-library-de.*\.js/, route => route.abort())
  await page.locator('#language').selectOption('de')
  await expect(page.locator('.local-status')).toContainText('This language could not load')
  await expect(page).toHaveTitle(title)
  await expect(page.locator('#language')).toHaveValue('en')
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
  await page.unroute(/reading-library-de.*\.js/)
  await page.locator('#language').selectOption('de')
  await expect(page).toHaveURL(new RegExp('#' + path.replace('/en/', '/de/') + '$'))
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
})

test('cancelling a slow German library leaves the newer English concept title and reading state intact', async ({ page }) => {
  await page.goto('./#/en/source/p052')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  let release!: () => void, requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reading-library-de.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('de'); await seen
  await page.locator('#nav-atlas').click(); await page.locator('#atlas-care').click()
  await expect(page.locator('h1')).toHaveText('Care and human presence')
  const title = await page.title()
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  const response = page.waitForResponse(/reading-library-de.*\.js/)
  release(); await response
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(page).toHaveTitle(title)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
})

test('pending German source cannot overwrite a rapid return to the English edition', async ({ page }) => {
  await page.goto('./#/en/source/p052')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  let release!: () => void, requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reviewed-reading-context-de.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('de'); await seen
  await page.locator('#language').selectOption('en')
  release()
  await expect(page).toHaveURL(/#\/en\/source\/p052$/)
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  await expect(page.locator('main')).not.toContainText(reading.editionId)
})

for (const trail of reading.trails) test(`German ending ${trail.id} keeps the optional reflection and a real stopping point`, async ({ page }) => {
  await page.goto(`./#/de/trails/${trail.id}/end`)
  await expect(page.getByText(trail.ending.text, { exact: true })).toBeVisible()
  await expect(page.getByText(trail.reflection.prompt.text, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Erklärung anzeigen', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(trail.reflection.feedback.text, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Erklärung anzeigen', exact: true })).toBeFocused()
  if (trail.reflection.scenario) await expect(page.getByText(trail.reflection.scenario.text, { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Diesen Lesepfad neu beginnen', exact: true })).toBeVisible()
})

for (const kind of ['note', 'read'] as const) test(`German ${kind} loading failure stays translated and supports retry`, async ({ page }) => {
  const pattern = kind === 'note' ? /reviewed-reading-context-de.*\.js/ : /reading-sequence-de.*\.js/
  await page.route(pattern, route => route.abort())
  await page.goto(kind === 'note' ? './#/de/notes/n223' : './#/de/read')
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(kind === 'note' ? 'Quellennote konnte nicht geladen werden' : 'Fortlaufende Lektüre konnte nicht geladen werden')
  await page.unroute(pattern)
  await page.getByRole('button', { name: kind === 'note' ? 'Quellennote erneut laden' : 'Fortlaufende Lektüre erneut laden', exact: true }).click()
  if (kind === 'note') await expect(page.locator('blockquote')).toContainText('Gebetsvigil und des Rosenkranzes für den Frieden')
  else await expect(page.locator('#read-p245')).toBeAttached()
})

test('German temporary storage and empty states stay usable with localized live notices', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError') } }))
  await page.goto('./#/de/saved')
  await expect(page.getByText(/Noch keine gespeicherten Punkte\./)).toBeVisible()
  await page.goto('./#/de/concepts/dignity')
  await page.getByRole('button', { name: 'Diesen Punkt speichern', exact: true }).click()
  await expect(page.getByText('Vorübergehend in dieser Registerkarte gespeichert', { exact: true })).toBeVisible()
  await expect(page.locator('.local-status')).toContainText('Dieser Punkt konnte nicht auf dem Gerät gespeichert werden')
  await page.locator('#nav-saved').click()
  await expect(page.locator('#saved-0')).toContainText('Menschenwürde')
  await page.locator('#saved-0').click()
  await expect(page.locator('h1')).toHaveText('Menschenwürde')
})

test('German atlas entry requests only its active reading library and keeps context and sequence deferred', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.goto('./#/de/atlas')
  await expect(page.locator('h1')).toHaveText('Ideen erkunden')
  expect(requests.some(url => /reading-library-de.*\.js/.test(url))).toBe(true)
  expect(requests.some(url => /reading-library-en.*\.js/.test(url))).toBe(false)
  expect(requests.some(url => /(?:reviewed-reading-context|reading-sequence)-de.*\.js/.test(url))).toBe(false)
})

test('failed English activation from German retains the German note title, state and translated failure notice', async ({ page }) => {
  await page.goto('./#/de/notes/n223')
  await expect(page.locator('h1')).toHaveText('Quellennote 223')
  const title = await page.title()
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  await page.route(/reading-library-en.*\.js/, route => route.abort())
  await page.locator('#language').selectOption('en')
  await expect(page.locator('.local-status')).toContainText('Diese Sprache konnte nicht geladen werden')
  await expect(page).toHaveTitle(title)
  await expect(page.locator('h1')).toHaveText('Quellennote 223')
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await expect(page.locator('#language')).toHaveValue('de')
  const retained = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
})

for (const route of [
  'atlas?view=all#overview', 'concepts/dignity?from=atlas#dignity-idea', 'relations/rel-002?via=atlas#relation',
  'foundations/dignity?via=concept#foundation', 'trails/worth-not-reward/steps/intrinsic-worth?via=trails#step',
  'trails/worth-not-reward/end?via=trails#ending', 'read?at=read-p052#read-p052', 'source/p052?via=read#paragraph',
  'notes/n143?via=source#note', 'search?q=W%C3%BCrde#term', 'saved?via=nav#places', 'about?via=footer#method',
]) test(`German equivalent switching preserves stable route/query/anchor: ${route}`, async ({ page }) => {
  await page.goto(`./#/en/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.locator('#language').selectOption('de')
  await expect(page).toHaveURL(url => url.hash === `#/de/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await expect(page.locator('main h1')).toBeVisible()
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
  await page.locator('#language').selectOption('it')
  await expect(page).toHaveURL(url => url.hash === `#/it/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'it')
})

test('German substantive Arendt note and spaced bibliographic references keep their local edition and context', async ({ page }) => {
  await page.goto('./#/de/notes/n143')
  await expect(page.locator('blockquote')).toContainText('deutlich anders formuliert')
  await expect(page.locator('main')).toContainText('Argument und Nachweis')
  for (const [id, previous] of [['n163', 'n162'], ['n194', 'n193']]) {
    await page.goto(`./#/de/notes/${id}`)
    await expect(page.locator(`#${id}-previous`)).toHaveAttribute('href', new RegExp(`#/de/notes/${previous}$`))
    await expect(page.locator('main')).toContainText('„ebd.“ verweist auf den vorherigen Nachweis')
  }
})

test('German navigator.language backup and explicit Italian entry remain independent', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', { get: () => ['pl-PL', 'ru'] })
    Object.defineProperty(navigator, 'language', { get: () => 'de-AT' })
  })
  await page.goto('./')
  await expect(page).toHaveURL(/#\/de\/atlas$/)
  await page.goto('./#/it/concepts/dignity')
  await expect(page.locator('h1')).toHaveText('Dignità umana')
  await expect(page.locator('html')).toHaveAttribute('lang', 'it')
})
