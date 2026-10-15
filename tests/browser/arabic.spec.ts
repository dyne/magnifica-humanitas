import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import messages from '../../content/messages/ar.json' with { type: 'json' }
const ui = (key: keyof typeof messages, values: Record<string, string | number> = {}) => messages[key].replace(/\{([^}]+)\}/g, (_, name) => typeof values[name] === 'number' ? `\u2068${new Intl.NumberFormat('ar', { numberingSystem: 'arab' }).format(values[name] as number)}\u2069` : String(values[name]))
import reading from '../../content/reading/ar.json' with { type: 'json' }
const require = createRequire(import.meta.url)
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const baseKind = process.env.VITE_BASE === '/' ? 'root' : 'subpath'
const key = 'mh-reading-v1-ar'
const surfaces = {
  atlas: ['atlas', 'استكشف الأفكار'],
  concept: ['concepts/dignity', 'كرامة الإنسان'],
  trail: ['trails/worth-not-reward/steps/intrinsic-worth', 'كرامة الإنسان'],
  read: ['read?at=read-p052', 'قراءة متصلة'],
  source: ['source/p052', ui('source.source_context_value', { value1: 52 })],
  note: ['notes/n174', ui('source.source_note_value', { value1: 174 })],
  search: ['search?q=اللامركزية والتكامل', 'ابحث في هذه القراءة'],
  saved: ['saved', 'المواضع المحفوظة والمسار الأخير'],
  about: ['about', 'عن هذه القراءة'],
}

for (const width of [390, 1440]) for (const size of ['100', '200']) {
  test(`Arabic nine-surface review ${width} text ${size}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('./#/ar/atlas')
    await expect(page.locator('#language option')).toHaveText(['English', 'Italiano', 'Deutsch', 'Español', 'Français', 'Português', 'Polski', 'Беларуская', 'Русский', 'العربية'])
    await page.locator('#language').focus()
    await page.keyboard.press('Tab')
    await expect(page.locator('#appearance')).toBeFocused()
    await page.locator('#text-size').selectOption(size)
    await page.locator('header').screenshot({ path: `output/arabic/${baseKind}-${width}-${size}-selector.png` })
    const fontsBySurface: Record<string, unknown> = {}
    for (const [name, [route, heading]] of Object.entries(surfaces)) {
      await page.goto(`./#/ar/${route}`)
      if (name === 'read') await expect(page.locator('#read-p052')).toBeFocused()
      if (name === 'trail') await expect(page.locator('h1')).toContainText(heading)
      else await expect(page.locator('h1')).toHaveText(heading)
      await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
      await page.evaluate(() => document.fonts.ready)
      await expect(page.locator('html')).toHaveCSS('font-size', size === '200' ? '32px' : '16px')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (name === 'source' || name === 'note') await expect(page.locator('main')).toContainText(reading.editionId)
      await page.locator('h1').scrollIntoViewIfNeeded()
      await page.screenshot({ path: `output/arabic/${baseKind}-${width}-${size}-${name}.png` })
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('DOM.enable'); await cdp.send('CSS.enable')
      const { root } = await cdp.send('DOM.getDocument')
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'h1' })
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
      expect(fonts.some(font => font.isCustomFont && font.glyphCount > 0)).toBe(true)
      expect(fonts.every(font => font.isCustomFont)).toBe(true)
      expect(fonts.some(font => font.familyName === 'Noto Sans Arabic')).toBe(true)
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
    await page.screenshot({ path: `output/arabic/${baseKind}-${width}-${size}-about-dark.png` })
    await test.info().attach('Arabic painted fonts', { body: JSON.stringify(fontsBySurface), contentType: 'application/json' })
  })
}

for (const [preferences, expected] of [
  [['zh-CN', 'ar-EG', 'it-IT'], 'ar'], [['AR-eg', 'en'], 'ar'], [['it-IT', 'ar-EG'], 'it'], [['de-AT', 'ar-EG'], 'de'], [['es-MX', 'ar-EG'], 'es'], [['en-GB', 'ar-EG'], 'en'], [['fr-FR', 'ar-EG'], 'fr'], [['pt-BR', 'ar-EG'], 'pt'], [['be-BY', 'ar-EG'], 'be'], [['ja', 'zh-CN'], 'en'],
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

test('Arabic keyboard switching preserves query, anchor, selector focus and fresh neutral defaults', async ({ page }) => {
  await page.goto('./#/en/search?q=care#stable-anchor')
  await page.locator('#language').focus()
  await page.keyboard.press('Space'); await page.keyboard.press('End'); await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#\/ar\/search\?q=care#stable-anchor$/)
  await expect(page.locator('#language')).toBeFocused()
  await expect(page.locator('h1')).toHaveText('ابحث في هذه القراءة')
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
  await page.goto('./')
  await expect(page).toHaveURL(/#\/en\/atlas$/)
})

test('Arabic search handles Arabic harakat/alif matching, paragraph keywords, unavailable IDs and empty results', async ({ page }) => {
  await page.goto('./#/ar/search?q=كرامة%20الإنسان')
  await expect(page.locator('#search-concept-dignity')).toHaveText('كرامة الإنسان')
  await page.goto('./#/ar/search?q=التربية')
  await expect(page.locator('#search-concept-education')).toHaveText('التّربية')
  await page.getByLabel('كلمة أو رقم فقرة').fill('فقرة ٥٢')
  await expect(page.locator('#search-read-p052')).toHaveText('§٥٢ · أربعة معانٍ للكرامة')
  await page.locator('#search-read-p052').click()
  await expect(page.locator('#read-p052')).toBeFocused()
  await page.goto('./#/ar/search?q=zzzzsinresultado')
  await expect(page.getByText('لا نتائج لهذا الاستعلام.', { exact: true })).toBeVisible()
  await page.goto('./#/ar/concepts/no-existe')
  await expect(page.locator('main')).toContainText('الصفحة المطلوبة غير متاحة في هذه الطبعة العربية.')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
})

test('Arabic saved places resume exact paragraph, preserve caller return and remain separate from English', async ({ page }) => {
  await page.goto('./#/ar/read?at=read-p176')
  await expect(page.locator('#read-p176')).toBeFocused()
  await page.locator('#read-p176').getByRole('button', { name: 'احفظ هذه الفقرة' }).click()
  await page.locator('#nav-saved').click()
  await expect(page.locator('#saved-0')).toContainText('١٧٦')
  await page.locator('#saved-0').click()
  await expect(page.locator('#read-p176')).toBeFocused()
  await expect(page.locator('.local-status')).toContainText('عُدت إلى')
  await page.locator('#read-p176 .sources a').first().click()
  await expect(page.locator('h1')).toHaveText(ui('source.source_context_value', { value1: 176 }))
  await expect(page.locator('#return-to-reading')).toContainText('قراءة متصلة')
  await page.locator('#p176-note-n174').click()
  await expect(page.locator('h1')).toHaveText(ui('source.source_note_value', { value1: 174 }))
  await expect(page.locator('blockquote')).toContainText('الضّغوط السّياسيّة، وأحيانًا الاقتصاديّة')
  await page.locator('#return-to-reading').click()
  await expect(page.locator('h1')).toHaveText(ui('source.source_context_value', { value1: 176 }))
  await page.locator('#return-to-reading').click()
  await expect(page.locator('#read-p176 .sources a').first()).toBeFocused()
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved, key)
  expect(saved[0]).toMatchObject({ kind: 'read', entityId: 'continuous', blockId: 'read-p176' })
  await page.goto('./#/en/saved')
  await expect(page.getByText(/No saved places yet/)).toBeVisible()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).saved, key)).toEqual(saved)
  await page.goto('./#/ar/saved')
  await page.reload()
  await expect(page.locator('#saved-0')).toContainText('١٧٦')
})

test('Arabic source quotations, bibliography, note backlinks and official links use the Arabic edition', async ({ page }) => {
  await page.goto('./#/ar/source/p052')
  await expect(page.locator('blockquote')).toContainText('الكرامة الوجوديّة')
  await expect(page.locator('main')).not.toContainText('These aspects of dignity')
  await expect(page.locator('footer a[href*="vatican.va"]')).toHaveAttribute('href', /\/ar\/encyclicals\//)
  await page.goto('./#/ar/notes/n124')
  await expect(page.locator('#n124-paragraph-p101')).toHaveAttribute('href', /#\/ar\/source\/p101$/)
  await page.goto('./#/ar/notes/n211')
  await expect(page.locator('#n211-previous')).toHaveAttribute('href', /#\/ar\/notes\/n210$/)
  await page.goto('./#/ar/notes/n223')
  await expect(page.locator('blockquote')).toContainText('تأمّل في عشيّة الصّلاة من أجل السّلام')
})

test('failed Arabic activation preserves exact English source title and saved state then retries without stale caller labels', async ({ page }) => {
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
  await page.route(/reading-library-ar.*\.js/, route => route.abort())
  await page.locator('#language').selectOption('ar')
  await expect(page.locator('.local-status')).toContainText('This language could not load')
  await expect(page).toHaveTitle(title)
  await expect(page.locator('#language')).toHaveValue('en')
  expect(await page.evaluate(() => ({ length: history.length, state: history.state, url: location.href }))).toEqual(historyBefore)
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  expect(state.saved.length).toBeGreaterThan(0)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
  await page.unroute(/reading-library-ar.*\.js/)
  await page.locator('#language').selectOption('ar')
  await expect(page).toHaveURL(new RegExp('#' + path.replace('/en/', '/ar/') + '$'))
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
})

test('cancelling a slow Arabic library leaves the newer English concept title and reading state intact', async ({ page }) => {
  await page.goto('./#/en/concepts/dignity')
  await page.getByRole('button', { name: 'Save this place', exact: true }).click()
  await page.goto('./#/en/source/p052')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  let release!: () => void, requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reading-library-ar.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('ar'); await seen
  await page.locator('#nav-atlas').click(); await page.locator('#atlas-care').click()
  await expect(page.locator('h1')).toHaveText('Care and human presence')
  const title = await page.title()
  const historyBefore = await page.evaluate(() => ({ length: history.length, state: history.state, url: location.href }))
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  const response = page.waitForResponse(/reading-library-ar.*\.js/)
  release(); await response
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(page).toHaveTitle(title)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  expect(await page.evaluate(() => ({ length: history.length, state: history.state, url: location.href }))).toEqual(historyBefore)
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('mh-reading-v1')!))
  expect(state.saved.length).toBeGreaterThan(0)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
})

test('pending Arabic source cannot overwrite a rapid return to the English edition', async ({ page }) => {
  await page.goto('./#/en/concepts/dignity')
  await page.getByRole('button', { name: 'Save this place', exact: true }).click()
  await page.goto('./#/en/source/p052')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  let release!: () => void, requested!: () => void
  const seen = new Promise<void>(resolve => { requested = resolve })
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(/reviewed-reading-context-ar.*\.js/, async route => { requested(); await pending; await route.continue() })
  await page.locator('#language').selectOption('ar'); await seen
  await page.locator('#language').selectOption('en')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  const title = await page.title()
  const before = await page.evaluate(() => ({ history: history.state, length: history.length, url: location.href, state: JSON.parse(localStorage.getItem('mh-reading-v1')!) }))
  expect(before.state.saved.length).toBeGreaterThan(0)
  const response = page.waitForResponse(/reviewed-reading-context-ar.*\.js/)
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

for (const trail of reading.trails) test(`Arabic ending ${trail.id} keeps the optional reflection and a real stopping point`, async ({ page }) => {
  await page.goto(`./#/ar/trails/${trail.id}/end`)
  await expect(page.getByText(trail.ending.text, { exact: true })).toBeVisible()
  await expect(page.getByText(trail.reflection.prompt.text, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'أظهر الشرح', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(trail.reflection.feedback.text, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'أظهر الشرح', exact: true })).toBeFocused()
  if (trail.reflection.scenario) await expect(page.getByText(trail.reflection.scenario.text, { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'ابدأ هذا المسار من جديد', exact: true })).toBeVisible()
})

for (const kind of ['note', 'read'] as const) test(`Arabic ${kind} loading failure stays translated and supports retry`, async ({ page }) => {
  const pattern = kind === 'note' ? /reviewed-reading-context-ar.*\.js/ : /reading-sequence-ar.*\.js/
  await page.route(pattern, route => route.abort())
  await page.goto(kind === 'note' ? './#/ar/notes/n223' : './#/ar/read')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(kind === 'note' ? 'تعذّر تحميل ملاحظة المصدر' : 'تعذّر تحميل القراءة المتصلة')
  await page.unroute(pattern)
  await page.getByRole('button', { name: kind === 'note' ? 'أعِد تحميل ملاحظة المصدر' : 'أعِد تحميل القراءة المتصلة', exact: true }).click()
  if (kind === 'note') await expect(page.locator('blockquote')).toContainText('تأمّل في عشيّة الصّلاة من أجل السّلام')
  else await expect(page.locator('#read-p245')).toBeAttached()
})

test('Arabic temporary storage and empty states stay usable with localized live notices', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError') } }))
  await page.goto('./#/ar/saved')
  await expect(page.getByText(/لا مواضع محفوظة بعد\./)).toBeVisible()
  await page.goto('./#/ar/concepts/dignity')
  await page.getByRole('button', { name: 'احفظ هذا الموضع', exact: true }).click()
  await expect(page.getByText('محفوظ مؤقّتًا في علامة التبويب', { exact: true })).toBeVisible()
  await expect(page.locator('.local-status')).toContainText('تعذّر حفظ هذا الموضع على الجهاز')
  await page.locator('#nav-saved').click()
  await expect(page.locator('#saved-0')).toContainText('كرامة الإنسان')
  await page.locator('#saved-0').click()
  await expect(page.locator('h1')).toHaveText('كرامة الإنسان')
})

test('Arabic atlas entry requests only its active reading library and keeps context and sequence deferred', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.goto('./#/ar/atlas')
  await expect(page.locator('h1')).toHaveText('استكشف الأفكار')
  expect(requests.some(url => /reading-library-ar.*\.js/.test(url))).toBe(true)
  expect(requests.some(url => /reading-library-en.*\.js/.test(url))).toBe(false)
  expect(requests.some(url => /(?:reviewed-reading-context|reading-sequence)-ar.*\.js/.test(url))).toBe(false)
})

test('failed English activation from Arabic retains the Arabic note title, state and translated failure notice', async ({ page }) => {
  await page.goto('./#/ar/concepts/dignity')
  await page.getByRole('button', { name: 'احفظ هذا الموضع', exact: true }).click()
  await page.goto('./#/ar/notes/n223')
  await expect(page.locator('h1')).toHaveText(ui('source.source_note_value', { value1: 223 }))
  await page.locator('h1').focus()
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')))
  await expect.poll(() => page.evaluate(() => history.state.mhReader?.focusId)).toBe('page-heading')
  const title = await page.title()
  const historyBefore = await page.evaluate(() => ({ length: history.length, state: history.state, url: location.href }))
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  await page.route(/reading-library-en.*\.js/, route => route.abort())
  await page.locator('#language').selectOption('en')
  await expect(page.locator('.local-status')).toContainText('تعذّر تحميل هذه اللغة')
  await expect(page).toHaveTitle(title)
  await expect(page.locator('h1')).toHaveText(ui('source.source_note_value', { value1: 223 }))
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page.locator('#language')).toHaveValue('ar')
  expect(await page.evaluate(() => ({ length: history.length, state: history.state, url: location.href }))).toEqual(historyBefore)
  const retained = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  expect(state.saved.length).toBeGreaterThan(0)
  for (const field of ['last', 'saved', 'recent', 'visited']) expect(retained[field]).toEqual(state[field])
})

for (const route of [
  'atlas?view=all#overview', 'concepts/dignity?from=atlas#dignity-idea', 'relations/rel-002?via=atlas#relation',
  'foundations/dignity?via=concept#foundation', 'trails/worth-not-reward/steps/intrinsic-worth?via=trails#step',
  'trails/worth-not-reward/end?via=trails#ending', 'read?at=read-p052#read-p052', 'source/p052?via=read#paragraph',
  'notes/n143?via=source#note', 'search?q=%D9%83%D8%B1%D8%A7%D9%85%D8%A9#term', 'saved?via=nav#places', 'about?via=footer#method',
]) test(`Arabic equivalent switching preserves stable route/query/anchor: ${route}`, async ({ page }) => {
  await page.goto(`./#/en/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await page.locator('#language').selectOption('ar')
  await expect(page).toHaveURL(url => url.hash === `#/ar/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page.locator('main h1')).toBeVisible()
  expect(await page.evaluate(() => history.state.mhCaller)).toBeUndefined()
  await page.locator('#language').selectOption('it')
  await expect(page).toHaveURL(url => url.hash === `#/it/${route}`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'it')
})

test('Arabic navigator.language backup and explicit existing editions remain independent', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh'] })
    Object.defineProperty(navigator, 'language', { get: () => 'ar-EG' })
  })
  await page.goto('./')
  await expect(page).toHaveURL(/#\/ar\/atlas$/)
  for (const [locale, title] of [['en', 'Human dignity'], ['it', 'Dignità umana'], ['de', 'Menschenwürde'], ['es', 'Dignidad humana'], ['fr', 'Dignité humaine'], ['pt', 'Dignidade humana']]) {
    await page.goto(`./#/${locale}/concepts/dignity`)
    await expect(page.locator('h1')).toHaveText(title)
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
  }
})



test('Arabic local notes retain exact bibliography, same-work and same-author dependencies', async ({ page }) => {
  await page.goto('./#/ar/notes/n133')
  await expect(page.locator('main')).toContainText('ملاحظة ببليوغرافية')
  await expect(page.locator('blockquote')).toHaveText('فيكتور فرانكل، بحث الإنسان عن المعنى، مقدّمة في العلاج بالكلام، بوسطن 1963، 213.')
  await expect(page.locator('#n133-previous')).toHaveCount(0)
  for (const [id, previous] of [['n002','n001'],['n026','n025'],['n033','n032'],['n163','n162'],['n193','n192'],['n194','n193'],['n204','n203'],['n207','n206'],['n211','n210']]) {
    await page.goto(`./#/ar/notes/${id}`)
    await expect(page.locator(`#${id}-previous`)).toHaveAttribute('href',new RegExp(`#/ar/notes/${previous}$`))
    await expect(page.locator('main')).toContainText('«المرجع نفسه» يحيل إلى العمل السابق')
    await expect(page.locator('main')).toContainText('«المؤلّف نفسه» إلى صاحبه مع ذكر عمل آخر')
  }
  await page.goto('./#/ar/notes/n217')
  await expect(page.locator('#n217-previous')).toHaveCount(0)
  await expect(page.locator('blockquote')).toHaveText('راجع أعلاه، الأرقام 11-14.')
})

for (const [id, required] of [
  ['p052',['الكرامة الأخلاقيّة','الكرامة الاجتماعيّة','كرامة الحياة','الكرامة الوجوديّة','لا تنقص بخطيئة','الله أراد الإنسان وخلقه وأحبّه']],
  ['p108',['جماعات المؤمنين','الهيئات الوسيطة','ملكيتها للقطاع الخاصّ وحده']],
  ['p111',['الجماعات المسيحيّة المعنيّة','الشفافية والمسؤولية','الخير الحقيقيّ']],
  ['p118',['يوجب السعي إلى إزالة الألم','لا يَعِد بإلغاء كلّ وجع ولا يجيز رفض العلاج','العلاقة الأصلية بالله']],
  ['p133',['دون أن يسمّي الأصل العربيّ هنا الخطيئة الأصلية','الضمير','قناعة لا خوفًا']],
  ['p176',['التأخير','امتلكت مؤسسات كنسية عبيدًا','أضفى شرعية','ثمانية عشر قرنًا','المغفرة باسم الكنيسة','1866']],
  ['p198',['المميتة أو غير القابلة للرجوع','أهمية غرس القيم والحكم الرشيد','لا يجيز التفويض']],
  ['p244',['الأرملة واليتيم والغريب والطفل الجريح والمنفيّ واللاجئ']],
] as const) test(`Arabic standalone source ${id} retains local meaning independently`, async ({ page }) => {
  await page.goto(`./#/ar/source/${id}`)
  const explanation = page.locator('main > p').filter({hasText:reading.contexts.find(c=>c.paragraphId===id)!.explanation.text})
  await expect(explanation).toBeVisible()
  for(const phrase of required)await expect(explanation).toContainText(phrase)
})

test('Arabic Psalm85 and Augustine note191 stay distinct from note84 and empty duplicate anchor', async ({ page }) => {
  await page.goto('./#/ar/source/p215')
  await expect(page.locator('main > p').filter({hasText:reading.contexts.find(c=>c.paragraphId==='p215')!.explanation.text})).toContainText('سؤال العربية متماسك')
  await expect(page.locator('#p215-note-n084')).toHaveCount(0)
  await page.locator('#p215-note-n191').click()
  await expect(page.locator('blockquote')).toContainText('84، 12')
  await page.goto('./#/ar/notes/n084')
  await expect(page.locator('#n084-paragraph-p064')).toHaveAttribute('href',/#\/ar\/source\/p064$/)
  await expect(page.locator('#n084-paragraph-p215')).toHaveCount(0)
  await page.goto('./#/ar/source/p066')
  await expect(page.locator('#p066-note-n071')).toHaveCount(0)
})

test('Arabic actual shaped and vocalized text paints using bundled Noto and citations isolate mixed scripts', async ({ page }) => {
  await page.goto('./#/ar/source/p052')
  await page.evaluate(()=>document.fonts.ready)
  const quote=page.locator('blockquote p').first()
  await expect(quote).toHaveText('الكرامة الوجوديّة')
  await quote.evaluate(e=>e.setAttribute('data-font-witness','arabic'))
  const cdp=await page.context().newCDPSession(page)
  await cdp.send('DOM.enable');await cdp.send('CSS.enable')
  const {root}=await cdp.send('DOM.getDocument')
  const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'[data-font-witness="arabic"]'})
  const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId})
  expect(fonts.every(f=>f.isCustomFont&&f.familyName==='Noto Sans Arabic')).toBe(true)
  expect(fonts.reduce((n,f)=>n+f.glyphCount,0)).toBeGreaterThan(5)
  const mixed=await page.locator('main').innerText()
  expect(mixed).toContain('\u2068'+reading.editionId+'\u2069')
  await expect(page.locator('.sources bdi[dir="ltr"]').first()).toHaveAttribute('dir','ltr')
  await expect(page.locator('.sources bdi[dir="ltr"]').first()).toHaveCSS('unicode-bidi','isolate')
  await expect(page.locator('h1')).toHaveText(ui('source.source_context_value',{value1:52}))
  await expect(page.locator('footer a[href*="vatican.va"]')).toHaveAttribute('href',/https:\/\/www.vatican.va\/content\/leo-xiv\/ar\//)
  await test.info().attach('Arabic shaped glyphs and bidi witnesses',{body:JSON.stringify({fonts,quote:await quote.textContent(),mixed}),contentType:'application/json'})
  await cdp.detach()
  for(const q of ['كَرَامَة الإِنْسَان','كـرامة الإنسان','كرامة الانسان']) {
    await page.goto('./#/ar/search?q='+encodeURIComponent(q))
    await expect(page.locator('#search-concept-dignity')).toHaveText('كرامة الإنسان')
  }
})

test('Arabic regional defaults and history switch direction and retain localized title at the same source', async ({ page }) => {
  await page.goto('./#/ar/source/p052')
  await expect(page.locator('h1')).toHaveText(ui('source.source_context_value',{value1:52}))
  await expect(page).toHaveTitle(ui('source.source_context_value',{value1:52})+' · الإنسانيّة الرّائعة')
  const arTitle=await page.title()
  await expect(page.locator('html')).toHaveAttribute('dir','rtl')
  await page.locator('#language').selectOption('en')
  await expect(page.locator('html')).toHaveAttribute('dir','ltr')
  await expect(page.locator('h1')).toHaveText('Source context · §52')
  const enTitle=await page.title()
  await page.goBack()
  await expect(page.locator('html')).toHaveAttribute('dir','rtl')
  await expect(page).toHaveTitle(arTitle)
  await expect(page.locator('h1')).toHaveText(ui('source.source_context_value',{value1:52}))
  await page.goForward()
  await expect(page.locator('html')).toHaveAttribute('dir','ltr')
  await expect(page).toHaveTitle(enTitle)
})

test('Arabic optional relationship diagram uses local Arabic glyphs and keeps its complete HTML equivalent', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900})
  await page.goto('./#/ar/atlas?focus=subsidiarity')
  await page.locator('.neighborhood-diagram summary').click()
  await page.evaluate(()=>document.fonts.ready)
  await expect(page.locator('svg')).toHaveAttribute('aria-hidden','true')
  const cdp=await page.context().newCDPSession(page)
  await cdp.send('DOM.enable');await cdp.send('CSS.enable')
  const {root}=await cdp.send('DOM.getDocument')
  const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'svg text'})
  const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId})
  expect(fonts.every(f=>f.isCustomFont&&f.familyName==='Noto Sans Arabic')).toBe(true)
  expect(fonts.some(f=>f.glyphCount>0)).toBe(true)
  const diagram=await page.locator('svg a').evaluateAll(links=>links.map(a=>a.getAttribute('data-relation')))
  const list=await page.locator('.relationships li').evaluateAll(links=>links.map(a=>a.getAttribute('data-relation')))
  expect(diagram).toEqual(list)
  const boxes=await page.locator('svg text').evaluateAll(nodes=>nodes.map(n=>{const b=(n as SVGGraphicsElement).getBBox();return{x:b.x,width:b.width}}))
  expect(boxes.every(b=>b.x>=0&&b.x+b.width<=900)).toBe(true)
  await page.locator('.neighborhood-diagram').screenshot({path:`output/arabic/${baseKind}-diagram.png`})
  await test.info().attach('Arabic diagram painted glyphs',{body:JSON.stringify({fonts,boxes}),contentType:'application/json'})
  await cdp.detach()
})
