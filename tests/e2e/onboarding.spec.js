const { test, expect, readState } = require('./fixtures');

test.describe('Configuración inicial', () => {
  test('la primera vez muestra la bienvenida y no la pantalla Hoy', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/#\/bienvenida/);
    await expect(page.getByRole('heading', { name: 'Calisthenic Flow' })).toBeVisible();
    await expect(page.locator('#tabbar')).toBeHidden();
  });

  test('guarda niveles, objetivos y días y lleva al entreno de hoy', async ({ page }) => {
    await page.goto('/');
    await page.selectOption('select[data-id="dominadas"]', '4');
    await page.selectOption('select[data-id="flexiones"]', '2');
    await page.locator('[data-action="toggle-goal-setting"][data-id="frontlever"]').click();
    await page.locator('[data-action="toggle-goal-setting"][data-id="pino"]').click();
    // Al elegir un objetivo aparece su selector de nivel
    await expect(page.locator('select[data-id="frontlever"]')).toBeVisible();
    await page.locator('[data-action="plan-day"][data-i="5"]').click(); // + sábado
    await page.locator('[data-action="finish-onboarding"]').click();

    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible();
    // El 2/11/2026 es lunes y la semana 45 es impar: toca Día B
    await expect(page.locator('.plan .eyebrow').first()).toContainText('Hoy toca · Lunes');
    await expect(page.locator('.plan h2')).toContainText('Día B');
    // Las habilidades objetivo van primero
    await expect(page.locator('.ex-row').first()).toContainText('Front lever');

    const s = await readState(page);
    expect(s.onboarded).toBe(true);
    expect(s.progress.dominadas.step).toBe(4);
    expect(s.settings.goals).toEqual(['frontlever', 'pino']);
    expect(s.settings.schedule.days).toEqual([true, false, true, false, true, true, false]);
  });

  test('no permite más de 3 habilidades objetivo', async ({ page }) => {
    await page.goto('/');
    for (const id of ['muscleup', 'pino', 'lsit', 'planche']) {
      await page.locator(`[data-action="toggle-goal-setting"][data-id="${id}"]`).click();
    }
    await expect(page.locator('#toast')).toContainText('Máximo 3');
    const s = await readState(page);
    expect(s.settings.goals).toHaveLength(3);
  });
});
