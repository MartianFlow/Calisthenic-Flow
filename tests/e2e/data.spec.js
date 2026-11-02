// Datos: migración desde la v1, copia de seguridad, descarga y modo sin conexión.
const fs = require('fs');
const { test, expect, makeState, seed, readState, KEY } = require('./fixtures');

test.describe('Datos del usuario', () => {
  test('migra el progreso guardado con la versión 1 a los pasos nuevos', async ({ page }) => {
    // v1: fondos paso 2 = «Soporte en paralelas» (hoy paso 0); frontlever paso 1 = «Tuck front lever» (hoy 0)
    await seed(page, {
      version: 1, onboarded: true, settings: { goals: ['frontlever'], daysPerWeek: 3 },
      progress: { fondos: { step: 2, passes: 1 }, frontlever: { step: 1, passes: 0 }, flexiones: { step: 3, passes: 0 } },
      sessions: [], levelLog: [],
    });
    await page.goto('/#/rutas');
    const s = await readState(page);
    expect(s.version).toBe(2);
    expect(s.progress.fondos.step).toBe(0);
    expect(s.progress.frontlever.step).toBe(0);
    expect(s.progress.flexiones.step).toBe(2); // «Flexiones» sigue siendo «Flexiones»
    expect(s.game).toBeTruthy();
  });

  test('exporta una copia JSON y la vuelve a importar', async ({ page }, testInfo) => {
    await seed(page, makeState({ progress: { dominadas: { step: 5, passes: 0, done: false } } }));
    await page.goto('/#/ajustes');
    // Sin Web Share con archivos (navegador de escritorio) la copia se descarga
    await page.evaluate(() => { navigator.canShare = undefined; });
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-action="export-data"]').click()]);
    expect(download.suggestedFilename()).toMatch(/^calisthenic-flow-\d{4}-\d{2}-\d{2}\.json$/);
    const file = testInfo.outputPath('copia.json');
    await download.saveAs(file);
    const backup = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(backup.app).toBe('calisthenic-flow');
    expect(backup.data.progress.dominadas.step).toBe(5);

    // Cambia el progreso y restaura la copia
    await page.evaluate((key) => {
      const s = JSON.parse(localStorage.getItem(key));
      s.progress.dominadas.step = 0;
      localStorage.setItem(key, JSON.stringify(s));
    }, KEY);
    await page.locator('input[data-change="import-data"]').setInputFiles(file);
    await expect(page).toHaveURL(/#\/$/);
    expect((await readState(page)).progress.dominadas.step).toBe(5);
  });

  test('borrar todos los datos vuelve a la bienvenida', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/ajustes');
    await page.locator('[data-action="reset-data"]').click();
    await expect(page).toHaveURL(/#\/bienvenida/);
    expect((await readState(page)).onboarded).toBe(false);
  });
});

test.describe('Sin conexión', () => {
  test.use({ serviceWorkers: 'allow' });

  test('la app abre sin internet una vez instalada', async ({ page, context, browserName }) => {
    // Limitación de Playwright: en WebKit (Linux) recargar con setOffline y un service
    // worker activo da «WebKit encountered an internal error». Se comprueba en Chromium.
    test.skip(browserName === 'webkit', 'Playwright no puede emular sin conexión con service worker en WebKit');
    await seed(page, makeState());
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      // Espera a que la caché tenga la app completa
      for (let i = 0; i < 50; i++) {
        const keys = await caches.keys();
        if (keys.length) {
          const cache = await caches.open(keys[0]);
          if ((await cache.keys()).length > 20) return;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
    });
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible();
    await context.setOffline(false);
  });
});

test.describe('Versión de la app', () => {
  test('Ajustes muestra la versión y coincide con la del service worker', async ({ page, request }) => {
    const version = fs.readFileSync('js/version.js', 'utf8').match(/APP_VERSION = '(cf-v\d+)'/)[1];
    const sw = await (await request.get('/sw.js')).text();
    expect(sw).toContain(`const VERSION = '${version}'`);
    await seed(page, makeState());
    await page.goto('/#/ajustes');
    await expect(page.locator('[data-app-version]')).toContainText(version.replace('cf-v', 'versión '));
    await expect(page.locator('[data-action="app-update"]')).toBeVisible();
  });
});
