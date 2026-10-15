import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import reading from '../../content/reading/es.json' with { type: 'json' }
const require = createRequire(import.meta.url)
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const baseKind = process.env.VITE_BASE === '/' ? 'root' : 'subpath'
const key = 'mh-reading-v1-es'
const surfaces = {
  atlas: ['atlas', 'Explorar las ideas'],
  concept: ['concepts/dignity', 'Dignidad humana'],
  trail: ['trails/worth-not-reward/steps/intrinsic-worth', 'Dignidad humana'],
  read: ['read?at=read-p052', 'Lectura continua'],
  source: ['source/p052', 'Contexto de la fuente · §52'],
  note: ['notes/n174', 'Nota de la fuente 174'],
  search: ['search?q=subsidiariedad', 'Buscar en esta lectura'],
  saved: ['saved', 'Lugares de lectura'],
  about: ['about', 'Acerca de esta lectura'],
}

for (const width of [390, 1440]) for (const size of ['100', '200']) {
  test(`Spanish nine-surface review ${width} text ${size}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('./#/es/atlas')
    await expect(page.locator('#language option')).toHaveText(['English', 'Italiano', 'Deutsch', 'Español', 'Français', 'Português', 'Polski'])
    await page.locator('#language').focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('#appearance')).toBeFocused()
    await page.locator('#text-size').selectOption(size)
    await page.locator('header').screenshot({ path: `output/spanish/${baseKind}-${width}-${size}-selector.png` })
    const fontsBySurface: Record<string, unknown> = {}
    for (const [name, [route, heading]] of Object.entries(surfaces)) {
      await page.goto(`./#/es/${route}`)
      if (name === 'read') await expect(page.locator('#read-p052')).toBeFocused()
      if (name === 'trail') await expect(page.locator('h1')).toContainText(heading)
      else await expect(page.locator('h1')).toHaveText(heading)
      await expect(page.locator('html')).toHaveAttribute('lang', 'es')
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
      await page.evaluate(() => document.fonts.ready)
      await expect(page.locator('html')).toHaveCSS('font-size', size === '200' ? '32px' : '16px')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (name === 'source' || name === 'note') await expect(page.locator('main')).toContainText(reading.editionId)
      await page.locator('h1').scrollIntoViewIfNeeded()
      await page.screenshot({ path: `output/spanish/${baseKind}-${width}-${size}-${name}.png` })
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
    await page.screenshot({ path: `output/spanish/${baseKind}-${width}-${size}-about-dark.png` })
    await test.info().attach('Spanish painted fonts', { body: JSON.stringify(fontsBySurface), contentType: 'application/json' })
  })
}

for (const [preferences, expected] of [
  [['be-BY', 'es-ES', 'it-IT'], 'es'], [['ES-mx', 'en'], 'es'], [['it-IT', 'es-ES'], 'it'], [['de-AT', 'es-AR'], 'de'], [['en-GB', 'es-ES'], 'en'], [['ar', 'ru-RU'], 'en'],
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

test('Spanish keyboard switching preserves query, anchor, selector focus and fresh neutral defaults', async ({ page }) => {
  await page.goto('./#/en/search?q=care#stable-anchor')
  await page.locator('#language').focus()
  await page.keyboard.press('e'); await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/es\/search\?q=care#stable-anchor$/)
  await expect(page.locator('#language')).toBeFocused()
  await expect(page.locator('h1')).toHaveText('Buscar en esta lectura')
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
  await page.goto('./')
  await expect(page).toHaveURL(/#\/en\/atlas$/)
})

test('Spanish search handles accent folding, paragraph keywords, unavailable IDs and empty results', async ({ page }) => {
  await page.goto('./#/es/search?q=EDUCACION')
  await expect(page.locator('#search-concept-education')).toHaveText('Educación')
  await page.getByLabel('Término o número de párrafo').fill('PÁRRAFO 52')
  await expect(page.locator('#search-read-p052')).toHaveText('§52 · Cuatro sentidos de dignidad')
  await page.locator('#search-read-p052').click()
  await expect(page.locator('#read-p052')).toBeFocused()
  await page.goto('./#/es/search?q=zzzzsinresultado')
  await expect(page.getByText('No hay resultados para esta consulta.', { exact: true })).toBeVisible()
  await page.goto('./#/es/concepts/no-existe')
  await expect(page.locator('main')).toContainText('La página solicitada no está disponible en esta edición española.')
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
})

test('Spanish saved places resume exact paragraph, preserve caller return and remain separate from English', async ({ page }) => {
  await page.goto('./#/es/read?at=read-p176')
  await expect(page.locator('#read-p176')).toBeFocused()
  await page.locator('#read-p176').getByRole('button', { name: 'Guardar este párrafo' }).click()
  await page.locator('#nav-saved').click()
  await expect(page.locator('#saved-0')).toContainText('§176')
  await page.locator('#saved-0').click()
  await expect(page.locator('#read-p176')).toBeFocused()
  await expect(page.locator('.local-status')).toContainText('Has vuelto a')
  await page.locator('#read-p176 .sources a').first().click()
  await expect(page.locator('h1')).toHaveText('Contexto de la fuente · §176')
  await expect(page.locator('#return-to-reading')).toContainText('Lectura continua')
  await page.locator('#p176-note-n174').click()
  await expect(page.locator('h1')).toHaveText('Nota de la fuente 174')
  await expect(page.locator('blockquote')).toContainText('Las presiones políticas, y en ocasiones también las económicas')
  await page.locator('#return-to-reading').click()
  await expect(page.locator('h1')).toHaveText('Contexto de la fuente · §176')
  await page.locator('#return-to-reading').click()
  await expect(page.locator('#read-p176 .sources a').first()).toBeFocused()
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved, key)
  expect(saved[0]).toMatchObject({ kind: 'read', entityId: 'continuous', blockId: 'read-p176' })
  await page.goto('./#/en/saved')
  await expect(page.getByText(/No saved places yet/)).toBeVisible()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved, key)).toEqual(saved)
  await page.goto('./#/es/saved')
  await page.reload()
  await expect(page.locator('#saved-0')).toContainText('§176')
})

test('Spanish source quotations, bibliography, note backlinks and official links use the Spanish edition', async ({ page }) => {
  await page.goto('./#/es/source/p052')
  await expect(page.locator('blockquote')).toContainText('dignidad ontológica')
  await expect(page.locator('main')).not.toContainText('These aspects of dignity')
  await expect(page.locator('footer a[href*="vatican.va"]')).toHaveAttribute('href', /\/es\/encyclicals\//)
  await page.goto('./#/es/notes/n124')
  await expect(page.locator('#n124-paragraph-p101')).toHaveAttribute('href', /#\/es\/source\/p101$/)
  await page.goto('./#/es/notes/n211')
  await expect(page.locator('#n211-previous')).toHaveAttribute('href', /#\/es\/notes\/n210$/)
  await page.goto('./#/es/notes/n223')
  await expect(page.locator('blockquote')).toContainText('Meditación del Rosario por la paz')
})

test('failed Spanish activation preserves exact English source title and saved state then retries without stale caller labels', async ({ page }) => {
  await page.goto('./#/en/concepts/dignity')
  await page.getByRole('button', { name: 'Save this place', exact: true }).click()
  await page.locator('.sources a').first().click()
  await expect(page.locator('h1')).toContainText('Source context · §')
  const title = await page.title()
  const path = page.url().split('#')[1]
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  await page.route(/reading-library-es.*\.js/, route => route.abort())
  await page.locator('#language').selectOption('es')
  await expect(page.locator('.local-status')).toContainText('This language could not load')
  await expect(page).toHaveTitle(title)
  await expect(page.locator('#language')).toHaveValue('en')
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  expect(state.saved.length).toBeGreaterThan(0)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
  await page.unroute(/reading-library-es.*\.js/)
  await page.locator('#language').selectOption('es')
  await expect(page).toHaveURL(new RegExp('#' + path.replace('/en/', '/es/') + '$'))
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
})

test('cancelling a slow Spanish library leaves the newer English concept title and reading state intact', async ({ page }) => {
  await page.goto('./#/en/concepts/dignity')
  await page.getByRole('button', { name: 'Save this place', exact: true }).click()
  await page.goto('./#/en/source/p052')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  let release!: () => void, requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reading-library-es.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('es'); await seen
  await page.locator('#nav-atlas').click(); await page.locator('#atlas-care').click()
  await expect(page.locator('h1')).toHaveText('Care and human presence')
  const title = await page.title()
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  const response = page.waitForResponse(/reading-library-es.*\.js/)
  release(); await response
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(page).toHaveTitle(title)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  expect(state.saved.length).toBeGreaterThan(0)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
})

test('pending Spanish source cannot overwrite a rapid return to the English edition', async ({ page }) => {
  await page.goto('./#/en/source/p052')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  let release!: () => void, requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reviewed-reading-context-es.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('es'); await seen
  await page.locator('#language').selectOption('en')
  release()
  await expect(page).toHaveURL(/#\/en\/source\/p052$/)
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  await expect(page.locator('main')).not.toContainText(reading.editionId)
})

for (const trail of reading.trails) test(`Spanish ending ${trail.id} keeps the optional reflection and a real stopping point`, async ({ page }) => {
  await page.goto(`./#/es/trails/${trail.id}/end`)
  await expect(page.getByText(trail.ending.text, { exact: true })).toBeVisible()
  await expect(page.getByText(trail.reflection.prompt.text, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Mostrar explicación', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(trail.reflection.feedback.text, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mostrar explicación', exact: true })).toBeFocused()
  if (trail.reflection.scenario) await expect(page.getByText(trail.reflection.scenario.text, { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Reiniciar este recorrido', exact: true })).toBeVisible()
})

for (const kind of ['note', 'read'] as const) test(`Spanish ${kind} loading failure stays translated and supports retry`, async ({ page }) => {
  const pattern = kind === 'note' ? /reviewed-reading-context-es.*\.js/ : /reading-sequence-es.*\.js/
  await page.route(pattern, route => route.abort())
  await page.goto(kind === 'note' ? './#/es/notes/n223' : './#/es/read')
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(kind === 'note' ? 'No se pudo cargar la nota de la fuente' : 'No se pudo cargar la lectura continua')
  await page.unroute(pattern)
  await page.getByRole('button', { name: kind === 'note' ? 'Reintentar la nota de la fuente' : 'Reintentar la lectura continua', exact: true }).click()
  if (kind === 'note') await expect(page.locator('blockquote')).toContainText('Meditación del Rosario por la paz')
  else await expect(page.locator('#read-p245')).toBeAttached()
})

test('Spanish temporary storage and empty states stay usable with localized live notices', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError') } }))
  await page.goto('./#/es/saved')
  await expect(page.getByText(/Aún no hay lugares guardados\./)).toBeVisible()
  await page.goto('./#/es/concepts/dignity')
  await page.getByRole('button', { name: 'Guardar este lugar', exact: true }).click()
  await expect(page.getByText('Guardado temporalmente en esta pestaña', { exact: true })).toBeVisible()
  await expect(page.locator('.local-status')).toContainText('No se pudo guardar este lugar en el dispositivo')
  await page.locator('#nav-saved').click()
  await expect(page.locator('#saved-0')).toContainText('Dignidad humana')
  await page.locator('#saved-0').click()
  await expect(page.locator('h1')).toHaveText('Dignidad humana')
})

test('Spanish atlas entry requests only its active reading library and keeps context and sequence deferred', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.goto('./#/es/atlas')
  await expect(page.locator('h1')).toHaveText('Explorar las ideas')
  expect(requests.some(url => /reading-library-es.*\.js/.test(url))).toBe(true)
  expect(requests.some(url => /reading-library-en.*\.js/.test(url))).toBe(false)
  expect(requests.some(url => /(?:reviewed-reading-context|reading-sequence)-es.*\.js/.test(url))).toBe(false)
})

test('failed English activation from Spanish retains the Spanish note title, state and translated failure notice', async ({ page }) => {
  await page.goto('./#/es/concepts/dignity')
  await page.getByRole('button', { name: 'Guardar este lugar', exact: true }).click()
  await page.goto('./#/es/notes/n223')
  await expect(page.locator('h1')).toHaveText('Nota de la fuente 223')
  const title = await page.title()
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  await page.route(/reading-library-en.*\.js/, route => route.abort())
  await page.locator('#language').selectOption('en')
  await expect(page.locator('.local-status')).toContainText('No se pudo cargar este idioma')
  await expect(page).toHaveTitle(title)
  await expect(page.locator('h1')).toHaveText('Nota de la fuente 223')
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.locator('#language')).toHaveValue('es')
  const retained = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  expect(state.saved.length).toBeGreaterThan(0)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
})

for (const route of [
  'atlas?view=all#overview', 'concepts/dignity?from=atlas#dignity-idea', 'relations/rel-002?via=atlas#relation',
  'foundations/dignity?via=concept#foundation', 'trails/worth-not-reward/steps/intrinsic-worth?via=trails#step',
  'trails/worth-not-reward/end?via=trails#ending', 'read?at=read-p052#read-p052', 'source/p052?via=read#paragraph',
  'notes/n143?via=source#note', 'search?q=educaci%C3%B3n#term', 'saved?via=nav#places', 'about?via=footer#method',
]) test(`Spanish equivalent switching preserves stable route/query/anchor: ${route}`, async ({ page }) => {
  await page.goto(`./#/en/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.locator('#language').selectOption('es')
  await expect(page).toHaveURL(url => url.hash === `#/es/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.locator('main h1')).toBeVisible()
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
  await page.locator('#language').selectOption('it')
  await expect(page).toHaveURL(url => url.hash === `#/it/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'it')
})

test('Spanish bibliographic Arendt note and ibíd. references keep their local edition and context', async ({ page }) => {
  await page.goto('./#/es/notes/n143')
  await expect(page.locator('blockquote')).toHaveText('H. Arendt, Los orígenes del totalitarismo, Madrid 2014, 634.')
  await expect(page.locator('main')).toContainText('nota bibliográfica')
  for (const [id, previous] of [['n163', 'n162'], ['n194', 'n193']]) {
    await page.goto(`./#/es/notes/${id}`)
    await expect(page.locator(`#${id}-previous`)).toHaveAttribute('href', new RegExp(`#/es/notes/${previous}$`))
    await expect(page.locator('main')).toContainText('«ibíd.» remite a la cita anterior')
  }
})

test('Spanish navigator.language backup and explicit Italian entry remain independent', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', { get: () => ['be-BY', 'ru'] })
    Object.defineProperty(navigator, 'language', { get: () => 'es-CO' })
  })
  await page.goto('./')
  await expect(page).toHaveURL(/#\/es\/atlas$/)
  await page.goto('./#/it/concepts/dignity')
  await expect(page.locator('h1')).toHaveText('Dignità umana')
  await expect(page.locator('html')).toHaveAttribute('lang', 'it')
})
