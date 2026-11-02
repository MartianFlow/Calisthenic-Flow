const { test, expect, makeState, seed, readState, pastSession } = require('./fixtures');

// Historial suficiente para estar en nivel 2+ (≈ 3 entrenos)
const history = [3, 2, 1].map((d) => pastSession({ daysAgo: d, items: [
  { roadmapId: 'dominadas', stepIndex: 4, sets: [5, 5, 5] },
  { roadmapId: 'core', stepIndex: 0, sets: [6, 6, 6] },
] }));

test.describe('Héroe y gamificación', () => {
  test('el héroe en pixel art muestra nivel, título, EXP y atributos', async ({ page }) => {
    await seed(page, makeState({ sessions: history, progress: { dominadas: { step: 4, passes: 0, done: false } } }));
    await page.goto('/#/heroe');
    await expect(page.locator('.px-scene .hero-svg')).toBeVisible();
    await expect(page.locator('.hero-svg rect').first()).toBeAttached();
    await expect(page.locator('.px-lv.big')).toContainText('LV');
    await expect(page.locator('.px-title').first()).toBeVisible();
    await expect(page.locator('.px-attrs li')).toHaveCount(6);
    await expect(page.locator('.px-attrs li').first()).toContainText('Tirón');
  });

  test('los logros del historial se desbloquean al abrir la app', async ({ page }) => {
    await seed(page, makeState({ sessions: history }));
    await page.goto('/#/logros');
    await page.locator('[data-action="ach-filter"][data-value="hechos"]').click();
    await expect(page.locator('.px-ach.done')).toContainText(['Primer asalto']);
    await page.locator('[data-action="ach-filter"][data-value="pendientes"]').click();
    await expect(page.locator('.px-ach.done')).toHaveCount(0);
    expect((await readState(page)).game.unlocked['primer-entreno']).toBeTruthy();
  });

  test('un artículo bloqueado no se puede equipar; uno desbloqueado sí', async ({ page }) => {
    await seed(page, makeState({ sessions: history }));
    await page.goto('/#/equipo');
    // Gafas de sol: nivel 8 (bloqueadas)
    const sun = page.locator('[data-action="equip"][data-item="gafas-sol"]');
    await expect(sun).toHaveClass(/locked/);
    await expect(sun).toContainText('Nivel 8');
    await sun.click({ force: true });
    expect((await readState(page)).game.equipped.face).toBeUndefined();
    // Muñequeras amarillas: nivel 2 (desbloqueadas con el historial)
    await page.locator('[data-action="equip"][data-item="munequeras-amarillas"]').click();
    await expect(page.locator('[data-action="equip"][data-item="munequeras-amarillas"]')).toHaveClass(/on/);
    expect((await readState(page)).game.equipped.wrists).toBe('munequeras-amarillas');
  });

  test('apariencia y nombre del héroe', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/equipo');
    await page.locator('[data-action="look"][data-key="hairStyle"][data-value="cresta"]').click();
    await page.locator('[data-action="look"][data-key="skin"][data-value="3"]').click();
    await page.goto('/#/heroe');
    await page.locator('[data-action="hero-rename"]').click();
    await expect(page.locator('.px-name.big')).toHaveText('Rayo');
    const s = await readState(page);
    expect(s.game.look).toMatchObject({ hairStyle: 'cresta', skin: 3 });
  });

  test('la pantalla Hoy muestra el mini héroe con su nivel', async ({ page }) => {
    await seed(page, makeState({ sessions: history }));
    await page.goto('/');
    await expect(page.locator('.hero-mini .px-lv')).toContainText('LV');
    await page.locator('.hero-mini').click();
    await expect(page).toHaveURL(/#\/heroe/);
  });
});
