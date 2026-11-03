// Ejercicios propios (petición 27, parte 1), aviso de copia de seguridad y peso corporal.
const { test, expect, makeState, seed, readState, pastSession, completeCurrentExercise, rate } = require('./fixtures');

const CURL = {
  id: 'c-curl', name: 'Curl de bíceps', kind: 'reps', load: true, inc: 2.5, group: 'tiron', muscle: 'Bíceps',
  sets: 3, min: 8, max: 12, side: false, video: '', cues: ['Codos pegados'], days: ['B'],
};
const PLANK = {
  id: 'c-plank', name: 'Plancha lateral', kind: 'hold', load: false, group: 'core', sets: 2, min: 20, max: 30, side: false, days: [],
};

// Lunes 2/11/2026: con L-X-V y 3 días, la semana ISO 45 (impar) es B-A-B → hoy toca el Día B.
async function startToday(page) {
  await page.goto('/');
  await page.locator('[data-action="start-session"]').click();
  await page.locator('[data-action="warmup-done"]').first().click();
}

test.describe('Crear y editar ejercicios propios', () => {
  test('se crea desde Rutas con peso y días, y sale en Hoy antes del core', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/rutas');
    await page.locator('#mis-ejercicios a.custom-new').click();
    await expect(page.locator('h1')).toHaveText('Nuevo ejercicio');
    // Sin nombre no se guarda
    await page.locator('[data-action="cx-save"]').click();
    await expect(page.locator('#toast')).toContainText('Ponle un nombre');

    await page.locator('[name="name"]').fill('Curl martillo');
    await page.locator('[data-action="cx-set"][data-key="group"][data-value="tiron"]').click();
    // Lo escrito no se pierde al tocar botones
    await expect(page.locator('[name="name"]')).toHaveValue('Curl martillo');
    await page.locator('[name="muscle"]').fill('Bíceps y braquial');
    await page.locator('[data-action="cx-toggle"][data-key="load"]').click();
    await page.locator('[data-action="cx-set"][data-key="inc"][data-value="1"]').click();
    await page.locator('[name="kg"]').fill('10,5');
    await page.locator('[data-action="cx-set"][data-key="sets"][data-value="4"]').click();
    await page.locator('[data-action="cx-range"][data-key="min"][data-dir="1"]').click(); // 9
    await page.locator('[data-action="cx-range"][data-key="max"][data-dir="1"]').click(); // 13
    await page.locator('[data-action="cx-day"][data-value="B"]').click();
    await page.locator('[name="cues"]').fill('Agarre neutro\nSin balanceo');
    await page.locator('[data-action="cx-save"]').click();

    await expect(page).toHaveURL(/#\/ejercicio\/c-/);
    await expect(page.locator('h1')).toHaveText('Curl martillo');
    await expect(page.locator('.page-head .eyebrow')).toContainText('Tirón · Bíceps y braquial');
    await expect(page.locator('.work-box')).toContainText('4 × 9 reps');
    await expect(page.locator('.work-box')).toContainText('+1 kg');
    await expect(page.locator('.cue-list li')).toHaveText(['Agarre neutro', 'Sin balanceo']);
    const s = await readState(page);
    const c = s.custom[0];
    expect(c).toMatchObject({ name: 'Curl martillo', kind: 'reps', load: true, inc: 1, group: 'tiron', sets: 4, min: 9, max: 13, days: ['B'] });
    expect(s.lifts[c.id].kg).toBe(10.5);
    expect(s.game.unlocked.creador).toBeTruthy();

    await page.goto('/');
    const rows = page.locator('.ex-list .ex-row');
    await expect(rows.last()).toContainText('Core');
    await expect(rows.nth(await rows.count() - 2)).toContainText('Curl martillo');
    await expect(page.locator('.custom-row .ex-target')).toContainText('4 × 9');
    await expect(page.locator('.custom-row .ex-target')).toContainText('10,5 kg');
    // En Rutas, con sus días
    await page.goto('/#/rutas');
    await expect(page.locator('.custom-card')).toContainText('Día B');
  });

  test('editar cambia el ejercicio; archivar lo saca de los entrenos sin borrar el historial', async ({ page }) => {
    const done = pastSession({ daysAgo: 2, dayType: 'B', items: [{ customId: 'c-curl', name: 'Curl de bíceps', group: 'tiron', load: true, min: 8, max: 12, goal: 8, target: 12, sets: [8, 8, 8], loads: [10, 10, 10] }] });
    await seed(page, makeState({ custom: [CURL], sessions: [done] }));
    await page.goto('/#/mis-ejercicios/c-curl');
    await expect(page.locator('[name="name"]')).toHaveValue('Curl de bíceps');
    // Con historial no se puede borrar, solo archivar
    await expect(page.locator('[data-action="cx-delete"]')).toHaveCount(0);
    await page.locator('[name="name"]').fill('Curl con barra Z');
    await page.locator('[data-action="cx-save"]').click();
    await expect(page.locator('h1')).toHaveText('Curl con barra Z');
    await expect(page.locator('.summary-list li')).toHaveCount(1);

    await page.goto('/#/mis-ejercicios/c-curl');
    await page.locator('[data-action="cx-archive"]').click();
    await expect(page.locator('#toast')).toContainText('archivado');
    await page.goto('/');
    await expect(page.locator('.custom-row')).toHaveCount(0);
    await page.goto('/#/rutas');
    await expect(page.locator('.archived-list summary')).toContainText('Archivados (1)');
    const s = await readState(page);
    expect(s.custom[0].archived).toBe(true);
    expect(s.sessions[0].items[0].name).toBe('Curl de bíceps');
  });

  test('uno sin entrenar se puede borrar del todo', async ({ page }) => {
    await seed(page, makeState({ custom: [PLANK] }));
    await page.goto('/#/mis-ejercicios/c-plank');
    await page.locator('[data-action="cx-delete"]').click();
    await expect(page.locator('h1')).toHaveText('Rutas');
    expect((await readState(page)).custom).toEqual([]);
  });

  test('se añade a un entreno suelto desde Hoy → Editar', async ({ page }) => {
    await seed(page, makeState({ custom: [PLANK] }));
    await page.goto('/');
    await expect(page.locator('.custom-row')).toHaveCount(0);
    await page.locator('[data-action="plan-edit"]').click();
    await page.locator('[data-change="plan-add"]').selectOption('c-plank');
    await expect(page.locator('.custom-row')).toContainText('Plancha lateral');
    await expect(page.locator('.edit-panel a[href="#/mis-ejercicios/nuevo"]')).toBeVisible();
  });

  test('datos raros de una copia se corrigen al cargar', async ({ page }) => {
    await seed(page, makeState({
      custom: [
        { id: 'c-ok', name: '  Remo con mancuerna  ', kind: 'reps', load: true, inc: 99, group: 'xx', sets: 20, min: 15, max: 9 },
        { id: 'c-hold', name: 'Colgado', kind: 'hold', load: true, min: 1, max: 9999 },
        { id: 'malo', name: 'Sin prefijo' },
        { id: 'c-sin-nombre', name: '   ' },
      ],
      body: [{ date: 1, kg: 75 }, { date: 2, kg: 5000 }, { kg: 70 }],
      backup: { last: 'ayer', count: -3 },
    }));
    await page.goto('/#/rutas');
    const s = await readState(page);
    expect(s.custom.map((c) => c.id)).toEqual(['c-ok', 'c-hold']);
    expect(s.custom[0]).toMatchObject({ name: 'Remo con mancuerna', inc: 2.5, group: 'otro', sets: 8, min: 15, max: 15 });
    expect(s.custom[1]).toMatchObject({ load: false, min: 5, max: 600 });
    expect(s.body).toEqual([{ date: 1, kg: 75 }]);
    expect(s.backup).toEqual({ last: null, count: 0, snoozeUntil: null });
  });
});

test.describe('Entrenar ejercicios propios', () => {
  test('con peso: arriba del rango y Normal sube el peso y vuelve al mínimo', async ({ page }) => {
    await seed(page, makeState({ custom: [CURL], lifts: { 'c-curl': { kg: 12.5, reps: 12, stall: 0 } } }));
    await startToday(page);
    await page.locator('.chip', { hasText: 'Curl de bíceps' }).click();
    await expect(page.locator('.exercise h2')).toHaveText('Curl de bíceps');
    await expect(page.locator('.exercise .target-line')).toContainText('3 × 12 reps · 12,5 kg');
    await expect(page.locator('.set .set-kg')).toHaveCount(3);
    await completeCurrentExercise(page);
    await rate(page, 'normal');
    await page.locator('.session-head [data-action="session-finish"]').click();
    await expect(page).toHaveURL(/#\/resumen\//);
    await expect(page.locator('.summary-item', { hasText: 'Curl de bíceps' })).toContainText('¡Sube el peso! Próxima vez: 3 × 8 reps con 15 kg');
    const s = await readState(page);
    expect(s.lifts['c-curl']).toMatchObject({ kg: 15, reps: 8 });
    const item = s.sessions[0].items.find((it) => it.customId === 'c-curl');
    expect(item).toMatchObject({ name: 'Curl de bíceps', group: 'tiron', load: true, loads: [12.5, 12.5, 12.5], outcome: { kind: 'load-up' } });
  });

  test('con peso: «+» suma su propio incremento', async ({ page }) => {
    await seed(page, makeState({ custom: [{ ...CURL, inc: 1 }], lifts: { 'c-curl': { kg: 10, reps: 8, stall: 0 } } }));
    await startToday(page);
    await page.locator('.chip', { hasText: 'Curl de bíceps' }).click();
    await page.locator('[data-action="load-inc"]').click();
    await expect(page.locator('.load-input')).toHaveValue('11');
  });

  test('de segundos sin peso: con cronómetro, y al llegar arriba propone una variante más difícil', async ({ page }) => {
    await seed(page, makeState({ custom: [{ ...PLANK, days: ['B'] }], lifts: { 'c-plank': { kg: null, reps: 30, stall: 0 } } }));
    await startToday(page);
    await page.locator('.chip', { hasText: 'Plancha lateral' }).click();
    await expect(page.locator('.exercise .target-line')).toContainText('2 × 30 s');
    await expect(page.locator('.set [data-action="hold-start"]')).toHaveCount(2);
    await expect(page.locator('.set .set-kg')).toHaveCount(0);
    await completeCurrentExercise(page);
    await rate(page, 'facil');
    await page.locator('.session-head [data-action="session-finish"]').click();
    await expect(page.locator('.summary-item', { hasText: 'Plancha lateral' })).toContainText('Tope del rango');
    const s = await readState(page);
    expect(s.sessions[0].items.find((it) => it.customId).outcome.kind).toBe('top');
  });

  test('sin peso: por debajo del tope, Fácil sube 2 repeticiones', async ({ page }) => {
    const pull = { id: 'c-band', name: 'Face pull con banda', kind: 'reps', load: false, group: 'tiron', sets: 2, min: 10, max: 20, days: ['B'] };
    await seed(page, makeState({ custom: [pull] }));
    await startToday(page);
    await page.locator('.chip', { hasText: 'Face pull' }).click();
    await expect(page.locator('.exercise .target-line')).toContainText('2 × 10 reps');
    await completeCurrentExercise(page);
    await rate(page, 'facil');
    await page.locator('.session-head [data-action="session-finish"]').click();
    expect((await readState(page)).lifts['c-band'].reps).toBe(12);
  });

  test('la ficha muestra el historial con su gráfica y un récord cuenta', async ({ page }) => {
    const mk = (d, kg) => pastSession({ daysAgo: d, dayType: 'B', items: [{ customId: 'c-curl', name: 'Curl de bíceps', group: 'tiron', load: true, min: 8, max: 12, goal: 8, target: 12, sets: [8, 8, 8], loads: [kg, kg, kg] }] });
    await seed(page, makeState({ custom: [CURL], sessions: [mk(9, 10), mk(5, 12.5)] }));
    await page.goto('/#/ejercicio/c-curl');
    await expect(page.locator('.chart')).toBeVisible();
    await expect(page.locator('.summary-list li')).toHaveCount(2);
    const s = await readState(page);
    // 12,5 kg supera los 10 kg de antes: es un récord
    expect(s.game.unlocked['record-1']).toBeTruthy();
  });
});

test.describe('Copia de seguridad', () => {
  const old = (d) => pastSession({ daysAgo: d, items: [{ roadmapId: 'core', stepIndex: 0, sets: [8, 8, 8] }] });

  test('avisa en Hoy si nunca has hecho copia y llevas 2 semanas; «Ahora no» lo aplaza', async ({ page }) => {
    await seed(page, makeState({ sessions: [old(20), old(18), old(16)] }));
    await page.goto('/');
    await expect(page.locator('.backup-card')).toContainText('Aún no has hecho ninguna copia y llevas 3 entrenos nuevos');
    await page.locator('[data-action="backup-snooze"]').click();
    await expect(page.locator('.backup-card')).toHaveCount(0);
    expect((await readState(page)).backup.snoozeUntil).toBeGreaterThan(Date.now());
  });

  test('no avisa con pocos entrenos ni con una copia reciente', async ({ page }) => {
    await seed(page, makeState({ sessions: [old(20), old(18), old(16)], backup: { last: new Date('2026-10-25T10:00:00+01:00').getTime(), count: 1 } }));
    await page.goto('/');
    await expect(page.locator('.backup-card')).toHaveCount(0);
    await page.goto('/#/ajustes');
    await expect(page.locator('.backup-last')).toContainText('Última copia');
  });

  test('exportar apunta la copia y da el logro «A salvo»', async ({ page }) => {
    await seed(page, makeState({ sessions: [old(20), old(18), old(16)] }));
    await page.goto('/');
    const download = page.waitForEvent('download');
    await page.locator('.backup-card [data-action="export-data"]').click();
    await download;
    await expect(page.locator('.backup-card')).toHaveCount(0);
    const s = await readState(page);
    expect(s.backup.count).toBe(1);
    expect(s.backup.last).toBeGreaterThan(0);
    expect(s.game.unlocked['a-salvo']).toBeTruthy();
  });
});

test.describe('Peso corporal', () => {
  test('se apunta en Progreso (uno por día), se ve la diferencia y se puede borrar', async ({ page }) => {
    const d = (n) => new Date('2026-11-02T08:00:00+01:00').getTime() - n * 864e5;
    await seed(page, makeState({ body: [{ date: d(30), kg: 80 }, { date: d(20), kg: 79.5 }, { date: d(10), kg: 79 }] }));
    await page.goto('/#/progreso');
    await page.locator('#body-kg').fill('abc');
    await page.locator('[data-action="body-add"]').click();
    await expect(page.locator('#toast')).toContainText('Escribe tu peso');
    await page.locator('#body-kg').fill('78,4');
    await page.locator('[data-action="body-add"]').click();
    await expect(page.locator('.body-card .pill')).toHaveText('78,4 kg');
    await expect(page.locator('.body-card')).toContainText('−1,6 kg desde');
    await expect(page.locator('.body-card .chart')).toBeVisible();
    // El mismo día se sustituye
    await page.locator('#body-kg').fill('78,2');
    await page.locator('[data-action="body-add"]').click();
    let s = await readState(page);
    expect(s.body.map((e) => e.kg)).toEqual([80, 79.5, 79, 78.2]);
    expect(s.game.unlocked.bascula).toBeTruthy();
    await page.locator('.body-log summary').click();
    await page.locator('[data-action="body-del"]').first().click();
    s = await readState(page);
    expect(s.body.map((e) => e.kg)).toEqual([80, 79.5, 79]);
  });
});
