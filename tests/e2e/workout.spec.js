const { test, expect, makeState, seed, readState, completeCurrentExercise, rate } = require('./fixtures');

test.describe('Entreno', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, makeState({ progress: { pino: { step: 0, passes: 0, done: false } }, settings: { goals: ['pino'] } }));
  });

  test('flujo completo: calentamiento, series, descanso con valoración y resumen con EXP', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-action="start-session"]').click();
    await expect(page).toHaveURL(/#\/entreno/);
    await expect(page.locator('#tabbar')).toBeHidden();

    // Calentamiento: marcar y empezar
    await page.locator('[data-action="warmup-check"]').first().click();
    await expect(page.locator('.check-item.on')).toHaveCount(1);
    await page.locator('[data-action="warmup-done"]').first().click();

    // Primer ejercicio: el objetivo (pino) — isometría con cronómetro
    await expect(page.locator('.exercise h2')).toHaveText('Pica con pies elevados');
    await page.locator('[data-action="hold-start"][data-set="0"]').click();
    await expect(page.locator('.hold-overlay')).toBeVisible();
    await expect(page.locator('.hold-phase')).toHaveText('Prepárate');
    await page.clock.runFor(5000 + 21000); // 5 s de cuenta atrás y 21 s de isometría
    await expect(page.locator('[data-tick="hold"]')).toHaveText('21');
    await page.locator('[data-action="hold-stop"]').click();
    await expect(page.locator('.hold-overlay')).toBeHidden();
    await expect(page.locator('.set').first()).toHaveClass(/done/);
    await expect(page.locator('.set .val').first()).toContainText('21');

    // Descanso en marcha tras la serie
    await expect(page.locator('.rest-bar [data-tick="rest"]')).toBeVisible();
    await page.locator('[data-action="rest-skip"]').click();
    await completeCurrentExercise(page);

    // Al acabar el ejercicio pregunta la dificultad mientras corre el descanso
    await expect(page.locator('.rate-q')).toContainText('Pica con pies elevados');
    await expect(page.locator('.rest-bar [data-tick="rest"]')).toBeVisible();
    await rate(page, 'facil');
    await expect(page.locator('.rate-panel')).toHaveCount(0);
    await expect(page.locator('.rest-bar [data-tick="rest"]')).toBeVisible();

    // El descanso termina solo
    await page.clock.runFor(200_000);
    await expect(page.locator('.rest-bar')).toHaveCount(0);

    // Pasó al siguiente ejercicio
    await expect(page.locator('.chip.current')).not.toContainText('Pino');

    // Terminar: si falta valorar un ejercicio con series hechas, lo pide antes de cerrar
    // (ya no hay «Omitir»; «Seguir entrenando» vuelve al entreno)
    await completeCurrentExercise(page);
    await expect(page.locator('.rate-panel')).toBeVisible();
    await page.locator('[data-action="session-finish"]').first().click();
    await expect(page.locator('.rate-q')).toContainText('Antes de terminar');
    await expect(page.locator('[data-action="rate-back"]')).toHaveText('Seguir entrenando');
    await rate(page, 'normal');

    await expect(page).toHaveURL(/#\/resumen\//);
    await expect(page.getByRole('heading', { name: '¡Entreno completado!' })).toBeVisible();
    await expect(page.locator('.px-gain')).toContainText('EXP');
    await expect(page.locator('.px-ach-list')).toContainText('Primer asalto');
    await expect(page.locator('.summary-item').first()).toContainText('Fácil');

    const s = await readState(page);
    expect(s.active).toBeNull();
    expect(s.sessions).toHaveLength(1);
    expect(s.sessions[0].items[0]).toMatchObject({ roadmapId: 'pino', rating: 'facil' });
    expect(s.game.unlocked['primer-entreno']).toBeTruthy();
  });

  test('el entreno en curso sobrevive a recargar la app', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-action="start-session"]').click();
    await page.locator('[data-action="warmup-done"]').first().click();
    await page.locator('[data-action="set-inc"][data-set="0"]').click();
    await page.reload();
    await expect(page.locator('.exercise h2')).toHaveText('Pica con pies elevados');
    await page.locator('[data-action="session-leave"]').click();
    await expect(page.locator('.resume')).toContainText('Entreno en curso');
    await page.locator('[data-action="go-session"]').click();
    await expect(page).toHaveURL(/#\/entreno/);
  });

  test('+/− cambian el valor y descartar no guarda nada', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-action="start-session"]').click();
    await page.locator('[data-action="warmup-done"]').first().click();
    const val = page.locator('.set .val').first();
    const before = parseInt(await val.innerText(), 10);
    await page.locator('[data-action="set-inc"][data-set="0"]').click();
    await page.locator('[data-action="set-inc"][data-set="0"]').click();
    await expect(val).toContainText(String(before + 2));
    await page.locator('[data-action="set-add"]').click();
    await expect(page.locator('.set')).toHaveCount(4);
    await page.locator('[data-action="session-discard"]').click();
    await expect(page).toHaveURL(/#\/$/);
    const s = await readState(page);
    expect(s.active).toBeNull();
    expect(s.sessions).toHaveLength(0);
  });
});

test.describe('Isometrías: cuenta atrás', () => {
  async function openHold(page, settings = {}) {
    await seed(page, makeState({ progress: { pino: { step: 0, passes: 0, done: false } }, settings }));
    await page.goto('/#/ruta/pino');
    await page.locator('[data-action="train-only"]').click();
    await page.locator('[data-action="warmup-done"]').last().click();
    await page.locator('[data-action="hold-start"][data-set="0"]').click();
    await expect(page.locator('.hold-overlay')).toBeVisible();
  }

  test('empieza en 5 s, «+5 s» la alarga y desaparece al empezar a contar', async ({ page }) => {
    await openHold(page);
    await expect(page.locator('[data-tick="hold"]')).toHaveText('5');
    await page.locator('[data-action="hold-more"]').click();
    await expect(page.locator('[data-tick="hold"]')).toHaveText(/^(10|9)$/);
    await page.clock.runFor(7000);
    await expect(page.locator('.hold-phase')).toHaveText('Prepárate');
    await page.clock.runFor(3000 + 4000);
    await expect(page.locator('.hold-phase')).toHaveText('¡Aguanta!');
    await expect(page.locator('[data-tick="hold"]')).toHaveText(/^[34]$/);
    await expect(page.locator('[data-action="hold-more"]')).toBeHidden();
  });

  test('la cuenta atrás se elige en Ajustes', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/ajustes');
    await page.locator('[data-action="set-setting"][data-key="holdPrep"][data-value="10"]').click();
    expect((await readState(page)).settings.holdPrep).toBe(10);
    await page.close();
  });

  test('con 10 s en Ajustes, la cuenta atrás empieza en 10', async ({ page }) => {
    await openHold(page, { holdPrep: 10 });
    await expect(page.locator('[data-tick="hold"]')).toHaveText('10');
  });
});
