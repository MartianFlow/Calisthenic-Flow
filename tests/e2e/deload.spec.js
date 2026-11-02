const { test, expect, makeState, seed, readState } = require('./fixtures');

test.describe('Semana de descarga', () => {
  test('se sugiere con 2 rutas estancadas y reduce series y objetivos', async ({ page }) => {
    await seed(page, makeState({
      progress: {
        dominadas: { step: 4, passes: 0, done: false, work: 6, stall: 2 },
        remo: { step: 2, passes: 0, done: false, stall: 2 },
      },
    }));
    await page.goto('/');
    await expect(page.locator('.deload-card')).toContainText('¿Toca descarga?');
    await page.locator('[data-action="deload-start"]').click();
    await expect(page.locator('.deload-card')).toContainText('Semana de descarga');

    await page.goto('/#/ruta/dominadas');
    await page.locator('[data-action="train-only"]').click();
    await page.locator('[data-action="warmup-done"]').last().click();
    // 2 series en vez de 3 y objetivo al ~65 % (6 → 4)
    await expect(page.locator('.set')).toHaveCount(2);
    await expect(page.locator('.set .val').first()).toContainText('4');

    const pending = page.locator('[data-action="set-toggle"]:not(.on)');
    while (await pending.count()) await pending.first().click();
    await page.locator('.rate-panel [data-value="facil"]').click();
    await page.locator('[data-action="session-finish"]').first().click();
    await expect(page.locator('.outcome')).toContainText('Semana de descarga');
    // La descarga no cambia el progreso
    expect((await readState(page)).progress.dominadas.work).toBe(6);
  });

  test('«Ahora no» pospone la sugerencia', async ({ page }) => {
    await seed(page, makeState({ progress: { dominadas: { step: 4, passes: 0, stall: 2 }, remo: { step: 2, passes: 0, stall: 2 } } }));
    await page.goto('/');
    await page.locator('[data-action="deload-snooze"]').click();
    await expect(page.locator('.deload-card')).toHaveCount(0);
  });
});
