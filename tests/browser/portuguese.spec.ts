import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import reading from '../../content/reading/pt.json' with { type: 'json' }
const require = createRequire(import.meta.url)
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const baseKind = process.env.VITE_BASE === '/' ? 'root' : 'subpath'
const key = 'mh-reading-v1-pt'
const surfaces = {
  atlas: ['atlas', 'Explorar as ideias'],
  concept: ['concepts/dignity', 'Dignidade humana'],
  trail: ['trails/worth-not-reward/steps/intrinsic-worth', 'Dignidade humana'],
  read: ['read?at=read-p052', 'Leitura contínua'],
  source: ['source/p052', 'Contexto da fonte · §52'],
  note: ['notes/n174', 'Nota da fonte 174'],
  search: ['search?q=subsidiariedade', 'Pesquisa'],
  saved: ['saved', 'Lugares de leitura'],
  about: ['about', 'Sobre esta leitura'],
}

for (const width of [390, 1440]) for (const size of ['100', '200']) {
  test(`Portuguese nine-surface review ${width} text ${size}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('./#/pt/atlas')
    await expect(page.locator('#language option')).toHaveText(['English', 'Italiano', 'Deutsch', 'Español', 'Français', 'Português', 'Polski', 'Беларуская', 'Русский', 'العربية'])
    await page.locator('#language').focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('#appearance')).toBeFocused()
    await page.locator('#text-size').selectOption(size)
    await page.locator('header').screenshot({ path: `output/portuguese/${baseKind}-${width}-${size}-selector.png` })
    const fontsBySurface: Record<string, unknown> = {}
    for (const [name, [route, heading]] of Object.entries(surfaces)) {
      await page.goto(`./#/pt/${route}`)
      if (name === 'read') await expect(page.locator('#read-p052')).toBeFocused()
      if (name === 'trail') await expect(page.locator('h1')).toContainText(heading)
      else await expect(page.locator('h1')).toHaveText(heading)
      await expect(page.locator('html')).toHaveAttribute('lang', 'pt')
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
      await page.evaluate(() => document.fonts.ready)
      await expect(page.locator('html')).toHaveCSS('font-size', size === '200' ? '32px' : '16px')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (name === 'source' || name === 'note') await expect(page.locator('main')).toContainText(reading.editionId)
      await page.locator('h1').scrollIntoViewIfNeeded()
      await page.screenshot({ path: `output/portuguese/${baseKind}-${width}-${size}-${name}.png` })
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
    await page.screenshot({ path: `output/portuguese/${baseKind}-${width}-${size}-about-dark.png` })
    await test.info().attach('Portuguese painted fonts', { body: JSON.stringify(fontsBySurface), contentType: 'application/json' })
  })
}

for (const [preferences, expected] of [
  [['zh-CN', 'pt-PT', 'it-IT'], 'pt'], [['PT-br', 'en'], 'pt'], [['it-IT', 'pt-AO'], 'it'], [['de-AT', 'pt-MZ'], 'de'], [['es-MX', 'pt-PT'], 'es'], [['en-GB', 'pt-PT'], 'en'], [['fr-FR', 'pt-PT'], 'fr'], [['ja', 'zh-CN'], 'en'],
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

test('Portuguese keyboard switching preserves query, anchor, selector focus and fresh neutral defaults', async ({ page }) => {
  await page.goto('./#/en/search?q=care#stable-anchor')
  await page.locator('#language').focus()
  await page.keyboard.press('p'); await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/pt\/search\?q=care#stable-anchor$/)
  await expect(page.locator('#language')).toBeFocused()
  await expect(page.locator('h1')).toHaveText('Pesquisa')
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
  await page.goto('./')
  await expect(page).toHaveURL(/#\/en\/atlas$/)
})

test('Portuguese search handles accent folding, paragraph keywords, unavailable IDs and empty results', async ({ page }) => {
  await page.goto('./#/pt/search?q=EDUCACAO')
  await expect(page.locator('#search-concept-education')).toHaveText('Educação')
  await page.getByLabel('Termo ou número de parágrafo').fill('PARAGRAFO 52')
  await expect(page.locator('#search-read-p052')).toHaveText('§52 · Quatro sentidos de dignidade')
  await page.locator('#search-read-p052').click()
  await expect(page.locator('#read-p052')).toBeFocused()
  await page.goto('./#/pt/search?q=zzzzsinresultado')
  await expect(page.getByText('Sem resultados para esta pesquisa.', { exact: true })).toBeVisible()
  await page.goto('./#/pt/concepts/no-existe')
  await expect(page.locator('main')).toContainText('A página pedida não está disponível nesta edição portuguesa.')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt')
})

test('Portuguese saved places resume exact paragraph, preserve caller return and remain separate from English', async ({ page }) => {
  await page.goto('./#/pt/read?at=read-p176')
  await expect(page.locator('#read-p176')).toBeFocused()
  await page.locator('#read-p176').getByRole('button', { name: 'Guardar este parágrafo' }).click()
  await page.locator('#nav-saved').click()
  await expect(page.locator('#saved-0')).toContainText('§176')
  await page.locator('#saved-0').click()
  await expect(page.locator('#read-p176')).toBeFocused()
  await expect(page.locator('.local-status')).toContainText('De volta a')
  await page.locator('#read-p176 .sources a').first().click()
  await expect(page.locator('h1')).toHaveText('Contexto da fonte · §176')
  await expect(page.locator('#return-to-reading')).toContainText('Leitura contínua')
  await page.locator('#p176-note-n174').click()
  await expect(page.locator('h1')).toHaveText('Nota da fonte 174')
  await expect(page.locator('blockquote')).toContainText('As exigências políticas e, por vezes, também as económicas')
  await page.locator('#return-to-reading').click()
  await expect(page.locator('h1')).toHaveText('Contexto da fonte · §176')
  await page.locator('#return-to-reading').click()
  await expect(page.locator('#read-p176 .sources a').first()).toBeFocused()
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved, key)
  expect(saved[0]).toMatchObject({ kind: 'read', entityId: 'continuous', blockId: 'read-p176' })
  await page.goto('./#/en/saved')
  await expect(page.getByText(/No saved places yet/)).toBeVisible()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved, key)).toEqual(saved)
  await page.goto('./#/pt/saved')
  await page.reload()
  await expect(page.locator('#saved-0')).toContainText('§176')
})

test('Portuguese source quotations, bibliography, note backlinks and official links use the Portuguese edition', async ({ page }) => {
  await page.goto('./#/pt/source/p052')
  await expect(page.locator('blockquote')).toContainText('dignidade ontológica')
  await expect(page.locator('main')).not.toContainText('These aspects of dignity')
  await expect(page.locator('footer a[href*="vatican.va"]')).toHaveAttribute('href', /\/pt\/encyclicals\//)
  await page.goto('./#/pt/notes/n124')
  await expect(page.locator('#n124-paragraph-p101')).toHaveAttribute('href', /#\/pt\/source\/p101$/)
  await page.goto('./#/pt/notes/n211')
  await expect(page.locator('#n211-previous')).toHaveAttribute('href', /#\/pt\/notes\/n210$/)
  await page.goto('./#/pt/notes/n223')
  await expect(page.locator('blockquote')).toContainText('Meditação na Vigília de oração')
})

test('failed Portuguese activation preserves exact English source title and saved state then retries without stale caller labels', async ({ page }) => {
  await page.goto('./#/en/concepts/dignity')
  await page.getByRole('button', { name: 'Save this place', exact: true }).click()
  await page.locator('.sources a').first().click()
  await expect(page.locator('h1')).toContainText('Source context · §')
  const title = await page.title()
  const path = page.url().split('#')[1]
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  await page.route(/reading-library-pt.*\.js/, route => route.abort())
  await page.locator('#language').selectOption('pt')
  await expect(page.locator('.local-status')).toContainText('This language could not load')
  await expect(page).toHaveTitle(title)
  await expect(page.locator('#language')).toHaveValue('en')
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  expect(state.saved.length).toBeGreaterThan(0)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
  await page.unroute(/reading-library-pt.*\.js/)
  await page.locator('#language').selectOption('pt')
  await expect(page).toHaveURL(new RegExp('#' + path.replace('/en/', '/pt/') + '$'))
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt')
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
})

test('cancelling a slow Portuguese library leaves the newer English concept title and reading state intact', async ({ page }) => {
  await page.goto('./#/en/concepts/dignity')
  await page.getByRole('button', { name: 'Save this place', exact: true }).click()
  await page.goto('./#/en/source/p052')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  let release!: () => void, requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reading-library-pt.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('pt'); await seen
  await page.locator('#nav-atlas').click(); await page.locator('#atlas-care').click()
  await expect(page.locator('h1')).toHaveText('Care and human presence')
  const title = await page.title()
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  const response = page.waitForResponse(/reading-library-pt.*\.js/)
  release(); await response
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(page).toHaveTitle(title)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  expect(state.saved.length).toBeGreaterThan(0)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
})

test('pending Portuguese source cannot overwrite a rapid return to the English edition', async ({ page }) => {
  await page.goto('./#/en/source/p052')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  let release!: () => void, requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reviewed-reading-context-pt.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('pt'); await seen
  await page.locator('#language').selectOption('en')
  release()
  await expect(page).toHaveURL(/#\/en\/source\/p052$/)
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  await expect(page.locator('main')).not.toContainText(reading.editionId)
})

for (const trail of reading.trails) test(`Portuguese ending ${trail.id} keeps the optional reflection and a real stopping point`, async ({ page }) => {
  await page.goto(`./#/pt/trails/${trail.id}/end`)
  await expect(page.getByText(trail.ending.text, { exact: true })).toBeVisible()
  await expect(page.getByText(trail.reflection.prompt.text, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Revelar explicação', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(trail.reflection.feedback.text, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Revelar explicação', exact: true })).toBeFocused()
  if (trail.reflection.scenario) await expect(page.getByText(trail.reflection.scenario.text, { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Recomeçar este percurso', exact: true })).toBeVisible()
})

for (const kind of ['note', 'read'] as const) test(`Portuguese ${kind} loading failure stays translated and supports retry`, async ({ page }) => {
  const pattern = kind === 'note' ? /reviewed-reading-context-pt.*\.js/ : /reading-sequence-pt.*\.js/
  await page.route(pattern, route => route.abort())
  await page.goto(kind === 'note' ? './#/pt/notes/n223' : './#/pt/read')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(kind === 'note' ? 'Não foi possível carregar a nota' : 'Não foi possível carregar a leitura contínua')
  await page.unroute(pattern)
  await page.getByRole('button', { name: kind === 'note' ? 'Tentar carregar a nota' : 'Tentar carregar a leitura contínua', exact: true }).click()
  if (kind === 'note') await expect(page.locator('blockquote')).toContainText('Meditação na Vigília de oração')
  else await expect(page.locator('#read-p245')).toBeAttached()
})

test('Portuguese temporary storage and empty states stay usable with localized live notices', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError') } }))
  await page.goto('./#/pt/saved')
  await expect(page.getByText(/Ainda não há lugares guardados\./)).toBeVisible()
  await page.goto('./#/pt/concepts/dignity')
  await page.getByRole('button', { name: 'Guardar este lugar', exact: true }).click()
  await expect(page.getByText('Guardado temporariamente neste separador', { exact: true })).toBeVisible()
  await expect(page.locator('.local-status')).toContainText('Não foi possível guardar este lugar no dispositivo')
  await page.locator('#nav-saved').click()
  await expect(page.locator('#saved-0')).toContainText('Dignidade humana')
  await page.locator('#saved-0').click()
  await expect(page.locator('h1')).toHaveText('Dignidade humana')
})

test('Portuguese atlas entry requests only its active reading library and keeps context and sequence deferred', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.goto('./#/pt/atlas')
  await expect(page.locator('h1')).toHaveText('Explorar as ideias')
  expect(requests.some(url => /reading-library-pt.*\.js/.test(url))).toBe(true)
  expect(requests.some(url => /reading-library-en.*\.js/.test(url))).toBe(false)
  expect(requests.some(url => /(?:reviewed-reading-context|reading-sequence)-pt.*\.js/.test(url))).toBe(false)
})

test('failed English activation from Portuguese retains the Portuguese note title, state and translated failure notice', async ({ page }) => {
  await page.goto('./#/pt/concepts/dignity')
  await page.getByRole('button', { name: 'Guardar este lugar', exact: true }).click()
  await page.goto('./#/pt/notes/n223')
  await expect(page.locator('h1')).toHaveText('Nota da fonte 223')
  const title = await page.title()
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  await page.route(/reading-library-en.*\.js/, route => route.abort())
  await page.locator('#language').selectOption('en')
  await expect(page.locator('.local-status')).toContainText('Não foi possível carregar este idioma')
  await expect(page).toHaveTitle(title)
  await expect(page.locator('h1')).toHaveText('Nota da fonte 223')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt')
  await expect(page.locator('#language')).toHaveValue('pt')
  const retained = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  expect(state.saved.length).toBeGreaterThan(0)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
})

for (const route of [
  'atlas?view=all#overview', 'concepts/dignity?from=atlas#dignity-idea', 'relations/rel-002?via=atlas#relation',
  'foundations/dignity?via=concept#foundation', 'trails/worth-not-reward/steps/intrinsic-worth?via=trails#step',
  'trails/worth-not-reward/end?via=trails#ending', 'read?at=read-p052#read-p052', 'source/p052?via=read#paragraph',
  'notes/n143?via=source#note', 'search?q=educa%C3%A7%C3%A3o#term', 'saved?via=nav#places', 'about?via=footer#method',
]) test(`Portuguese equivalent switching preserves stable route/query/anchor: ${route}`, async ({ page }) => {
  await page.goto(`./#/en/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.locator('#language').selectOption('pt')
  await expect(page).toHaveURL(url => url.hash === `#/pt/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt')
  await expect(page.locator('main h1')).toBeVisible()
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
  await page.locator('#language').selectOption('it')
  await expect(page).toHaveURL(url => url.hash === `#/it/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'it')
})

test('Portuguese bibliographic Arendt note and ibid. references keep their local edition and context', async ({ page }) => {
  await page.goto('./#/pt/notes/n143')
  await expect(page.locator('blockquote')).toHaveText('H. Arendt, As Origens do Totalitarismo (Alfragide 2024), 627.')
  await expect(page.locator('main')).toContainText('nota bibliográfica')
  for (const [id, previous] of [['n007', 'n006'], ['n163', 'n162'], ['n194', 'n193'], ['n204', 'n203'], ['n207', 'n206']]) {
    await page.goto(`./#/pt/notes/${id}`)
    await expect(page.locator(`#${id}-previous`)).toHaveAttribute('href', new RegExp(`#/pt/notes/${previous}$`))
    await expect(page.locator('main')).toContainText('«ibid.» ou «ibidem» remete para a citação anterior')
  }
})

test('Portuguese navigator.language backup and explicit existing editions remain independent', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh'] })
    Object.defineProperty(navigator, 'language', { get: () => 'pt-BR' })
  })
  await page.goto('./')
  await expect(page).toHaveURL(/#\/pt\/atlas$/)
  for (const [locale, title] of [['en', 'Human dignity'], ['it', 'Dignità umana'], ['de', 'Menschenwürde'], ['es', 'Dignidad humana'], ['fr', 'Dignité humaine']]) {
    await page.goto(`./#/${locale}/concepts/dignity`)
    await expect(page.locator('h1')).toHaveText(title)
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
  }
})
