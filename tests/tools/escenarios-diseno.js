// Pantallas y estados que recorre la auditoría de diseño (auditar-diseno.js) y la
// prueba de maquetación (tests/e2e/layout.spec.js). Cada escenario tiene un estado
// guardado, una ruta y, si hace falta, unos pasos (setup) para llegar al estado.

const NOW = Date.parse('2026-11-02T10:00:00+01:00'); // lunes, semana ISO 45
const DAY = 864e5;
const ROUTES = ['dominadas', 'remo', 'flexiones', 'fondos', 'piernas', 'bisagra', 'core', 'muscleup', 'pino', 'hspu', 'lsit', 'frontlever', 'planche', 'backlever'];
const LIFT_IDS = ['hack', 'peso-muerto', 'goblet-hack', 'extension', 'curl-femoral', 'aductor', 'abductor', 'gemelo-pie', 'gemelo-sentado'];
const L_V = [true, true, true, true, true, false, false];

function baseState(extra = {}) {
  const base = {
    version: 2,
    onboarded: true,
    settings: {
      focus: null, maintain: [], daysPerWeek: 3, passesToLevelUp: 2, sound: false, warmup: true, legs: 'calistenia', theme: 'auto',
      schedule: { days: [true, false, true, false, true, false, false] },
    },
    progress: {}, lifts: {}, levelLog: [], sessions: [], active: null, plan: null, lastDayType: null,
    deload: null, deloadSnoozeUntil: null,
    game: { name: 'Tu héroe', unlocked: {}, equipped: {}, look: { skin: 1, hair: 0, hairStyle: 'puntas' }, videosWatched: 0 },
  };
  return {
    ...base, ...extra,
    settings: { ...base.settings, ...(extra.settings || {}) },
    game: { ...base.game, ...(extra.game || {}) },
  };
}

let seq = 0;
function session({ daysAgo, items, dayType = 'A', duration = 2700, levelUps = [], hour = 19 }) {
  const d = new Date(NOW - daysAgo * DAY);
  d.setHours(hour, 5, 0, 0);
  const startedAt = d.getTime();
  return {
    id: `s${++seq}`, startedAt, endedAt: startedAt + duration * 1000, duration, dayType,
    deload: false, warmupFull: daysAgo % 2 === 0, items, levelUps, notes: daysAgo === 3 ? 'Buen día, mucha energía.' : '',
  };
}
const reps = (roadmapId, stepIndex, sets, extra = {}) => ({
  roadmapId, stepIndex, type: 'reps', target: 8, goal: sets[0], plannedSets: sets.length, side: false, sets,
  met: false, goalMet: true, rating: 'normal', outcome: { kind: 'up', from: sets[0], next: sets[0] + 1 }, ...extra,
});
const hold = (roadmapId, stepIndex, sets, extra = {}) => ({
  roadmapId, stepIndex, type: 'hold', target: 15, goal: sets[0], plannedSets: sets.length, side: false, sets,
  met: false, goalMet: true, rating: 'facil', outcome: { kind: 'up', from: sets[0], next: sets[0] + 3 }, ...extra,
});
const lift = (liftId, kg, sets, extra = {}) => ({
  liftId, type: 'reps', min: 6, max: 10, target: 10, goal: sets[0], plannedSets: sets.length, side: false, sets,
  loads: sets.map(() => kg), met: false, goalMet: true, rating: 'normal', outcome: { kind: 'up', from: sets[0], next: sets[0] + 1, kg }, ...extra,
});

// Usuario con dos meses de historial y logros. Como el usuario real: aprende el pino y
// mantiene el muscle-up y el front lever.
function richState(extra = {}) {
  const sessions = [];
  for (let w = 8; w >= 0; w--) {
    for (const off of [0, 2, 4]) {
      const daysAgo = w * 7 + 7 - off; // lunes, miércoles y viernes de semanas anteriores
      if (daysAgo <= 0) continue;
      const k = 8 - w;
      const isA = (w + off) % 2 === 0;
      const items = [
        hold('frontlever', 2, [8 + k, 8 + k, 7 + k]),
        reps('muscleup', 1, [3, 3, 2], { rating: 'dificil', outcome: { kind: 'keep', next: 3 } }),
        ...(isA
          ? [reps('dominadas', 5, [5 + (k % 4), 5, 5]), reps('fondos', 4, [7, 7, 6]), reps('piernas', 5, [10, 10, 9]), reps('core', 6, [8, 8, 8])]
          : [reps('remo', 4, [9, 9, 8]), reps('flexiones', 6, [6, 6, 5]), reps('bisagra', 2, [10, 9, 9]), hold('core', 2, [30, 30, 25])]),
      ];
      const levelUps = k === 4 && off === 0 ? [{ roadmapId: 'dominadas', from: 4, to: 5, reason: 'meta' }] : [];
      if (levelUps.length) items[2].outcome = { kind: 'levelup', to: 5, next: 5, reason: 'meta' };
      sessions.push(session({ daysAgo, items, dayType: isA ? 'A' : 'B', levelUps, duration: 2400 + k * 120, hour: off === 2 ? 7 : 19 }));
    }
  }
  const levelLog = [
    { date: new Date(NOW - 40 * DAY).toISOString(), roadmapId: 'flexiones', from: 5, to: 6, reason: 'facil' },
    { date: new Date(NOW - 30 * DAY).toISOString(), roadmapId: 'dominadas', from: 4, to: 5, reason: 'meta' },
    { date: new Date(NOW - 20 * DAY).toISOString(), roadmapId: 'frontlever', from: 1, to: 2, reason: 'meta' },
    { date: new Date(NOW - 10 * DAY).toISOString(), roadmapId: 'core', from: 5, to: 6, reason: 'facil' },
  ];
  return baseState({
    settings: { focus: 'pino', maintain: ['muscleup', 'frontlever'], daysPerWeek: 3 },
    progress: {
      dominadas: { step: 5, passes: 0, done: false, work: 6 }, remo: { step: 4, passes: 0, done: false },
      flexiones: { step: 6, passes: 0, done: false }, fondos: { step: 4, passes: 0, done: false, stall: 1 },
      piernas: { step: 5, passes: 0, done: false }, bisagra: { step: 2, passes: 0, done: false },
      core: { step: 6, passes: 0, done: false }, frontlever: { step: 2, passes: 1, done: false, work: 12 },
      muscleup: { step: 1, passes: 0, done: false }, pino: { step: 3, passes: 0, done: false },
    },
    sessions, levelLog,
    game: { name: 'Rayo Callejero', videosWatched: 4, equipped: { top: 'top-negra' } },
    ...extra,
  });
}

// Pierna en el gimnasio: 5 días (L–V), 2 de pierna, con historial de pesos.
function gymState(extra = {}) {
  const kg = { hack: 120, 'peso-muerto': 80, 'goblet-hack': 32.5, extension: 55, 'curl-femoral': 45, aductor: 70, abductor: 65, 'gemelo-pie': 90, 'gemelo-sentado': 50 };
  const sessions = [];
  for (let w = 5; w >= 1; w--) {
    for (const off of [1, 3]) {
      const daysAgo = w * 7 - off;
      const k = 5 - w;
      sessions.push(session({
        daysAgo, dayType: 'P', duration: 4200,
        items: LIFT_IDS.map((id, i) => lift(id, kg[id] - (5 - k) * 2.5, [8 + (k % 3), 8, 7], i === 0 && k === 3 ? { outcome: { kind: 'load-up', from: kg[id] - 5, kg: kg[id], next: 6 } } : {})),
      }));
    }
  }
  const lifts = Object.fromEntries(LIFT_IDS.map((id) => [id, { kg: kg[id], reps: 8, stall: id === 'aductor' ? 2 : 0 }]));
  return baseState({
    settings: { legs: 'gym', daysPerWeek: 5, schedule: { days: L_V }, focus: 'frontlever', maintain: ['pino'] },
    progress: { dominadas: { step: 7, passes: 0, done: false }, remo: { step: 5, passes: 0, done: false }, flexiones: { step: 7, passes: 0, done: false }, fondos: { step: 6, passes: 0, done: false }, core: { step: 7, passes: 0, done: false }, frontlever: { step: 3, passes: 0, done: false } },
    lifts, sessions,
    ...extra,
  });
}

const click = (sel, opts) => async (page) => { await page.locator(sel).first().click(opts); };
const clickAll = (...sels) => async (page) => { for (const s of sels) await page.locator(s).first().click(); };

// Usuario que aún no ha hecho la configuración inicial.
function fresh({ focus = null, maintain = [], settings = {}, game = {} } = {}) {
  return baseState({ onboarded: false, game, settings: { schedule: null, focus, maintain, ...settings } });
}

// Avanza por la bienvenida hasta el paso indicado. En «experiencia» elige «Tengo algo de base»
// (avanza sola tras un momento; si el reloj de la prueba está parado, se pulsa «Siguiente»).
const wizTo = (key, after) => async (page) => {
  const current = () => page.locator('.wiz-body').getAttribute('data-step');
  for (let i = 0; i < 30 && (await current()) !== key; i++) {
    const step = await current();
    if (step === 'experiencia' && !(await page.locator('.wiz-option.on').count())) {
      await page.locator('[data-action="wiz-exp"][data-value="base"]').click();
      for (let t = 0; t < 10 && (await current()) === 'experiencia'; t++) await page.waitForTimeout(100);
      if ((await current()) !== 'experiencia') continue;
    }
    await page.locator('.wiz-foot [data-action="wiz-next"]').click();
  }
  if (after) await after(page);
};
const startSession = async (page) => {
  await page.locator('[data-action="start-session"]').click();
  await page.waitForSelector('.session-head');
};
const skipWarmup = async (page) => { await page.locator('[data-action="warmup-done"]').last().click(); };
const doSet = async (page, i = 0) => { await page.locator(`[data-action="set-toggle"][data-set="${i}"]`).click(); };
const doAllSets = async (page) => {
  const n = await page.locator('[data-action="set-toggle"]:not(.on)').count();
  for (let i = 0; i < n; i++) await page.locator('[data-action="set-toggle"]:not(.on)').first().click();
};

// Mes anterior del calendario y el último día entrenado (con su detalle debajo).
const prevMonthDay = async (page) => {
  await page.locator('[data-action="cal-month"][data-dir="-1"]').click();
  await page.locator('.cal-cell.on').last().click();
};

const TUE = '2026-11-03T10:00:00+01:00';
const rich = richState();
const gym = gymState();
const richSessionId = rich.sessions[rich.sessions.length - 1].id;
const levelSessionId = rich.sessions.find((s) => s.levelUps.length).id;
const gymSessionId = gym.sessions[gym.sessions.length - 1].id;

const scenarios = [
  // Bienvenida paso a paso
  { name: 'bienvenida', route: '/bienvenida', state: fresh() },
  { name: 'bienvenida-experiencia', route: '/bienvenida', state: fresh(), setup: wizTo('experiencia') },
  { name: 'bienvenida-experiencia-elegida', route: '/bienvenida', state: fresh(), setup: wizTo('pierna', click('[data-action="wiz-back"]')) },
  { name: 'bienvenida-pierna', route: '/bienvenida', state: fresh(), setup: wizTo('pierna') },
  { name: 'bienvenida-nivel', route: '/bienvenida', state: fresh(), setup: wizTo('nivel-dominadas', click('[data-action="wiz-level"][data-step="6"]')) },
  { name: 'bienvenida-nivel-bisagra', route: '/bienvenida', state: fresh(), setup: wizTo('nivel-bisagra') },
  { name: 'bienvenida-mantener', route: '/bienvenida', state: fresh(), setup: wizTo('mantener') },
  { name: 'bienvenida-mantener-elegidas', route: '/bienvenida', state: fresh({ maintain: ['muscleup', 'frontlever'] }), setup: wizTo('mantener') },
  { name: 'bienvenida-foco-sin-ninguna', route: '/bienvenida', state: fresh(), setup: wizTo('foco') },
  { name: 'bienvenida-foco', route: '/bienvenida', state: fresh({ focus: 'pino', maintain: ['muscleup', 'frontlever'] }), setup: wizTo('foco') },
  { name: 'bienvenida-nivel-habilidad', route: '/bienvenida', state: fresh({ focus: 'planche', maintain: ['frontlever', 'muscleup'] }), setup: wizTo('nivel-planche') },
  { name: 'bienvenida-dias', route: '/bienvenida', state: fresh({ focus: 'frontlever', maintain: ['planche'] }), setup: wizTo('dias') },
  { name: 'bienvenida-entreno', route: '/bienvenida', state: fresh(), setup: wizTo('entreno') },
  { name: 'bienvenida-entreno-auto', route: '/bienvenida', state: fresh({ settings: { restMode: 'auto' } }), setup: wizTo('entreno') },
  { name: 'bienvenida-heroe', route: '/bienvenida', state: fresh({ game: { name: 'Rayo Callejero' } }), setup: wizTo('heroe') },
  { name: 'bienvenida-cambiando-dias', route: '/bienvenida', state: fresh({ focus: 'pino' }), setup: wizTo('listo', click('[data-action="wiz-goto"][data-key="dias"]')) },
  { name: 'bienvenida-listo', route: '/bienvenida', state: fresh({ focus: 'planche', maintain: ['frontlever', 'muscleup'], settings: { legs: 'gym' } }), setup: wizTo('listo') },

  // Usuario nuevo (sin datos)
  { name: 'nuevo-hoy', route: '/', state: baseState() },
  { name: 'nuevo-calendario', route: '/calendario', state: baseState() },
  { name: 'nuevo-progreso', route: '/progreso', state: baseState() },
  { name: 'nuevo-heroe', route: '/heroe', state: baseState() },
  { name: 'nuevo-plan-sin-dias', route: '/plan', state: baseState({ settings: { schedule: null } }) },
  { name: 'nuevo-hoy-sin-plan', route: '/', state: baseState({ settings: { schedule: null } }) },
  { name: 'nuevo-ajustes', route: '/ajustes', state: baseState() },
  { name: 'nuevo-hoy-foco-sin-base', route: '/', state: baseState({ settings: { focus: 'frontlever' } }) },
  { name: 'nuevo-ruta-foco-sin-base', route: '/ruta/frontlever', state: baseState({ settings: { focus: 'frontlever' } }) },

  // Usuario con historial (calistenia)
  { name: 'hoy', route: '/', state: rich },
  { name: 'hoy-editando', route: '/', state: rich, setup: click('[data-action="plan-edit"]') },
  { name: 'hoy-descanso', route: '/', state: rich, now: TUE },
  { name: 'hoy-hecho', route: '/', state: richState({ sessions: [...rich.sessions, session({ daysAgo: 0, hour: 8, items: [reps('dominadas', 5, [6, 6, 6])] })] }) },
  { name: 'hoy-descarga-sugerida', route: '/', state: richState({ progress: { ...rich.progress, remo: { step: 4, passes: 0, done: false, stall: 2 }, fondos: { step: 4, passes: 0, done: false, stall: 2 } } }) },
  { name: 'hoy-aviso-habilidades', route: '/', state: richState({ settings: { goals: ['frontlever', 'muscleup', 'pino'], daysPerWeek: 3, focus: undefined, maintain: undefined } }) },
  { name: 'hoy-habilidad-conseguida', route: '/', state: richState({ progress: { ...rich.progress, pino: { step: 8, passes: 0, done: true } } }) },
  { name: 'hoy-habilidad-conseguida-hueco', route: '/', state: richState({ settings: { focus: 'pino', maintain: ['frontlever'], daysPerWeek: 3 }, progress: { ...rich.progress, pino: { step: 8, passes: 0, done: true } } }) },
  { name: 'hoy-descanso-pino-hecho', route: '/', state: richState({ sessions: [...rich.sessions, session({ daysAgo: 0, hour: 8, dayType: 'pino', duration: 600, items: [hold('pino', 3, [40, 45, 42])] })] }), now: TUE },
  { name: 'hoy-descarga-activa', route: '/', state: richState({ deload: { start: NOW - DAY, until: NOW + 6 * DAY } }) },
  { name: 'hoy-entreno-a-medias', route: '/', state: rich, setup: async (page) => { await startSession(page); await page.goto(page.url().replace(/#.*/, '#/')); } },
  { name: 'calendario', route: '/calendario', state: rich },
  { name: 'calendario-dia', route: '/calendario', state: rich, setup: prevMonthDay },
  { name: 'rutas', route: '/rutas', state: rich },
  ...ROUTES.map((id) => ({ name: `ruta-${id}`, route: `/ruta/${id}`, state: rich })),
  { name: 'ruta-pasos-abiertos', route: '/ruta/frontlever', state: rich, setup: async (page) => { for (const d of await page.locator('.path-step details').all()) await d.evaluate((el) => { el.open = true; }); } },
  { name: 'heroe', route: '/heroe', state: rich },
  { name: 'logros', route: '/logros', state: rich },
  { name: 'logros-pendientes', route: '/logros', state: rich, setup: click('[data-action="ach-filter"][data-value="pendientes"]') },
  { name: 'equipo', route: '/equipo', state: rich },
  { name: 'progreso', route: '/progreso', state: rich },
  { name: 'sesion-detalle', route: `/sesion/${richSessionId}`, state: rich },
  { name: 'resumen-subida', route: `/resumen/${levelSessionId}`, state: rich },
  { name: 'ajustes', route: '/ajustes', state: rich },
  { name: 'ajustes-foco-sin-mantener', route: '/ajustes', state: richState({ settings: { focus: 'frontlever', maintain: [], daysPerWeek: 3 } }) },
  { name: 'ruta-mantener-sin-hueco', route: '/ruta/planche', state: rich },
  { name: 'plan', route: '/plan', state: rich },
  { name: 'plan-moviendo', route: '/plan', state: rich, setup: click('.week-row:nth-child(3) [data-action="week-move"]') },
  { name: 'plan-semana-cambiada', route: '/plan', state: rich, setup: clickAll('.week-row:nth-child(3) [data-action="week-move"]', '.week-row:nth-child(4) [data-action="week-move-to"]') },
  { name: 'plan-4-dias', route: '/plan', state: richState({ settings: { ...rich.settings, daysPerWeek: 4, schedule: { days: [true, true, false, true, true, false, false] } } }) },
  { name: 'plan-6-dias', route: '/plan', state: richState({ settings: { ...rich.settings, daysPerWeek: 6, schedule: { days: [true, true, true, true, true, true, false] } } }) },

  // Entreno (calistenia)
  { name: 'entreno-calentamiento', route: '/', state: rich, setup: startSession },
  { name: 'entreno-calentamiento-marcado', route: '/', state: rich, setup: async (page) => { await startSession(page); for (let i = 0; i < 4; i++) await page.locator('[data-action="warmup-check"]').nth(i).click(); } },
  { name: 'entreno-isometria', route: '/', state: rich, setup: async (page) => { await startSession(page); await skipWarmup(page); } },
  { name: 'entreno-claves-abiertas', route: '/', state: rich, setup: async (page) => { await startSession(page); await skipWarmup(page); await page.locator('.cues summary').click(); } },
  { name: 'entreno-cronometro', route: '/', state: rich, viewportOnly: true, setup: async (page) => { await startSession(page); await skipWarmup(page); await page.locator('[data-action="hold-start"]').first().click(); } },
  { name: 'entreno-cronometro-aguanta', route: '/', state: rich, viewportOnly: true, setup: async (page) => { await startSession(page); await skipWarmup(page); await page.locator('[data-action="hold-start"]').first().click(); await page.clock.runFor(14000); } },
  { name: 'entreno-descanso', route: '/', state: rich, viewportOnly: true, setup: async (page) => { await startSession(page); await skipWarmup(page); await doSet(page, 0); } },
  { name: 'entreno-descanso-final', route: '/', state: rich, setup: async (page) => { await startSession(page); await skipWarmup(page); await doSet(page, 0); await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); }, viewportOnly: true },
  { name: 'entreno-valorar', route: '/', state: rich, viewportOnly: true, setup: async (page) => { await startSession(page); await skipWarmup(page); await doAllSets(page); } },
  { name: 'entreno-valorar-final', route: '/', state: rich, viewportOnly: true, setup: async (page) => { await startSession(page); await skipWarmup(page); await doAllSets(page); await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); } },
  { name: 'entreno-repeticiones', route: '/', state: rich, setup: async (page) => { await startSession(page); await skipWarmup(page); await doAllSets(page); await page.locator('.rate-panel [data-value="normal"]').click(); await page.locator('[data-action="rest-skip"]').click().catch(() => {}); } },
  { name: 'entreno-valoracion-en-tarjeta', route: '/', state: rich, setup: async (page) => { await startSession(page); await skipWarmup(page); await doSet(page, 0); await page.locator('[data-action="rest-skip"]').click(); } },
  { name: 'entreno-terminar-valorando', route: '/', state: rich, viewportOnly: true, setup: async (page) => { await startSession(page); await skipWarmup(page); await doSet(page, 0); await page.locator('[data-action="rest-skip"]').click(); await page.locator('.session-head [data-action="session-finish"]').click(); } },
  { name: 'entreno-video', route: '/', state: rich, viewportOnly: true, setup: async (page) => { await startSession(page); await skipWarmup(page); await page.locator('[data-action="video-open"]').first().click(); } },
  { name: 'entreno-ultimo', route: '/', state: rich, setup: async (page) => { await startSession(page); await skipWarmup(page); await page.locator('.chip').last().click(); } },
  { name: 'entreno-resumen', route: '/', state: rich, setup: async (page) => {
    await startSession(page); await skipWarmup(page);
    await doAllSets(page); await page.locator('.rate-panel [data-value="facil"]').click();
    await page.locator('.session-head [data-action="session-finish"]').click(); // acepta «quedan series sin completar»
    // Espera desde Node: con el reloj simulado de las pruebas, waitForFunction no avanza.
    for (let i = 0; i < 50 && !(await page.evaluate(() => location.hash)).startsWith('#/resumen/'); i++) await page.waitForTimeout(100);
  } },
  { name: 'entreno-vacio', route: '/entreno', state: rich },
  { name: 'entreno-complementario', route: '/', state: rich, setup: async (page) => { await startSession(page); await skipWarmup(page); await page.locator('.chip.acc').first().click(); } },
  { name: 'entreno-alternando', route: '/', viewportOnly: true, state: richState({ settings: { focus: 'frontlever', maintain: ['planche'], daysPerWeek: 3 }, progress: { ...rich.progress, planche: { step: 2, passes: 0, done: false } }, plan: { dayType: 'B', ids: ['frontlever', 'planche', 'remo', 'core'], custom: true } }), setup: async (page) => { await startSession(page); await skipWarmup(page); await doSet(page, 0); } },
  { name: 'entreno-alternando-tarjeta', route: '/', state: richState({ settings: { focus: 'frontlever', maintain: ['planche'], daysPerWeek: 3 }, progress: { ...rich.progress, planche: { step: 2, passes: 0, done: false } }, plan: { dayType: 'B', ids: ['frontlever', 'planche', 'remo', 'core'], custom: true } }), setup: async (page) => { await startSession(page); await skipWarmup(page); } },
  { name: 'entreno-preparacion-back-lever', route: '/ruta/backlever', state: richState({ settings: { focus: 'backlever', maintain: [], daysPerWeek: 3 }, progress: { ...rich.progress, backlever: { step: 3, passes: 0, done: false } } }), setup: async (page) => { await page.locator('[data-action="train-only"]').click(); await skipWarmup(page); } },
  { name: 'hoy-front-lever-foco', route: '/', state: richState({ settings: { focus: 'frontlever', maintain: ['muscleup'], daysPerWeek: 3 }, progress: { ...rich.progress, frontlever: { step: 3, passes: 0, done: false } } }) },
  { name: 'hoy-con-serie-menos', route: '/', state: richState({ settings: { focus: 'muscleup', maintain: [], daysPerWeek: 3 }, progress: { ...rich.progress, muscleup: { step: 3, passes: 0, done: false } }, plan: { dayType: 'A', ids: ['muscleup', 'dominadas', 'fondos', 'core'], custom: true } }) },
  { name: 'entreno-mantener', route: '/', state: rich, setup: async (page) => { await startSession(page); await skipWarmup(page); await page.locator('.chip').nth(2).click(); } },
  { name: 'entreno-solo-pino', route: '/', state: rich, now: TUE, setup: async (page) => { await page.locator('[data-action="pino-only"]').click(); await page.waitForSelector('.session-head'); } },

  // Pierna en el gimnasio
  { name: 'gym-hoy-torso', route: '/', state: gym },
  { name: 'gym-hoy-pierna', route: '/', state: gym, now: TUE },
  { name: 'gym-hoy-descarga-sugerida', route: '/', state: gymState({ lifts: { ...gym.lifts, hack: { kg: 120, reps: 8, stall: 2 } } }), now: TUE },
  { name: 'gym-plan', route: '/plan', state: gym },
  { name: 'gym-plan-moviendo', route: '/plan', state: gym, setup: click('.week-row:nth-child(2) [data-action="week-move"]') },
  { name: 'gym-plan-sin-pesos', route: '/plan', state: gymState({ lifts: {}, sessions: [] }) },
  ...LIFT_IDS.map((id) => ({ name: `gym-ficha-${id}`, route: `/ejercicio/${id}`, state: gym })),
  { name: 'gym-ficha-sin-historial', route: '/ejercicio/hack', state: gymState({ lifts: {}, sessions: [] }) },
  { name: 'gym-entreno-calentamiento', route: '/', state: gym, now: TUE, setup: startSession },
  { name: 'gym-entreno-ejercicio', route: '/', state: gym, now: TUE, setup: async (page) => { await startSession(page); await skipWarmup(page); } },
  { name: 'gym-entreno-sin-peso', route: '/', state: gymState({ lifts: {}, sessions: [] }), now: TUE, setup: async (page) => { await startSession(page); await skipWarmup(page); } },
  { name: 'gym-entreno-descanso', route: '/', state: gym, now: TUE, viewportOnly: true, setup: async (page) => { await startSession(page); await skipWarmup(page); await doSet(page, 0); } },
  { name: 'gym-entreno-valorar', route: '/', state: gym, now: TUE, viewportOnly: true, setup: async (page) => { await startSession(page); await skipWarmup(page); await doAllSets(page); } },
  { name: 'gym-resumen', route: `/resumen/${gymSessionId}`, state: gym },
  { name: 'gym-sesion-detalle', route: `/sesion/${gymSessionId}`, state: gym },
  { name: 'gym-progreso', route: '/progreso', state: gym },
  { name: 'gym-calendario-dia', route: '/calendario', state: gym, setup: prevMonthDay },
  { name: 'gym-ajustes', route: '/ajustes', state: gym },
];

module.exports = { scenarios, baseState, richState, gymState, NOW };
