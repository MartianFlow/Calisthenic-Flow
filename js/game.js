// Gamificación: experiencia (XP), nivel de jugador, atributos del héroe,
// logros y artículos desbloqueables.
//
// La XP y los atributos se calculan a partir del historial (no se guardan), así
// nunca se descuadran. Solo se guarda qué logros se desbloquearon y cuándo.

import { ROADMAP_BY_ID, ROADMAPS } from './data/roadmaps.js';
import { getProgress } from './store.js';
import { globalProgress, startOfWeek, isWorkout } from './logic.js';

// ─────────────────────────────── XP y nivel ───────────────────────────────

export const XP_RULES = {
  session: 40,       // por entreno terminado
  set: 4,            // por serie completada
  rated: 3,          // por ejercicio valorado
  minute: 1,         // por minuto (máx. 60 por sesión)
  levelUp: 120,      // por subir de paso en una ruta
  routeDone: 600,    // por completar una ruta
  loadUp: 30,        // por subir el peso en un ejercicio de gimnasio
  record: 15,        // por cada récord personal (mejor serie de un paso, complementario o peso)
  mission: 60,       // por cada misión de la semana
  missionsAll: 60,   // extra por completar las 3 misiones de una semana
};

export const RARITY = {
  bronce: { label: 'Bronce', xp: 50 },
  plata: { label: 'Plata', xp: 150 },
  oro: { label: 'Oro', xp: 400 },
  leyenda: { label: 'Leyenda', xp: 1000 },
};

export function sessionXP(s) {
  const sets = s.items.reduce((a, it) => a + it.sets.length, 0);
  const rated = s.items.filter((it) => it.rating).length;
  const minutes = Math.min(60, Math.round(s.duration / 60));
  const ups = s.levelUps.filter((l) => !l.completed).length;
  const done = s.levelUps.filter((l) => l.completed).length;
  const loads = s.items.filter((it) => it.outcome?.kind === 'load-up').length;
  return {
    total: XP_RULES.session + sets * XP_RULES.set + rated * XP_RULES.rated + minutes * XP_RULES.minute
      + ups * XP_RULES.levelUp + done * XP_RULES.routeDone + loads * XP_RULES.loadUp,
    parts: {
      base: XP_RULES.session, sets: sets * XP_RULES.set, rated: rated * XP_RULES.rated, minutes,
      levelUps: ups * XP_RULES.levelUp + done * XP_RULES.routeDone, loadUps: loads * XP_RULES.loadUp,
    },
  };
}

export function achievementXP(state) {
  return Object.keys(state.game?.unlocked || {}).reduce((a, id) => a + (RARITY[ACH_BY_ID[id]?.rarity]?.xp || 0), 0);
}

export function totalXP(state) {
  return state.sessions.reduce((a, s) => a + sessionXP(s).total, 0) + achievementXP(state)
    + recordCount(state) * XP_RULES.record + missionXP(state);
}

// ─────────────────────────────── Récords personales ───────────────────────────────
// La mejor serie de cada paso de una ruta, de cada complementario y el mayor peso de cada
// ejercicio de gimnasio. La primera vez que se hace algo no cuenta como récord.
// Devuelve un Map: id de sesión → [{ item, value, prev }].
let recCache = { key: null, map: new Map() };
export function personalRecords(state) {
  const key = `${state.sessions.length}:${state.sessions[state.sessions.length - 1]?.id || ''}`;
  if (recCache.key === key && recCache.ref === state.sessions) return recCache.map;
  const best = new Map();
  const out = new Map();
  for (const ses of state.sessions) {
    const list = [];
    for (const it of ses.items) {
      let k;
      let value;
      if (it.liftId || (it.customId && it.load)) {
        const kgs = (it.loads || []).map(Number).filter((v) => v > 0);
        if (!kgs.length) continue;
        k = `lift:${it.liftId || it.customId}`;
        value = Math.max(...kgs);
      } else if (it.customId) {
        k = `custom:${it.customId}:${it.type}`;
        value = Math.max(0, ...it.sets);
      } else if (it.acc) {
        k = `acc:${it.acc}`;
        value = Math.max(0, ...it.sets);
      } else if (it.roadmapId) {
        k = `${it.roadmapId}:${it.stepIndex}`;
        value = Math.max(0, ...it.sets);
      } else continue;
      if (!value) continue;
      const prev = best.get(k);
      if (prev != null && value > prev) list.push({ item: it, value, prev });
      if (prev == null || value > prev) best.set(k, value);
    }
    if (list.length) out.set(ses.id, list);
  }
  recCache = { key, ref: state.sessions, map: out };
  return out;
}
export const recordCount = (state) => [...personalRecords(state).values()].reduce((a, l) => a + l.length, 0);

// XP acumulada necesaria para alcanzar el nivel L.
export const xpForLevel = (L) => (L <= 1 ? 0 : Math.round(150 * Math.pow(L - 1, 1.6)));

export function levelInfo(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const from = xpForLevel(level);
  const to = xpForLevel(level + 1);
  return { level, xp, from, to, into: xp - from, need: to - from, pct: Math.round(((xp - from) / (to - from)) * 100) };
}

const TITLES = [
  [30, 'Mito'], [25, 'Leyenda'], [20, 'Maestro'], [16, 'Gimnasta'], [12, 'Acróbata'],
  [8, 'Atleta'], [5, 'Callejero'], [3, 'Aprendiz'], [1, 'Novato'],
];
export const titleFor = (level) => TITLES.find(([l]) => level >= l)[1];

// ─────────────────────────────── Misiones de la semana ───────────────────────────────
// 3 por semana: «cumple tu semana» y 2 más que cambian cada semana (elegidas por el número de
// semana, así no cambian al reabrir la app). Al cumplirse se guardan en game.missions, para
// que su EXP no cambie aunque luego cambien los ajustes.
const MISSIONS = [
  { id: 'semana', text: (st) => `Completa ${st.settings.daysPerWeek} entrenos`, goal: (st) => st.settings.daysPerWeek, count: (w) => w.workouts.length },
  { id: 'series', text: () => 'Completa 40 series', goal: () => 40, count: (w) => w.sets },
  { id: 'valora', text: () => 'Valora todos los ejercicios en 2 entrenos', goal: () => 2, count: (w) => w.allRated },
  { id: 'calienta', text: () => 'Haz el calentamiento entero 2 veces', goal: () => 2, count: (w) => w.warmups },
  { id: 'madruga', text: () => 'Entrena antes de las 9:00', goal: () => 1, count: (w) => w.early },
  { id: 'isometria', text: () => 'Suma 3 minutos de isometrías', goal: () => 180, count: (w) => w.holdSec, unit: 's' },
  { id: 'notas', text: () => 'Apunta en las notas cómo te fue un entreno', goal: () => 1, count: (w) => w.notes },
  { id: 'record', text: () => 'Bate un récord personal', goal: () => 1, count: (w) => w.records },
  { id: 'perfecto', text: () => 'Haz un entreno perfecto: todo cumplido y valorado', goal: () => 1, count: (w) => w.perfect },
  { id: 'foco', text: () => 'Entrena 2 veces la habilidad que aprendes', goal: () => 2, count: (w) => w.focus, when: (st) => !!st.settings.focus },
  { id: 'pino', text: () => 'Haz 2 prácticas de «Solo pino»', goal: () => 2, count: (w) => w.pino, when: (st) => st.settings.goals?.includes('pino') },
  { id: 'complementos', text: () => 'Completa 12 series de complementarios', goal: () => 12, count: (w) => w.accSets, when: (st) => !!st.settings.focus },
];
export const MISSION_BY_ID = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

const isPerfect = (x) => x.items.filter((it) => !it.acc).length >= 3 && x.items.every((it) => it.acc || (it.goalMet && it.rating));

function weekData(state, weekStart) {
  const end = weekStart + 7 * 864e5 + 3600e3; // (+1 h por el cambio de hora)
  const list = state.sessions.filter((x) => x.startedAt >= weekStart && x.startedAt < end && startOfWeek(x.startedAt) === weekStart);
  const recs = personalRecords(state);
  const sum = (fn) => list.reduce((a, x) => a + fn(x), 0);
  return {
    workouts: list.filter(isWorkout),
    sets: sum((x) => x.items.reduce((a, it) => a + it.sets.length, 0)),
    allRated: list.filter((x) => x.items.some((it) => !it.acc) && x.items.every((it) => it.acc || it.rating)).length,
    warmups: list.filter((x) => x.warmupFull).length,
    early: list.filter((x) => new Date(x.startedAt).getHours() < 9).length,
    holdSec: sum((x) => x.items.filter((it) => it.type === 'hold').reduce((a, it) => a + it.sets.reduce((b, v) => b + v, 0) * (it.side ? 2 : 1), 0)),
    notes: list.filter((x) => (x.notes || '').trim()).length,
    records: sum((x) => recs.get(x.id)?.length || 0),
    perfect: list.filter(isPerfect).length,
    focus: list.filter((x) => x.items.some((it) => it.role === 'foco')).length,
    pino: list.filter((x) => x.dayType === 'pino').length,
    accSets: sum((x) => x.items.filter((it) => it.acc).reduce((a, it) => a + it.sets.length, 0)),
  };
}

// Mezcla determinista según la semana (las mismas 3 misiones toda la semana).
function seeded(n) {
  let x = Math.abs(Math.floor(n / 864e5)) % 2147483647 || 1;
  return () => { x = (x * 48271) % 2147483647; return x / 2147483647; };
}

export function weekMissions(state, weekStart = startOfWeek(Date.now())) {
  const stored = state.game?.missions?.[weekStart];
  const rnd = seeded(weekStart);
  const pool = MISSIONS.slice(1).filter((m) => !m.when || m.when(state));
  const picks = [MISSIONS[0]];
  while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  const w = weekData(state, weekStart);
  return picks.map((m) => {
    const goal = m.goal(state);
    const cur = Math.min(goal, m.count(w));
    return { id: m.id, text: m.text(state), goal, cur, unit: m.unit, done: !!stored?.ids?.includes(m.id) || cur >= goal };
  });
}

export function missionXP(state) {
  return Object.values(state.game?.missions || {}).reduce((a, m) => a + (m.ids?.length || 0) * XP_RULES.mission + ((m.ids?.length || 0) >= 3 ? XP_RULES.missionsAll : 0), 0);
}
export const missionCount = (state) => Object.values(state.game?.missions || {}).reduce((a, m) => a + (m.ids?.length || 0), 0);

// Guarda las misiones cumplidas de esta semana y devuelve las nuevas (para celebrarlas).
export function syncMissions(s) {
  s.game ||= {};
  s.game.missions ||= {};
  const ws = startOfWeek(Date.now());
  const fresh = [];
  for (const m of weekMissions(s, ws)) {
    const rec = (s.game.missions[ws] ||= { ids: [] });
    if (m.cur >= m.goal && !rec.ids.includes(m.id)) { rec.ids.push(m.id); fresh.push(m.id); }
  }
  if (!s.game.missions[ws]?.ids.length) delete s.game.missions[ws];
  return fresh;
}

// ─────────────────────────────── Atributos ───────────────────────────────

const ATTR_DEFS = [
  { key: 'tiron', label: 'Tirón', color: 'var(--cyan)', routes: ['dominadas', 'remo', 'muscleup', 'frontlever', 'backlever'] },
  { key: 'empuje', label: 'Empuje', color: 'var(--pink)', routes: ['flexiones', 'fondos', 'hspu', 'planche'] },
  { key: 'piernas', label: 'Piernas', color: 'var(--yellow)', routes: ['piernas', 'bisagra'] },
  { key: 'core', label: 'Core', color: 'var(--lime)', routes: ['core', 'lsit'] },
  { key: 'equilibrio', label: 'Equilibrio', color: '#b48cff', routes: ['pino', 'hspu'] },
  { key: 'aguante', label: 'Aguante', color: '#ff9a3d', routes: [] },
];

function routeFraction(id) {
  const r = ROADMAP_BY_ID[id];
  const p = getProgress(id);
  return (p.step + (p.done ? 1 : 0)) / r.steps.length;
}

// Subidas de peso en los ejercicios de pierna (los del gimnasio y los tuyos de pierna).
const legItem = (it) => !!it.liftId || (it.customId && it.group === 'pierna' && it.load);
export function loadUpCount(state) {
  return state.sessions.reduce((a, s) => a + s.items.filter((it) => legItem(it) && it.outcome?.kind === 'load-up').length, 0);
}

export function attributes(state) {
  const minutes = state.sessions.reduce((a, s) => a + s.duration, 0) / 60;
  const loadUps = loadUpCount(state);
  return ATTR_DEFS.map((d) => {
    let value;
    if (d.key === 'aguante') {
      // 50 horas de entreno = 100
      value = Math.min(100, Math.round(Math.sqrt(minutes / 3000) * 100));
    } else {
      const fr = d.routes.map(routeFraction);
      // Las rutas básicas pesan el doble que las avanzadas para que el héroe crezca desde el principio.
      const weights = d.routes.map((id) => (ROADMAP_BY_ID[id].category === 'fuerza' ? 2 : 1));
      const sum = fr.reduce((a, f, i) => a + f * weights[i], 0);
      value = Math.round((sum / weights.reduce((a, w) => a + w, 0)) * 100);
      // Pierna en el gimnasio: cuenta lo que has subido de peso (60 subidas = 100).
      if (d.key === 'piernas' && loadUps) value = Math.max(value, Math.min(100, Math.round(Math.sqrt(loadUps / 60) * 100)));
    }
    return { ...d, value, rank: rankFor(value) };
  });
}

export function rankFor(v) {
  if (v >= 85) return 'S';
  if (v >= 65) return 'A';
  if (v >= 45) return 'B';
  if (v >= 25) return 'C';
  if (v >= 10) return 'D';
  return 'E';
}

// ─────────────────────────────── Estadísticas ───────────────────────────────

function stepIndex(id, key) {
  return ROADMAP_BY_ID[id].steps.findIndex((s) => s.key === key);
}
// Paso alcanzado (estás en él o más allá).
function reached(id, key) {
  return getProgress(id).step >= stepIndex(id, key);
}
// Paso superado (ya pasaste al siguiente, o completaste la ruta en él).
function passed(id, key) {
  const p = getProgress(id);
  const i = stepIndex(id, key);
  return p.step > i || (p.done && p.step === i);
}

function bestWeekStreak(state) {
  if (!state.sessions.length) return 0;
  const goal = state.settings.daysPerWeek;
  const counts = new Map();
  for (const s of state.sessions) {
    const w = startOfWeek(s.startedAt);
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  const weeks = [...counts.keys()].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = null;
  for (const w of weeks) {
    const ok = counts.get(w) >= goal;
    const consecutive = prev !== null && Math.round((w - prev) / (7 * 864e5)) === 1;
    run = ok ? (consecutive && run > 0 ? run + 1 : 1) : 0;
    best = Math.max(best, run);
    prev = w;
  }
  return best;
}

export function gameStats(state) {
  const s = state.sessions;
  let sets = 0; let reps = 0; let holdSec = 0; let rated = 0;
  const routes = new Set();
  for (const ses of s) {
    for (const it of ses.items) {
      sets += it.sets.length;
      if (it.roadmapId) routes.add(it.roadmapId);
      if (it.rating) rated++;
      const sum = it.sets.reduce((a, v) => a + v, 0) * (it.side ? 2 : 1);
      if (it.type === 'hold') holdSec += sum; else reps += sum;
    }
  }
  const hours = s.map((x) => new Date(x.startedAt).getHours());
  return {
    sessions: s.length,
    seconds: s.reduce((a, x) => a + x.duration, 0),
    maxMinutes: Math.max(0, ...s.map((x) => x.duration / 60)),
    sets, reps, holdSec, rated,
    routes: routes.size,
    levelUps: state.levelLog.filter((l) => !l.manual && !l.completed).length,
    routesDone: Object.values(state.progress).filter((p) => p?.done).length,
    bestStreak: bestWeekStreak(state),
    early: hours.some((h) => h < 8),
    late: hours.some((h) => h >= 22),
    warmups: s.filter((x) => x.warmupFull).length,
    deloadSessions: s.filter((x) => x.deload).length,
    // (los complementarios no se valoran: no cuentan aquí)
    perfect: s.filter(isPerfect).length,
    legDays: s.filter((x) => x.items.some(legItem)).length,
    loadUps: loadUpCount(state),
    videos: state.game?.videosWatched || 0,
    map: globalProgress(),
    ...moreStats(state),
  };
}

const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

// Estadísticas de los logros nuevos (habilidades, hábitos y secretos).
function moreStats(state) {
  const s = state.sessions;
  const workouts = s.filter(isWorkout);
  const count = (keyFn, list) => { const m = new Map(); for (const x of list) m.set(keyFn(x), (m.get(keyFn(x)) || 0) + 1); return m; };
  const perDay = count((x) => dayKey(x.startedAt), workouts);
  const perMonth = count((x) => { const d = new Date(x.startedAt); return `${d.getFullYear()}-${d.getMonth()}`; }, workouts);
  const days = new Set(s.map((x) => dayKey(x.startedAt)));
  const dates = s.map((x) => new Date(x.startedAt));
  const sorted = [...s].sort((a, b) => a.startedAt - b.startedAt);
  const skill = (it) => it.roadmapId && it.roadmapId !== 'pino' && ROADMAP_BY_ID[it.roadmapId]?.category === 'habilidad';
  const ratedAll = (x, r) => { const l = x.items.filter((it) => !it.acc); return l.length >= 4 && l.every((it) => it.rating === r); };
  const setsOf = (x) => x.items.reduce((a, it) => a + it.sets.length, 0);
  const lvl = levelInfo(totalXP(state)).level;
  const eq = equipped(state);
  return {
    level: lvl,
    monthMax: Math.max(0, ...perMonth.values()),
    doubleDay: [...perDay.values()].some((v) => v >= 2),
    weekend: dates.some((d) => d.getDay() === 6 && days.has(dayKey(d.getTime() + 864e5))),
    comeback: sorted.some((x, i) => i > 0 && x.startedAt - sorted[i - 1].startedAt >= 30 * 864e5),
    newYear: dates.some((d) => d.getMonth() === 0 && d.getDate() === 1),
    xmas: dates.some((d) => d.getMonth() === 11 && d.getDate() === 25),
    friday13: dates.some((d) => d.getDay() === 5 && d.getDate() === 13),
    vampire: dates.some((d) => d.getHours() >= 1 && d.getHours() < 5),
    allEasy: s.some((x) => ratedAll(x, 'facil')),
    allHard: s.some((x) => ratedAll(x, 'dificil')),
    express: s.some((x) => x.duration <= 20 * 60 && setsOf(x) >= 10),
    endless: s.some((x) => x.duration >= 120 * 60),
    tripleJump: s.some((x) => new Set(x.levelUps.filter((l) => !l.completed).map((l) => l.roadmapId)).size >= 3),
    focusSessions: s.filter((x) => x.items.some((it) => it.role === 'foco')).length,
    maintainSessions: s.filter((x) => x.items.some((it) => it.role === 'mantener')).length,
    pinoPractices: s.filter((x) => x.dayType === 'pino').length,
    accSets: s.reduce((a, x) => a + x.items.filter((it) => it.acc).reduce((b, it) => b + it.sets.length, 0), 0),
    altSessions: s.filter((x) => x.items.filter(skill).length >= 2).length,
    notes: s.filter((x) => (x.notes || '').trim()).length,
    records: recordCount(state),
    missions: missionCount(state),
    hasFocus: !!state.settings.focus,
    mastered: (state.settings.maintain || []).some((id) => getProgress(id).done),
    customCount: (state.custom || []).length,
    customSessions: s.filter((x) => x.items.some((it) => it.customId)).length,
    backups: state.backup?.count || 0,
    bodyLogs: (state.body || []).length,
    pokes: state.game?.pokes || 0,
    themeFlips: state.game?.themeFlips || 0,
    named: !!state.game?.name && state.game.name !== 'Tu héroe',
    fashion: Object.keys(SLOTS).every((slot) => eq[slot]),
    allRoutes: new Set(s.flatMap((x) => x.items.map((it) => it.roadmapId).filter(Boolean))).size >= ROADMAPS.length,
  };
}

// ─────────────────────────────── Logros ───────────────────────────────
// check(st) → [actual, meta]. Se desbloquea cuando actual ≥ meta.

const n = (v) => [v ? 1 : 0, 1];

export const ACH_CATEGORIES = {
  constancia: 'Constancia',
  progreso: 'Progreso',
  hitos: 'Hitos de calistenia',
  habilidades: 'Tus habilidades',
  habitos: 'Buenos hábitos',
  secretos: 'Secretos',
};

export const ACHIEVEMENTS = [
  // Constancia
  { id: 'primer-entreno', cat: 'constancia', rarity: 'bronce', name: 'Primer asalto', desc: 'Termina tu primer entreno.', check: (st) => [st.sessions, 1] },
  { id: 'cinco', cat: 'constancia', rarity: 'bronce', name: 'Calentando motores', desc: 'Completa 5 entrenos.', check: (st) => [st.sessions, 5] },
  { id: 'veinticinco', cat: 'constancia', rarity: 'plata', name: 'Hábito de acero', desc: 'Completa 25 entrenos.', check: (st) => [st.sessions, 25] },
  { id: 'centenario', cat: 'constancia', rarity: 'oro', name: 'Centenario', desc: 'Completa 100 entrenos.', check: (st) => [st.sessions, 100] },
  { id: 'semana-completa', cat: 'constancia', rarity: 'bronce', name: 'Semana redonda', desc: 'Cumple tu objetivo de días en una semana.', check: (st) => [Math.min(st.bestStreak, 1), 1] },
  { id: 'racha-4', cat: 'constancia', rarity: 'plata', name: 'Racha de 4', desc: '4 semanas seguidas cumpliendo tu objetivo.', check: (st) => [st.bestStreak, 4] },
  { id: 'racha-12', cat: 'constancia', rarity: 'oro', name: 'Imparable', desc: '12 semanas seguidas cumpliendo tu objetivo.', check: (st) => [st.bestStreak, 12] },
  { id: 'madrugador', cat: 'constancia', rarity: 'bronce', name: 'Madrugador', desc: 'Entrena antes de las 8:00.', check: (st) => n(st.early) },
  { id: 'nocturno', cat: 'constancia', rarity: 'bronce', name: 'Búho nocturno', desc: 'Entrena después de las 22:00.', check: (st) => n(st.late) },
  { id: 'maraton', cat: 'constancia', rarity: 'plata', name: 'Maratoniano', desc: 'Un entreno de 60 minutos o más.', check: (st) => [Math.floor(st.maxMinutes), 60] },
  { id: 'horas-10', cat: 'constancia', rarity: 'plata', name: '10 horas de hierro', desc: 'Acumula 10 horas entrenando.', check: (st) => [Math.floor(st.seconds / 3600), 10] },
  { id: 'horas-50', cat: 'constancia', rarity: 'oro', name: 'Cincuenta horas', desc: 'Acumula 50 horas entrenando.', check: (st) => [Math.floor(st.seconds / 3600), 50] },
  { id: 'dia-pierna', cat: 'constancia', rarity: 'bronce', name: 'Día de pierna', desc: 'Completa tu primer día de pierna en el gimnasio.', check: (st) => [st.legDays, 1] },
  { id: 'pierna-25', cat: 'constancia', rarity: 'plata', name: 'Nunca me salto pierna', desc: 'Completa 25 días de pierna en el gimnasio.', check: (st) => [st.legDays, 25] },
  { id: 'cincuenta', cat: 'constancia', rarity: 'plata', name: 'Medio centenar', desc: 'Completa 50 entrenos.', check: (st) => [st.sessions, 50] },
  { id: 'doscientos', cat: 'constancia', rarity: 'leyenda', name: 'Doscientos', desc: 'Completa 200 entrenos.', check: (st) => [st.sessions, 200] },
  { id: 'racha-26', cat: 'constancia', rarity: 'leyenda', name: 'Medio año sin fallar', desc: '26 semanas seguidas cumpliendo tu objetivo.', check: (st) => [st.bestStreak, 26] },
  { id: 'mes-12', cat: 'constancia', rarity: 'oro', name: 'Mes de hierro', desc: '12 entrenos en un mismo mes.', check: (st) => [st.monthMax, 12] },
  { id: 'fin-de-semana', cat: 'constancia', rarity: 'bronce', name: 'Fin de semana activo', desc: 'Entrena el sábado y el domingo del mismo fin de semana.', check: (st) => n(st.weekend) },
  { id: 'horas-100', cat: 'constancia', rarity: 'leyenda', name: 'Cien horas', desc: 'Acumula 100 horas entrenando.', check: (st) => [Math.floor(st.seconds / 3600), 100] },
  { id: 'pierna-50', cat: 'constancia', rarity: 'oro', name: 'Piernas de roble', desc: 'Completa 50 días de pierna en el gimnasio.', check: (st) => [st.legDays, 50] },

  // Progreso
  { id: 'subida-1', cat: 'progreso', rarity: 'bronce', name: '¡Nivel arriba!', desc: 'Supera tu primer paso en una ruta.', check: (st) => [st.levelUps, 1] },
  { id: 'subidas-10', cat: 'progreso', rarity: 'plata', name: 'Escalador', desc: 'Supera 10 pasos.', check: (st) => [st.levelUps, 10] },
  { id: 'subidas-50', cat: 'progreso', rarity: 'oro', name: 'Cumbre', desc: 'Supera 50 pasos.', check: (st) => [st.levelUps, 50] },
  { id: 'ruta-completa', cat: 'progreso', rarity: 'oro', name: 'Fin de ruta', desc: 'Completa una ruta entera.', check: (st) => [st.routesDone, 1] },
  { id: 'mapa-25', cat: 'progreso', rarity: 'plata', name: 'Cartógrafo', desc: 'Completa el 25 % del mapa.', check: (st) => [st.map, 25] },
  { id: 'mapa-50', cat: 'progreso', rarity: 'oro', name: 'Medio mundo', desc: 'Completa el 50 % del mapa.', check: (st) => [st.map, 50] },
  { id: 'explorador', cat: 'progreso', rarity: 'plata', name: 'Explorador', desc: 'Entrena 8 rutas distintas.', check: (st) => [st.routes, 8] },
  { id: 'mas-peso', cat: 'progreso', rarity: 'plata', name: 'Más discos', desc: 'Sube el peso 10 veces en ejercicios de pierna.', check: (st) => [st.loadUps, 10] },
  { id: 'mas-peso-30', cat: 'progreso', rarity: 'oro', name: 'Cargador', desc: 'Sube el peso 30 veces en ejercicios de pierna.', check: (st) => [st.loadUps, 30] },
  { id: 'subidas-100', cat: 'progreso', rarity: 'leyenda', name: 'Por encima de las nubes', desc: 'Supera 100 pasos.', check: (st) => [st.levelUps, 100] },
  { id: 'rutas-3', cat: 'progreso', rarity: 'oro', name: 'Triple corona', desc: 'Completa 3 rutas enteras.', check: (st) => [st.routesDone, 3] },
  { id: 'mapa-75', cat: 'progreso', rarity: 'leyenda', name: 'Casi todo el mapa', desc: 'Completa el 75 % del mapa.', check: (st) => [st.map, 75] },
  { id: 'trotamundos', cat: 'progreso', rarity: 'oro', name: 'Trotamundos', desc: 'Entrena las 14 rutas.', check: (st) => n(st.allRoutes) },
  { id: 'record-1', cat: 'progreso', rarity: 'bronce', name: 'Mejor que ayer', desc: 'Bate tu primer récord personal (tu mejor serie en un ejercicio).', check: (st) => [st.records, 1] },
  { id: 'records-25', cat: 'progreso', rarity: 'plata', name: 'Rompe récords', desc: 'Bate 25 récords personales.', check: (st) => [st.records, 25] },
  { id: 'records-100', cat: 'progreso', rarity: 'oro', name: 'Imbatible', desc: 'Bate 100 récords personales.', check: (st) => [st.records, 100] },
  { id: 'nivel-10', cat: 'progreso', rarity: 'plata', name: 'Doble dígito', desc: 'Llega al nivel 10 de héroe.', check: (st) => [st.level, 10] },
  { id: 'nivel-20', cat: 'progreso', rarity: 'oro', name: 'Veterano', desc: 'Llega al nivel 20 de héroe.', check: (st) => [st.level, 20] },
  { id: 'nivel-30', cat: 'progreso', rarity: 'leyenda', name: 'Mito viviente', desc: 'Llega al nivel 30 de héroe.', check: (st) => [st.level, 30] },

  // Hitos de calistenia
  { id: 'primera-dominada', cat: 'hitos', rarity: 'bronce', name: 'Primera dominada', desc: 'Llega al paso «Dominadas».', check: () => n(reached('dominadas', 'dominadas')) },
  { id: 'diez-dominadas', cat: 'hitos', rarity: 'plata', name: 'Diez limpias', desc: 'Supera «Dominadas (volumen)» 3×10.', check: () => n(passed('dominadas', 'volumen')) },
  { id: 'fondos', cat: 'hitos', rarity: 'plata', name: 'Paralelas dominadas', desc: 'Supera «Fondos en paralelas» 3×8.', check: () => n(passed('fondos', 'paralelas')) },
  { id: 'pistol', cat: 'hitos', rarity: 'oro', name: 'Pistolero', desc: 'Supera la pistol squat.', check: () => n(passed('piernas', 'pistol')) },
  { id: 'nordico', cat: 'hitos', rarity: 'oro', name: 'Isquios de titanio', desc: 'Supera el curl nórdico.', check: () => n(passed('bisagra', 'nordico')) },
  { id: 'dragon', cat: 'hitos', rarity: 'oro', name: 'Dragón', desc: 'Supera el dragon flag.', check: () => n(passed('core', 'dragon')) },
  { id: 'muscle-up', cat: 'hitos', rarity: 'oro', name: 'Por encima de la barra', desc: 'Supera el muscle-up con impulso.', check: () => n(passed('muscleup', 'impulso')) },
  { id: 'pino-libre', cat: 'hitos', rarity: 'oro', name: 'Mundo al revés', desc: 'Supera el pino libre (5×10 s).', check: () => n(passed('pino', 'libre')) },
  { id: 'hspu', cat: 'hitos', rarity: 'oro', name: 'Prensa invertida', desc: 'Supera las flexiones de pino en pared.', check: () => n(passed('hspu', 'pared')) },
  { id: 'lsit', cat: 'hitos', rarity: 'plata', name: 'Escuadra', desc: 'Supera el L-sit (3×15 s).', check: () => n(passed('lsit', 'lsit')) },
  { id: 'front-tuck', cat: 'hitos', rarity: 'plata', name: 'Lever en bolita', desc: 'Supera el tuck front lever.', check: () => n(passed('frontlever', 'tuck')) },
  { id: 'planche-tuck', cat: 'hitos', rarity: 'plata', name: 'Despegue', desc: 'Supera la tuck planche.', check: () => n(passed('planche', 'tuck')) },
  { id: 'front-lever', cat: 'hitos', rarity: 'leyenda', name: 'Horizonte', desc: 'Supera el front lever completo.', check: () => n(passed('frontlever', 'completo')) },
  { id: 'planche', cat: 'hitos', rarity: 'leyenda', name: 'Planchador', desc: 'Supera la planche straddle.', check: () => n(passed('planche', 'straddle')) },
  { id: 'back-lever', cat: 'hitos', rarity: 'leyenda', name: 'Espejo', desc: 'Supera el back lever completo.', check: () => n(passed('backlever', 'completo')) },
  { id: 'una-mano', cat: 'hitos', rarity: 'leyenda', name: 'Una sola mano', desc: 'Supera la dominada a una mano.', check: () => n(passed('dominadas', 'una-mano')) },
  { id: 'arquero', cat: 'hitos', rarity: 'oro', name: 'Arquero', desc: 'Supera las dominadas arqueras.', check: () => n(passed('dominadas', 'arqueras')) },
  { id: 'flexion-una-mano', cat: 'hitos', rarity: 'leyenda', name: 'Un brazo basta', desc: 'Supera la flexión a una mano.', check: () => n(passed('flexiones', 'una-mano')) },
  { id: 'camaron', cat: 'hitos', rarity: 'oro', name: 'Camarón', desc: 'Supera la sentadilla del camarón avanzada.', check: () => n(passed('piernas', 'camaron-avanzada')) },
  { id: 'muscle-up-estricto', cat: 'hitos', rarity: 'leyenda', name: 'Sin trampa', desc: 'Supera el muscle-up estricto.', check: () => n(passed('muscleup', 'estricto')) },
  { id: 'pino-30', cat: 'hitos', rarity: 'oro', name: 'Medio minuto boca abajo', desc: 'Supera el pino libre de 30 s.', check: () => n(passed('pino', 'libre-30')) },
  { id: 'pino-60', cat: 'hitos', rarity: 'leyenda', name: 'Un minuto al revés', desc: 'Supera el pino libre de 60 s.', check: () => n(passed('pino', 'libre-60')) },
  { id: 'hspu-libre', cat: 'hitos', rarity: 'leyenda', name: 'Prensa en el aire', desc: 'Supera la flexión de pino libre.', check: () => n(passed('hspu', 'libre')) },
  { id: 'vsit', cat: 'hitos', rarity: 'leyenda', name: 'Uve', desc: 'Supera el V-sit.', check: () => n(passed('lsit', 'vsit')) },
  { id: 'front-avanzado', cat: 'hitos', rarity: 'oro', name: 'Espalda plana', desc: 'Supera el tuck avanzado del front lever.', check: () => n(passed('frontlever', 'tuck-avanzado')) },
  { id: 'planche-avanzada', cat: 'hitos', rarity: 'oro', name: 'Vuelo rasante', desc: 'Supera el tuck avanzado de la planche.', check: () => n(passed('planche', 'tuck-avanzado')) },
  { id: 'back-tuck', cat: 'hitos', rarity: 'plata', name: 'Del revés', desc: 'Supera el tuck back lever.', check: () => n(passed('backlever', 'tuck')) },

  // Tus habilidades: la que aprendes y las que mantienes
  { id: 'foco-elegido', cat: 'habilidades', rarity: 'bronce', name: 'Con un objetivo', desc: 'Elige la habilidad que quieres aprender.', check: (st) => n(st.hasFocus) },
  { id: 'foco-10', cat: 'habilidades', rarity: 'plata', name: 'Enfocado', desc: 'Entrena 10 veces la habilidad que aprendes.', check: (st) => [st.focusSessions, 10] },
  { id: 'foco-50', cat: 'habilidades', rarity: 'oro', name: 'Obsesión sana', desc: 'Entrena 50 veces la habilidad que aprendes.', check: (st) => [st.focusSessions, 50] },
  { id: 'mantener-10', cat: 'habilidades', rarity: 'plata', name: 'Sin oxidarse', desc: 'Entrena 10 veces una habilidad para mantenerla.', check: (st) => [st.maintainSessions, 10] },
  { id: 'dominada', cat: 'habilidades', rarity: 'oro', name: 'De aprenderla a dominarla', desc: 'Completa la ruta de una habilidad y pásala a mantener.', check: (st) => n(st.mastered) },
  { id: 'equilibrista', cat: 'habilidades', rarity: 'plata', name: 'Equilibrista', desc: 'Haz 10 prácticas de «Solo pino».', check: (st) => [st.pinoPractices, 10] },
  { id: 'vive-al-reves', cat: 'habilidades', rarity: 'oro', name: 'Vive al revés', desc: 'Haz 50 prácticas de «Solo pino».', check: (st) => [st.pinoPractices, 50] },
  { id: 'trabajo-invisible', cat: 'habilidades', rarity: 'plata', name: 'Trabajo invisible', desc: 'Completa 100 series de ejercicios complementarios.', check: (st) => [st.accSets, 100] },
  { id: 'malabarista', cat: 'habilidades', rarity: 'plata', name: 'Malabarista', desc: 'Entrena 10 veces dos habilidades alternando sus series.', check: (st) => [st.altSessions, 10] },

  // Buenos hábitos
  { id: 'valorador', cat: 'habitos', rarity: 'bronce', name: 'Sincero', desc: 'Valora 50 ejercicios.', check: (st) => [st.rated, 50] },
  { id: 'estudioso', cat: 'habitos', rarity: 'bronce', name: 'Estudioso de la técnica', desc: 'Mira 10 vídeos de técnica.', check: (st) => [st.videos, 10] },
  { id: 'calentamiento', cat: 'habitos', rarity: 'plata', name: 'Nunca en frío', desc: 'Completa el calentamiento entero 10 veces.', check: (st) => [st.warmups, 10] },
  { id: 'descarga', cat: 'habitos', rarity: 'plata', name: 'Sabio del descanso', desc: 'Entrena 2 veces en una semana de descarga.', check: (st) => [st.deloadSessions, 2] },
  { id: 'perfecto', cat: 'habitos', rarity: 'plata', name: 'Sesión perfecta', desc: 'Un entreno con todos los objetivos cumplidos y valorados.', check: (st) => [st.perfect, 1] },
  { id: 'reps-1000', cat: 'habitos', rarity: 'plata', name: 'Mil repeticiones', desc: 'Acumula 1.000 repeticiones.', check: (st) => [st.reps, 1000] },
  { id: 'reps-10000', cat: 'habitos', rarity: 'oro', name: 'Diez mil', desc: 'Acumula 10.000 repeticiones.', check: (st) => [st.reps, 10000] },
  { id: 'isometrico', cat: 'habitos', rarity: 'plata', name: 'Estatua', desc: 'Acumula 30 minutos en isometrías.', check: (st) => [Math.floor(st.holdSec / 60), 30] },
  { id: 'monumento', cat: 'habitos', rarity: 'oro', name: 'Monumento', desc: 'Acumula 2 horas en isometrías.', check: (st) => [Math.floor(st.holdSec / 60), 120] },
  { id: 'reps-50000', cat: 'habitos', rarity: 'leyenda', name: 'Cincuenta mil', desc: 'Acumula 50.000 repeticiones.', check: (st) => [st.reps, 50000] },
  { id: 'juez', cat: 'habitos', rarity: 'plata', name: 'Juez justo', desc: 'Valora 250 ejercicios.', check: (st) => [st.rated, 250] },
  { id: 'diario', cat: 'habitos', rarity: 'bronce', name: 'Diario de entreno', desc: 'Escribe notas en 10 entrenos.', check: (st) => [st.notes, 10] },
  { id: 'siempre-a-punto', cat: 'habitos', rarity: 'oro', name: 'Siempre a punto', desc: 'Completa el calentamiento entero 50 veces.', check: (st) => [st.warmups, 50] },
  { id: 'perfeccionista', cat: 'habitos', rarity: 'oro', name: 'Perfeccionista', desc: '5 entrenos perfectos: todo cumplido y valorado.', check: (st) => [st.perfect, 5] },
  { id: 'mision-1', cat: 'habitos', rarity: 'bronce', name: 'A la orden', desc: 'Cumple tu primera misión de la semana.', check: (st) => [st.missions, 1] },
  { id: 'misiones-10', cat: 'habitos', rarity: 'plata', name: 'Cazador de misiones', desc: 'Cumple 10 misiones de la semana.', check: (st) => [st.missions, 10] },
  { id: 'misiones-50', cat: 'habitos', rarity: 'oro', name: 'Mercenario', desc: 'Cumple 50 misiones de la semana.', check: (st) => [st.missions, 50] },
  { id: 'creador', cat: 'habitos', rarity: 'bronce', name: 'Creador', desc: 'Crea tu primer ejercicio propio.', check: (st) => [st.customCount, 1] },
  { id: 'propio-10', cat: 'habitos', rarity: 'plata', name: 'Marca de la casa', desc: 'Entrena 10 veces con tus ejercicios propios.', check: (st) => [st.customSessions, 10] },
  { id: 'a-salvo', cat: 'habitos', rarity: 'bronce', name: 'A salvo', desc: 'Exporta una copia de tus datos.', check: (st) => [st.backups, 1] },
  { id: 'bascula', cat: 'habitos', rarity: 'bronce', name: 'En la báscula', desc: 'Apunta tu peso corporal 4 veces.', check: (st) => [st.bodyLogs, 4] },

  // Secretos: no se ve qué piden hasta conseguirlos, solo una pista.
  { id: 'ano-nuevo', cat: 'secretos', secret: true, rarity: 'oro', name: 'Año nuevo, héroe nuevo', desc: 'Entrena el 1 de enero.', hint: 'Empieza el año con buen pie.', check: (st) => n(st.newYear) },
  { id: 'navidad', cat: 'secretos', secret: true, rarity: 'plata', name: 'Turrón quemado', desc: 'Entrena el 25 de diciembre.', hint: 'Un día de fiesta muy especial.', check: (st) => n(st.xmas) },
  { id: 'viernes-13', cat: 'secretos', secret: true, rarity: 'plata', name: 'Sin supersticiones', desc: 'Entrena un viernes 13.', hint: 'Hay quien ese día no sale de casa.', check: (st) => n(st.friday13) },
  { id: 'vampiro', cat: 'secretos', secret: true, rarity: 'plata', name: 'Vampiro', desc: 'Empieza un entreno entre la 1 y las 5 de la madrugada.', hint: 'Cuando todos duermen.', check: (st) => n(st.vampire) },
  { id: 'doble-racion', cat: 'secretos', secret: true, rarity: 'plata', name: 'Doble ración', desc: 'Haz dos entrenos el mismo día (sin contar «Solo pino»).', hint: 'Una vez no fue suficiente.', check: (st) => n(st.doubleDay) },
  { id: 'regreso', cat: 'secretos', secret: true, rarity: 'plata', name: 'El regreso', desc: 'Vuelve a entrenar tras 30 días o más sin hacerlo.', hint: 'Todo héroe vuelve.', check: (st) => n(st.comeback) },
  { id: 'paseo', cat: 'secretos', secret: true, rarity: 'plata', name: 'Paseo militar', desc: 'Valora «Fácil» todos los ejercicios de un entreno (al menos 4).', hint: 'Hoy nada te ha costado.', check: (st) => n(st.allEasy) },
  { id: 'guerra', cat: 'secretos', secret: true, rarity: 'oro', name: 'Día de guerra', desc: 'Valora «Difícil» todos los ejercicios de un entreno (al menos 4) y termínalo.', hint: 'Hoy todo te ha costado, y aun así acabaste.', check: (st) => n(st.allHard) },
  { id: 'expres', cat: 'secretos', secret: true, rarity: 'plata', name: 'Exprés', desc: 'Un entreno de 20 minutos o menos con 10 series o más.', hint: 'Rápido, pero completo.', check: (st) => n(st.express) },
  { id: 'sin-reloj', cat: 'secretos', secret: true, rarity: 'oro', name: 'Sin reloj', desc: 'Un entreno de 2 horas o más.', hint: 'Se te fue la tarde.', check: (st) => n(st.endless) },
  { id: 'triple-salto', cat: 'secretos', secret: true, rarity: 'oro', name: 'Triple salto', desc: 'Sube de paso en 3 rutas en un mismo entreno.', hint: 'Un día de los buenos.', check: (st) => n(st.tripleJump) },
  { id: 'cosquillas', cat: 'secretos', secret: true, rarity: 'bronce', name: '¡Cosquillas!', desc: 'Toca a tu héroe 10 veces.', hint: 'Tu héroe es muy sensible.', check: (st) => [st.pokes, 10] },
  { id: 'lado-oscuro', cat: 'secretos', secret: true, rarity: 'bronce', name: 'El lado oscuro', desc: 'Cambia entre el modo claro y el oscuro 10 veces.', hint: 'Ni de día ni de noche.', check: (st) => [st.themeFlips, 10] },
  { id: 'bautizo', cat: 'secretos', secret: true, rarity: 'bronce', name: 'Bautizo', desc: 'Ponle nombre a tu héroe.', hint: 'Todo héroe necesita un nombre.', check: (st) => n(st.named) },
  { id: 'pasarela', cat: 'secretos', secret: true, rarity: 'plata', name: 'Pasarela', desc: 'Lleva algo puesto en todas las ranuras del equipo a la vez.', hint: 'Vístete para la ocasión.', check: (st) => n(st.fashion) },
];

export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export function achievementStatus(state, st = gameStats(state)) {
  const unlocked = state.game?.unlocked || {};
  return ACHIEVEMENTS.map((a) => {
    const [cur, goal] = a.check(st);
    return {
      ...a,
      current: Math.min(cur, goal),
      goal,
      done: !!unlocked[a.id],
      ready: cur >= goal,
      date: unlocked[a.id] || null,
      reward: ITEMS.find((it) => it.unlock?.ach === a.id) || null,
    };
  });
}

// ─────────────────────────────── Artículos ───────────────────────────────

export const SLOTS = {
  head: 'Cabeza', face: 'Cara', top: 'Camiseta', neck: 'Cuello', wrists: 'Muñecas',
  bottom: 'Pantalón', feet: 'Zapatillas', back: 'Espalda', aura: 'Aura', pet: 'Mascota',
};

export const ITEMS = [
  { id: 'top-blanca', slot: 'top', name: 'Camiseta blanca', color: '#ffffff', unlock: null },
  { id: 'top-negra', slot: 'top', name: 'Camiseta negra', color: '#1d1a24', unlock: { level: 2 } },
  { id: 'top-rosa', slot: 'top', name: 'Camiseta rosa', color: '#ff2d87', unlock: { level: 4 } },
  { id: 'top-cian', slot: 'top', name: 'Camiseta cian', color: '#18e0ff', unlock: { ach: 'semana-completa' } },
  { id: 'top-amarilla', slot: 'top', name: 'Camiseta amarilla', color: '#ffe500', unlock: { level: 9 } },
  { id: 'top-dorada', slot: 'top', name: 'Camiseta dorada', color: '#e8b923', unlock: { ach: 'centenario' } },
  { id: 'top-verde', slot: 'top', name: 'Camiseta verde', color: '#3ccf5a', unlock: { level: 10 } },
  { id: 'top-morada', slot: 'top', name: 'Camiseta morada', color: '#8b4dff', unlock: { ach: 'cincuenta' } },
  { id: 'top-naranja', slot: 'top', name: 'Camiseta naranja', color: '#ff8a1f', unlock: { ach: 'bautizo' } },
  { id: 'top-rayas', slot: 'top', name: 'Camiseta a rayas', color: '#ff3b5c', unlock: { ach: 'trotamundos' } },

  { id: 'short-negro', slot: 'bottom', name: 'Pantalón negro', color: '#1d1a24', unlock: null },
  { id: 'short-azul', slot: 'bottom', name: 'Pantalón azul', color: '#3b5bff', unlock: { level: 3 } },
  { id: 'short-rojo', slot: 'bottom', name: 'Pantalón rojo', color: '#ff3b3b', unlock: { level: 6 } },
  { id: 'short-rosa', slot: 'bottom', name: 'Pantalón rosa', color: '#ff2d87', unlock: { ach: 'explorador' } },
  { id: 'short-verde', slot: 'bottom', name: 'Pantalón verde', color: '#2fae4c', unlock: { ach: 'fin-de-semana' } },
  { id: 'short-blanco', slot: 'bottom', name: 'Pantalón blanco', color: '#f4f1e8', unlock: { ach: 'doble-racion' } },
  { id: 'short-dorado', slot: 'bottom', name: 'Pantalón dorado', color: '#e8b923', unlock: { level: 18 } },

  { id: 'zapas-blancas', slot: 'feet', name: 'Zapatillas blancas', color: '#ffffff', unlock: null },
  { id: 'zapas-cian', slot: 'feet', name: 'Zapatillas cian', color: '#18e0ff', unlock: { level: 5 } },
  { id: 'zapas-rosas', slot: 'feet', name: 'Zapatillas rosas', color: '#ff2d87', unlock: { ach: 'pistol' } },
  { id: 'zapas-doradas', slot: 'feet', name: 'Zapatillas doradas', color: '#e8b923', unlock: { level: 15 } },
  { id: 'zapas-negras', slot: 'feet', name: 'Zapatillas negras', color: '#26222e', unlock: { level: 13 } },
  { id: 'zapas-verdes', slot: 'feet', name: 'Zapatillas verdes', color: '#3ccf5a', unlock: { ach: 'expres' } },
  { id: 'zapas-fuego', slot: 'feet', name: 'Zapatillas de fuego', color: '#ff6a00', unlock: { ach: 'mes-12' } },

  { id: 'munequeras-amarillas', slot: 'wrists', name: 'Muñequeras amarillas', color: '#ffe500', unlock: { level: 2 } },
  { id: 'munequeras-rosas', slot: 'wrists', name: 'Muñequeras rosas', color: '#ff2d87', unlock: { ach: 'primera-dominada' } },
  { id: 'munequeras-cian', slot: 'wrists', name: 'Muñequeras cian', color: '#18e0ff', unlock: { ach: 'pino-libre' } },
  { id: 'munequeras-negras', slot: 'wrists', name: 'Muñequeras negras', color: '#26222e', unlock: { ach: 'guerra' } },
  { id: 'munequeras-doradas', slot: 'wrists', name: 'Muñequeras doradas', color: '#ffd23f', unlock: { ach: 'muscle-up-estricto' } },

  { id: 'cinta-roja', slot: 'head', name: 'Cinta roja', color: '#ff3b3b', unlock: { level: 3 } },
  { id: 'cinta-cian', slot: 'head', name: 'Cinta cian', color: '#18e0ff', unlock: { ach: 'madrugador' } },
  { id: 'gorra', slot: 'head', name: 'Gorra', color: '#ffe500', unlock: { level: 7 } },
  { id: 'corona', slot: 'head', name: 'Corona', color: '#ffd23f', unlock: { ach: 'una-mano' } },
  { id: 'gorro', slot: 'head', name: 'Gorro de lana', color: '#3b5bff', unlock: { level: 11 } },
  { id: 'gorro-navidad', slot: 'head', name: 'Gorro de Navidad', color: '#e0002a', unlock: { ach: 'navidad' } },
  { id: 'auriculares', slot: 'head', name: 'Auriculares', color: '#ff2d87', unlock: { level: 14 } },
  { id: 'casco-vikingo', slot: 'head', name: 'Casco vikingo', color: '#9aa3b5', unlock: { ach: 'regreso' } },
  { id: 'halo', slot: 'head', name: 'Halo', color: '#ffe500', unlock: { ach: 'nivel-30' } },

  { id: 'gafas-sol', slot: 'face', name: 'Gafas de sol', color: '#050507', unlock: { level: 8 } },
  { id: 'gafas-estrella', slot: 'face', name: 'Gafas de estrella', color: '#ff2d87', unlock: { ach: 'estudioso' } },
  { id: 'antifaz', slot: 'face', name: 'Antifaz', color: '#6b2bff', unlock: { ach: 'nocturno' } },
  { id: 'parche', slot: 'face', name: 'Parche pirata', color: '#050507', unlock: { ach: 'viernes-13' } },
  { id: 'bigote', slot: 'face', name: 'Bigote de sabio', color: '#5b3a22', unlock: { ach: 'diario' } },
  { id: 'visor', slot: 'face', name: 'Visor', color: '#18e0ff', unlock: { ach: 'records-25' } },

  { id: 'medalla-bronce', slot: 'neck', name: 'Medalla de bronce', color: '#cd7f32', unlock: { ach: 'racha-4' } },
  { id: 'medalla-plata', slot: 'neck', name: 'Medalla de plata', color: '#c9d1e0', unlock: { ach: 'perfeccionista' } },
  { id: 'medalla-oro', slot: 'neck', name: 'Medalla de oro', color: '#ffd23f', unlock: { ach: 'racha-12' } },
  { id: 'toalla', slot: 'neck', name: 'Toalla', color: '#f4f1e8', unlock: { ach: 'foco-10' } },
  { id: 'cadena', slot: 'neck', name: 'Cadena de oro', color: '#ffd23f', unlock: { ach: 'racha-26' } },

  { id: 'capa-cian', slot: 'back', name: 'Capa cian', color: '#18e0ff', unlock: { level: 12 } },
  { id: 'capa-rosa', slot: 'back', name: 'Capa rosa', color: '#ff2d87', unlock: { ach: 'muscle-up' } },
  { id: 'capa-negra', slot: 'back', name: 'Capa negra', color: '#1d1a24', unlock: { ach: 'front-lever' } },
  { id: 'capa-dorada', slot: 'back', name: 'Capa dorada', color: '#e8b923', unlock: { ach: 'ruta-completa' } },
  { id: 'capa-roja', slot: 'back', name: 'Capa roja', color: '#e0002a', unlock: { level: 16 } },
  { id: 'capa-morada', slot: 'back', name: 'Capa morada', color: '#8b4dff', unlock: { ach: 'rutas-3' } },
  { id: 'alas', slot: 'back', name: 'Alas', color: '#f4f1e8', unlock: { ach: 'triple-salto' } },
  { id: 'alas-oscuras', slot: 'back', name: 'Alas oscuras', color: '#3a2a55', unlock: { ach: 'lado-oscuro' } },

  { id: 'aura-rayos', slot: 'aura', name: 'Aura de rayos', color: '#18e0ff', unlock: { ach: 'subidas-10' } },
  { id: 'aura-fuego', slot: 'aura', name: 'Aura de fuego', color: '#ff6a00', unlock: { ach: 'maraton' } },
  { id: 'aura-dorada', slot: 'aura', name: 'Aura dorada', color: '#ffd23f', unlock: { level: 20 } },
  { id: 'aura-verde', slot: 'aura', name: 'Aura verde', color: '#3cff7a', unlock: { ach: 'ano-nuevo' } },
  { id: 'aura-morada', slot: 'aura', name: 'Aura morada', color: '#a46bff', unlock: { ach: 'horas-100' } },
  { id: 'aura-sombra', slot: 'aura', name: 'Aura de sombra', color: '#5b2a8a', unlock: { ach: 'sin-reloj' } },
  { id: 'aura-arcoiris', slot: 'aura', name: 'Aura arcoíris', color: '#ff2d87', rainbow: true, unlock: { ach: 'doscientos' } },

  // Mascotas: te acompañan al lado del héroe.
  { id: 'gato', slot: 'pet', name: 'Gato', color: '#ff9a3d', unlock: { level: 6 } },
  { id: 'perro', slot: 'pet', name: 'Perro', color: '#c98a5e', unlock: { ach: 'misiones-10' } },
  { id: 'pollito', slot: 'pet', name: 'Pollito', color: '#ffe500', unlock: { ach: 'equilibrista' } },
  { id: 'slime', slot: 'pet', name: 'Slime', color: '#3cff7a', unlock: { ach: 'cosquillas' } },
  { id: 'fantasma', slot: 'pet', name: 'Fantasma', color: '#f4f1e8', unlock: { ach: 'vampiro' } },
  { id: 'dragon', slot: 'pet', name: 'Dragón', color: '#ff3b5c', unlock: { ach: 'misiones-50' } },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const DEFAULT_EQUIP = { top: 'top-blanca', bottom: 'short-negro', feet: 'zapas-blancas' };

export function itemUnlocked(item, state, level) {
  if (!item.unlock) return true;
  if (item.unlock.level) return level >= item.unlock.level;
  if (item.unlock.ach) return !!state.game?.unlocked?.[item.unlock.ach];
  return false;
}

export function unlockText(item) {
  if (!item.unlock) return 'Inicial';
  if (item.unlock.level) return `Nivel ${item.unlock.level}`;
  const a = ACH_BY_ID[item.unlock.ach];
  return a?.secret ? 'Logro secreto' : `Logro «${a?.name}»`;
}

export function equipped(state) {
  return { ...DEFAULT_EQUIP, ...(state.game?.equipped || {}) };
}

// ─────────────────────────────── Sincronización ───────────────────────────────

// Marca los logros recién conseguidos y devuelve sus ids (para celebrarlos).
export function syncAchievements(s) {
  s.game ||= {};
  s.game.unlocked ||= {};
  const st = gameStats(s);
  const now = new Date().toISOString();
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (s.game.unlocked[a.id]) continue;
    const [cur, goal] = a.check(st);
    if (cur >= goal) {
      s.game.unlocked[a.id] = now;
      fresh.push(a.id);
    }
  }
  return fresh;
}

// Artículos que se desbloquean al pasar de nivel o con los logros indicados.
export function itemsUnlockedBy(levelBefore, levelAfter, achIds) {
  return ITEMS.filter((it) => it.unlock && (
    (it.unlock.ach && achIds.includes(it.unlock.ach))
    || (it.unlock.level && it.unlock.level > levelBefore && it.unlock.level <= levelAfter)
  )).map((it) => it.id);
}
