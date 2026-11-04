// Cómo se entrena la habilidad de foco (plan de habilidades A–J): complementarios,
// alternancia de las dos habilidades, más series en los aguantes difíciles, subida más
// despacio en brazos rectos, calentamiento según las habilidades y sustituir en vez de sumar.
const { test, expect, makeState, seed, readState } = require('./fixtures');

const prog = (o) => Object.fromEntries(Object.entries(o).map(([id, step]) => [id, typeof step === 'object' ? step : { step, passes: 0, done: false }]));
const rowsOf = (page) => page.locator('.ex-row').evaluateAll((rows) => rows.map((r) => ({
  title: r.querySelector('.ex-title').textContent.trim(),
  sub: r.querySelector('.muted.small')?.textContent.replace(/\s+/g, ' ').trim() || '',
  acc: r.classList.contains('acc-row'),
  target: r.querySelector('.ex-target').textContent.replace(/\s+/g, ' ').trim(),
})));

async function doAllSets(page) {
  const n = await page.locator('[data-action="set-toggle"]:not(.on)').count();
  for (let i = 0; i < n; i++) await page.locator('[data-action="set-toggle"]:not(.on)').first().click();
}

test.describe('Complementarios de la habilidad de foco', () => {
  test('van después de las habilidades y antes de los básicos, sin valorar y sin tocar el progreso', async ({ page }) => {
    // Lunes de semana impar: Día B. Front lever a una pierna (paso 3): 2 complementarios
    await seed(page, makeState({ settings: { focus: 'frontlever', maintain: [] }, progress: prog({ frontlever: 2 }) }));
    await page.goto('/');
    const rows = await rowsOf(page);
    expect(rows.map((r) => r.title)).toEqual([
      'Front lever a una pierna', 'Remo en tuck front lever', 'Retracciones escapulares',
      'Remo inclinado', 'Flexiones en pared', 'Puente de glúteo a una pierna', 'Dead bug',
    ]);
    expect(rows[1]).toMatchObject({ acc: true, sub: 'Complementario · Front lever', target: '3 × 6reps' });
    expect(rows[2]).toMatchObject({ acc: true, target: '3 × 10reps' });

    await page.locator('[data-action="start-session"]').click();
    await page.locator('[data-action="warmup-done"]').last().click();
    await page.locator('.chip', { hasText: 'Remo en tuck front lever' }).click();
    await expect(page.locator('.exercise .eyebrow')).toContainText('Complementario · Front lever');
    await expect(page.locator('.exercise')).toContainText('no hace falta valorarlo');
    await doAllSets(page);
    // Sin pregunta de dificultad: pasa al siguiente y no aparece el panel de valorar
    await expect(page.locator('.rate-panel')).toHaveCount(0);
    await expect(page.locator('.exercise h2')).toHaveText('Retracciones escapulares');
    await page.locator('.session-head [data-action="session-finish"]').click();
    await expect(page).toHaveURL(/#\/resumen\//);
    await expect(page.locator('.summary-item.acc-item')).toContainText('Remo en tuck front lever');

    const s = await readState(page);
    const entry = s.sessions[0].items.find((it) => it.acc === 'remo/tuck-fl');
    expect(entry).toMatchObject({ accessoryOf: 'frontlever', sets: [6, 6, 6] });
    expect(entry.roadmapId).toBeUndefined();
    expect(s.progress.remo?.step ?? 0).toBe(0); // el remo no avanza por hacer su paso como complementario

    // «Última vez» del complementario
    await page.goto('/');
    await page.locator('[data-action="train-anyway"]').click(); // hoy ya entrenó
    await expect(page.locator('.ex-row.acc-row', { hasText: 'Remo en tuck front lever' })).toContainText('Última vez: 6 · 6 · 6');
  });

  test('en los primeros pasos, como mucho uno; las de mantener no llevan', async ({ page }) => {
    await seed(page, makeState({ settings: { focus: 'frontlever', maintain: ['planche'] }, progress: prog({ frontlever: 0, planche: 3 }) }));
    await page.goto('/#/ruta/frontlever');
    await page.locator('[data-action="train-only"]').click();
    let s = await readState(page);
    expect(s.active.items.filter((it) => it.acc).map((it) => it.acc)).toEqual(['dominadas/escapulares']);
    await page.goto('/#/ruta/planche');
    await page.locator('[data-action="train-only"]').click();
    s = await readState(page);
    expect(s.active.items.filter((it) => it.acc)).toEqual([]);
  });

  test('back lever: german hang y skin the cat como preparación, antes de los aguantes', async ({ page }) => {
    await seed(page, makeState({ settings: { focus: 'backlever', maintain: [] }, progress: prog({ backlever: 2 }) }));
    await page.goto('/#/ruta/backlever');
    await page.locator('[data-action="train-only"]').click();
    const s = await readState(page);
    expect(s.active.items.map((it) => it.acc || it.roadmapId)).toEqual(['backlever/german-hang', 'backlever/skin-the-cat', 'backlever']);
    expect(s.active.items[0]).toMatchObject({ prep: true, type: 'hold', plannedSets: 2, goal: 20 });
    await page.locator('[data-action="warmup-done"]').last().click();
    await expect(page.locator('.exercise .eyebrow')).toContainText('Preparación · Back lever');
    // El cronómetro de isometrías también sirve en un complementario
    await page.locator('[data-action="hold-start"]').first().click();
    await expect(page.locator('.hold-overlay')).toContainText('German hang · serie 1');
    await page.locator('[data-action="hold-cancel"]').click();
  });

  test('pino de foco: despegues y salida en rueda desde el pino en pared de 1 min', async ({ page }) => {
    await seed(page, makeState({ settings: { focus: 'pino', maintain: [] }, progress: prog({ pino: 3 }) }));
    await page.goto('/');
    const titles = (await rowsOf(page)).map((r) => r.title);
    expect(titles.slice(0, 3)).toEqual(['Pino de cara a la pared (1 min)', 'Despegues de la pared', 'Patada al pino y salida en rueda']);
  });

  test('L-sit entre tus habilidades y hoy no toca: compresión ligera después del core', async ({ page }) => {
    await seed(page, makeState({
      settings: { focus: 'pino', maintain: ['lsit'] }, progress: prog({ lsit: 2 }),
      plan: { dayType: 'B', ids: ['remo', 'core'], custom: true },
    }));
    await page.goto('/');
    const rows = await rowsOf(page);
    expect(rows.map((r) => r.title)).toEqual(['Remo inclinado', 'Dead bug', 'Elevaciones de piernas sentado']);
    expect(rows[2]).toMatchObject({ acc: true, sub: 'Complementario · L-sit', target: '2 × 8reps' });
  });

  test('sustituir: con el front lever en straddle y remo hoy, el jalón con banda en lugar del remo en tuck', async ({ page }) => {
    await seed(page, makeState({ settings: { focus: 'frontlever', maintain: [] }, progress: prog({ frontlever: 3 }) }));
    await page.goto('/'); // Día B, con remo
    const titles = (await rowsOf(page)).map((r) => r.title);
    expect(titles.slice(0, 3)).toEqual(['Front lever straddle', 'Retracciones escapulares', 'Jalón con brazos rectos con banda']);
    // Sin vídeo propio: se ofrece buscarlo en YouTube
    await page.locator('[data-action="start-session"]').click();
    await page.locator('[data-action="warmup-done"]').last().click();
    await page.locator('.chip', { hasText: 'Jalón con brazos rectos' }).click();
    await expect(page.locator('.exercise .video-search')).toBeVisible();
  });
});

test.describe('Alternar las dos habilidades', () => {
  test('tras una serie de una, pasa a la otra; el descanso sigue siendo 80 s', async ({ page }) => {
    await seed(page, makeState({
      settings: { focus: 'frontlever', maintain: [] }, progress: prog({ frontlever: 1, planche: 2 }),
      plan: { dayType: 'B', ids: ['frontlever', 'planche', 'core'], custom: true },
    }));
    await page.goto('/');
    await page.locator('[data-action="start-session"]').click();
    await page.locator('[data-action="warmup-done"]').last().click();
    await expect(page.locator('.exercise h2')).toHaveText('Tuck avanzado');
    await expect(page.locator('.alt-note')).toContainText('Alternando con Planche');
    await page.locator('[data-action="set-toggle"][data-set="0"]').click();
    await expect(page.locator('.exercise .eyebrow')).toContainText('Planche');
    await expect(page.locator('[data-tick="rest-total"]')).toHaveText('de 1:20');
    await expect(page.locator('.alt-note')).toContainText('Alternando con Front lever');
    await page.locator('[data-action="rest-skip"]').click();
    await page.locator('[data-action="set-toggle"][data-set="0"]').click();
    await expect(page.locator('.exercise .eyebrow')).toContainText('Front lever');
    // El front lever tiene 4 series y la planche 5: cuando una termina, la otra sigue sola
    let s = await readState(page);
    expect(s.active.items.slice(0, 2).map((it) => it.sets.filter((x) => x.done).length)).toEqual([1, 1]);
    for (let k = 0; k < 6; k++) {
      if (await page.locator('[data-action="rest-skip"]').count()) await page.locator('[data-action="rest-skip"]').click();
      if (await page.locator('.rate-panel').count()) await page.locator('.rate-panel [data-value="normal"]').click();
      await page.locator('.exercise [data-action="set-toggle"]:not(.on)').first().click();
    }
    s = await readState(page);
    expect(s.active.items.slice(0, 2).map((it) => it.sets.filter((x) => x.done).length)).toEqual([4, 4]);
    await expect(page.locator('.exercise .eyebrow')).toContainText('Planche');
    await expect(page.locator('.alt-note')).toHaveCount(0);
  });
});

test.describe('Más series y metas de las guías', () => {
  test('front lever straddle: 5 series; tuck avanzado: 4 × 15 s', async ({ page }) => {
    await seed(page, makeState({ settings: { focus: 'frontlever', maintain: [] }, progress: prog({ frontlever: 3 }) }));
    await page.goto('/#/ruta/frontlever');
    await expect(page.locator('.path-step').nth(1)).toContainText('4 × 15 s');
    await page.locator('[data-action="train-only"]').click();
    const s = await readState(page);
    expect(s.active.items.find((it) => it.roadmapId === 'frontlever')).toMatchObject({ plannedSets: 5, target: 8 });
  });

  test('la ficha de una habilidad muestra sus complementarios y cuánto se tarda', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/ruta/frontlever');
    await expect(page.locator('.acc-list')).toContainText('Remo en tuck front lever');
    await expect(page.locator('.timeline')).toContainText('Front lever completo');
    await expect(page.locator('.timeline')).toContainText('1–3 años');
  });
});

test.describe('Brazos rectos: subir más despacio', () => {
  test('«Fácil» en la meta cuenta como sesión superada: hacen falta 2 para subir', async ({ page }) => {
    // Tuck front lever 3 × 15 s, ya en la meta
    await seed(page, makeState({ settings: { focus: 'frontlever', maintain: [] }, progress: { frontlever: { step: 0, passes: 0, done: false, work: 15 } } }));
    for (let round = 1; round <= 2; round++) {
      await page.goto('/#/ruta/frontlever');
      await page.locator('[data-action="train-only"]').click();
      await page.locator('[data-action="warmup-done"]').last().click();
      for (let i = 0; i < 3; i++) await page.locator('.exercise [data-action="set-toggle"]:not(.on)').first().click();
      await page.locator('.rate-panel [data-value="facil"]').click();
      await page.locator('.session-head [data-action="session-finish"]').click();
      await expect(page).toHaveURL(/#\/resumen\//);
      const p = (await readState(page)).progress.frontlever;
      if (round === 1) {
        expect(p).toMatchObject({ step: 0, passes: 1 });
        await expect(page.locator('.summary-item', { hasText: 'Tuck front lever' })).toContainText('en brazos rectos se pide la meta en 2 sesiones');
      } else {
        expect(p.step).toBe(1);
      }
    }
  });
});

test.describe('Calentamiento según las habilidades', () => {
  test('con la planche y el pino, muñecas y encogimientos antes de las series de aproximación; aguanta una recarga', async ({ page }) => {
    await seed(page, makeState({ settings: { focus: 'planche', maintain: ['pino'] }, plan: { dayType: 'B', ids: ['pino', 'planche', 'core'], custom: true } }));
    await page.goto('/');
    await page.locator('[data-action="start-session"]').click();
    const names = await page.locator('.check-name').allTextContents();
    expect(names.slice(-3)).toEqual([
      'Flexiones de muñeca sobre la palma y el dorso', 'Encogimientos en pino contra la pared',
      'Series de aproximación: 1 serie suave del paso anterior y otra corta del actual',
    ]);
    await expect(page.locator('.check-item', { hasText: 'Flexiones de muñeca' })).toContainText('2 × 10 · para planche y pino');
    await page.locator('[data-action="warmup-check"]').nth(9).click(); // encogimientos
    await page.reload();
    await expect(page.locator('.check-item.on')).toHaveCount(1);
    await expect(page.locator('.check-item.on')).toContainText('Encogimientos en pino');
  });

  test('con el back lever, german hang suave', async ({ page }) => {
    await seed(page, makeState({ settings: { focus: 'backlever', maintain: [] }, progress: prog({ backlever: 2 }) }));
    await page.goto('/#/ruta/backlever');
    await page.locator('[data-action="train-only"]').click();
    await expect(page.locator('.checklist')).toContainText('German hang suave con los pies apoyados');
    await expect(page.locator('.check-item')).toHaveCount(10);
  });
});

test.describe('Sustituir en vez de sumar', () => {
  test('con el muscle-up, las dominadas del día llevan una serie menos y no suben de paso', async ({ page }) => {
    await seed(page, makeState({
      settings: { focus: 'muscleup', maintain: [] },
      progress: { dominadas: { step: 4, passes: 0, done: false, work: 8 }, muscleup: { step: 0, passes: 0, done: false } },
      plan: { dayType: 'A', ids: ['muscleup', 'dominadas', 'core'], custom: true },
    }));
    await page.goto('/');
    const dom = (await rowsOf(page)).find((r) => r.title === 'Dominadas');
    expect(dom.sub).toContain('−1 serie');
    expect(dom.target).toMatch(/^2 × 8/);
    await page.locator('[data-action="start-session"]').click();
    await page.locator('[data-action="warmup-done"]').last().click();
    await page.locator('.chip', { hasText: 'Dominadas' }).click();
    await expect(page.locator('.exercise')).toContainText('Hoy una serie menos: el muscle-up ya trabaja esto');
    await doAllSets(page);
    await page.locator('.rate-panel [data-value="facil"]').click();
    await page.locator('.session-head [data-action="session-finish"]').click();
    await expect(page).toHaveURL(/#\/resumen\//);
    await expect(page.locator('.summary-item', { hasText: 'Dominadas' })).toContainText('Meta cumplida con una serie menos');
    expect((await readState(page)).progress.dominadas.step).toBe(4);
  });

  test('en la semana, el muscle-up ocupa el sitio de las dominadas si otro día las tiene', async ({ page }) => {
    // 6 días: L (A, con muscle-up) sin dominadas porque el jueves (A, sin muscle-up) las tiene
    await seed(page, makeState({ settings: { focus: 'muscleup', maintain: [], daysPerWeek: 6, schedule: { days: [true, true, true, true, true, true, false] } } }));
    await page.goto('/#/plan');
    const row = (i) => page.locator('.week-row').nth(i);
    await expect(row(0)).toContainText('Muscle-up');
    // («Dominadas pecho a barra» es el paso del muscle-up: se busca la ruta «Dominadas ·»)
    await expect(row(0).locator('.mini-chip', { hasText: /^Dominadas ·/ })).toHaveCount(0);
    await expect(row(3).locator('.mini-chip', { hasText: /^Dominadas ·/ })).toHaveCount(1);
    await expect(row(3)).not.toContainText('Muscle-up');
  });

  test('con la flexión de pino, los fondos llevan una serie menos', async ({ page }) => {
    await seed(page, makeState({
      settings: { focus: 'hspu', maintain: [] },
      plan: { dayType: 'A', ids: ['hspu', 'fondos', 'core'], custom: true },
    }));
    await page.goto('/');
    await page.locator('[data-action="start-session"]').click();
    const s = await readState(page);
    expect(s.active.items.find((it) => it.roadmapId === 'fondos')).toMatchObject({ trimmed: true, plannedSets: 2 });
    expect(s.active.items.find((it) => it.acc)).toMatchObject({ acc: 'encogimientos-pino', plannedSets: 3, target: 8 });
  });
});
