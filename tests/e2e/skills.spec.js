// Habilidades: una de foco (la que se aprende) y hasta 2 de mantenimiento (petición 24).
const { test, expect, makeState, seed, readState, pastSession } = require('./fixtures');

const L_V = [true, true, true, true, true, false, false];

// Semana del plan leída de la pantalla: por día, si descansa y qué habilidades lleva.
async function weekSkills(page) {
  await page.goto('/#/plan');
  await expect(page.locator('.week-row')).toHaveCount(7);
  return page.locator('.week-row').evaluateAll((rows) => rows.map((r) => {
    const name = (c) => c.childNodes[0].textContent.trim();
    return {
      rest: r.classList.contains('type-R'),
      skills: [...r.querySelectorAll('.mini-chip.skill')].map(name),
      keep: [...r.querySelectorAll('.mini-chip.skill.keep')].map(name),
      first: r.querySelector('.mini-chip') ? name(r.querySelector('.mini-chip')) : null,
    };
  }));
}
const daysWith = (week, name) => week.map((d, i) => (d.skills.includes(name) ? i : -1)).filter((i) => i >= 0);
const noneConsecutive = (days) => days.every((d, k) => k === 0 || d - days[k - 1] > 1);

test.describe('Foco y mantenimiento', () => {
  test('los objetivos de antes pasan a foco y mantener, con un aviso que se cierra', async ({ page }) => {
    await seed(page, makeState({ settings: { goals: ['frontlever', 'muscleup', 'pino'] } }));
    await page.goto('/');
    await expect(page.locator('.notice-card')).toContainText('Aprende una, mantén las demás');
    await expect(page.locator('.notice-card')).toContainText('Front lever como la que aprendes y Muscle-up y Pino para mantener');
    let s = await readState(page);
    expect(s.settings).toMatchObject({ focus: 'frontlever', maintain: ['muscleup', 'pino'], goals: ['frontlever', 'muscleup', 'pino'] });
    await page.locator('[data-action="skills-notice-ok"]').click();
    await expect(page.locator('.notice-card')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.notice-card')).toHaveCount(0);
    s = await readState(page);
    expect(s.notices.skills).toBeUndefined();
    expect(s.settings.focus).toBe('frontlever'); // no se vuelve a migrar
  });

  test('«Elegir en Ajustes» lleva a las habilidades: un foco y hasta 2 para mantener', async ({ page }) => {
    await seed(page, makeState({ settings: { goals: ['frontlever', 'muscleup', 'pino'] } }));
    await page.goto('/');
    await page.locator('[data-action="skills-review"]').click();
    await expect(page).toHaveURL(/#\/ajustes/);
    await expect(page.locator('#habilidades')).toBeVisible();

    // Como el usuario: aprender el pino y mantener el muscle-up y el front lever
    await page.locator('[data-action="set-focus"][data-id="pino"]').click();
    await expect(page.locator('[data-action="set-focus"][data-id="pino"]')).toHaveAttribute('aria-checked', 'true');
    let s = await readState(page);
    expect(s.settings).toMatchObject({ focus: 'pino', maintain: ['muscleup'] }); // el pino sale de mantener
    await expect(page.locator('[data-action="toggle-maintain"][data-id="pino"]')).toHaveCount(0);
    await page.locator('[data-action="toggle-maintain"][data-id="frontlever"]').click();
    s = await readState(page);
    expect(s.settings).toMatchObject({ focus: 'pino', maintain: ['muscleup', 'frontlever'], goals: ['pino', 'muscleup', 'frontlever'] });

    // Un tercero no cabe
    await page.locator('[data-action="toggle-maintain"][data-id="lsit"]').click();
    await expect(page.locator('#toast')).toContainText('Como mucho 2');
    expect((await readState(page)).settings.maintain).toEqual(['muscleup', 'frontlever']);

    // «Aún no domino ninguna» las quita; tocar otra vez el foco lo quita
    await page.locator('[data-action="maintain-none"]').click();
    await expect(page.locator('[data-action="maintain-none"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-action="set-focus"][data-id="pino"]').click();
    s = await readState(page);
    expect(s.settings).toMatchObject({ focus: null, maintain: [], goals: [] });
  });

  test('en tu semana el pino va el primero todos los días y las de mantener se turnan', async ({ page }) => {
    await seed(page, makeState({ settings: { focus: 'pino', maintain: ['muscleup', 'frontlever'] } }));
    const week = await weekSkills(page);
    const train = week.filter((d) => !d.rest);
    expect(train).toHaveLength(3);
    for (const d of train) {
      expect(d.first).toBe('Pino');
      expect(d.keep.length).toBeLessThanOrEqual(1); // como mucho una de mantener por sesión
    }
    for (const name of ['Muscle-up', 'Front lever']) {
      const n = daysWith(week, name).length;
      expect(n, name).toBeGreaterThanOrEqual(1);
      expect(n, name).toBeLessThanOrEqual(2);
    }
  });

  test('con 5 días: cada una de mantener 1–2 días, nunca seguidos', async ({ page }) => {
    await seed(page, makeState({ settings: { focus: 'pino', maintain: ['muscleup', 'frontlever'], daysPerWeek: 5, schedule: { days: L_V } } }));
    const week = await weekSkills(page);
    expect(week.filter((d) => !d.rest).every((d) => d.first === 'Pino')).toBe(true);
    for (const name of ['Muscle-up', 'Front lever']) {
      const days = daysWith(week, name);
      expect(days.length, name).toBeGreaterThanOrEqual(1);
      expect(days.length, name).toBeLessThanOrEqual(2);
      expect(noneConsecutive(days), name).toBe(true);
    }
  });

  test('foco de brazos rectos: 3 días como mucho y, entre todas las de brazos rectos, nunca días seguidos', async ({ page }) => {
    await seed(page, makeState({ settings: { focus: 'frontlever', maintain: ['planche', 'lsit'], daysPerWeek: 5, schedule: { days: L_V } } }));
    const week = await weekSkills(page);
    const fl = daysWith(week, 'Front lever');
    expect(fl.length).toBeGreaterThanOrEqual(2);
    expect(fl.length).toBeLessThanOrEqual(3);
    // El foco va antes que las de mantener
    for (const i of fl) expect(week[i].skills[0]).toBe('Front lever');
    const straightDays = week.map((d, i) => (d.skills.some((n) => ['Front lever', 'Planche'].includes(n)) ? i : -1)).filter((i) => i >= 0);
    expect(straightDays.length).toBeLessThanOrEqual(3);
    expect(noneConsecutive(straightDays)).toBe(true);
  });

  test('back lever y planche nunca el mismo día, y aun así el back lever entra en la semana', async ({ page }) => {
    await seed(page, makeState({ settings: { focus: 'planche', maintain: ['backlever'] } }));
    const week = await weekSkills(page);
    expect(week.some((d) => d.skills.includes('Planche') && d.skills.includes('Back lever'))).toBe(false);
    expect(daysWith(week, 'Back lever').length).toBeGreaterThanOrEqual(1);
    expect(daysWith(week, 'Planche').length).toBeGreaterThanOrEqual(2);
  });

  for (const [focus, name] of [['hspu', 'Flexión de pino'], ['muscleup', 'Muscle-up']]) {
    test(`${name} de foco: 2–3 días y nunca seguidos`, async ({ page }) => {
      await seed(page, makeState({ settings: { focus, maintain: [], daysPerWeek: 5, schedule: { days: L_V } } }));
      const days = daysWith(await weekSkills(page), name);
      expect(days.length).toBeGreaterThanOrEqual(2);
      expect(days.length).toBeLessThanOrEqual(3);
      expect(noneConsecutive(days)).toBe(true);
    });
  }

  test('las de mantener llevan como mucho 3 series y su etiqueta; el foco, todas', async ({ page }) => {
    // Pino libre (5 × 10 s) como mantenimiento → 3 series; front lever de foco → las de su paso
    await seed(page, makeState({
      settings: { focus: 'frontlever', maintain: ['pino'] },
      progress: { pino: { step: 6, passes: 0, done: false }, frontlever: { step: 0, passes: 0, done: false } },
    }));
    await page.goto('/');
    const pinoRow = page.locator('.ex-row', { hasText: 'Pino libre' });
    await expect(pinoRow.locator('.role-tag')).toHaveText('mantener');
    await expect(pinoRow.locator('.ex-target')).toContainText('3 ×');
    await expect(page.locator('.ex-row', { hasText: 'Tuck front lever' }).locator('.role-tag')).toHaveText('foco');
    await page.locator('[data-action="start-session"]').click();
    const s = await readState(page);
    const pino = s.active.items.find((it) => it.roadmapId === 'pino');
    const fl = s.active.items.find((it) => it.roadmapId === 'frontlever');
    expect(pino).toMatchObject({ role: 'mantener', plannedSets: 3 });
    expect(fl).toMatchObject({ role: 'foco', plannedSets: 3 });
    expect(s.active.items[0].roadmapId).toBe('pino'); // la práctica de pino, la primera
    await page.locator('[data-action="warmup-done"]').last().click();
    await expect(page.locator('.exercise .eyebrow')).toContainText('Práctica de pino');
    await expect(page.locator('.exercise')).toContainText('Para mantener: series limpias');
  });

  test.describe('en un día de descanso', () => {
    test.use({ now: '2026-11-03T10:00:00+01:00' }); // martes

    test('«Solo pino» hace una práctica corta que no cuenta como entreno de la semana', async ({ page }) => {
      await seed(page, makeState({ settings: { focus: 'pino', maintain: [] }, progress: { pino: { step: 2, passes: 0, done: false } } }));
      await page.goto('/');
      await expect(page.locator('.plan.rest')).toContainText('Hoy toca descanso');
      await page.locator('[data-action="pino-only"]').click();
      await expect(page).toHaveURL(/#\/entreno/);
      let s = await readState(page);
      expect(s.active).toMatchObject({ dayType: 'pino', warmupKind: 'pino', warmupDone: false });
      expect(s.active.items.map((it) => it.roadmapId)).toEqual(['pino']);
      // Calentamiento corto: solo muñecas y hombros, no el general
      await expect(page.locator('.exercise h2')).toHaveText('Calentamiento corto');
      await expect(page.locator('.check-item')).toHaveCount(2);
      await expect(page.locator('.checklist')).toContainText('Flexiones de muñeca sobre la palma y el dorso');
      await page.locator('[data-action="warmup-done"]').first().click();
      await expect(page.locator('.chip')).toHaveCount(2); // calentamiento y pino
      for (let i = 0; i < 3; i++) await page.locator('[data-action="set-toggle"]:not(.on)').first().click();
      await page.locator('.rate-panel [data-value="normal"]').click();
      await page.locator('[data-action="session-finish"]').first().click();
      await expect(page).toHaveURL(/#\/resumen\//);
      await page.goto('/');
      await expect(page.locator('.plan.rest')).toContainText('Hoy toca descanso'); // sigue siendo día de descanso
      await expect(page.locator('.pino-daily .pino-done')).toContainText('Hecho hoy');
      await expect(page.locator('.pino-daily .pill')).toHaveText('1/7 días');
      await expect(page.locator('.pino-day.today')).toHaveClass(/on/);
      await expect(page.locator('.week .pill')).toContainText('0/3');
      s = await readState(page);
      expect(s.sessions.at(-1).dayType).toBe('pino');
    });

    test('con el pino de foco, Hoy recuerda que es diario aunque elijas entrenar otra rutina', async ({ page }) => {
      await seed(page, makeState({ settings: { focus: 'pino', maintain: [] } }));
      await page.goto('/');
      await expect(page.locator('.pino-daily')).toContainText('el pino es diario');
      await expect(page.locator('.pino-daily [data-action="pino-only"]')).toBeVisible();
      await expect(page.locator('.plan.rest [data-action="pino-only"]')).toHaveCount(0); // no sale dos veces
      // «Entrenar igualmente»: el entreno ya lleva el pino al principio
      await page.locator('[data-action="train-anyway"]').click();
      await expect(page.locator('.pino-daily')).toContainText('al principio de tu entreno');
      await expect(page.locator('.ex-row').first()).toContainText('Práctica de pino');
    });

    test('pierna en el gimnasio: el día de pierna también empieza con el pino', async ({ page }) => {
      // Martes con 5 días L–V: día de pierna
      await seed(page, makeState({ settings: { legs: 'gym', focus: 'pino', maintain: ['muscleup'], daysPerWeek: 5, schedule: { days: L_V } } }));
      await page.goto('/');
      await expect(page.locator('.plan h2')).toContainText('Pierna');
      await expect(page.locator('.ex-row').first()).toContainText('Práctica de pino');
      await expect(page.locator('.pino-daily')).toContainText('al principio de tu entreno');
      // y el calentamiento sigue siendo el de pierna
      await page.locator('[data-action="start-session"]').click();
      expect((await readState(page)).active.warmupKind).toBe('pierna');
    });

    test('sin el pino entre tus habilidades no aparece «Solo pino»', async ({ page }) => {
      await seed(page, makeState({ settings: { focus: 'frontlever', maintain: ['muscleup'] } }));
      await page.goto('/');
      await expect(page.locator('.plan.rest')).toBeVisible();
      await expect(page.locator('[data-action="pino-only"]')).toHaveCount(0);
    });
  });
});

test.describe('Sin ninguna habilidad todavía', () => {
  test('Hoy y Ajustes recomiendan por cuál empezar', async ({ page }) => {
    await seed(page, makeState({ settings: { focus: null, maintain: [] } }));
    await page.goto('/');
    await expect(page.locator('.card', { hasText: 'Tus habilidades' })).toContainText('Para empezar te recomendamos Pino y L-sit');
    await page.goto('/#/ajustes');
    await expect(page.locator('[data-action="set-focus"][data-id="pino"] .rec-tag')).toHaveText('Recomendada');
    await expect(page.locator('[data-action="set-focus"][data-id="lsit"] .rec-tag')).toHaveCount(1);
    await expect(page.locator('.rec-tag')).toHaveCount(2);
    // Con la base de dominadas y core, el front lever también se puede empezar
    await page.evaluate((key) => {
      const s = JSON.parse(localStorage.getItem(key));
      Object.assign(s.progress, { dominadas: { step: 5, passes: 0, done: false }, core: { step: 4, passes: 0, done: false }, flexiones: { step: 2, passes: 0, done: false }, fondos: { step: 1, passes: 0, done: false } });
      localStorage.setItem(key, JSON.stringify(s));
    }, 'calisthenic-flow:v1');
    await page.reload();
    await expect(page.locator('.rec-tag')).toHaveCount(3);
    await expect(page.locator('[data-action="set-focus"][data-id="frontlever"] .rec-tag')).toHaveCount(1);
    // Con una habilidad para mantener ya no hace falta recomendar
    await page.locator('[data-action="toggle-maintain"][data-id="muscleup"]').click();
    await expect(page.locator('.rec-tag')).toHaveCount(0);
  });

  test('si al foco le falta base, Hoy dice qué básicos le acercan y esos van primero', async ({ page }) => {
    // Planche sin base: pide Flexiones arqueras y Fondos en paralelas (volumen)
    await seed(page, makeState({ settings: { focus: 'planche', maintain: [] } }));
    await page.goto('/');
    await expect(page.locator('.prereq-note')).toContainText('Para la planche: llega a Flexiones arqueras 3 × 6 reps por lado y a Fondos en paralelas (volumen) 3 × 12 reps');
    // Lunes de semana impar: Día B (remo, flexiones, isquios, core) → planche, su complementario
    // (en el primer paso, solo uno) y luego las flexiones, antes que el remo
    const names = await page.locator('.ex-row .ex-title').allTextContents();
    expect(names[0]).toMatch(/Planche lean/);
    expect(names[1]).toMatch(/Flexiones pseudo planche/);
    expect(names[2]).toMatch(/Flexiones en pared/);
    expect(names[3]).toMatch(/Remo/);
    // Se puede empezar igual desde su primer paso
    await page.locator('[data-action="start-session"]').click();
    expect((await readState(page)).active.items[0]).toMatchObject({ roadmapId: 'planche', stepIndex: 0, role: 'foco' });
  });

  test('al completar la ruta del foco propone pasarla a mantener y elegir otra', async ({ page }) => {
    // Último paso del pino con la meta ya cumplida una vez: otra sesión en la meta lo completa
    await seed(page, makeState({
      settings: { focus: 'pino', maintain: ['frontlever'] },
      progress: { pino: { step: 8, passes: 1, done: false, work: 60 } },
    }));
    await page.goto('/#/ruta/pino');
    await page.locator('[data-action="train-only"]').click();
    await page.locator('[data-action="warmup-done"]').last().click();
    for (let i = 0; i < 3; i++) await page.locator('[data-action="set-toggle"]:not(.on)').first().click();
    await page.locator('.rate-panel [data-value="normal"]').click();
    await page.locator('[data-action="session-finish"]').first().click();
    await expect(page).toHaveURL(/#\/resumen\//);
    await expect(page.locator('.achieved-card')).toContainText('Ya tienes el pino');

    // Hoy también lo propone hasta que se decide
    await page.goto('/');
    await expect(page.locator('.achieved-card')).toBeVisible();
    await page.locator('.achieved-card [data-action="focus-to-maintain"]').click();
    await expect(page).toHaveURL(/#\/ajustes/);
    await expect(page.locator('#toast')).toContainText('Pino pasa a mantener');
    const s = await readState(page);
    expect(s.settings).toMatchObject({ focus: null, maintain: ['pino', 'frontlever'] });
    await page.goto('/');
    await expect(page.locator('.achieved-card')).toHaveCount(0);
  });

  test('con 2 de mantener elige cuál deja; «Seguir con ella» oculta la propuesta', async ({ page }) => {
    const done = { pino: { step: 8, passes: 0, done: true } };
    await seed(page, makeState({ settings: { focus: 'pino', maintain: ['muscleup', 'frontlever'] }, progress: done }));
    await page.goto('/');
    await expect(page.locator('.achieved-card [data-action="focus-to-maintain"]')).toHaveCount(2);
    await page.locator('.achieved-card [data-action="focus-keep"]').click();
    await expect(page.locator('.achieved-card')).toHaveCount(0);
    expect((await readState(page)).settings.focus).toBe('pino');

    // Desde la ruta: «¿Ya la dominas?» en lugar del muscle-up
    await page.goto('/#/ruta/pino');
    await page.locator('.role-card [data-action="focus-to-maintain"][data-replace="muscleup"]').click();
    expect((await readState(page)).settings).toMatchObject({ focus: null, maintain: ['pino', 'frontlever'] });
  });
});

test.describe('Rutas: aprender, mantener o quitar', () => {
  test('la ficha de una habilidad cambia su papel con un toque', async ({ page }) => {
    await seed(page, makeState({ settings: { focus: 'pino', maintain: ['frontlever'] } }));
    await page.goto('/#/rutas');
    await expect(page.locator('.route-card', { hasText: 'Pino' }).first().locator('.pill.focus')).toBeVisible();
    await expect(page.locator('.route-card', { hasText: 'Front lever' }).locator('.pill.keep')).toBeVisible();

    await page.goto('/#/ruta/planche');
    await page.locator('.role-card [data-action="set-focus"]').click();
    await expect(page.locator('#toast')).toContainText('Ahora aprendes la planche. Pino deja de ser tu foco');
    expect((await readState(page)).settings).toMatchObject({ focus: 'planche', maintain: ['frontlever'] });
    await expect(page.locator('.role-card')).toContainText('Aprendiendo');

    await page.goto('/#/ruta/muscleup');
    await page.locator('.role-card [data-action="toggle-maintain"]').click();
    expect((await readState(page)).settings.maintain).toEqual(['frontlever', 'muscleup']);
    await page.locator('.role-card [data-action="skill-remove"]').click();
    expect((await readState(page)).settings.maintain).toEqual(['frontlever']);
  });

  test('las de mantener se ven en cian en el plan y en Hoy', async ({ page }) => {
    await seed(page, makeState({ settings: { focus: 'pino', maintain: ['frontlever'] } }));
    await page.goto('/');
    await expect(page.locator('.goal.is-focus')).toContainText('Pino');
    await expect(page.locator('.goal.is-keep')).toContainText('Front lever');
    const week = await weekSkills(page);
    expect(week.flatMap((d) => d.keep)).toContain('Front lever');
    expect(week.flatMap((d) => d.keep)).not.toContain('Pino');
  });
});

test('una sesión de habilidades sin plan semanal turna las de mantener', async ({ page }) => {
  const sessions = [1, 3].map((daysAgo) => pastSession({ daysAgo, dayType: daysAgo === 1 ? 'B' : 'A', items: [{ roadmapId: 'core', stepIndex: 0, sets: [8, 8, 8] }] }));
  await seed(page, makeState({ settings: { focus: 'lsit', maintain: ['muscleup', 'frontlever'], schedule: null }, sessions }));
  await page.goto('/');
  // 2 sesiones de torso hechas → turno de la primera de mantener (muscle-up)
  const names = await page.locator('.ex-row .muted.small').allTextContents();
  expect(names[0]).toMatch(/L-sit/);
  expect(names[1]).toMatch(/Muscle-up/);
  expect(names.join(' ')).not.toMatch(/Front lever/);
});
