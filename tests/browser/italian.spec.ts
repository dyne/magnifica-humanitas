import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import reading from '../../content/reading/it.json' with { type: 'json' }
const require = createRequire(import.meta.url)
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const baseKind = process.env.VITE_BASE === '/' ? 'root' : 'subpath'
const key = 'mh-reading-v1-it'
const surfaces = {
  atlas: ['atlas', 'Esplora le idee'],
  concept: ['concepts/dignity', 'Dignità umana'],
  trail: ['trails/worth-not-reward/steps/intrinsic-worth', 'Dignità umana'],
  read: ['read?at=read-p052', 'Lettura continua'],
  source: ['source/p052', 'Contesto della fonte · §52'],
  note: ['notes/n174', 'Nota della fonte 174'],
  search: ['search?q=sussidiariet%C3%A0', 'Cerca in questa lettura'],
  saved: ['saved', 'Punti salvati e percorso recente'],
  about: ['about', 'Su questa lettura'],
}

for (const width of [390, 1440]) for (const size of ['100', '200']) {
  test(`Italian nine-surface review ${width} text ${size}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('./#/it/atlas')
    await expect(page.locator('#language option')).toHaveText(['English', 'Italiano', 'Deutsch', 'Español', 'Français', 'Português', 'Polski', 'Беларуская', 'Русский'])
    await page.locator('#language').focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('#appearance')).toBeFocused()
    await page.locator('#text-size').selectOption(size)
    await page.locator('header').screenshot({ path: `output/italian/${baseKind}-${width}-${size}-selector.png` })
    const fontsBySurface: Record<string, unknown> = {}
    for (const [name, [route, heading]] of Object.entries(surfaces)) {
      await page.goto(`./#/it/${route}`)
      if (name === 'read') await expect(page.locator('#read-p052')).toBeFocused()
      if (name === 'trail') await expect(page.locator('h1')).toContainText(heading)
      else await expect(page.locator('h1')).toHaveText(heading)
      await expect(page.locator('html')).toHaveAttribute('lang', 'it')
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
      await page.evaluate(() => document.fonts.ready)
      await expect(page.locator('html')).toHaveCSS('font-size', size === '200' ? '32px' : '16px')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (name === 'source' || name === 'note') await expect(page.locator('main')).toContainText(reading.editionId)
      await page.locator('h1').scrollIntoViewIfNeeded()
      await page.screenshot({ path: `output/italian/${baseKind}-${width}-${size}-${name}.png` })
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
    await page.screenshot({ path: `output/italian/${baseKind}-${width}-${size}-about-dark.png` })
    await test.info().attach('Italian painted fonts', { body: JSON.stringify(fontsBySurface), contentType: 'application/json' })
  })
}

for (const [preferences, expected] of [
  [['ar-EG', 'it-IT', 'en-US'], 'it'], [['IT-ch', 'en'], 'it'], [['en-GB', 'it-IT'], 'en'], [['ar', 'zh-CN'], 'en'],
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

test('Italian keyboard switching preserves query, anchor, selector focus and fresh neutral defaults', async ({ page }) => {
  await page.goto('./#/en/search?q=care#stable-anchor')
  await page.locator('#language').focus()
  await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/it\/search\?q=care#stable-anchor$/)
  await expect(page.locator('#language')).toBeFocused()
  await expect(page.locator('h1')).toHaveText('Cerca in questa lettura')
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
  await page.goto('./')
  await expect(page).toHaveURL(/#\/en\/atlas$/)
})

test('Italian search handles accent folding, paragraph keywords, unavailable IDs and empty results', async ({ page }) => {
  await page.goto('./#/it/search?q=DIGNITA')
  await expect(page.locator('#search-concept-dignity')).toHaveText('Dignità umana')
  await page.getByLabel('Termine o numero di paragrafo').fill('paragrafo 52')
  await expect(page.locator('#search-read-p052')).toHaveText('§52 · Quattro significati della dignità')
  await page.locator('#search-read-p052').click()
  await expect(page.locator('#read-p052')).toBeFocused()
  await page.goto('./#/it/search?q=zzzznessunrisultato')
  await expect(page.getByText('Nessun risultato per questa ricerca.', { exact: true })).toBeVisible()
  await page.goto('./#/it/concepts/non-esiste')
  await expect(page.locator('main')).toContainText('La pagina richiesta non è disponibile in questa edizione italiana.')
  await expect(page.locator('html')).toHaveAttribute('lang', 'it')
})

test('Italian saved places resume exact paragraph, preserve caller return and remain separate from English', async ({ page }) => {
  await page.goto('./#/it/read?at=read-p176')
  await expect(page.locator('#read-p176')).toBeFocused()
  await page.locator('#read-p176').getByRole('button', { name: 'Salva questo paragrafo' }).click()
  await page.locator('#nav-saved').click()
  await expect(page.locator('#saved-0')).toContainText('§176')
  await page.locator('#saved-0').click()
  await expect(page.locator('#read-p176')).toBeFocused()
  await expect(page.locator('.local-status')).toContainText('Ritorno a')
  await page.locator('#read-p176 .sources a').first().click()
  await expect(page.locator('h1')).toHaveText('Contesto della fonte · §176')
  await expect(page.locator('#return-to-reading')).toContainText('Lettura continua')
  await page.locator('#p176-note-n174').click()
  await expect(page.locator('h1')).toHaveText('Nota della fonte 174')
  await expect(page.locator('blockquote')).toContainText('Le pressioni politiche')
  await page.locator('#return-to-reading').click()
  await expect(page.locator('h1')).toHaveText('Contesto della fonte · §176')
  await page.locator('#return-to-reading').click()
  await expect(page.locator('#read-p176 .sources a').first()).toBeFocused()
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved, key)
  expect(saved[0]).toMatchObject({ kind: 'read', entityId: 'continuous', blockId: 'read-p176' })
  await page.goto('./#/en/saved')
  await expect(page.getByText(/No saved places yet/)).toBeVisible()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved, key)).toEqual(saved)
  await page.goto('./#/it/saved')
  await page.reload()
  await expect(page.locator('#saved-0')).toContainText('§176')
})

test('Italian source quotations, bibliography, note backlinks and official links use the Italian edition', async ({ page }) => {
  await page.goto('./#/it/source/p052')
  await expect(page.locator('blockquote')).toContainText('dignità ontologica')
  await expect(page.locator('main')).not.toContainText('These aspects of dignity')
  await expect(page.locator('footer a[href*="vatican.va"]')).toHaveAttribute('href', /\/it\/encyclicals\//)
  await page.goto('./#/it/notes/n124')
  await expect(page.locator('#n124-paragraph-p101')).toHaveAttribute('href', /#\/it\/source\/p101$/)
  await page.goto('./#/it/notes/n211')
  await expect(page.locator('#n211-previous')).toHaveAttribute('href', /#\/it\/notes\/n210$/)
  await page.goto('./#/it/notes/n223')
  await expect(page.locator('blockquote')).toContainText('Veglia di preghiera e del Rosario per la pace')
})

test('failed Italian activation preserves exact English source title and saved state then retries without stale caller labels', async ({ page }) => {
  await page.goto('./#/en/concepts/dignity')
  await page.locator('.sources a').first().click()
  await expect(page.locator('h1')).toContainText('Source context · §')
  const title = await page.title()
  const path = page.url().split('#')[1]
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  await page.route(/reading-library-it.*\.js/, route => route.abort())
  await page.locator('#language').selectOption('it')
  await expect(page.locator('.local-status')).toContainText('This language could not load')
  await expect(page).toHaveTitle(title)
  await expect(page.locator('#language')).toHaveValue('en')
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
  await page.unroute(/reading-library-it.*\.js/)
  await page.locator('#language').selectOption('it')
  await expect(page).toHaveURL(new RegExp('#' + path.replace('/en/', '/it/') + '$'))
  await expect(page.locator('html')).toHaveAttribute('lang', 'it')
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
})

test('cancelling a slow Italian library leaves the newer English concept title and reading state intact', async ({ page }) => {
  await page.goto('./#/en/source/p052')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  let release!: () => void, requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reading-library-it.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('it'); await seen
  await page.locator('#nav-atlas').click(); await page.locator('#atlas-care').click()
  await expect(page.locator('h1')).toHaveText('Care and human presence')
  const title = await page.title()
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  const response = page.waitForResponse(/reading-library-it.*\.js/)
  release(); await response
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(page).toHaveTitle(title)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
})

test('pending Italian source cannot overwrite a rapid return to the English edition', async ({ page }) => {
  await page.goto('./#/en/source/p052')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  let release!: () => void, requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reviewed-reading-context-it.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('it'); await seen
  await page.locator('#language').selectOption('en')
  release()
  await expect(page).toHaveURL(/#\/en\/source\/p052$/)
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  await expect(page.locator('main')).not.toContainText(reading.editionId)
})

for (const trail of reading.trails) test(`Italian ending ${trail.id} keeps the optional reflection and a real stopping point`, async ({ page }) => {
  await page.goto(`./#/it/trails/${trail.id}/end`)
  await expect(page.getByText(trail.ending.text, { exact: true })).toBeVisible()
  await expect(page.getByText(trail.reflection.prompt.text, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Mostra la spiegazione', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(trail.reflection.feedback.text, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mostra la spiegazione', exact: true })).toBeFocused()
  if (trail.reflection.scenario) await expect(page.getByText(trail.reflection.scenario.text, { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ricomincia questo percorso', exact: true })).toBeVisible()
})

for (const kind of ['note', 'read'] as const) test(`Italian ${kind} loading failure stays translated and supports retry`, async ({ page }) => {
  const pattern = kind === 'note' ? /reviewed-reading-context-it.*\.js/ : /reading-sequence-it.*\.js/
  await page.route(pattern, route => route.abort())
  await page.goto(kind === 'note' ? './#/it/notes/n223' : './#/it/read')
  await expect(page.locator('html')).toHaveAttribute('lang', 'it')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(kind === 'note' ? 'Impossibile caricare la nota della fonte' : 'Impossibile caricare la lettura continua')
  await page.unroute(pattern)
  await page.getByRole('button', { name: kind === 'note' ? 'Riprova a caricare la nota' : 'Riprova a caricare la lettura continua', exact: true }).click()
  if (kind === 'note') await expect(page.locator('blockquote')).toContainText('Veglia di preghiera e del Rosario per la pace')
  else await expect(page.locator('#read-p245')).toBeAttached()
})

test('Italian temporary storage and empty states stay usable with localized live notices', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError') } }))
  await page.goto('./#/it/saved')
  await expect(page.getByText(/Non ci sono ancora punti salvati\./)).toBeVisible()
  await page.goto('./#/it/concepts/dignity')
  await page.getByRole('button', { name: 'Salva questo punto', exact: true }).click()
  await expect(page.getByText('Salvato temporaneamente in questa scheda', { exact: true })).toBeVisible()
  await expect(page.locator('.local-status')).toContainText('Impossibile salvare questo punto sul dispositivo')
  await page.locator('#nav-saved').click()
  await expect(page.locator('#saved-0')).toContainText('Dignità umana')
  await page.locator('#saved-0').click()
  await expect(page.locator('h1')).toHaveText('Dignità umana')
})

test('Italian atlas entry requests only its active reading library and keeps context and sequence deferred', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.goto('./#/it/atlas')
  await expect(page.locator('h1')).toHaveText('Esplora le idee')
  expect(requests.some(url => /reading-library-it.*\.js/.test(url))).toBe(true)
  expect(requests.some(url => /reading-library-en.*\.js/.test(url))).toBe(false)
  expect(requests.some(url => /(?:reviewed-reading-context|reading-sequence)-it.*\.js/.test(url))).toBe(false)
})

test('failed English activation from Italian retains the Italian note title, state and translated failure notice', async ({ page }) => {
  await page.goto('./#/it/notes/n223')
  await expect(page.locator('h1')).toHaveText('Nota della fonte 223')
  const title = await page.title()
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  await page.route(/reading-library-en.*\.js/, route => route.abort())
  await page.locator('#language').selectOption('en')
  await expect(page.locator('.local-status')).toContainText('Impossibile caricare questa lingua')
  await expect(page).toHaveTitle(title)
  await expect(page.locator('h1')).toHaveText('Nota della fonte 223')
  await expect(page.locator('html')).toHaveAttribute('lang', 'it')
  await expect(page.locator('#language')).toHaveValue('it')
  const retained = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
})
