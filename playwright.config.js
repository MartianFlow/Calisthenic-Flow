// Pruebas funcionales e2e de Calisthenic Flow con Playwright.
// · iphone-chromium: iPhone 13 emulado con Chromium (rápido, el que se usa en local).
// · iphone-webkit:   iPhone 13 con WebKit, el motor de Safari (el más fiel al iPhone).
// Ejecutar: npm run test:e2e   ·   Ver informe: npm run test:e2e:report

const { defineConfig, devices } = require('@playwright/test');

const PORT = 4173;

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'iphone-chromium', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: `python3 -m http.server ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'ignore',
  },
});
