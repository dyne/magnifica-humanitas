import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'

const url = new URL(process.env.PUBLISHED_URL ?? 'https://dyne.github.io/magnifica-humanitas/')
const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
assert.ok(url.protocol === 'https:' || (loopback && url.protocol === 'http:'), 'Published verification requires HTTPS (HTTP is allowed only for local smoke fixtures)')
assert.ok(url.pathname.endsWith('/'), 'PUBLISHED_URL must include its trailing slash')
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const failures = []
  page.on('pageerror', error => failures.push(error.message))
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`) })
  const release = await page.request.get(new URL('release.json', url).href)
  assert.ok(release.ok(), `Release identity unavailable (${release.status()})`)
  const identity = await release.json()
  assert.match(identity.commit, /^[a-f0-9]{40}$/)
  if (process.env.EXPECTED_RELEASE_SHA) assert.equal(identity.commit, process.env.EXPECTED_RELEASE_SHA)
  for (const [route, title] of [['atlas', 'Explore the ideas in Magnifica Humanitas'], ['concepts/dignity', 'Human dignity'], ['source/p052', 'Source context · §52']]) {
    await page.goto(`${url.href}#/en/${route}`)
    await page.getByRole('heading', { level: 1, name: title, exact: true }).waitFor()
    await page.reload()
    await page.getByRole('heading', { level: 1, name: title, exact: true }).waitFor()
    await page.evaluate(() => document.fonts.ready)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  }
  for (const path of ['NOTICE.txt', 'licenses/dyne-vite-theme-MIT.txt', 'licenses/Syne-OFL.txt', 'licenses/Inter-OFL.txt', 'licenses/JetBrains-Mono-OFL.txt']) {
    const response = await page.request.get(new URL(path, url).href)
    assert.ok(response.ok(), `Missing notice: ${path} (${response.status()})`)
  }
  assert.deepEqual(failures, [])
  console.log(`${loopback ? 'Local fixture' : 'Published'} smoke: PASS; commit ${identity.commit}; 3 routes/refreshed, assets and 5 notices; ${url.href}`)
} finally { await browser.close() }
