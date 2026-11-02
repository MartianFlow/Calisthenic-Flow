// Rutas, vídeos, calendario y progreso.
const { test, expect, makeState, seed, readState, pastSession } = require('./fixtures');

test.describe('Rutas y vídeos', () => {
  test('lista las 14 rutas y cada una muestra su hoja de ruta', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/rutas');
    await expect(page.locator('.route-card')).toHaveCount(14);
    await page.locator('.route-card', { hasText: 'Front lever' }).click();
    await expect(page.getByRole('heading', { name: 'Front lever', exact: true })).toBeVisible();
    await expect(page.locator('.path-step')).toHaveCount(7);
    await expect(page.locator('.path-step.current')).toContainText('Tuck front lever');
  });

  test('el vídeo de técnica se abre en un visor sin cookies y se cierra', async ({ page }) => {
    await seed(page, makeState({ progress: { dominadas: { step: 4, passes: 0, done: false } } }));
    await page.goto('/#/ruta/dominadas');
    await page.locator('.path-step.current [data-action="video-open"]').click();
    const frame = page.locator('.video-modal iframe');
    await expect(frame).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?/);
    await page.locator('.video-modal-panel [data-action="video-close"]').click();
    await expect(page.locator('.video-modal')).toHaveCount(0);
    expect((await readState(page)).game.videosWatched).toBe(1);
  });

  test('un paso sin vídeo ofrece buscarlo en YouTube', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/ruta/backlever');
    await expect(page.locator('.path-step.current .video-search')).toHaveAttribute('href', /youtube\.com\/results/);
  });

  test('se puede fijar el nivel a mano desde la hoja de ruta', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/ruta/flexiones');
    await page.locator('.path-step').nth(3).locator('summary').click();
    await page.locator('[data-action="set-level"][data-step="3"]').click();
    await expect(page.locator('.path-step.current')).toContainText('Flexiones diamante');
    expect((await readState(page)).progress.flexiones.step).toBe(3);
  });
});

test.describe('Calendario y progreso', () => {
  const sessions = [
    pastSession({ daysAgo: 4, items: [{ roadmapId: 'dominadas', stepIndex: 4, sets: [6, 6, 5], rating: 'dificil' }] }),
    pastSession({ daysAgo: 2, items: [{ roadmapId: 'flexiones', stepIndex: 2, sets: [8, 8, 8], rating: 'facil' }],
      levelUps: [{ roadmapId: 'flexiones', from: 2, to: 3, reason: 'facil' }] }),
  ];

  test('marca los días entrenados y muestra el detalle de un día', async ({ page }) => {
    await seed(page, makeState({ sessions }));
    await page.goto('/#/calendario');
    // Hoy es 2 de noviembre: los entrenos sembrados son de finales de octubre
    await expect(page.locator('h2.cap')).toContainText('noviembre');
    await expect(page.locator('.cal-cell.on')).toHaveCount(0);
    await page.locator('[data-action="cal-month"][data-dir="-1"]').click();
    await expect(page.locator('h2.cap')).toContainText('octubre');
    await expect(page.locator('.cal-cell.on')).toHaveCount(2);
    await expect(page.locator('.cal-cell.lvl')).toHaveCount(1);
    await page.locator('.cal-cell.on').first().click();
    await expect(page.locator('.cal-session')).toContainText('Difícil');
    await expect(page.locator('.cal-stats')).toContainText('2');
  });

  test('progreso: totales, historial y detalle de un entreno', async ({ page }) => {
    await seed(page, makeState({ sessions }));
    await page.goto('/#/progreso');
    await expect(page.locator('.tile').first()).toContainText('2');
    await expect(page.locator('.history-row')).toHaveCount(2);
    await page.locator('.history-row').first().click();
    await expect(page).toHaveURL(/#\/sesion\//);
    await expect(page.locator('.summary-item')).toContainText('Flexiones');
  });

  test('la barra de pestañas navega entre secciones', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/');
    for (const [tab, heading] of [['calendario', 'Calendario'], ['rutas', 'Rutas'], ['heroe', 'Héroe'], ['progreso', 'Progreso'], ['hoy', 'Hoy']]) {
      await page.locator(`#tabbar [data-tab="${tab}"]`).click();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.locator(`#tabbar [data-tab="${tab}"]`)).toHaveAttribute('aria-current', 'page');
    }
  });
});

test.describe('Tema', () => {
  const bg = (page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());

  test.describe('con el iPhone en modo claro', () => {
    test.use({ colorScheme: 'light' });

    test('se puede forzar el modo oscuro y se mantiene al reabrir', async ({ page }) => {
      await seed(page, makeState());
      await page.goto('/#/ajustes');
      expect(await bg(page)).toBe('#fff2bd');
      await page.locator('[data-action="set-theme"][data-value="dark"]').click();
      expect(await bg(page)).toBe('#120e18');
      await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute('content', '#050507');
      expect((await readState(page)).settings.theme).toBe('dark');
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      expect(await bg(page)).toBe('#120e18');
      // Automático vuelve a seguir al iPhone
      await page.locator('[data-action="set-theme"][data-value="auto"]').click();
      expect(await bg(page)).toBe('#fff2bd');
    });
  });

  test.describe('con el iPhone en modo oscuro', () => {
    test.use({ colorScheme: 'dark' });

    test('automático es oscuro y se puede forzar el claro', async ({ page }) => {
      await seed(page, makeState());
      await page.goto('/#/ajustes');
      expect(await bg(page)).toBe('#120e18');
      await page.locator('[data-action="set-theme"][data-value="light"]').click();
      expect(await bg(page)).toBe('#fff2bd');
    });
  });
});
