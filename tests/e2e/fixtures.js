// Utilidades comunes de las pruebas e2e.
// · Reloj fijo: lunes 2 de noviembre de 2026 a las 10:00 (Madrid), salvo que la
//   prueba indique otra fecha con test.use({ now: '…' }).
// · Bloquea la red externa (YouTube, miniaturas) para que las pruebas no dependan de internet.
// · Falla la prueba si la app lanza errores de JavaScript.

const base = require('@playwright/test');

const KEY = 'calisthenic-flow:v1';
const DEFAULT_NOW = '2026-11-02T10:00:00+01:00'; // lunes

const test = base.test.extend({
  now: [DEFAULT_NOW, { option: true }],
  pageErrors: [async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errors.push(m.text());
    });
    await use(errors);
    base.expect(errors, 'La app no debe lanzar errores de JavaScript').toEqual([]);
  }, { auto: true }],
  page: async ({ page, now }, use) => {
    await page.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
    await page.clock.install({ time: new Date(now) });
    page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'Rayo' : undefined));
    await use(page);
  },
});

// Estado guardado listo para usar (usuario que ya hizo la configuración inicial).
function makeState(overrides = {}) {
  const base = {
    version: 2,
    onboarded: true,
    settings: {
      goals: [], daysPerWeek: 3, passesToLevelUp: 2, sound: false, warmup: true,
      schedule: { days: [true, false, true, false, true, false, false] },
    },
    progress: {},
    levelLog: [],
    sessions: [],
    active: null,
    plan: null,
    lastDayType: null,
    deload: null,
    deloadSnoozeUntil: null,
    game: { name: 'Tu héroe', unlocked: {}, equipped: {}, look: { skin: 1, hair: 0, hairStyle: 'puntas' }, videosWatched: 0 },
  };
  return {
    ...base,
    ...overrides,
    settings: { ...base.settings, ...(overrides.settings || {}) },
    game: { ...base.game, ...(overrides.game || {}) },
  };
}

// Sesión pasada mínima para sembrar el historial.
function pastSession({ daysAgo = 1, items = [], duration = 2400, dayType = 'A', levelUps = [], now = DEFAULT_NOW } = {}) {
  const startedAt = new Date(now).getTime() - daysAgo * 864e5;
  return {
    id: `s${daysAgo}-${Math.random().toString(36).slice(2, 6)}`,
    startedAt, endedAt: startedAt + duration * 1000, duration, dayType, deload: false, warmupFull: false,
    items: items.map((it) => ({ type: 'reps', target: 8, goal: 5, plannedSets: 3, side: false, met: false, goalMet: true, rating: 'normal', ...it })),
    levelUps, notes: '',
  };
}

// Siembra el almacenamiento antes de que cargue la app (solo una vez por pestaña).
async function seed(page, state) {
  await page.addInitScript(([key, data]) => {
    if (window.top !== window) return; // no tocar iframes (p. ej. el vídeo)
    if (!sessionStorage.getItem('e2e-seeded')) {
      localStorage.setItem(key, JSON.stringify(data));
      sessionStorage.setItem('e2e-seeded', '1');
    }
  }, [KEY, state]);
}

async function readState(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY);
}

// Completa las series pendientes del ejercicio actual (con los valores precargados).
// Al terminar la última pide la valoración y, al darla, pasa al siguiente ejercicio.
async function completeCurrentExercise(page) {
  const pending = page.locator('[data-action="set-toggle"]:not(.on)');
  const n = await pending.count();
  for (let i = 0; i < n; i++) await pending.first().click();
}

// Valora el ejercicio que pregunta el panel inferior.
async function rate(page, value) {
  await page.locator(`.rate-panel [data-value="${value}"]`).click();
}

// Entrena una sola ruta desde su página: completa las series y valora.
async function trainOnly(page, routeId, { rating = 'normal', setValue } = {}) {
  await page.goto(`/#/ruta/${routeId}`);
  await page.locator('[data-action="train-only"]').click();
  await page.locator('[data-action="warmup-done"]').last().click();
  if (setValue !== undefined) {
    const sets = await page.locator('.set').count();
    for (let i = 0; i < sets; i++) {
      const val = page.locator('.set .val').nth(i);
      let current = parseInt(await val.innerText(), 10);
      while (current !== setValue) {
        await page.locator(`[data-action="${current < setValue ? 'set-inc' : 'set-dec'}"][data-set="${i}"]`).click();
        current = parseInt(await val.innerText(), 10);
      }
    }
  }
  await completeCurrentExercise(page);
  await rate(page, rating);
  await page.locator('[data-action="session-finish"]').first().click();
  await base.expect(page).toHaveURL(/#\/resumen\//);
}

module.exports = { test, expect: base.expect, KEY, makeState, pastSession, seed, readState, completeCurrentExercise, rate, trainOnly, DEFAULT_NOW };
