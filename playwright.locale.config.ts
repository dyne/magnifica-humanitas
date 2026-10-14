import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/locale-browser', outputDir: 'output/locale-fixture-results',
  reporter: [['list'], ['json', { outputFile: 'output/locale-fixture-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:4174/', browserName: 'chromium', headless: true },
  webServer: { command: 'npm run preview -- --mode locale-fixture --outDir /tmp/magnifica-locale-fixture-dist --host 127.0.0.1 --port 4174 --strictPort', url: 'http://127.0.0.1:4174/', reuseExistingServer: false },
})
