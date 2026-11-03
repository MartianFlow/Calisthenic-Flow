const { test, expect, makeState, seed, readState, pastSession } = require('./fixtures');

test.describe('Plan semanal', () => {
  test('recomienda 3 días a principiantes y explica por qué', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/plan');
    await expect(page.locator('.rec-card .hero-num')).toContainText('3');
    await expect(page.locator('.rec-card')).toContainText('Principiante');
    await expect(page.locator('.week-row:not(.type-R)')).toHaveCount(3);
  });

  test('las habilidades en las que avanzas cuentan para el nivel', async ({ page }) => {
    // Básicos al ~54 % → intermedio (sin necesidad de entrenos registrados)
    const basics = { dominadas: 5, remo: 4, flexiones: 5, fondos: 4, piernas: 5, bisagra: 3, core: 5 };
    const progress = Object.fromEntries(Object.entries(basics).map(([id, step]) => [id, { step, passes: 0, done: false }]));
    await seed(page, makeState({ progress }));
    await page.goto('/#/plan');
    await expect(page.locator('.rec-card')).toContainText('Intermedio');
    // Con front lever, planche y muscle-up a mitad de ruta pasa a avanzado
    await page.evaluate((key) => {
      const s = JSON.parse(localStorage.getItem(key));
      Object.assign(s.progress, {
        frontlever: { step: 4, passes: 0, done: false },
        planche: { step: 3, passes: 0, done: false },
        muscleup: { step: 4, passes: 0, done: false },
      });
      localStorage.setItem(key, JSON.stringify(s));
    }, 'calisthenic-flow:v1');
    await page.reload();
    await expect(page.locator('.rec-card')).toContainText('Avanzado');
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

test.describe('Cambiar la semana y elegir rutina', () => {
  // Lunes 2/11/2026, semana impar: L-X-V = Día B, Día A, Día B
  const row = (page, wd) => page.locator('.week-row').nth(wd);

  test('mover el entreno del miércoles al jueves solo esta semana, y deshacerlo', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/plan');
    await expect(row(page, 2)).toContainText('Día A');
    await row(page, 2).locator('[data-action="week-move"]').click();
    await expect(page.locator('.move-banner')).toContainText('Día A del miércoles');
    // El lunes ya no se ofrece como destino: hoy en adelante, sí
    await expect(row(page, 3).locator('[data-action="week-move-to"]')).toHaveText(/Aquí/);
    await row(page, 3).locator('[data-action="week-move-to"]').click();
    await expect(page.locator('#toast')).toContainText('Día A pasa al jueves');
    await expect(row(page, 3)).toContainText('Día A');
    await expect(row(page, 3)).toContainText('del miércoles');
    await expect(row(page, 2)).toContainText('Descanso');
    let s = await readState(page);
    expect(s.weekMoves.from).toEqual([0, -1, -1, 2, 4, -1, -1]);
    expect(s.settings.schedule.days).toEqual([true, false, true, false, true, false, false]); // el plan no cambia

    // En Hoy, la semana muestra el jueves con entreno
    await page.goto('/');
    await expect(page.locator('.days .day').nth(3)).toHaveClass(/planned/);
    await expect(page.locator('.days .day').nth(2)).not.toHaveClass(/planned/);

    await page.goto('/#/plan');
    await page.locator('[data-action="week-reset"]').click();
    await expect(row(page, 2)).toContainText('Día A');
    s = await readState(page);
    expect(s.weekMoves).toBeNull();
  });

  test('mover el entreno de hoy a mañana deja hoy de descanso', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/plan');
    await row(page, 0).locator('[data-action="week-move"]').click();
    await row(page, 1).locator('[data-action="week-move-to"]').click();
    await page.goto('/');
    await expect(page.locator('.plan.rest')).toContainText('Hoy toca descanso');
    await expect(page.locator('.next-up')).toContainText('martes');
  });

  test('los cambios de otra semana no cuentan', async ({ page }) => {
    const lastWeek = new Date('2026-10-26T00:00:00').getTime();
    await seed(page, makeState({ weekMoves: { start: lastWeek, sig: 'B,R,A,R,B,R,R', from: [-1, 0, 2, -1, 4, -1, -1] } }));
    await page.goto('/#/plan');
    await expect(row(page, 0)).toContainText('Día B');
    await expect(page.locator('.week-changed')).toHaveCount(0);
  });

  test('«Entrenar hoy» en otro día del plan lo pone como entreno de hoy', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/plan');
    await row(page, 2).locator('[data-action="week-train-today"]').click();
    await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible();
    await expect(page.locator('.plan .eyebrow').first()).toContainText('Elegido para hoy');
    await expect(page.locator('.plan h2')).toContainText('Día A');
    await page.locator('[data-action="start-session"]').click();
    await expect(page).toHaveURL(/#\/entreno/);
    expect((await readState(page)).active.dayType).toBe('A');
  });

  test('en Hoy se elige cualquier rutina del plan, también al editar', async ({ page }) => {
    await seed(page, makeState({ settings: { goals: ['pino'] } }));
    await page.goto('/');
    await page.locator('[data-action="plan-edit"]').click();
    await page.locator('.edit-panel [data-action="plan-pick"][data-type="A"]').click();
    await expect(page.locator('.plan h2')).toContainText('Día A');
    await expect(page.locator('.edit-panel [data-action="plan-pick"][data-type="A"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test.describe('en un día de descanso', () => {
    test.use({ now: '2026-11-03T10:00:00+01:00' }); // martes

    test('se puede elegir una rutina del plan con un toque', async ({ page }) => {
      await seed(page, makeState());
      await page.goto('/');
      await page.locator('.plan.rest [data-action="plan-pick"][data-type="B"]').click();
      await expect(page.locator('.plan h2')).toContainText('Día B');
      await expect(page.locator('[data-action="start-session"]')).toBeVisible();
    });
  });
});
