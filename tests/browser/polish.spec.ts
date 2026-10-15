import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import reading from '../../content/reading/pl.json' with { type: 'json' }
const require = createRequire(import.meta.url)
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const baseKind = process.env.VITE_BASE === '/' ? 'root' : 'subpath'
const key = 'mh-reading-v1-pl'
const surfaces = {
  atlas: ['atlas', 'Poznaj idee'],
  concept: ['concepts/dignity', 'Godność człowieka'],
  trail: ['trails/worth-not-reward/steps/intrinsic-worth', 'Godność człowieka'],
  read: ['read?at=read-p052', 'Czytaj po kolei'],
  source: ['source/p052', 'Kontekst źródłowy · §52'],
  note: ['notes/n174', 'Przypis 174'],
  search: ['search?q=pomocniczość', 'Szukaj'],
  saved: ['saved', 'Zapisane miejsca'],
  about: ['about', 'O tej lekturze'],
}

for (const width of [390, 1440]) for (const size of ['100', '200']) {
  test(`Polish nine-surface review ${width} text ${size}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('./#/pl/atlas')
    await expect(page.locator('#language option')).toHaveText(['English', 'Italiano', 'Deutsch', 'Español', 'Français', 'Português', 'Polski', 'Беларуская', 'Русский', 'العربية'])
    await page.locator('#language').focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('#appearance')).toBeFocused()
    await page.locator('#text-size').selectOption(size)
    await page.locator('header').screenshot({ path: `output/polish/${baseKind}-${width}-${size}-selector.png` })
    const fontsBySurface: Record<string, unknown> = {}
    for (const [name, [route, heading]] of Object.entries(surfaces)) {
      await page.goto(`./#/pl/${route}`)
      if (name === 'read') await expect(page.locator('#read-p052')).toBeFocused()
      if (name === 'trail') await expect(page.locator('h1')).toContainText(heading)
      else await expect(page.locator('h1')).toHaveText(heading)
      await expect(page.locator('html')).toHaveAttribute('lang', 'pl')
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
      await page.evaluate(() => document.fonts.ready)
      await expect(page.locator('html')).toHaveCSS('font-size', size === '200' ? '32px' : '16px')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (name === 'source' || name === 'note') await expect(page.locator('main')).toContainText(reading.editionId)
      await page.locator('h1').scrollIntoViewIfNeeded()
      await page.screenshot({ path: `output/polish/${baseKind}-${width}-${size}-${name}.png` })
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('DOM.enable'); await cdp.send('CSS.enable')
      const { root } = await cdp.send('DOM.getDocument')
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'h1' })
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
      expect(fonts.some(font => font.isCustomFont && font.glyphCount > 0)).toBe(true)
      expect(fonts.every(font => font.isCustomFont)).toBe(true)
      const { nodeId: bodyId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'main p:not(.local-status)' })
      const { fonts: bodyFonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: bodyId })
      expect(bodyFonts.some(font => font.isCustomFont && font.glyphCount > 0)).toBe(true)
      expect(bodyFonts.every(font => font.isCustomFont), JSON.stringify({ name, bodyFonts })).toBe(true)
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
    await page.screenshot({ path: `output/polish/${baseKind}-${width}-${size}-about-dark.png` })
    await test.info().attach('Polish painted fonts', { body: JSON.stringify(fontsBySurface), contentType: 'application/json' })
  })
}

for (const [preferences, expected] of [
  [['zh-CN', 'pl-PL', 'it-IT'], 'pl'], [['PL-pl', 'en'], 'pl'], [['it-IT', 'pl-PL'], 'it'], [['de-AT', 'pl-PL'], 'de'], [['es-MX', 'pl-PL'], 'es'], [['en-GB', 'pl-PL'], 'en'], [['fr-FR', 'pl-PL'], 'fr'], [['pt-BR', 'pl-PL'], 'pt'], [['ja', 'zh-CN'], 'en'],
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

test('Polish keyboard switching preserves query, anchor, selector focus and fresh neutral defaults', async ({ page }) => {
  await page.goto('./#/en/search?q=care#stable-anchor')
  await page.locator('#language').focus()
  await page.keyboard.press('p'); await page.keyboard.press('o'); await page.keyboard.press('l'); await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/pl\/search\?q=care#stable-anchor$/)
  await expect(page.locator('#language')).toBeFocused()
  await expect(page.locator('h1')).toHaveText('Szukaj')
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
  await page.goto('./')
  await expect(page).toHaveURL(/#\/en\/atlas$/)
})

test('Polish search handles accent folding, paragraph keywords, unavailable IDs and empty results', async ({ page }) => {
  await page.goto('./#/pl/search?q=GODNOSC%20CZLOWIEKA')
  await expect(page.locator('#search-concept-dignity')).toHaveText('Godność człowieka')
  await page.goto('./#/pl/search?q=WYCHOWANIE')
  await expect(page.locator('#search-concept-education')).toHaveText('Wychowanie i edukacja')
  await page.getByLabel('Hasło lub numer akapitu').fill('AKAPIT 52')
  await expect(page.locator('#search-read-p052')).toHaveText('§52 · Cztery znaczenia godności')
  await page.locator('#search-read-p052').click()
  await expect(page.locator('#read-p052')).toBeFocused()
  await page.goto('./#/pl/search?q=zzzzsinresultado')
  await expect(page.getByText('Brak wyników dla tego zapytania.', { exact: true })).toBeVisible()
  await page.goto('./#/pl/concepts/no-existe')
  await expect(page.locator('main')).toContainText('Żądana strona jest niedostępna w tym polskim wydaniu.')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl')
})

test('Polish saved places resume exact paragraph, preserve caller return and remain separate from English', async ({ page }) => {
  await page.goto('./#/pl/read?at=read-p176')
  await expect(page.locator('#read-p176')).toBeFocused()
  await page.locator('#read-p176').getByRole('button', { name: 'Zapisz ten akapit' }).click()
  await page.locator('#nav-saved').click()
  await expect(page.locator('#saved-0')).toContainText('§176')
  await page.locator('#saved-0').click()
  await expect(page.locator('#read-p176')).toBeFocused()
  await expect(page.locator('.local-status')).toContainText('Powrót do:')
  await page.locator('#read-p176 .sources a').first().click()
  await expect(page.locator('h1')).toHaveText('Kontekst źródłowy · §176')
  await expect(page.locator('#return-to-reading')).toContainText('Czytaj po kolei')
  await page.locator('#p176-note-n174').click()
  await expect(page.locator('h1')).toHaveText('Przypis 174')
  await expect(page.locator('blockquote')).toContainText('Naciski polityczne, a niekiedy także ekonomiczne')
  await page.locator('#return-to-reading').click()
  await expect(page.locator('h1')).toHaveText('Kontekst źródłowy · §176')
  await page.locator('#return-to-reading').click()
  await expect(page.locator('#read-p176 .sources a').first()).toBeFocused()
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved, key)
  expect(saved[0]).toMatchObject({ kind: 'read', entityId: 'continuous', blockId: 'read-p176' })
  await page.goto('./#/en/saved')
  await expect(page.getByText(/No saved places yet/)).toBeVisible()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved, key)).toEqual(saved)
  await page.goto('./#/pl/saved')
  await page.reload()
  await expect(page.locator('#saved-0')).toContainText('§176')
})

test('Polish source quotations, bibliography, note backlinks and official links use the Polish edition', async ({ page }) => {
  await page.goto('./#/pl/source/p052')
  await expect(page.locator('blockquote')).toContainText('godność ontologiczna')
  await expect(page.locator('main')).not.toContainText('These aspects of dignity')
  await expect(page.locator('footer a[href*="vatican.va"]')).toHaveAttribute('href', /\/pl\/encyclicals\//)
  await page.goto('./#/pl/notes/n124')
  await expect(page.locator('#n124-paragraph-p101')).toHaveAttribute('href', /#\/pl\/source\/p101$/)
  await page.goto('./#/pl/notes/n211')
  await expect(page.locator('#n211-previous')).toHaveAttribute('href', /#\/pl\/notes\/n210$/)
  await page.goto('./#/pl/notes/n223')
  await expect(page.locator('blockquote')).toContainText('Medytacja podczas czuwania modlitewnego')
})

test('Polish note identities remain reachable despite broken official fragments', async ({ page }) => {
  await page.goto('./#/pl/notes/n033')
  await expect(page.locator('h1')).toHaveText('Przypis 33')
  await expect(page.locator('blockquote')).toContainText('Octogesima adveniens')
  await expect(page.locator('#n033-previous')).toHaveAttribute('href', /#\/pl\/notes\/n032$/)
  await expect(page.locator('#n033-paragraph-p036')).toHaveAttribute('href', /#\/pl\/source\/p036$/)
  await page.goto('./#/pl/notes/n219')
  await expect(page.locator('h1')).toHaveText('Przypis 219')
  await expect(page.locator('blockquote')).toContainText('Caritas in veritate (29 czerwca 2009), 34')
  await expect(page.locator('#n219-paragraph-p237')).toHaveAttribute('href', /#\/pl\/source\/p237$/)
  await page.locator('#n219-paragraph-p237').click()
  await expect(page.locator('h1')).toHaveText('Kontekst źródłowy · §237')
  await page.locator('#p237-note-n219').click()
  await expect(page.locator('h1')).toHaveText('Przypis 219')
})

test('failed Polish activation preserves exact English source title and saved state then retries without stale caller labels', async ({ page }) => {
  await page.goto('./#/en/concepts/dignity')
  await page.getByRole('button', { name: 'Save this place', exact: true }).click()
  await page.locator('.sources a').first().click()
  await expect(page.locator('h1')).toContainText('Source context · §')
  await page.locator('h1').focus()
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')))
  await expect.poll(() => page.evaluate(() => history.state.mhReader?.focusId)).toBe('page-heading')
  const title = await page.title()
  const path = page.url().split('#')[1]
  const historyBefore = await page.evaluate(() => ({ length: history.length, state: history.state, url: location.href }))
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  await page.route(/reading-library-pl.*\.js/, route => route.abort())
  await page.locator('#language').selectOption('pl')
  await expect(page.locator('.local-status')).toContainText('This language could not load')
  await expect(page).toHaveTitle(title)
  await expect(page.locator('#language')).toHaveValue('en')
  expect(await page.evaluate(() => ({ length: history.length, state: history.state, url: location.href }))).toEqual(historyBefore)
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  expect(state.saved.length).toBeGreaterThan(0)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
  await page.unroute(/reading-library-pl.*\.js/)
  await page.locator('#language').selectOption('pl')
  await expect(page).toHaveURL(new RegExp('#' + path.replace('/en/', '/pl/') + '$'))
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl')
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
})

test('cancelling a slow Polish library leaves the newer English concept title and reading state intact', async ({ page }) => {
  await page.goto('./#/en/concepts/dignity')
  await page.getByRole('button', { name: 'Save this place', exact: true }).click()
  await page.goto('./#/en/source/p052')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  let release!: () => void, requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reading-library-pl.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('pl'); await seen
  await page.locator('#nav-atlas').click(); await page.locator('#atlas-care').click()
  await expect(page.locator('h1')).toHaveText('Care and human presence')
  const title = await page.title()
  const historyBefore = await page.evaluate(() => ({ length: history.length, state: history.state, url: location.href }))
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  const response = page.waitForResponse(/reading-library-pl.*\.js/)
  release(); await response
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(page).toHaveTitle(title)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  expect(await page.evaluate(() => ({ length: history.length, state: history.state, url: location.href }))).toEqual(historyBefore)
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  expect(state.saved.length).toBeGreaterThan(0)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
})

test('pending Polish source cannot overwrite a rapid return to the English edition', async ({ page }) => {
  await page.goto('./#/en/concepts/dignity')
  await page.getByRole('button', { name: 'Save this place', exact: true }).click()
  await page.goto('./#/en/source/p052')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  let release!: () => void, requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reviewed-reading-context-pl.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('pl'); await seen
  await page.locator('#language').selectOption('en')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  const title = await page.title()
  const before = await page.evaluate(() => ({ history: history.state, length: history.length, url: location.href, state: JSON.parse(localStorage.getItem('mh-reading-v1')!) }))
  expect(before.state.saved.length).toBeGreaterThan(0)
  const response = page.waitForResponse(/reviewed-reading-context-pl.*\.js/)
  release()
  await response
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(page).toHaveTitle(title)
  await expect(page).toHaveURL(/#\/en\/source\/p052$/)
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  await expect(page.locator('main')).not.toContainText(reading.editionId)
  const after = await page.evaluate(() => ({ history: history.state, length: history.length, url: location.href, state: JSON.parse(localStorage.getItem('mh-reading-v1')!) }))
  for (const field of ['history', 'length', 'url'] as const) expect(after[field]).toEqual(before[field])
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(after.state[field]).toEqual(before.state[field])
})

for (const trail of reading.trails) test(`Polish ending ${trail.id} keeps the optional reflection and a real stopping point`, async ({ page }) => {
  await page.goto(`./#/pl/trails/${trail.id}/end`)
  await expect(page.getByText(trail.ending.text, { exact: true })).toBeVisible()
  await expect(page.getByText(trail.reflection.prompt.text, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Pokaż objaśnienie', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(trail.reflection.feedback.text, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pokaż objaśnienie', exact: true })).toBeFocused()
  if (trail.reflection.scenario) await expect(page.getByText(trail.reflection.scenario.text, { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Zacznij ścieżkę od nowa', exact: true })).toBeVisible()
})

for (const kind of ['note', 'read'] as const) test(`Polish ${kind} loading failure stays translated and supports retry`, async ({ page }) => {
  const pattern = kind === 'note' ? /reviewed-reading-context-pl.*\.js/ : /reading-sequence-pl.*\.js/
  await page.route(pattern, route => route.abort())
  await page.goto(kind === 'note' ? './#/pl/notes/n223' : './#/pl/read')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(kind === 'note' ? 'Nie udało się wczytać przypisu' : 'Nie udało się wczytać lektury ciągłej')
  await page.unroute(pattern)
  await page.getByRole('button', { name: kind === 'note' ? 'Wczytaj przypis ponownie' : 'Wczytaj lekturę ponownie', exact: true }).click()
  if (kind === 'note') await expect(page.locator('blockquote')).toContainText('Medytacja podczas czuwania modlitewnego')
  else await expect(page.locator('#read-p245')).toBeAttached()
})

test('Polish temporary storage and empty states stay usable with localized live notices', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError') } }))
  await page.goto('./#/pl/saved')
  await expect(page.getByText(/Nie ma jeszcze zapisanych miejsc\./)).toBeVisible()
  await page.goto('./#/pl/concepts/dignity')
  await page.getByRole('button', { name: 'Zapisz to miejsce', exact: true }).click()
  await expect(page.getByText('Zapisano tymczasowo w tej karcie', { exact: true })).toBeVisible()
  await expect(page.locator('.local-status')).toContainText('Nie udało się zapisać tego miejsca na urządzeniu')
  await page.locator('#nav-saved').click()
  await expect(page.locator('#saved-0')).toContainText('Godność człowieka')
  await page.locator('#saved-0').click()
  await expect(page.locator('h1')).toHaveText('Godność człowieka')
})

test('Polish atlas entry requests only its active reading library and keeps context and sequence deferred', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.goto('./#/pl/atlas')
  await expect(page.locator('h1')).toHaveText('Poznaj idee')
  expect(requests.some(url => /reading-library-pl.*\.js/.test(url))).toBe(true)
  expect(requests.some(url => /reading-library-en.*\.js/.test(url))).toBe(false)
  expect(requests.some(url => /(?:reviewed-reading-context|reading-sequence)-pl.*\.js/.test(url))).toBe(false)
})

test('failed English activation from Polish retains the Polish note title, state and translated failure notice', async ({ page }) => {
  await page.goto('./#/pl/concepts/dignity')
  await page.getByRole('button', { name: 'Zapisz to miejsce', exact: true }).click()
  await page.goto('./#/pl/notes/n223')
  await expect(page.locator('h1')).toHaveText('Przypis 223')
  await page.locator('h1').focus()
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')))
  await expect.poll(() => page.evaluate(() => history.state.mhReader?.focusId)).toBe('page-heading')
  const title = await page.title()
  const historyBefore = await page.evaluate(() => ({ length: history.length, state: history.state, url: location.href }))
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  await page.route(/reading-library-en.*\.js/, route => route.abort())
  await page.locator('#language').selectOption('en')
  await expect(page.locator('.local-status')).toContainText('Nie udało się wczytać tego języka')
  await expect(page).toHaveTitle(title)
  await expect(page.locator('h1')).toHaveText('Przypis 223')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl')
  await expect(page.locator('#language')).toHaveValue('pl')
  expect(await page.evaluate(() => ({ length: history.length, state: history.state, url: location.href }))).toEqual(historyBefore)
  const retained = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  expect(state.saved.length).toBeGreaterThan(0)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
})

for (const route of [
  'atlas?view=all#overview', 'concepts/dignity?from=atlas#dignity-idea', 'relations/rel-002?via=atlas#relation',
  'foundations/dignity?via=concept#foundation', 'trails/worth-not-reward/steps/intrinsic-worth?via=trails#step',
  'trails/worth-not-reward/end?via=trails#ending', 'read?at=read-p052#read-p052', 'source/p052?via=read#paragraph',
  'notes/n143?via=source#note', 'search?q=godno%C5%9B%C4%87#term', 'saved?via=nav#places', 'about?via=footer#method',
]) test(`Polish equivalent switching preserves stable route/query/anchor: ${route}`, async ({ page }) => {
  await page.goto(`./#/en/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.locator('#language').selectOption('pl')
  await expect(page).toHaveURL(url => url.hash === `#/pl/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl')
  await expect(page.locator('main h1')).toBeVisible()
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
  await page.locator('#language').selectOption('it')
  await expect(page).toHaveURL(url => url.hash === `#/it/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'it')
})

test('Polish bibliographic Arendt note and ibid. references keep their local edition and context', async ({ page }) => {
  await page.goto('./#/pl/notes/n143')
  await expect(page.locator('blockquote')).toHaveText('H. Arendt, The Origins of Totalitarianism, t. III, New York 1962, s. 474; Korzenie totalitaryzmu, tłum. M. Szawiel, D. Grinberg, Warszawa 1993, s. 510.')
  await expect(page.locator('main')).toContainText('przypis bibliograficzny')
  for (const [id, previous] of [['n003', 'n002'], ['n007', 'n006'], ['n033', 'n032'], ['n163', 'n162'], ['n194', 'n193'], ['n204', 'n203'], ['n207', 'n206']]) {
    await page.goto(`./#/pl/notes/${id}`)
    await expect(page.locator(`#${id}-previous`)).toHaveAttribute('href', new RegExp(`#/pl/notes/${previous}$`))
    await expect(page.locator('main')).toContainText('„Tamże” odsyła do poprzedniego dzieła, a „Tenże” do poprzedniego autora')
  }
})

test('Polish navigator.language backup and explicit existing editions remain independent', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh'] })
    Object.defineProperty(navigator, 'language', { get: () => 'pl-PL' })
  })
  await page.goto('./')
  await expect(page).toHaveURL(/#\/pl\/atlas$/)
  for (const [locale, title] of [['en', 'Human dignity'], ['it', 'Dignità umana'], ['de', 'Menschenwürde'], ['es', 'Dignidad humana'], ['fr', 'Dignité humaine'], ['pt', 'Dignidade humana']]) {
    await page.goto(`./#/${locale}/concepts/dignity`)
    await expect(page.locator('h1')).toHaveText(title)
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
  }
})
