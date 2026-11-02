// Pierna en el gimnasio: plan torso/pierna, pesos y progresión doble con carga.
const { test, expect, makeState, seed, readState, completeCurrentExercise, rate } = require('./fixtures');

const L_V = [true, true, true, true, true, false, false];
const gymState = (extra = {}) => makeState({
  ...extra,
  settings: { legs: 'gym', daysPerWeek: 5, schedule: { days: L_V }, goals: ['frontlever'], ...(extra.settings || {}) },
});

test.describe('Plan torso / pierna', () => {
  test('5 días: torso L-X-V y pierna M-J, habilidades solo en torso', async ({ page }) => {
    await seed(page, gymState());
    await page.goto('/#/plan');
    const rows = page.locator('.week-row');
    // Semana 45 (impar): empieza por Torso B
    const expected = ['TB', 'P', 'TA', 'P', 'TB', 'R', 'R'];
    for (const [i, type] of expected.entries()) await expect(rows.nth(i)).toHaveClass(new RegExp(`type-${type}\\b`));
    // Los días de torso no llevan pierna de calistenia y los de pierna no llevan habilidades
    await expect(rows.nth(0)).not.toContainText('Piernas ·');
    await expect(rows.nth(0).locator('.mini-chip.skill')).toContainText('Front lever');
    await expect(rows.nth(1).locator('.mini-chip.skill')).toHaveCount(0);
    // Cada día de pierna es la rutina completa (9 ejercicios)
    await expect(rows.nth(1).locator('.mini-chip.lift')).toHaveCount(9);
    await expect(rows.nth(3)).toContainText('Peso muerto piernas rígidas');
  });

  test('con el sábado libre separa los días de pierna 72 h', async ({ page }) => {
    await seed(page, gymState({ settings: { schedule: { days: [true, true, true, true, true, true, false] } } }));
    await page.goto('/#/plan');
    const types = await page.locator('.week-row').evaluateAll((rows) => rows.map((r) => r.className.match(/type-(\w+)/)[1]));
    expect(types.filter((t) => t === 'P')).toHaveLength(2);
    const legDays = types.map((t, i) => (t === 'P' ? i : -1)).filter((i) => i >= 0);
    expect(legDays[1] - legDays[0]).toBeGreaterThanOrEqual(3);
  });

  test('elegir pierna en el gimnasio cambia la recomendación y la plantilla', async ({ page }) => {
    // Básicos al ~70 %: avanzado aunque no haya ningún entreno registrado
    const progress = Object.fromEntries([['dominadas', 7], ['remo', 5], ['flexiones', 6], ['fondos', 6], ['piernas', 6], ['bisagra', 4], ['core', 7]]
      .map(([id, step]) => [id, { step, passes: 0, done: false }]));
    await seed(page, makeState({ progress, settings: { schedule: { days: L_V } } }));
    await page.goto('/#/plan');
    await expect(page.locator('.rec-card')).toContainText('Avanzado');
    await expect(page.locator('.rec-card .hero-num')).toContainText('4');
    await page.locator('[data-action="set-legs"][data-value="gym"]').click();
    await expect(page.locator('.rec-card .hero-num')).toContainText('5');
    await expect(page.locator('.rec-card')).toContainText('2 de pierna');
    await expect(page.locator('.lift-weights li')).toHaveCount(9);
    expect((await readState(page)).settings.legs).toBe('gym');
  });

  test('los pesos se apuntan con coma decimal', async ({ page }) => {
    await seed(page, gymState());
    await page.goto('/#/plan');
    const input = page.locator('input[data-id="peso-muerto"]');
    await input.fill('62,5');
    await input.blur();
    await expect.poll(async () => (await readState(page)).lifts['peso-muerto']?.kg).toBe(62.5);
    await expect(input).toHaveValue('62,5');
  });
});

test.describe('Día de pierna', () => {
  test.use({ now: '2026-11-03T10:00:00+01:00' }); // martes → Pierna

  test('el tope del rango con Normal sube el peso y vuelve al mínimo', async ({ page }) => {
    await seed(page, gymState({ lifts: { hack: { kg: 100, reps: 10, stall: 0 } } }));
    await page.goto('/');
    await expect(page.locator('.plan h2')).toContainText('Pierna');
    await expect(page.locator('.ex-row')).toHaveCount(9);
    await page.locator('[data-action="start-session"]').click();
    await expect(page.locator('.exercise h2')).toHaveText('Calentamiento de pierna');
    await page.locator('[data-action="warmup-done"]').last().click();

    await expect(page.locator('.exercise h2')).toHaveText('Sentadilla hack');
    await expect(page.locator('.load-input')).toHaveValue('100');
    await expect(page.locator('.set')).toHaveCount(3);
    await completeCurrentExercise(page);
    await expect(page.locator('.rate-q')).toContainText('Sentadilla hack');
    await rate(page, 'normal');
    await page.locator('[data-action="session-finish"]').first().click(); // acepta terminar con series pendientes

    await expect(page).toHaveURL(/#\/resumen\//);
    await expect(page.locator('.burst-title')).toContainText('PESO');
    await expect(page.locator('.summary-item.lift')).toContainText('100 kg × 10');
    await expect(page.locator('.outcome')).toContainText('¡Sube el peso! Próxima vez: 3 × 6 reps con 105 kg');
    const s = await readState(page);
    expect(s.lifts.hack).toMatchObject({ kg: 105, reps: 6, stall: 0 });
    expect(s.sessions[0].dayType).toBe('P');
    expect(s.game.unlocked['dia-pierna']).toBeTruthy();
  });

  test('por debajo del rango con Difícil baja ~10 % el peso', async ({ page }) => {
    await seed(page, gymState({ lifts: { hack: { kg: 100, reps: 6, stall: 0 } } }));
    await page.goto('/');
    await page.locator('[data-action="start-session"]').click();
    await page.locator('[data-action="warmup-done"]').last().click();
    for (let i = 0; i < 3; i++) {
      for (let k = 0; k < 2; k++) await page.locator(`[data-action="set-dec"][data-set="${i}"]`).click(); // 6 → 4
    }
    await completeCurrentExercise(page);
    await rate(page, 'dificil');
    await page.locator('[data-action="session-finish"]').first().click();
    await expect(page.locator('.outcome')).toContainText('baja a 90 kg');
    expect((await readState(page)).lifts.hack).toMatchObject({ kg: 90, reps: 6 });
  });

  test('el peso se puede cambiar durante el entreno y cuenta el que usaste', async ({ page }) => {
    await seed(page, gymState({ lifts: { hack: { kg: 100, reps: 8, stall: 0 } } }));
    await page.goto('/');
    await page.locator('[data-action="start-session"]').click();
    await page.locator('[data-action="warmup-done"]').last().click();
    await page.locator('[data-action="load-inc"]').click();
    await expect(page.locator('.load-input')).toHaveValue('105');
    await expect(page.locator('.set-kg').first()).toContainText('105');
    await completeCurrentExercise(page);
    await rate(page, 'facil');
    await page.locator('[data-action="session-finish"]').first().click();
    // 8 reps con Fácil → +2 reps con el peso nuevo
    expect((await readState(page)).lifts.hack).toMatchObject({ kg: 105, reps: 10 });
  });
});

test.describe('Ver un ejercicio sin empezar el entreno', () => {
  test.use({ now: '2026-11-03T10:00:00+01:00' }); // martes → Pierna

  test('desde Hoy se abre la ficha con vídeo, objetivo e historial', async ({ page }) => {
    await seed(page, gymState({ lifts: { hack: { kg: 100, reps: 8, stall: 0 } } }));
    await page.goto('/');
    await page.locator('.ex-link').first().click();
    await expect(page).toHaveURL(/#\/ejercicio\/hack$/);
    await expect(page.getByRole('heading', { name: 'Sentadilla hack' })).toBeVisible();
    await expect(page.locator('.work-box')).toContainText('3 × 8 · 100 kg');
    await page.locator('[data-action="video-open"]').click();
    await expect(page.locator('.video-modal iframe')).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/VNpkYdex6Yc/);
    await page.locator('.video-modal-panel [data-action="video-close"]').click();
    // Volver lleva a donde estabas, sin haber empezado ningún entreno
    await page.locator('[data-action="go-back"]').click();
    await expect(page.getByRole('heading', { name: 'Hoy', exact: true })).toBeVisible();
    expect((await readState(page)).active).toBeNull();
  });

  test('desde el Plan semanal: un ejercicio de calistenia abre su ruta con el vídeo arriba', async ({ page }) => {
    await seed(page, gymState({ progress: { dominadas: { step: 4, passes: 0, done: false } } }));
    await page.goto('/#/plan');
    await page.locator('.week-row').first().locator('a.mini-chip', { hasText: 'Dominadas' }).click();
    await expect(page).toHaveURL(/#\/ruta\/dominadas$/);
    await expect(page.locator('.card').first().locator('[data-action="video-open"]')).toBeVisible();
    await page.locator('[data-action="go-back"]').click();
    await expect(page).toHaveURL(/#\/plan$/);
  });
});
