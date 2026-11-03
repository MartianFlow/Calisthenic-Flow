// Cómo divides tu semana (petición 27, parte 2): cuerpo completo, torso/pierna (también con
// pierna de calistenia), empuje/tirón/pierna y «A tu manera»; y superseries.
const { test, expect, makeState, seed, readState, completeCurrentExercise, rate } = require('./fixtures');

// Como el usuario: 5 días (L, X, V, S, D), pierna en el gimnasio, pino de foco y muscle-up de mantener.
const HIS_DAYS = [true, false, true, false, true, true, true];
const his = (settings = {}, extra = {}) => makeState({
  progress: { muscleup: { step: 2, passes: 0, done: false }, frontlever: { step: 3, passes: 0, done: false } },
  ...extra,
  settings: { focus: 'pino', maintain: ['muscleup'], daysPerWeek: 5, legs: 'gym', schedule: { days: HIS_DAYS }, ...settings },
});
const badges = (page) => page.locator('.week-row .type-badge').allInnerTexts();

test.describe('Cómo divides tu semana', () => {
  test('sin elegir nada (datos de antes) queda torso y pierna y la semana es la de siempre', async ({ page }) => {
    await seed(page, his());
    await page.goto('/#/plan');
    expect(await badges(page)).toEqual(['P', '—', 'TB', '—', 'TA', 'P', 'TB']);
    await expect(page.locator('.split-opt.on')).toContainText('Torso y pierna');
    expect((await readState(page)).settings.split).toBe('torso-pierna');
    await expect(page.locator('.freq-warn')).toHaveCount(0);
  });

  test('empuje, tirón y pierna con 5 días: pierna 2 veces, tirón, empuje y un torso completo', async ({ page }) => {
    await seed(page, his({ split: 'etp', maintain: ['muscleup', 'planche'] }, { progress: { planche: { step: 1, passes: 0, done: false }, muscleup: { step: 2, passes: 0, done: false } } }));
    await page.goto('/#/plan');
    // (semana ISO impar: empieza el empuje)
    expect(await badges(page)).toEqual(['P', '—', 'E', '—', 'T', 'P', 'TC']);
    const rows = page.locator('.week-row');
    // Las de mantener, en los días de su grupo: muscle-up con tirón, planche con empuje
    await expect(rows.nth(4).locator('.mini-chip.skill.keep')).toContainText('Muscle-up');
    await expect(rows.nth(2).locator('.mini-chip.skill.keep')).toContainText('Planche');
    await expect(rows.nth(4)).toContainText('Remo');
    await expect(rows.nth(4)).not.toContainText('Fondos');
    await expect(rows.nth(2)).toContainText('Fondos');
    await expect(page.locator('.freq-warn')).toHaveCount(0);
    await expect(page.locator('.split-legend')).toContainText('Torso completo');
    await expect(page.locator('.rec-card .hero-num')).toContainText('5');
  });

  test('con 3 días en empuje, tirón y pierna avisa de que cada grupo va 1 día', async ({ page }) => {
    await seed(page, makeState({ settings: { split: 'etp', daysPerWeek: 3 } }));
    await page.goto('/#/plan');
    expect(await badges(page)).toEqual(['P', '—', 'E', '—', 'T', '—', '—']);
    await expect(page.locator('.freq-warn .wiz-note')).toHaveCount(1);
    await expect(page.locator('.freq-warn')).toContainText('El empuje, el tirón y la pierna solo se entrenan 1 día por semana');
    // Con calistenia, el día de pierna son las rutas de pierna
    await expect(page.locator('.week-row').first()).toContainText('Piernas');
  });

  test('torso y pierna con la pierna de calistenia', async ({ page }) => {
    await seed(page, makeState({ settings: { split: 'torso-pierna', daysPerWeek: 4, schedule: { days: [true, true, false, true, true, false, false] } } }));
    await page.goto('/#/plan');
    expect((await badges(page)).filter((b) => b !== '—').sort()).toEqual(['P', 'P', 'TA', 'TB']);
    await expect(page.locator('.week-row', { hasText: 'Pierna' }).first()).toContainText('Isquios y cadera');
    await page.goto('/');
    await expect(page.locator('.card.plan h2')).toHaveText(/Torso|Pierna/);
  });

  test('cambiar de forma desde el Plan y desde Ajustes', async ({ page }) => {
    await seed(page, makeState());
    await page.goto('/#/plan');
    await page.locator('[data-action="set-split"][data-value="etp"]').click();
    await expect(page.locator('#toast')).toContainText('empuje, tirón y pierna');
    expect((await readState(page)).settings.split).toBe('etp');
    await page.goto('/#/ajustes');
    await expect(page.locator('.split-now')).toContainText('Empuje, tirón y pierna');
    // Gimnasio con cuerpo completo pasa a torso y pierna
    await page.goto('/#/plan');
    await page.locator('[data-action="set-split"][data-value="completo"]').click();
    await page.locator('[data-action="set-legs"][data-value="gym"]').click();
    expect((await readState(page)).settings).toMatchObject({ split: 'torso-pierna', legs: 'gym' });
  });
});

test.describe('A tu manera', () => {
  test('empieza con tus días de ahora, que se cambian y se reparten en la semana', async ({ page }) => {
    await seed(page, his());
    await page.goto('/#/plan');
    await page.locator('[data-action="set-split"][data-value="propia"]').click();
    await expect(page).toHaveURL(/#\/mis-dias/);
    // Sus 3 tipos de día pasan a ser días suyos, con los ejercicios de gimnasio incluidos
    await expect(page.locator('.myday-card')).toHaveCount(3);
    await expect(page.locator('.myday-card input').first()).toHaveValue('Pierna');
    await expect(page.locator('.myday-card').first()).toContainText('Sentadilla hack');
    let s = await readState(page);
    expect(s.settings.split).toBe('propia');
    expect(s.settings.myWeek.map((id) => (id ? s.settings.myDays.find((d) => d.id === id).name : null)))
      .toEqual(['Pierna', null, 'Torso B', null, 'Torso A', 'Pierna', 'Torso B']);

    // Renombrar «Torso A» y dejarlo solo en empuje
    const torsoA = page.locator('.myday-card').nth(2);
    await torsoA.locator('input').fill('Pecho y tríceps');
    await torsoA.locator('input').blur();
    for (const name of ['Dominadas', 'Remo invertido']) {
      await page.locator('.myday-card').nth(2).locator(`[aria-label="Quitar ${name}"]`).click();
    }
    await expect(page.locator('.myday-card').nth(2)).toContainText('Trabaja: Empuje, Core');

    // Un día nuevo de espalda el martes
    await page.locator('[data-action="myday-new"]').click();
    const nuevo = page.locator('.myday-card').nth(3);
    await nuevo.locator('input').fill('Espalda y bíceps');
    await nuevo.locator('input').blur();
    await page.locator('.myday-card').nth(3).locator('[data-change="myday-add"]').selectOption('dominadas');
    await page.locator('.myday-card').nth(3).locator('[data-change="myday-add"]').selectOption('remo');
    const espalda = (await readState(page)).settings.myDays[3].id;
    await page.locator('[data-change="myweek-set"][data-i="1"]').selectOption(espalda);
    s = await readState(page);
    expect(s.settings.daysPerWeek).toBe(6);
    expect(s.game.unlocked.arquitecto).toBeTruthy();

    // En el Plan: sus días con su insignia, y el muscle-up (tirón) en el de espalda
    await page.goto('/#/plan');
    await expect(page.locator('.week-row').nth(1)).toContainText('Espalda y bíceps');
    await expect(page.locator('.week-row').nth(1).locator('.type-badge')).toHaveText('EB');
    await expect(page.locator('.week-row').nth(4)).toContainText('Pecho y tríceps');
    await expect(page.locator('.week-row').nth(4)).not.toContainText('Muscle-up');
  });

  test('hoy toca el día tuyo de ese día y el historial guarda su nombre', async ({ page }) => {
    const myDays = [{ id: 'd-pecho', name: 'Pecho y tríceps', ids: ['fondos', 'flexiones', 'core'] }];
    await seed(page, makeState({ settings: { split: 'propia', myDays, myWeek: ['d-pecho', null, null, null, null, null, null], schedule: { days: [true, false, false, false, false, false, false] }, daysPerWeek: 1 } }));
    await page.goto('/');
    await expect(page.locator('.card.plan h2')).toHaveText('Pecho y tríceps');
    await expect(page.locator('.week .day.today b')).toHaveText('PT');
    await page.locator('[data-action="start-session"]').click();
    await page.locator('[data-action="warmup-done"]').first().click();
    await completeCurrentExercise(page);
    await rate(page, 'normal');
    await page.locator('.session-head [data-action="session-finish"]').click();
    await expect(page).toHaveURL(/#\/resumen\//);
    const s = await readState(page);
    expect(s.sessions[0]).toMatchObject({ dayType: 'd-pecho', dayName: 'Pecho y tríceps' });
    // Aunque borres el día, el historial lo sigue nombrando
    await page.goto('/#/mis-dias');
    await page.locator('[data-action="myday-del"]').click();
    await page.goto('/#/progreso');
    await expect(page.locator('.history-title').first()).toContainText('Pecho y tríceps');
  });

  test('un ejercicio propio se marca en tus días desde su formulario', async ({ page }) => {
    const myDays = [{ id: 'd-esp', name: 'Espalda', ids: ['dominadas'] }];
    await seed(page, makeState({ settings: { split: 'propia', myDays, myWeek: ['d-esp', null, null, null, null, null, null] } }));
    await page.goto('/#/mis-ejercicios/nuevo');
    await page.locator('[name="name"]').fill('Curl');
    await page.locator('[data-action="cx-day"][data-value="d-esp"]').click();
    await page.locator('[data-action="cx-save"]').click();
    await page.goto('/#/mis-dias');
    await expect(page.locator('.myday-card')).toContainText('Curl');
    await page.goto('/');
    await expect(page.locator('.custom-row')).toContainText('Curl');
  });
});

test.describe('Superseries', () => {
  test('con la opción en Ajustes, dominadas y fondos se alternan con medio descanso', async ({ page }) => {
    await seed(page, makeState({ settings: { daysPerWeek: 3 }, plan: { dayType: 'A', ids: ['dominadas', 'fondos', 'piernas', 'core'], custom: true } }));
    await page.goto('/#/ajustes');
    await page.locator('[data-action="toggle-setting"][data-key="supersets"]').click();
    expect((await readState(page)).settings.supersets).toBe(true);
    await page.goto('/');
    await expect(page.locator('.ss-label')).toHaveCount(2);
    await expect(page.locator('.ss-label').first()).toContainText('con 40 s entre medias');
    await page.locator('[data-action="start-session"]').click();
    await page.locator('[data-action="warmup-done"]').first().click();
    await expect(page.locator('.exercise .ss-note')).toContainText('Superserie con');
    await page.locator('[data-action="set-toggle"][data-set="0"]').click();
    // Pasa a fondos con 40 s de descanso
    await expect(page.locator('.chip.current')).toContainText('Fondos');
    await expect(page.locator('[data-tick="rest-total"]')).toHaveText('de 0:40');
    await page.locator('[data-action="set-toggle"][data-set="0"]').click();
    await expect(page.locator('.chip.current')).toContainText('Dominadas');
    await page.locator('.session-head [data-action="session-finish"]').click();
    for (let i = 0; i < 6 && await page.locator('.rate-panel [data-value="normal"]').count(); i++) await rate(page, 'normal');
    await expect(page).toHaveURL(/#\/resumen\//);
    const s = await readState(page);
    expect(s.sessions[0].items.filter((it) => it.ss === 0).length).toBe(2);
    expect(s.game.unlocked.superserie).toBeTruthy();
  });

  test('sin la opción no hay superseries y las habilidades nunca entran', async ({ page }) => {
    await seed(page, makeState({ settings: { focus: 'frontlever', supersets: true }, progress: { frontlever: { step: 2, passes: 0, done: false } }, plan: { dayType: 'B', ids: ['frontlever', 'remo', 'flexiones', 'core'], custom: true } }));
    await page.goto('/');
    await expect(page.locator('.ss-label')).toHaveCount(1);
    await expect(page.locator('.ex-row.ss-first')).toContainText('Remo');
    await page.goto('/#/ajustes');
    await page.locator('[data-action="toggle-setting"][data-key="supersets"]').click();
    await page.goto('/');
    await expect(page.locator('.ss-label')).toHaveCount(0);
  });
});

test.describe('Bienvenida', () => {
  test('pregunta cómo dividir la semana; con el gimnasio no ofrece cuerpo completo', async ({ page }) => {
    await page.goto('/');
    await page.locator('.wiz-foot [data-action="wiz-next"]').click();
    await page.locator('[data-action="wiz-exp"][data-value="base"]').click();
    await page.clock.runFor(600);
    await page.locator('[data-action="wiz-legs"][data-value="gym"]').click();
    await page.clock.runFor(600);
    for (let i = 0; i < 20 && (await page.locator('.wiz-body').getAttribute('data-step')) !== 'division'; i++) await page.locator('.wiz-foot [data-action="wiz-next"]').click();
    await expect(page.locator('.wiz-option')).toHaveCount(3);
    await expect(page.locator('.wiz-option.on')).toContainText('Torso y pierna');
    await page.locator('[data-action="wiz-split"][data-value="propia"]').click();
    await expect(page.locator('.wiz-note')).toContainText('creas tus días');
    for (let i = 0; i < 10 && (await page.locator('.wiz-body').getAttribute('data-step')) !== 'listo'; i++) await page.locator('.wiz-foot [data-action="wiz-next"]').click();
    await expect(page.locator('.wiz-summary')).toContainText('Divides tu semanaA tu manera');
    await page.locator('[data-action="finish-onboarding"]').click();
    await expect(page).toHaveURL(/#\/mis-dias/);
    await expect(page.locator('.myday-card')).toHaveCount(3);
    const s = await readState(page);
    expect(s.settings.split).toBe('propia');
    expect(s.settings.myWeek.filter(Boolean).length).toBe(s.settings.daysPerWeek);
  });
});
