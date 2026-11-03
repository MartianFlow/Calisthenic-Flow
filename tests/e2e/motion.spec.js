// Con las animaciones activadas (el resto de pruebas las desactiva): al terminar de
// entrar, todo queda visible, no hay scroll horizontal, las cabeceras fijas siguen en su
// sitio al bajar y la app no lanza errores. En CI también corre en WebKit (Safari).
// Los elementos con animaciones infinitas nunca están «quietos», así que se pulsan con
// dispatchEvent en vez de click.

const { test, expect, makeState, seed, pastSession } = require('./fixtures');

test.use({ reducedMotion: 'no-preference' });

const press = (page, sel) => page.locator(sel).first().dispatchEvent('click');

// Baja hasta el final poco a poco (para que aparezcan los paneles) y vuelve arriba.
async function scrollThrough(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= h; y += 250) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(900);
}

// Espera a que acaben las animaciones de entrada (las finitas; en CI la máquina es más lenta
// y el último panel aún puede estar apareciendo) y mide.
async function settled(page) {
  await page.evaluate(() => Promise.race([
    Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))),
    new Promise((r) => setTimeout(r, 3000)),
  ]));
  return page.evaluate(() => ({
    scrollX: document.documentElement.scrollWidth - window.innerWidth,
    pending: document.querySelectorAll('.reveal:not(.revealed)').length,
    faded: [...document.querySelectorAll('#view > *')].filter((el) => Number(getComputedStyle(el).opacity) < 0.99).length,
  }));
}

test('las pantallas principales terminan visibles y sin scroll horizontal', async ({ page }) => {
  const sessions = [1, 3, 5, 8, 10, 12].map((daysAgo) => pastSession({ daysAgo, items: [{ roadmapId: 'dominadas', stepIndex: 4, sets: [6, 6, 5] }] }));
  await seed(page, makeState({ sessions, settings: { goals: ['frontlever', 'pino'] } }));
  await page.goto('/');
  await page.waitForTimeout(1600);
  for (const tab of ['calendario', 'rutas', 'heroe', 'progreso', 'hoy']) {
    await press(page, `#tabbar a[data-tab="${tab}"]`);
    await expect(page.locator('#tabbar a.on')).toHaveAttribute('data-tab', tab);
    await page.waitForTimeout(1600);
    await scrollThrough(page);
    expect(await settled(page), tab).toEqual({ scrollX: 0, pending: 0, faded: 0 });
  }
  // La pastilla de la pestaña activa está debajo de su icono
  const [ind, ic] = await Promise.all([
    page.locator('.tab-ind').boundingBox(),
    page.locator('#tabbar a.on svg').boundingBox(),
  ]);
  expect(Math.abs(ind.x + ind.width / 2 - (ic.x + ic.width / 2))).toBeLessThan(3);
});

test('en el entreno la cabecera sigue arriba al bajar y el descanso responde', async ({ page }) => {
  await seed(page, makeState({ progress: { dominadas: { step: 3, passes: 0, done: false } } }));
  await page.goto('/#/ruta/dominadas');
  await page.waitForTimeout(1200);
  await press(page, '[data-action="train-only"]');
  await expect(page).toHaveURL(/#\/entreno/);
  await press(page, '[data-action="warmup-done"]');
  await press(page, '[data-action="set-toggle"][data-set="0"]');
  await expect(page.locator('.rest-bar [data-tick="rest"]')).toHaveText(/1:(20|19)/);
  await press(page, '[data-action="rest-add"]');
  await expect(page.locator('[data-tick="rest-total"]')).toHaveText('de 1:35');
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(300);
  const head = await page.locator('.session-head').boundingBox();
  expect(Math.round(head.y)).toBe(0);
  expect(await settled(page)).toMatchObject({ scrollX: 0, faded: 0 });
});

test('la bienvenida avanza con animación y su cabecera y su botón siguen a mano', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(800);
  await press(page, '.wiz-foot [data-action="wiz-next"]');
  await press(page, '[data-action="wiz-exp"][data-value="habitual"]');
  await page.clock.runFor(600);
  await expect(page.locator('.wiz-body')).toHaveAttribute('data-step', 'pierna');
  await press(page, '[data-action="wiz-legs"][data-value="calistenia"]');
  await page.clock.runFor(600);
  await expect(page.locator('.wiz-body')).toHaveAttribute('data-step', 'nivel-dominadas');
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  const vh = page.viewportSize().height;
  const head = await page.locator('.wiz-head').boundingBox();
  const foot = await page.locator('.wiz-foot .btn').boundingBox();
  expect(Math.round(head.y)).toBe(0);
  expect(foot.y + foot.height).toBeLessThanOrEqual(vh);
  expect(await settled(page)).toMatchObject({ scrollX: 0, faded: 0 });
});
