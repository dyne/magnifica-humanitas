import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import reading from '../../content/reading/fr.json' with { type: 'json' }
const require = createRequire(import.meta.url)
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const baseKind = process.env.VITE_BASE === '/' ? 'root' : 'subpath'
const key = 'mh-reading-v1-fr'
const surfaces = {
  atlas: ['atlas', 'Explorer les idées'],
  concept: ['concepts/dignity', 'Dignité humaine'],
  trail: ['trails/worth-not-reward/steps/intrinsic-worth', 'Dignité humaine'],
  read: ['read?at=read-p052', 'Lecture continue'],
  source: ['source/p052', 'Contexte de la source · §52'],
  note: ['notes/n174', 'Note de la source 174'],
  search: ['search?q=subsidiarité', 'Chercher'],
  saved: ['saved', 'Repères de lecture'],
  about: ['about', 'À propos de cette lecture'],
}

for (const width of [390, 1440]) for (const size of ['100', '200']) {
  test(`French nine-surface review ${width} text ${size}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('./#/fr/atlas')
    await expect(page.locator('#language option')).toHaveText(['English', 'Italiano', 'Deutsch', 'Español', 'Français', 'Português', 'Polski', 'Беларуская', 'Русский'])
    await page.locator('#language').focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('#appearance')).toBeFocused()
    await page.locator('#text-size').selectOption(size)
    await page.locator('header').screenshot({ path: `output/french/${baseKind}-${width}-${size}-selector.png` })
    const fontsBySurface: Record<string, unknown> = {}
    for (const [name, [route, heading]] of Object.entries(surfaces)) {
      await page.goto(`./#/fr/${route}`)
      if (name === 'read') await expect(page.locator('#read-p052')).toBeFocused()
      if (name === 'trail') await expect(page.locator('h1')).toContainText(heading)
      else await expect(page.locator('h1')).toHaveText(heading)
      await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
      await page.evaluate(() => document.fonts.ready)
      await expect(page.locator('html')).toHaveCSS('font-size', size === '200' ? '32px' : '16px')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (name === 'source' || name === 'note') await expect(page.locator('main')).toContainText(reading.editionId)
      await page.locator('h1').scrollIntoViewIfNeeded()
      await page.screenshot({ path: `output/french/${baseKind}-${width}-${size}-${name}.png` })
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
    await page.screenshot({ path: `output/french/${baseKind}-${width}-${size}-about-dark.png` })
    await test.info().attach('French painted fonts', { body: JSON.stringify(fontsBySurface), contentType: 'application/json' })
  })
}

for (const [preferences, expected] of [
  [['ar-EG', 'fr-FR', 'it-IT'], 'fr'], [['FR-ca', 'en'], 'fr'], [['it-IT', 'fr-BE'], 'it'], [['de-AT', 'fr-CH'], 'de'], [['es-MX', 'fr-FR'], 'es'], [['en-GB', 'fr-FR'], 'en'], [['ar', 'zh-CN'], 'en'],
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

test('French keyboard switching preserves query, anchor, selector focus and fresh neutral defaults', async ({ page }) => {
  await page.goto('./#/en/search?q=care#stable-anchor')
  await page.locator('#language').focus()
  await page.keyboard.press('f'); await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/fr\/search\?q=care#stable-anchor$/)
  await expect(page.locator('#language')).toBeFocused()
  await expect(page.locator('h1')).toHaveText('Chercher')
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
  await page.goto('./')
  await expect(page).toHaveURL(/#\/en\/atlas$/)
})

test('French search handles accent folding, paragraph keywords, unavailable IDs and empty results', async ({ page }) => {
  await page.goto('./#/fr/search?q=EDUCATION')
  await expect(page.locator('#search-concept-education')).toHaveText('Éducation')
  await page.getByLabel('Terme ou numéro de paragraphe').fill('PARAGRAPHE 52')
  await expect(page.locator('#search-read-p052')).toHaveText('§52 · Quatre sens de la dignité')
  await page.locator('#search-read-p052').click()
  await expect(page.locator('#read-p052')).toBeFocused()
  await page.goto('./#/fr/search?q=zzzzsinresultado')
  await expect(page.getByText('Aucun résultat pour cette recherche.', { exact: true })).toBeVisible()
  await page.goto('./#/fr/concepts/no-existe')
  await expect(page.locator('main')).toContainText('La page demandée est indisponible dans cette édition française.')
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
})

test('French saved places resume exact paragraph, preserve caller return and remain separate from English', async ({ page }) => {
  await page.goto('./#/fr/read?at=read-p176')
  await expect(page.locator('#read-p176')).toBeFocused()
  await page.locator('#read-p176').getByRole('button', { name: 'Enregistrer ce paragraphe' }).click()
  await page.locator('#nav-saved').click()
  await expect(page.locator('#saved-0')).toContainText('§176')
  await page.locator('#saved-0').click()
  await expect(page.locator('#read-p176')).toBeFocused()
  await expect(page.locator('.local-status')).toContainText('Retour à')
  await page.locator('#read-p176 .sources a').first().click()
  await expect(page.locator('h1')).toHaveText('Contexte de la source · §176')
  await expect(page.locator('#return-to-reading')).toContainText('Lecture continue')
  await page.locator('#p176-note-n174').click()
  await expect(page.locator('h1')).toHaveText('Note de la source 174')
  await expect(page.locator('blockquote')).toContainText('Les pressions politiques et, parfois aussi, économiques')
  await page.locator('#return-to-reading').click()
  await expect(page.locator('h1')).toHaveText('Contexte de la source · §176')
  await page.locator('#return-to-reading').click()
  await expect(page.locator('#read-p176 .sources a').first()).toBeFocused()
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved, key)
  expect(saved[0]).toMatchObject({ kind: 'read', entityId: 'continuous', blockId: 'read-p176' })
  await page.goto('./#/en/saved')
  await expect(page.getByText(/No saved places yet/)).toBeVisible()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved, key)).toEqual(saved)
  await page.goto('./#/fr/saved')
  await page.reload()
  await expect(page.locator('#saved-0')).toContainText('§176')
})

test('French source quotations, bibliography, note backlinks and official links use the French edition', async ({ page }) => {
  await page.goto('./#/fr/source/p052')
  await expect(page.locator('blockquote')).toContainText('dignité ontologique')
  await expect(page.locator('main')).not.toContainText('These aspects of dignity')
  await expect(page.locator('footer a[href*="vatican.va"]')).toHaveAttribute('href', /\/fr\/encyclicals\//)
  await page.goto('./#/fr/notes/n124')
  await expect(page.locator('#n124-paragraph-p101')).toHaveAttribute('href', /#\/fr\/source\/p101$/)
  await page.goto('./#/fr/notes/n211')
  await expect(page.locator('#n211-previous')).toHaveAttribute('href', /#\/fr\/notes\/n210$/)
  await page.goto('./#/fr/notes/n223')
  await expect(page.locator('blockquote')).toContainText('Méditation à l’occasion de la Veillée de prière')
})

test('failed French activation preserves exact English source title and saved state then retries without stale caller labels', async ({ page }) => {
  await page.goto('./#/en/concepts/dignity')
  await page.getByRole('button', { name: 'Save this place', exact: true }).click()
  await page.locator('.sources a').first().click()
  await expect(page.locator('h1')).toContainText('Source context · §')
  const title = await page.title()
  const path = page.url().split('#')[1]
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  await page.route(/reading-library-fr.*\.js/, route => route.abort())
  await page.locator('#language').selectOption('fr')
  await expect(page.locator('.local-status')).toContainText('This language could not load')
  await expect(page).toHaveTitle(title)
  await expect(page.locator('#language')).toHaveValue('en')
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  expect(state.saved.length).toBeGreaterThan(0)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
  await page.unroute(/reading-library-fr.*\.js/)
  await page.locator('#language').selectOption('fr')
  await expect(page).toHaveURL(new RegExp('#' + path.replace('/en/', '/fr/') + '$'))
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
})

test('cancelling a slow French library leaves the newer English concept title and reading state intact', async ({ page }) => {
  await page.goto('./#/en/concepts/dignity')
  await page.getByRole('button', { name: 'Save this place', exact: true }).click()
  await page.goto('./#/en/source/p052')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  let release!: () => void, requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reading-library-fr.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('fr'); await seen
  await page.locator('#nav-atlas').click(); await page.locator('#atlas-care').click()
  await expect(page.locator('h1')).toHaveText('Care and human presence')
  const title = await page.title()
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  const response = page.waitForResponse(/reading-library-fr.*\.js/)
  release(); await response
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(page).toHaveTitle(title)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  expect(state.saved.length).toBeGreaterThan(0)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
})

test('pending French source cannot overwrite a rapid return to the English edition', async ({ page }) => {
  await page.goto('./#/en/source/p052')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  let release!: () => void, requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reviewed-reading-context-fr.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('fr'); await seen
  await page.locator('#language').selectOption('en')
  release()
  await expect(page).toHaveURL(/#\/en\/source\/p052$/)
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  await expect(page.locator('main')).not.toContainText(reading.editionId)
})

for (const trail of reading.trails) test(`French ending ${trail.id} keeps the optional reflection and a real stopping point`, async ({ page }) => {
  await page.goto(`./#/fr/trails/${trail.id}/end`)
  await expect(page.getByText(trail.ending.text, { exact: true })).toBeVisible()
  await expect(page.getByText(trail.reflection.prompt.text, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Afficher l’explication', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(trail.reflection.feedback.text, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Afficher l’explication', exact: true })).toBeFocused()
  if (trail.reflection.scenario) await expect(page.getByText(trail.reflection.scenario.text, { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Recommencer ce parcours', exact: true })).toBeVisible()
})

for (const kind of ['note', 'read'] as const) test(`French ${kind} loading failure stays translated and supports retry`, async ({ page }) => {
  const pattern = kind === 'note' ? /reviewed-reading-context-fr.*\.js/ : /reading-sequence-fr.*\.js/
  await page.route(pattern, route => route.abort())
  await page.goto(kind === 'note' ? './#/fr/notes/n223' : './#/fr/read')
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(kind === 'note' ? 'La note n’a pas pu être chargée' : 'La lecture continue n’a pas pu être chargée')
  await page.unroute(pattern)
  await page.getByRole('button', { name: kind === 'note' ? 'Réessayer de charger la note' : 'Réessayer la lecture continue', exact: true }).click()
  if (kind === 'note') await expect(page.locator('blockquote')).toContainText('Méditation à l’occasion de la Veillée de prière')
  else await expect(page.locator('#read-p245')).toBeAttached()
})

test('French temporary storage and empty states stay usable with localized live notices', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError') } }))
  await page.goto('./#/fr/saved')
  await expect(page.getByText(/Aucun repère enregistré\./)).toBeVisible()
  await page.goto('./#/fr/concepts/dignity')
  await page.getByRole('button', { name: 'Enregistrer cet endroit', exact: true }).click()
  await expect(page.getByText('Enregistré temporairement dans cet onglet', { exact: true })).toBeVisible()
  await expect(page.locator('.local-status')).toContainText('Cet endroit n’a pas pu être enregistré sur l’appareil')
  await page.locator('#nav-saved').click()
  await expect(page.locator('#saved-0')).toContainText('Dignité humaine')
  await page.locator('#saved-0').click()
  await expect(page.locator('h1')).toHaveText('Dignité humaine')
})

test('French atlas entry requests only its active reading library and keeps context and sequence deferred', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.goto('./#/fr/atlas')
  await expect(page.locator('h1')).toHaveText('Explorer les idées')
  expect(requests.some(url => /reading-library-fr.*\.js/.test(url))).toBe(true)
  expect(requests.some(url => /reading-library-en.*\.js/.test(url))).toBe(false)
  expect(requests.some(url => /(?:reviewed-reading-context|reading-sequence)-fr.*\.js/.test(url))).toBe(false)
})

test('failed English activation from French retains the French note title, state and translated failure notice', async ({ page }) => {
  await page.goto('./#/fr/concepts/dignity')
  await page.getByRole('button', { name: 'Enregistrer cet endroit', exact: true }).click()
  await page.goto('./#/fr/notes/n223')
  await expect(page.locator('h1')).toHaveText('Note de la source 223')
  const title = await page.title()
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  await page.route(/reading-library-en.*\.js/, route => route.abort())
  await page.locator('#language').selectOption('en')
  await expect(page.locator('.local-status')).toContainText('Cette langue n’a pas pu être chargée')
  await expect(page).toHaveTitle(title)
  await expect(page.locator('h1')).toHaveText('Note de la source 223')
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  await expect(page.locator('#language')).toHaveValue('fr')
  const retained = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  expect(state.saved.length).toBeGreaterThan(0)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
})

for (const route of [
  'atlas?view=all#overview', 'concepts/dignity?from=atlas#dignity-idea', 'relations/rel-002?via=atlas#relation',
  'foundations/dignity?via=concept#foundation', 'trails/worth-not-reward/steps/intrinsic-worth?via=trails#step',
  'trails/worth-not-reward/end?via=trails#ending', 'read?at=read-p052#read-p052', 'source/p052?via=read#paragraph',
  'notes/n143?via=source#note', 'search?q=%C3%A9ducation#term', 'saved?via=nav#places', 'about?via=footer#method',
]) test(`French equivalent switching preserves stable route/query/anchor: ${route}`, async ({ page }) => {
  await page.goto(`./#/en/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.locator('#language').selectOption('fr')
  await expect(page).toHaveURL(url => url.hash === `#/fr/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  await expect(page.locator('main h1')).toBeVisible()
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
  await page.locator('#language').selectOption('it')
  await expect(page).toHaveURL(url => url.hash === `#/it/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'it')
})

test('French bibliographic Arendt note and ibid. references keep their local edition and context', async ({ page }) => {
  await page.goto('./#/fr/notes/n143')
  await expect(page.locator('blockquote')).toHaveText('H. Arendt, The Origins of Totalitarianism, III, New York 1962, p. 474.')
  await expect(page.locator('main')).toContainText('note bibliographique')
  for (const [id, previous] of [['n163', 'n162'], ['n194', 'n193']]) {
    await page.goto(`./#/fr/notes/${id}`)
    await expect(page.locator(`#${id}-previous`)).toHaveAttribute('href', new RegExp(`#/fr/notes/${previous}$`))
    await expect(page.locator('main')).toContainText('« ibid. » renvoie à la citation précédente')
  }
})

test('French navigator.language backup and explicit existing editions remain independent', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', { get: () => ['ar-EG', 'zh'] })
    Object.defineProperty(navigator, 'language', { get: () => 'fr-CA' })
  })
  await page.goto('./')
  await expect(page).toHaveURL(/#\/fr\/atlas$/)
  for (const [locale, title] of [['en', 'Human dignity'], ['it', 'Dignità umana'], ['de', 'Menschenwürde'], ['es', 'Dignidad humana']]) {
    await page.goto(`./#/${locale}/concepts/dignity`)
    await expect(page.locator('h1')).toHaveText(title)
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
  }
})
