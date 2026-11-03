const { test, expect, makeState, seed, readState } = require('./fixtures');

// Empieza un entreno de una sola ruta, salta el calentamiento y marca la primera serie.
async function firstSet(page, routeId) {
  await page.goto(`/#/ruta/${routeId}`);
  await page.locator('[data-action="train-only"]').click();
  await page.locator('[data-action="warmup-done"]').last().click();
  await page.locator('[data-action="set-toggle"][data-set="0"]').click();
  await expect(page.locator('.rest-bar [data-tick="rest"]')).toBeVisible();
}

test.describe('Descanso entre series', () => {
  test('por defecto es fijo de 80 s y se puede sumar o quitar 15 s', async ({ page }) => {
    await seed(page, makeState({ progress: { dominadas: { step: 3, passes: 0, done: false } } }));
    await firstSet(page, 'dominadas');
    // El reloj sigue corriendo mientras tanto (en WebKit, más lento, puede ir 1–2 s por detrás):
    // el total del descanso («de 1:20») es lo que no depende del tiempo.
    await expect(page.locator('[data-tick="rest-total"]')).toHaveText('de 1:20');
    await expect(page.locator('.rest-bar [data-tick="rest"]')).toHaveText(/^1:(20|1\d)$/);

    await page.locator('[data-action="rest-add"]').click();
    await expect(page.locator('[data-tick="rest-total"]')).toHaveText('de 1:35');
    await expect(page.locator('.rest-bar [data-tick="rest"]')).toHaveText(/^1:(3\d|2\d)$/);

    await page.locator('[data-action="rest-sub"]').click();
    await page.locator('[data-action="rest-sub"]').click();
    await expect(page.locator('[data-tick="rest-total"]')).toHaveText('de 1:05');
    await expect(page.locator('.rest-bar [data-tick="rest"]')).toHaveText(/^(1:0\d|0:5\d)$/);

    // Quitar más de lo que queda termina el descanso (con su aviso)
    for (let i = 0; i < 5; i++) await page.locator('[data-action="rest-sub"]').click();
    await page.clock.runFor(500);
    await expect(page.locator('.rest-bar')).toHaveCount(0);
  });

  test('el descanso por defecto se cambia en Ajustes', async ({ page }) => {
    await seed(page, makeState({ progress: { dominadas: { step: 3, passes: 0, done: false } } }));
    await page.goto('/#/ajustes');
    await expect(page.locator('[data-rest-default]')).toContainText('1:20');
    await page.locator('[data-action="rest-default"][data-dir="1"]').click();
    await page.locator('[data-action="rest-default"][data-dir="1"]').click();
    await expect(page.locator('[data-rest-default]')).toContainText('1:30');
    await page.locator('[data-action="rest-preset"][data-sec="120"]').click();
    await expect(page.locator('[data-rest-default]')).toContainText('2:00');
    expect((await readState(page)).settings).toMatchObject({ restMode: 'fixed', restSec: 120 });

    await firstSet(page, 'dominadas');
    await expect(page.locator('[data-tick="rest-total"]')).toHaveText('de 2:00');
    await expect(page.locator('.exercise .target-line')).toContainText('Descanso 2:00');
  });

  test('«Según ejercicio» usa el descanso recomendado de cada paso', async ({ page }) => {
    await seed(page, makeState({ progress: { dominadas: { step: 3, passes: 0, done: false } } }));
    await page.goto('/#/ajustes');
    await page.locator('[data-action="set-rest-mode"][data-value="auto"]').click();
    await expect(page.locator('[data-rest-default]')).toHaveCount(0);
    expect((await readState(page)).settings.restMode).toBe('auto');

    // Negativas de dominada 3×5 (≤ 5 reps) → 3:00
    await firstSet(page, 'dominadas');
    await expect(page.locator('[data-tick="rest-total"]')).toHaveText('de 3:00');
  });

  test('un valor raro guardado se corrige al cargar', async ({ page }) => {
    await seed(page, makeState({ settings: { restMode: 'otro', restSec: 3 } }));
    await page.goto('/#/ajustes');
    await expect(page.locator('[data-rest-default]')).toContainText('0:15');
    const s = await readState(page);
    expect(s.settings).toMatchObject({ restMode: 'fixed', restSec: 15 });
  });
});
