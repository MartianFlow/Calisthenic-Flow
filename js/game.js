// Gamificación: experiencia (XP), nivel de jugador, atributos del héroe,
// logros y artículos desbloqueables.
//
// La XP y los atributos se calculan a partir del historial (no se guardan), así
// nunca se descuadran. Solo se guarda qué logros se desbloquearon y cuándo.

import { ROADMAP_BY_ID } from './data/roadmaps.js';
import { getProgress } from './store.js';
import { globalProgress, startOfWeek } from './logic.js';

// ─────────────────────────────── XP y nivel ───────────────────────────────

export const XP_RULES = {
  session: 40,       // por entreno terminado
  set: 4,            // por serie completada
  rated: 3,          // por ejercicio valorado
  minute: 1,         // por minuto (máx. 60 por sesión)
  levelUp: 120,      // por subir de paso en una ruta
  routeDone: 600,    // por completar una ruta
  loadUp: 30,        // por subir el peso en un ejercicio de gimnasio
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
  return state.sessions.reduce((a, s) => a + sessionXP(s).total, 0) + achievementXP(state);
}

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

// Subidas de peso en los ejercicios de gimnasio (del historial).
export function loadUpCount(state) {
  return state.sessions.reduce((a, s) => a + s.items.filter((it) => it.outcome?.kind === 'load-up').length, 0);
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
    perfect: s.filter((x) => x.items.filter((it) => !it.acc).length >= 3 && x.items.every((it) => it.acc || (it.goalMet && it.rating))).length,
    legDays: s.filter((x) => x.items.some((it) => it.liftId)).length,
    loadUps: loadUpCount(state),
    videos: state.game?.videosWatched || 0,
    map: globalProgress(),
  };
}

// ─────────────────────────────── Logros ───────────────────────────────
// check(st) → [actual, meta]. Se desbloquea cuando actual ≥ meta.

const n = (v) => [v ? 1 : 0, 1];

export const ACH_CATEGORIES = {
  constancia: 'Constancia',
  progreso: 'Progreso',
  hitos: 'Hitos de calistenia',
  habitos: 'Buenos hábitos',
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

  // Progreso
  { id: 'subida-1', cat: 'progreso', rarity: 'bronce', name: '¡Nivel arriba!', desc: 'Supera tu primer paso en una ruta.', check: (st) => [st.levelUps, 1] },
  { id: 'subidas-10', cat: 'progreso', rarity: 'plata', name: 'Escalador', desc: 'Supera 10 pasos.', check: (st) => [st.levelUps, 10] },
  { id: 'subidas-50', cat: 'progreso', rarity: 'oro', name: 'Cumbre', desc: 'Supera 50 pasos.', check: (st) => [st.levelUps, 50] },
  { id: 'ruta-completa', cat: 'progreso', rarity: 'oro', name: 'Fin de ruta', desc: 'Completa una ruta entera.', check: (st) => [st.routesDone, 1] },
  { id: 'mapa-25', cat: 'progreso', rarity: 'plata', name: 'Cartógrafo', desc: 'Completa el 25 % del mapa.', check: (st) => [st.map, 25] },
  { id: 'mapa-50', cat: 'progreso', rarity: 'oro', name: 'Medio mundo', desc: 'Completa el 50 % del mapa.', check: (st) => [st.map, 50] },
  { id: 'explorador', cat: 'progreso', rarity: 'plata', name: 'Explorador', desc: 'Entrena 8 rutas distintas.', check: (st) => [st.routes, 8] },
  { id: 'mas-peso', cat: 'progreso', rarity: 'plata', name: 'Más discos', desc: 'Sube el peso 10 veces en ejercicios de pierna.', check: (st) => [st.loadUps, 10] },

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

  // Buenos hábitos
  { id: 'valorador', cat: 'habitos', rarity: 'bronce', name: 'Sincero', desc: 'Valora 50 ejercicios.', check: (st) => [st.rated, 50] },
  { id: 'estudioso', cat: 'habitos', rarity: 'bronce', name: 'Estudioso de la técnica', desc: 'Mira 10 vídeos de técnica.', check: (st) => [st.videos, 10] },
  { id: 'calentamiento', cat: 'habitos', rarity: 'plata', name: 'Nunca en frío', desc: 'Completa el calentamiento entero 10 veces.', check: (st) => [st.warmups, 10] },
  { id: 'descarga', cat: 'habitos', rarity: 'plata', name: 'Sabio del descanso', desc: 'Entrena 2 veces en una semana de descarga.', check: (st) => [st.deloadSessions, 2] },
  { id: 'perfecto', cat: 'habitos', rarity: 'plata', name: 'Sesión perfecta', desc: 'Un entreno con todos los objetivos cumplidos y valorados.', check: (st) => [st.perfect, 1] },
  { id: 'reps-1000', cat: 'habitos', rarity: 'plata', name: 'Mil repeticiones', desc: 'Acumula 1.000 repeticiones.', check: (st) => [st.reps, 1000] },
  { id: 'reps-10000', cat: 'habitos', rarity: 'oro', name: 'Diez mil', desc: 'Acumula 10.000 repeticiones.', check: (st) => [st.reps, 10000] },
  { id: 'isometrico', cat: 'habitos', rarity: 'plata', name: 'Estatua', desc: 'Acumula 30 minutos en isometrías.', check: (st) => [Math.floor(st.holdSec / 60), 30] },
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
  bottom: 'Pantalón', feet: 'Zapatillas', back: 'Espalda', aura: 'Aura',
};

export const ITEMS = [
  { id: 'top-blanca', slot: 'top', name: 'Camiseta blanca', color: '#ffffff', unlock: null },
  { id: 'top-negra', slot: 'top', name: 'Camiseta negra', color: '#1d1a24', unlock: { level: 2 } },
  { id: 'top-rosa', slot: 'top', name: 'Camiseta rosa', color: '#ff2d87', unlock: { level: 4 } },
  { id: 'top-cian', slot: 'top', name: 'Camiseta cian', color: '#18e0ff', unlock: { ach: 'semana-completa' } },
  { id: 'top-amarilla', slot: 'top', name: 'Camiseta amarilla', color: '#ffe500', unlock: { level: 9 } },
  { id: 'top-dorada', slot: 'top', name: 'Camiseta dorada', color: '#e8b923', unlock: { ach: 'centenario' } },

  { id: 'short-negro', slot: 'bottom', name: 'Pantalón negro', color: '#1d1a24', unlock: null },
  { id: 'short-azul', slot: 'bottom', name: 'Pantalón azul', color: '#3b5bff', unlock: { level: 3 } },
  { id: 'short-rojo', slot: 'bottom', name: 'Pantalón rojo', color: '#ff3b3b', unlock: { level: 6 } },
  { id: 'short-rosa', slot: 'bottom', name: 'Pantalón rosa', color: '#ff2d87', unlock: { ach: 'explorador' } },

  { id: 'zapas-blancas', slot: 'feet', name: 'Zapatillas blancas', color: '#ffffff', unlock: null },
  { id: 'zapas-cian', slot: 'feet', name: 'Zapatillas cian', color: '#18e0ff', unlock: { level: 5 } },
  { id: 'zapas-rosas', slot: 'feet', name: 'Zapatillas rosas', color: '#ff2d87', unlock: { ach: 'pistol' } },
  { id: 'zapas-doradas', slot: 'feet', name: 'Zapatillas doradas', color: '#e8b923', unlock: { level: 15 } },

  { id: 'munequeras-amarillas', slot: 'wrists', name: 'Muñequeras amarillas', color: '#ffe500', unlock: { level: 2 } },
  { id: 'munequeras-rosas', slot: 'wrists', name: 'Muñequeras rosas', color: '#ff2d87', unlock: { ach: 'primera-dominada' } },
  { id: 'munequeras-cian', slot: 'wrists', name: 'Muñequeras cian', color: '#18e0ff', unlock: { ach: 'pino-libre' } },

  { id: 'cinta-roja', slot: 'head', name: 'Cinta roja', color: '#ff3b3b', unlock: { level: 3 } },
  { id: 'cinta-cian', slot: 'head', name: 'Cinta cian', color: '#18e0ff', unlock: { ach: 'madrugador' } },
  { id: 'gorra', slot: 'head', name: 'Gorra', color: '#ffe500', unlock: { level: 7 } },
  { id: 'corona', slot: 'head', name: 'Corona', color: '#ffd23f', unlock: { ach: 'una-mano' } },

  { id: 'gafas-sol', slot: 'face', name: 'Gafas de sol', color: '#050507', unlock: { level: 8 } },
  { id: 'gafas-estrella', slot: 'face', name: 'Gafas de estrella', color: '#ff2d87', unlock: { ach: 'estudioso' } },
  { id: 'antifaz', slot: 'face', name: 'Antifaz', color: '#6b2bff', unlock: { ach: 'nocturno' } },

  { id: 'medalla-bronce', slot: 'neck', name: 'Medalla de bronce', color: '#cd7f32', unlock: { ach: 'racha-4' } },
  { id: 'medalla-oro', slot: 'neck', name: 'Medalla de oro', color: '#ffd23f', unlock: { ach: 'racha-12' } },

  { id: 'capa-cian', slot: 'back', name: 'Capa cian', color: '#18e0ff', unlock: { level: 12 } },
  { id: 'capa-rosa', slot: 'back', name: 'Capa rosa', color: '#ff2d87', unlock: { ach: 'muscle-up' } },
  { id: 'capa-negra', slot: 'back', name: 'Capa negra', color: '#1d1a24', unlock: { ach: 'front-lever' } },
  { id: 'capa-dorada', slot: 'back', name: 'Capa dorada', color: '#e8b923', unlock: { ach: 'ruta-completa' } },

  { id: 'aura-rayos', slot: 'aura', name: 'Aura de rayos', color: '#18e0ff', unlock: { ach: 'subidas-10' } },
  { id: 'aura-fuego', slot: 'aura', name: 'Aura de fuego', color: '#ff6a00', unlock: { ach: 'maraton' } },
  { id: 'aura-dorada', slot: 'aura', name: 'Aura dorada', color: '#ffd23f', unlock: { level: 20 } },
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
  return `Logro «${ACH_BY_ID[item.unlock.ach]?.name}»`;
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
