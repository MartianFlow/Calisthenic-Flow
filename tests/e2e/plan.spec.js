const { test, expect, makeState, seed, readState, pastSession } = require('./fixtures');

test.describe('Plan semanal', () => {
  test('recomienda 3 días a principiantes y explica por qué', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/plan');
    await expect(page.locator('.rec-card .hero-num')).toContainText('3');
    await expect(page.locator('.rec-card')).toContainText('Principiante');
    await expect(page.locator('.week-row:not(.type-R)')).toHaveCount(3);
  });

  test('cambiar los días disponibles recoloca la semana', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/plan');
    await page.locator('[data-action="plan-day"][data-i="0"]').click(); // quita lunes
    await page.locator('[data-action="plan-day"][data-i="1"]').click(); // añade martes
    const rows = page.locator('.week-row');
    await expect(rows.nth(0)).toHaveClass(/type-R/);
    await expect(rows.nth(1)).not.toHaveClass(/type-R/);
    expect((await readState(page)).settings.schedule.days).toEqual([false, true, true, false, true, false, false]);
  });

  test('front lever: máximo 3 días y nunca en días seguidos', async ({ page }) => {
    await seed(page, makeState({ settings: { goals: ['frontlever'], daysPerWeek: 5, schedule: { days: [true, true, true, true, true, false, false] } } }));
    await page.goto('/#/plan');
    const rows = await page.locator('.week-row').all();
    const withFL = [];
    for (const [i, row] of rows.entries()) {
      if (await row.locator('.mini-chip.skill', { hasText: 'Front lever' }).count()) withFL.push(i);
    }
    expect(withFL.length).toBeLessThanOrEqual(3);
    for (let k = 1; k < withFL.length; k++) expect(withFL[k] - withFL[k - 1]).toBeGreaterThan(1);
  });

  test.describe('en un día de descanso', () => {
    test.use({ now: '2026-11-03T10:00:00+01:00' }); // martes

    test('Hoy muestra el descanso, el próximo entreno y permite entrenar igualmente', async ({ page }) => {
      await seed(page, makeState());
      await page.goto('/');
      await expect(page.locator('.plan.rest')).toContainText('Hoy toca descanso');
      await expect(page.locator('.next-up')).toContainText('miércoles');
      await page.locator('[data-action="train-anyway"]').click();
      await expect(page.locator('[data-action="start-session"]')).toBeVisible();
    });
  });

  test('si ya entrenaste hoy muestra «Misión cumplida»', async ({ page }) => {
    await seed(page, makeState({ sessions: [pastSession({ daysAgo: 0, items: [{ roadmapId: 'core', stepIndex: 0, sets: [6, 6, 6] }] })] }));
    await page.goto('/');
    await expect(page.locator('.plan.rest')).toContainText('Misión cumplida');
  });
});
