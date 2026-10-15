import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import reading from '../../content/reading/ru.json' with { type: 'json' }
const require = createRequire(import.meta.url)
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const baseKind = process.env.VITE_BASE === '/' ? 'root' : 'subpath'
const key = 'mh-reading-v1-ru'
const surfaces = {
  atlas: ['atlas', 'Исследуйте идеи'],
  concept: ['concepts/dignity', 'Достоинство человека'],
  trail: ['trails/worth-not-reward/steps/intrinsic-worth', 'Достоинство человека'],
  read: ['read?at=read-p052', 'Читать подряд'],
  source: ['source/p052', 'Контекст источника · §52'],
  note: ['notes/n174', 'Примечание 174'],
  search: ['search?q=субсидиарность', 'Поиск по этому прочтению'],
  saved: ['saved', 'Сохраненные места и недавний путь'],
  about: ['about', 'Об этом прочтении'],
}

for (const width of [390, 1440]) for (const size of ['100', '200']) {
  test(`Russian nine-surface review ${width} text ${size}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('./#/ru/atlas')
    await expect(page.locator('#language option')).toHaveText(['English', 'Italiano', 'Deutsch', 'Español', 'Français', 'Português', 'Polski', 'Беларуская', 'Русский'])
    await page.locator('#language').focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('#appearance')).toBeFocused()
    await page.locator('#text-size').selectOption(size)
    await page.locator('header').screenshot({ path: `output/russian/${baseKind}-${width}-${size}-selector.png` })
    const fontsBySurface: Record<string, unknown> = {}
    for (const [name, [route, heading]] of Object.entries(surfaces)) {
      await page.goto(`./#/ru/${route}`)
      if (name === 'read') await expect(page.locator('#read-p052')).toBeFocused()
      if (name === 'trail') await expect(page.locator('h1')).toContainText(heading)
      else await expect(page.locator('h1')).toHaveText(heading)
      await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
      await page.evaluate(() => document.fonts.ready)
      await expect(page.locator('html')).toHaveCSS('font-size', size === '200' ? '32px' : '16px')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (name === 'source' || name === 'note') await expect(page.locator('main')).toContainText(reading.editionId)
      await page.locator('h1').scrollIntoViewIfNeeded()
      await page.screenshot({ path: `output/russian/${baseKind}-${width}-${size}-${name}.png` })
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
    await page.screenshot({ path: `output/russian/${baseKind}-${width}-${size}-about-dark.png` })
    await test.info().attach('Russian painted fonts', { body: JSON.stringify(fontsBySurface), contentType: 'application/json' })
  })
}

for (const [preferences, expected] of [
  [['ar-EG', 'ru-RU', 'it-IT'], 'ru'], [['RU-ru', 'en'], 'ru'], [['it-IT', 'ru-RU'], 'it'], [['de-AT', 'ru-RU'], 'de'], [['es-MX', 'ru-RU'], 'es'], [['en-GB', 'ru-RU'], 'en'], [['fr-FR', 'ru-RU'], 'fr'], [['pt-BR', 'ru-RU'], 'pt'], [['be-BY', 'ru-RU'], 'be'], [['ar', 'zh-CN'], 'en'],
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

test('Russian keyboard switching preserves query, anchor, selector focus and fresh neutral defaults', async ({ page }) => {
  await page.goto('./#/en/search?q=care#stable-anchor')
  await page.locator('#language').focus()
  await page.keyboard.press('End'); await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/ru\/search\?q=care#stable-anchor$/)
  await expect(page.locator('#language')).toBeFocused()
  await expect(page.locator('h1')).toHaveText('Поиск по этому прочтению')
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
  await page.goto('./')
  await expect(page).toHaveURL(/#\/en\/atlas$/)
})

test('Russian search handles canonical Cyrillic matching, paragraph keywords, unavailable IDs and empty results', async ({ page }) => {
  await page.goto('./#/ru/search?q=ДОСТОИНСТВО%20ЧЕЛОВЕКА')
  await expect(page.locator('#search-concept-dignity')).toHaveText('Достоинство человека')
  await page.goto('./#/ru/search?q=ОБРАЗОВАНИЕ')
  await expect(page.locator('#search-concept-education')).toHaveText('Образование и воспитание')
  await page.getByLabel('Термин или номер параграфа').fill('ПАРАГРАФ 52')
  await expect(page.locator('#search-read-p052')).toHaveText('§52 · Четыре значения достоинства')
  await page.locator('#search-read-p052').click()
  await expect(page.locator('#read-p052')).toBeFocused()
  await page.goto('./#/ru/search?q=zzzzsinresultado')
  await expect(page.getByText('Для этого запроса результатов нет.', { exact: true })).toBeVisible()
  await page.goto('./#/ru/concepts/no-existe')
  await expect(page.locator('main')).toContainText('Запрошенная страница недоступна в этом русском издании.')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
})

test('Russian saved places resume exact paragraph, preserve caller return and remain separate from English', async ({ page }) => {
  await page.goto('./#/ru/read?at=read-p176')
  await expect(page.locator('#read-p176')).toBeFocused()
  await page.locator('#read-p176').getByRole('button', { name: 'Сохранить этот параграф' }).click()
  await page.locator('#nav-saved').click()
  await expect(page.locator('#saved-0')).toContainText('§176')
  await page.locator('#saved-0').click()
  await expect(page.locator('#read-p176')).toBeFocused()
  await expect(page.locator('.local-status')).toContainText('Возврат к:')
  await page.locator('#read-p176 .sources a').first().click()
  await expect(page.locator('h1')).toHaveText('Контекст источника · §176')
  await expect(page.locator('#return-to-reading')).toContainText('Читать подряд')
  await page.locator('#p176-note-n174').click()
  await expect(page.locator('h1')).toHaveText('Примечание 174')
  await expect(page.locator('blockquote')).toContainText('Политическое давление, а иногда и экономические интересы')
  await page.locator('#return-to-reading').click()
  await expect(page.locator('h1')).toHaveText('Контекст источника · §176')
  await page.locator('#return-to-reading').click()
  await expect(page.locator('#read-p176 .sources a').first()).toBeFocused()
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved, key)
  expect(saved[0]).toMatchObject({ kind: 'read', entityId: 'continuous', blockId: 'read-p176' })
  await page.goto('./#/en/saved')
  await expect(page.getByText(/No saved places yet/)).toBeVisible()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved, key)).toEqual(saved)
  await page.goto('./#/ru/saved')
  await page.reload()
  await expect(page.locator('#saved-0')).toContainText('§176')
})

test('Russian source quotations, bibliography, note backlinks and official links use the Russian edition', async ({ page }) => {
  await page.goto('./#/ru/source/p052')
  await expect(page.locator('blockquote')).toContainText('достоинство онтологическое')
  await expect(page.locator('main')).not.toContainText('These aspects of dignity')
  await expect(page.locator('footer a[href*="vatican.va"]')).toHaveAttribute('href', /\/ru\/encyclicals\//)
  await page.goto('./#/ru/notes/n124')
  await expect(page.locator('#n124-paragraph-p101')).toHaveAttribute('href', /#\/ru\/source\/p101$/)
  await page.goto('./#/ru/notes/n211')
  await expect(page.locator('#n211-previous')).toHaveAttribute('href', /#\/ru\/notes\/n210$/)
  await page.goto('./#/ru/notes/n223')
  await expect(page.locator('blockquote')).toContainText('Размышление во время молитвенного бдения')
})

test('failed Russian activation preserves exact English source title and saved state then retries without stale caller labels', async ({ page }) => {
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
  await page.route(/reading-library-ru.*\.js/, route => route.abort())
  await page.locator('#language').selectOption('ru')
  await expect(page.locator('.local-status')).toContainText('This language could not load')
  await expect(page).toHaveTitle(title)
  await expect(page.locator('#language')).toHaveValue('en')
  expect(await page.evaluate(() => ({ length: history.length, state: history.state, url: location.href }))).toEqual(historyBefore)
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  expect(state.saved.length).toBeGreaterThan(0)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
  await page.unroute(/reading-library-ru.*\.js/)
  await page.locator('#language').selectOption('ru')
  await expect(page).toHaveURL(new RegExp('#' + path.replace('/en/', '/ru/') + '$'))
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
})

test('cancelling a slow Russian library leaves the newer English concept title and reading state intact', async ({ page }) => {
  await page.goto('./#/en/concepts/dignity')
  await page.getByRole('button', { name: 'Save this place', exact: true }).click()
  await page.goto('./#/en/source/p052')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  let release!: () => void, requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reading-library-ru.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('ru'); await seen
  await page.locator('#nav-atlas').click(); await page.locator('#atlas-care').click()
  await expect(page.locator('h1')).toHaveText('Care and human presence')
  const title = await page.title()
  const historyBefore = await page.evaluate(() => ({ length: history.length, state: history.state, url: location.href }))
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  const response = page.waitForResponse(/reading-library-ru.*\.js/)
  release(); await response
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(page).toHaveTitle(title)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  expect(await page.evaluate(() => ({ length: history.length, state: history.state, url: location.href }))).toEqual(historyBefore)
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  expect(state.saved.length).toBeGreaterThan(0)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
})

test('pending Russian source cannot overwrite a rapid return to the English edition', async ({ page }) => {
  await page.goto('./#/en/concepts/dignity')
  await page.getByRole('button', { name: 'Save this place', exact: true }).click()
  await page.goto('./#/en/source/p052')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  let release!: () => void, requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reviewed-reading-context-ru.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('ru'); await seen
  await page.locator('#language').selectOption('en')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  const title = await page.title()
  const before = await page.evaluate(() => ({ history: history.state, length: history.length, url: location.href, state: JSON.parse(localStorage.getItem('mh-reading-v1')!) }))
  expect(before.state.saved.length).toBeGreaterThan(0)
  const response = page.waitForResponse(/reviewed-reading-context-ru.*\.js/)
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

for (const trail of reading.trails) test(`Russian ending ${trail.id} keeps the optional reflection and a real stopping point`, async ({ page }) => {
  await page.goto(`./#/ru/trails/${trail.id}/end`)
  await expect(page.getByText(trail.ending.text, { exact: true })).toBeVisible()
  await expect(page.getByText(trail.reflection.prompt.text, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Показать объяснение', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(trail.reflection.feedback.text, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Показать объяснение', exact: true })).toBeFocused()
  if (trail.reflection.scenario) await expect(page.getByText(trail.reflection.scenario.text, { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Начать этот маршрут заново', exact: true })).toBeVisible()
})

for (const kind of ['note', 'read'] as const) test(`Russian ${kind} loading failure stays translated and supports retry`, async ({ page }) => {
  const pattern = kind === 'note' ? /reviewed-reading-context-ru.*\.js/ : /reading-sequence-ru.*\.js/
  await page.route(pattern, route => route.abort())
  await page.goto(kind === 'note' ? './#/ru/notes/n223' : './#/ru/read')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(kind === 'note' ? 'Не удалось загрузить примечание' : 'Не удалось загрузить последовательное чтение')
  await page.unroute(pattern)
  await page.getByRole('button', { name: kind === 'note' ? 'Повторить загрузку примечания' : 'Повторить загрузку чтения', exact: true }).click()
  if (kind === 'note') await expect(page.locator('blockquote')).toContainText('Размышление во время молитвенного бдения')
  else await expect(page.locator('#read-p245')).toBeAttached()
})

test('Russian temporary storage and empty states stay usable with localized live notices', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError') } }))
  await page.goto('./#/ru/saved')
  await expect(page.getByText(/Сохраненных мест пока нет\./)).toBeVisible()
  await page.goto('./#/ru/concepts/dignity')
  await page.getByRole('button', { name: 'Сохранить это место', exact: true }).click()
  await expect(page.getByText('Временно сохранено в этой вкладке', { exact: true })).toBeVisible()
  await expect(page.locator('.local-status')).toContainText('Не удалось сохранить это место на устройстве')
  await page.locator('#nav-saved').click()
  await expect(page.locator('#saved-0')).toContainText('Достоинство человека')
  await page.locator('#saved-0').click()
  await expect(page.locator('h1')).toHaveText('Достоинство человека')
})

test('Russian atlas entry requests only its active reading library and keeps context and sequence deferred', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.goto('./#/ru/atlas')
  await expect(page.locator('h1')).toHaveText('Исследуйте идеи')
  expect(requests.some(url => /reading-library-ru.*\.js/.test(url))).toBe(true)
  expect(requests.some(url => /reading-library-en.*\.js/.test(url))).toBe(false)
  expect(requests.some(url => /(?:reviewed-reading-context|reading-sequence)-ru.*\.js/.test(url))).toBe(false)
})

test('failed English activation from Russian retains the Russian note title, state and translated failure notice', async ({ page }) => {
  await page.goto('./#/ru/concepts/dignity')
  await page.getByRole('button', { name: 'Сохранить это место', exact: true }).click()
  await page.goto('./#/ru/notes/n223')
  await expect(page.locator('h1')).toHaveText('Примечание 223')
  await page.locator('h1').focus()
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')))
  await expect.poll(() => page.evaluate(() => history.state.mhReader?.focusId)).toBe('page-heading')
  const title = await page.title()
  const historyBefore = await page.evaluate(() => ({ length: history.length, state: history.state, url: location.href }))
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  await page.route(/reading-library-en.*\.js/, route => route.abort())
  await page.locator('#language').selectOption('en')
  await expect(page.locator('.local-status')).toContainText('Не удалось загрузить этот язык')
  await expect(page).toHaveTitle(title)
  await expect(page.locator('h1')).toHaveText('Примечание 223')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await expect(page.locator('#language')).toHaveValue('ru')
  expect(await page.evaluate(() => ({ length: history.length, state: history.state, url: location.href }))).toEqual(historyBefore)
  const retained = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  expect(state.saved.length).toBeGreaterThan(0)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
})

for (const route of [
  'atlas?view=all#overview', 'concepts/dignity?from=atlas#dignity-idea', 'relations/rel-002?via=atlas#relation',
  'foundations/dignity?via=concept#foundation', 'trails/worth-not-reward/steps/intrinsic-worth?via=trails#step',
  'trails/worth-not-reward/end?via=trails#ending', 'read?at=read-p052#read-p052', 'source/p052?via=read#paragraph',
  'notes/n143?via=source#note', 'search?q=%D0%B4%D0%BE%D1%81%D1%82%D0%BE%D0%B8%D0%BD%D1%81%D1%82%D0%B2%D0%BE#term', 'saved?via=nav#places', 'about?via=footer#method',
]) test(`Russian equivalent switching preserves stable route/query/anchor: ${route}`, async ({ page }) => {
  await page.goto(`./#/en/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.locator('#language').selectOption('ru')
  await expect(page).toHaveURL(url => url.hash === `#/ru/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await expect(page.locator('main h1')).toBeVisible()
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
  await page.locator('#language').selectOption('it')
  await expect(page).toHaveURL(url => url.hash === `#/it/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'it')
})

test('Russian navigator.language backup and explicit existing editions remain independent', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', { get: () => ['ar-EG', 'zh'] })
    Object.defineProperty(navigator, 'language', { get: () => 'ru-RU' })
  })
  await page.goto('./')
  await expect(page).toHaveURL(/#\/ru\/atlas$/)
  for (const [locale, title] of [['en', 'Human dignity'], ['it', 'Dignità umana'], ['de', 'Menschenwürde'], ['es', 'Dignidad humana'], ['fr', 'Dignité humaine'], ['pt', 'Dignidade humana']]) {
    await page.goto(`./#/${locale}/concepts/dignity`)
    await expect(page.locator('h1')).toHaveText(title)
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
  }
})


test('Russian local bibliography and note links retain the translator caveat and precedents', async ({ page }) => {
  await page.goto('./#/ru/notes/n133')
  await expect(page.locator('main')).toContainText('аргумент и ссылка')
  await expect(page.locator('blockquote')).toContainText('распространенного русского перевода, сделанного еще в СССР')
  await expect(page.locator('#n133-paragraph-p121')).toHaveAttribute('href', /#\/ru\/source\/p121$/)
  await expect(page.locator('#n133-previous')).toHaveCount(0)
  await page.goto('./#/ru/notes/n143')
  await expect(page.locator('blockquote')).toContainText('Москва 1996, 615')
  await expect(page.locator('main')).toContainText('библиографическое примечание')
  for (const [id, previous] of [['n002', 'n001'], ['n007', 'n006'], ['n163', 'n162'], ['n194', 'n193'], ['n204', 'n203'], ['n207', 'n206']]) {
    await page.goto(`./#/ru/notes/${id}`)
    await expect(page.locator(`#${id}-previous`)).toHaveAttribute('href', new RegExp(`#/ru/notes/${previous}$`))
    await expect(page.locator('main')).toContainText('«там же» отсылает к предшествующей цитате')
  }
  for (const id of ['n066', 'n067', 'n201']) {
    await page.goto(`./#/ru/notes/${id}`)
    await expect(page.locator('main')).toContainText('«он же» обозначает того же автора')
  }
  await page.goto('./#/ru/notes/n217')
  await expect(page.locator('#n217-previous')).toHaveCount(0)
  await expect(page.locator('blockquote')).toContainText('Ср. выше, № 11–14.')
})

for (const [id, required] of [
  ['p052', ['Нравственное достоинство', 'социальное', 'экзистенциальное', 'Онтологическое', 'не утрачивается', 'Бог пожелал, сотворил и возлюбил']],
  ['p118', ['обязанность стремиться устранить страдание', 'не оправдывает отказа в лечении', 'отношения с Богом']],
  ['p133', ['первородный грех', 'совесть', 'праву нужны не одни санкции']],
  ['p176', ['запоздалое осуждение', 'владение рабами', 'узаконивавшие', 'Восемнадцать веков', 'от имени Церкви просит прощения', '1866']],
  ['p198', ['запрещает передавать', 'смертельными или иными необратимыми', 'требует закладывать ценности и благоразумное суждение']],
  ['p244', ['Вдова, сирота, чужеземец, раненый ребенок, изгнанник и беженец']],
] as const) test(`Russian standalone source ${id} retains its local argument independently`, async ({ page }) => {
  await page.goto(`./#/ru/source/${id}`)
  const text = reading.contexts.find(c => c.paragraphId === id)!.explanation.text
  const explanation = page.locator('main > p').filter({ hasText: text }).first()
  await expect(explanation).toBeVisible()
  for (const phrase of required) await expect(explanation).toContainText(phrase)
  await expect(page.locator('main')).not.toContainText('These aspects of dignity')
})

test('Russian Psalm numbering stays distinct from note84 and the grammatical defect is not repaired', async ({ page }) => {
  await page.goto('./#/ru/source/p215')
  const explanation = page.locator('main > p').filter({ hasText: reading.contexts.find(c => c.paragraphId === 'p215')!.explanation.text }).first()
  await expect(explanation).toContainText('грамматически поврежден')
  await expect(explanation).toContainText('Псалом 84(85) — библейская нумерация, не примечание 84')
  await expect(page.locator('#p215-note-n084')).toHaveCount(0)
  await page.locator('#p215-note-n191').click()
  await expect(page.locator('blockquote')).toContainText('СВ. АВГУСТИН, Enarrationes in Psalmos, 84, 12.')
  await expect(page.locator('#n191-paragraph-p215')).toHaveAttribute('href', /#\/ru\/source\/p215$/)
  await page.goto('./#/ru/notes/n084')
  await expect(page.locator('#n084-paragraph-p064')).toHaveAttribute('href', /#\/ru\/source\/p064$/)
  await expect(page.locator('#n084-paragraph-p215')).toHaveCount(0)
})

test('Russian actual й and ё glyphs paint with local Inter and decomposed search is equivalent', async ({ page }) => {
  await page.goto('./#/ru/source/p112')
  const text = reading.contexts.find(c => c.paragraphId === 'p112')!.explanation.text
  const explanation = page.locator('main > p').filter({ hasText: text }).first()
  await expect(explanation).toBeVisible()
  expect(text).toContain('й'); expect(text).toContain('ё')
  await explanation.evaluate(e => e.setAttribute('data-font-witness', 'russian'))
  await page.evaluate(() => document.fonts.ready)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable')
  const { root } = await cdp.send('DOM.getDocument')
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '[data-font-witness="russian"]' })
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
  expect(fonts.every(f => f.isCustomFont && f.familyName === 'Inter')).toBe(true)
  expect(fonts.reduce((n, f) => n + f.glyphCount, 0)).toBeGreaterThan(100)
  await test.info().attach('Russian й and ё painted glyphs', { body: JSON.stringify({ text, fonts }), contentType: 'application/json' })
  await cdp.detach()
  await page.goto('./#/ru/search?q=' + encodeURIComponent('СКРЫТЫЙ ТРУД И ЭКСПЛУАТАЦИЯ'.normalize('NFD')))
  await expect(page.locator('#search-concept-exploitation')).toHaveText('Скрытый труд и эксплуатация')
})
