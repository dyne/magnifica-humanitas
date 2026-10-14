import { defineConfig } from '@playwright/test'
const base = process.env.VITE_BASE ?? '/magnifica-humanitas/'
export default defineConfig({
  testDir: './tests/browser',
  outputDir: 'output/browser-results',
  reporter: [['list'], ['json', { outputFile: 'output/browser-results.json' }]],
  use: { baseURL: `http://127.0.0.1:4173${base}`, browserName: 'chromium', headless: true },
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort', url: `http://127.0.0.1:4173${base}`, reuseExistingServer: false },
})
