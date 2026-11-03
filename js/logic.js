// Lógica de entrenamiento: generación de rutinas, subida de nivel y estadísticas.

import { ROADMAPS, ROADMAP_BY_ID, DAY_TEMPLATES, WARMUP } from './data/roadmaps.js';
import { LIFT_BY_ID, LEG_DAYS, LEG_WARMUP } from './data/gym.js';
import { getState, getProgress, update } from './store.js';
import { fmtKg } from './ui.js';

const MAX_REASONABLE_SESSION = 3 * 60 * 60 * 1000;

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function stepOf(id) {
  const roadmap = ROADMAP_BY_ID[id];
  const progress = getProgress(id);
  return { roadmap, step: roadmap.steps[progress.step], index: progress.step, progress };
}

export const isLift = (id) => !!LIFT_BY_ID[id];

// Nombre del ejercicio de un ítem de entreno (paso de una ruta o ejercicio de gimnasio).
export function itemName(item) {
  if (item.liftId) return LIFT_BY_ID[item.liftId]?.name || item.liftId;
  return ROADMAP_BY_ID[item.roadmapId]?.steps[item.stepIndex]?.name || '';
}

// Días con trabajo de torso (donde van las habilidades).
export const TORSO_TYPES = ['A', 'B', 'TA', 'TB'];
export const isGymLegs = (state) => state.settings.legs === 'gym';

// Rutinas del plan para elegir en la pantalla Hoy (Día A, Día B, Día S / Torso A, Torso B, Pierna).
export function dayOrder(state) {
  if (isGymLegs(state)) return ['TA', 'TB', 'P'];
  return state.settings.goals.length ? ['A', 'B', 'S'] : ['A', 'B'];
}

// Siguiente día cuando no hay plan semanal: alterna A/B, o torso/pierna con los
// torsos alternando TA/TB.
export function nextDayType(state) {
  if (isGymLegs(state)) {
    if (state.lastDayType === 'TA' || state.lastDayType === 'TB') return 'P';
    const lastTorso = [...state.sessions].reverse().find((s) => s.dayType === 'TA' || s.dayType === 'TB');
    return lastTorso?.dayType === 'TA' ? 'TB' : 'TA';
  }
  return state.lastDayType === 'A' ? 'B' : 'A';
}

// ─────────────────────────── Habilidades: foco y mantenimiento ───────────────────────────
// · Foco: la habilidad que se aprende. Va en todos los días que permite su tipo (brazos
//   rectos, flexión de pino y muscle-up: 3 días como mucho y nunca seguidos) y con el
//   volumen completo del paso.
// · Mantener (hasta 2): las que ya se dominan. 1–2 días por semana, una por sesión y como
//   mucho 3 series de calidad del paso actual (dosis de mantenimiento: Spiering 2021,
//   Bickel 2011). Siguen progresando con la misma lógica.
// · El pino es una práctica corta (5–10 min) al principio y no cuenta en el límite de 2
//   habilidades por sesión. Si es el foco, va en todos los días de entreno.
// · Back lever y planche no van en la misma sesión (las dos cargan el bíceps con el brazo recto).
export const MAX_SKILLS_PER_SESSION = 2;
export const PRACTICE_ID = 'pino';
export const MAINTAIN_SETS = 3;
const CLASH = { backlever: 'planche', planche: 'backlever' };
export const clashes = (id, list) => list.some((x) => CLASH[x] === id);

export function skillPicks(state) {
  const st = state.settings;
  const ok = (id) => ROADMAP_BY_ID[id]?.category === 'habilidad';
  const focus = ok(st.focus) ? st.focus : null;
  const maintain = (st.maintain || []).filter((id) => ok(id) && id !== focus).slice(0, 2);
  return { focus, maintain };
}

// 'foco' | 'mantener' | null
export function skillRole(state, id) {
  const { focus, maintain } = skillPicks(state);
  if (id === focus) return 'foco';
  return maintain.includes(id) ? 'mantener' : null;
}

// Series previstas de un paso: las de mantenimiento, como mucho 3; en descarga, una menos.
export function plannedSets(state, id, step, deload = false) {
  const sets = skillRole(state, id) === 'mantener' ? Math.min(MAINTAIN_SETS, step.sets) : step.sets;
  return deload ? Math.max(2, sets - 1) : sets;
}

// Prerrequisitos que le faltan a la habilidad de foco (los básicos que le acercan).
export function focusMissing(state) {
  const { focus } = skillPicks(state);
  if (!focus) return [];
  return prereqStatus(ROADMAP_BY_ID[focus]).filter((p) => !p.ok);
}

// Orden de los básicos del día: los que le faltan al foco van primero (salvo el core, que
// sigue al final), para que lleguen antes a lo que pide la habilidad.
export function prioritizeBase(state, ids) {
  const need = new Set(focusMissing(state).map((p) => p.roadmap.id).filter((id) => id !== 'core'));
  if (!need.size) return ids;
  return [...ids.filter((id) => need.has(id)), ...ids.filter((id) => !need.has(id))];
}

// De más fácil de empezar a más difícil (criterio propio: el pino y el L-sit piden poca base).
const SKILL_EASE = ['pino', 'lsit', 'frontlever', 'backlever', 'muscleup', 'hspu', 'planche'];

// Habilidades recomendadas para empezar (para quien aún no domina ninguna): las que ya puede
// entrenar por sus prerrequisitos, de más fácil a más difícil, o si no, las más cercanas.
export function recommendedSkills(state, max = 3) {
  const skills = ROADMAPS.filter((r) => r.category === 'habilidad' && !getProgress(r.id).done);
  const gap = (r) => (r.prereq || []).reduce((a, q) => a + Math.max(0, q.step - getProgress(q.id).step), 0);
  const ease = (r) => { const i = SKILL_EASE.indexOf(r.id); return i < 0 ? 99 : i; };
  const ready = skills.filter((r) => gap(r) === 0).sort((a, b) => ease(a) - ease(b));
  const near = skills.filter((r) => gap(r) > 0).sort((a, b) => gap(a) - gap(b) || ease(a) - ease(b));
  return [...ready, ...near].slice(0, ready.length >= 2 ? Math.min(max, ready.length) : 2).map((r) => r.id);
}

// ¿Aún no domina ninguna habilidad? (sin ninguna de mantener ni rutas de habilidad completadas)
export function noSkillsYet(state) {
  if (skillPicks(state).maintain.length) return false;
  return !ROADMAPS.some((r) => r.category === 'habilidad' && getProgress(r.id).done);
}

// Habilidades de una sesión sin plan semanal: pino (si es el foco, en todas), el foco y, por
// turnos entre sesiones, una de mantener (cada una sale más o menos una sesión de cada dos).
export function sessionGoals(state, dayType = 'A') {
  const { focus, maintain } = skillPicks(state);
  const torso = dayType === 'S' || TORSO_TYPES.includes(dayType);
  const out = [];
  if (focus === PRACTICE_ID) out.push(PRACTICE_ID);
  if (!torso) return out;
  const n = state.sessions.filter((s) => s.dayType === 'S' || TORSO_TYPES.includes(s.dayType)).length;
  if (maintain.includes(PRACTICE_ID) && n % 2 === 1) out.push(PRACTICE_ID);
  const others = maintain.filter((id) => id !== PRACTICE_ID);
  const slots = others.length >= 2 ? others : others.length ? [others[0], null] : [];
  const m = slots.length ? slots[n % slots.length] : null;
  const main = focus && focus !== PRACTICE_ID ? focus : null;
  if (main && m && CLASH[m] === main) {
    // Back lever y planche no se juntan: una de cada tres veces la de mantener ocupa el sitio del foco.
    out.push(n % 3 === 2 ? m : main);
    return out;
  }
  if (main) out.push(main);
  if (m) out.push(m);
  return out;
}

export function defaultIds(state, dayType) {
  const ids = sessionGoals(state, dayType);
  const base = LEG_DAYS[dayType] ? LEG_DAYS[dayType].ids : dayType === 'S' ? ['core'] : DAY_TEMPLATES[dayType]?.ids || [];
  for (const id of prioritizeBase(state, base)) if (!ids.includes(id)) ids.push(id);
  return ids;
}

// Plan del próximo entreno: el personalizado si existe, si no el de la plantilla.
export function currentPlan(state) {
  if (state.plan && state.plan.ids?.length) return state.plan;
  const dayType = nextDayType(state);
  return { dayType, ids: defaultIds(state, dayType), custom: false };
}

export function lastPerformance(state, roadmapId, stepIndex) {
  for (let i = state.sessions.length - 1; i >= 0; i--) {
    const item = state.sessions[i].items.find((x) => x.roadmapId === roadmapId && x.stepIndex === stepIndex);
    if (item && item.sets.length) return item.sets;
  }
  return null;
}

// Último registro de un ejercicio de gimnasio: { sets: reps[], loads: kg[] }.
export function lastLift(state, liftId) {
  for (let i = state.sessions.length - 1; i >= 0; i--) {
    const item = state.sessions[i].items.find((x) => x.liftId === liftId);
    if (item && item.sets.length) return { sets: item.sets, loads: item.loads || [] };
  }
  return null;
}

export function estimateMinutes(state, ids, withWarmup = state.settings.warmup) {
  let sec = withWarmup ? 6 * 60 : 0;
  for (const id of ids) {
    const lift = LIFT_BY_ID[id];
    if (lift) {
      sec += lift.sets * (((lift.min + lift.max) / 2) * 3.5 + 25) + (lift.sets - 1) * restSeconds(state, lift.rest) + 90;
      continue;
    }
    if (!ROADMAP_BY_ID[id]) continue;
    const { roadmap, step } = stepOf(id);
    const work = step.type === 'hold' ? step.target : step.target * 3;
    const sides = step.side ? 2 : 1;
    const sets = plannedSets(state, id, step);
    sec += sets * (work * sides + 20) + (sets - 1) * restSeconds(state, restFor(roadmap, step)) + 90;
  }
  return Math.max(5, Math.round(sec / 60 / 5) * 5);
}

// ─────────────────────── Objetivo de trabajo (progresión doble) ───────────────────────
//
// Cada paso tiene una META (p. ej. 3 × 8). Hasta llegar a ella se trabaja con un
// OBJETIVO DE HOY que empieza en ~60 % de la meta y sube según cómo valores el ejercicio:
//   · Fácil   → sube mucho   · Normal → sube un poco   · Difícil → se mantiene
// Al alcanzar la meta: Fácil = pasas al siguiente ejercicio de la escala;
// Normal = cuenta como sesión superada (al llegar a N subes de nivel);
// Difícil = consolidas ese nivel antes de avanzar.

// La valoración equivale a las repeticiones que quedaban en reserva (RIR):
// Fácil ≥ 3 · Normal 1–2 (zona ideal) · Difícil 0 o técnica rota.
export const RATINGS = {
  facil: { label: 'Fácil', hint: 'Me sobraban 3+ reps' },
  normal: { label: 'Normal', hint: 'Me quedaban 1–2' },
  dificil: { label: 'Difícil', hint: 'Sin margen o perdí técnica' },
};

export function defaultWork(step) {
  return Math.max(1, Math.round(step.target * 0.6));
}

// Descanso que se usa de verdad: el fijo de Ajustes o el recomendado para el ejercicio.
export function restSeconds(state, recommended) {
  return state.settings.restMode === 'auto' ? recommended : state.settings.restSec;
}

// Descanso recomendado según el paso (la investigación desaconseja un valor fijo por ruta).
export function restFor(roadmap, step) {
  if (step.rest) return step.rest;
  if (roadmap.id === 'core') return 60;
  if (step.type === 'hold') return roadmap.straightArm ? 150 : 75;
  if (step.side && roadmap.id === 'piernas') return step.target <= 5 ? 150 : 90;
  if (step.target <= 5) return 180;
  if (step.target <= 12) return ['dominadas', 'fondos', 'muscleup', 'hspu'].includes(roadmap.id) ? 120 : 90;
  return 75;
}

// Cuánto sube el objetivo por serie según la valoración.
export function increment(step, roadmap, rating, goal) {
  if (step.type !== 'hold') return rating === 'facil' ? 2 : 1;
  if (roadmap.straightArm) return rating === 'facil' ? 2 : 1; // tendones: poco a poco
  return rating === 'facil' ? Math.max(3, Math.round(goal * 0.18)) : Math.max(2, Math.round(goal * 0.1));
}

// Sesiones con la meta cumplida (Normal) para subir: 1 en básicos de fuerza,
// lo indicado en Ajustes (2 por defecto) en habilidades.
export function passesRequired(state, roadmap) {
  return roadmap.category === 'fuerza' ? 1 : Math.max(1, state.settings.passesToLevelUp | 0);
}

export function deloadActive(state, now = Date.now()) {
  return !!(state.deload && state.deload.until > now);
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Descarga cada 5–6 semanas o cuando hay ≥ 2 rutas estancadas.
export function deloadSuggestion(state, now = Date.now()) {
  if (deloadActive(state, now)) return null;
  if (state.deloadSnoozeUntil && state.deloadSnoozeUntil > now) return null;
  const stalled = [...Object.values(state.progress), ...Object.values(state.lifts || {})]
    .filter((p) => (p?.stall || 0) >= 2).length;
  if (stalled >= 2) return { reason: 'stall', stalled };
  const since = state.deload?.until ?? state.sessions[0]?.startedAt;
  if (!since) return null;
  const weeks = Math.floor((now - since) / (7 * DAY_MS));
  const count = state.sessions.filter((s) => s.startedAt >= since).length;
  if (weeks >= 5 && count >= 8) return { reason: 'weeks', weeks };
  return null;
}

export function startDeload(s, days = 7) {
  const now = Date.now();
  s.deload = { start: now, until: now + days * DAY_MS };
  s.plan = null;
}

// Objetivo por serie para la próxima sesión de una ruta.
// Sin objetivo guardado se parte de lo último registrado en ese paso, o del ~60 % de la meta.
export function workFor(id) {
  const { step, index, progress } = stepOf(id);
  let w = progress.work;
  if (w == null) {
    const last = lastPerformance(getState(), id, index);
    w = last ? Math.min(...last) : defaultWork(step);
  }
  return Math.min(step.target, Math.max(1, w));
}

// ───────────────────── Pierna en el gimnasio (progresión doble con carga) ─────────────────────
//
// Cada ejercicio tiene un rango (p. ej. 6–10 reps). Se trabaja con un objetivo de
// reps por serie y un peso. La valoración (RIR) decide:
//   · Todas las series en el tope del rango + Fácil/Normal → +peso y vuelta al mínimo.
//   · Por debajo del tope: Fácil +2 reps, Normal +1, Difícil se mantiene.
//   · Sin llegar al mínimo del rango y Difícil → baja ~10 % el peso.
//   · 3 sesiones sin avanzar → baja ~10 % y reconstruye desde el mínimo.

export function liftState(state, id) {
  return state.lifts?.[id] || { kg: null, reps: null, stall: 0 };
}

export function liftGoal(lift, p) {
  return Math.min(lift.max, Math.max(lift.min, p.reps ?? lift.min));
}

// Redondea al múltiplo del incremento (2,5 kg, 5 kg…) por debajo.
function floorLoad(kg, inc) {
  return Math.max(0, Math.floor(kg / inc + 1e-9) * inc);
}

// ~10 % menos, redondeado al incremento y siempre al menos un incremento menos.
export function lighterLoad(kg, inc) {
  return Math.max(0, Math.min(floorLoad(kg * 0.9, inc), kg - inc));
}

function liftItem(state, id, deload, dayType) {
  const lift = LIFT_BY_ID[id];
  const p = liftState(state, id);
  const goal = deload ? lift.min : liftGoal(lift, p);
  const kg = p.kg == null ? null : deload ? lighterLoad(p.kg, lift.inc) : p.kg;
  const base = LEG_DAYS[dayType]?.sets?.[id] ?? lift.sets;
  const sets = deload ? Math.max(2, base - 1) : base;
  return {
    liftId: id,
    type: 'reps',
    min: lift.min,
    max: lift.max,
    target: lift.max,
    goal,
    kg,
    plannedSets: sets,
    side: false,
    rest: lift.rest,
    rating: null,
    sets: Array.from({ length: sets }, () => ({ value: goal, kg, done: false })),
  };
}

function applyLiftProgress(p, lift, item) {
  const rating = item.rating || 'normal';
  const done = item.sets.filter((x) => x.done);
  const loads = done.map((x) => Number(x.kg) || 0);
  const reps = done.map((x) => Number(x.value) || 0);
  // Peso de trabajo: el de la serie más ligera (si cambiaste el peso a mitad, cuenta el menor).
  const kg = loads.length ? Math.min(...loads) : Number(item.kg) || 0;
  const hasKg = kg > 0;
  const goal = item.goal ?? lift.min;
  p.kg = hasKg ? kg : p.kg ?? null;

  let outcome;
  if (stepMet(item)) {
    // En máquinas de aislamiento llegar al fallo es normal: también sube el peso.
    if (rating !== 'dificil' || lift.failureOk) {
      p.reps = lift.min;
      p.stall = 0;
      if (!hasKg) { p.reps = lift.max; return { kind: 'no-kg', next: lift.max }; }
      p.kg = kg + lift.inc;
      return { kind: 'load-up', from: kg, kg: p.kg, next: lift.min };
    }
    p.reps = lift.max;
    outcome = { kind: 'consolidate', next: lift.max, kg };
  } else if (goalMet(item)) {
    if (rating === 'dificil') {
      p.reps = goal;
      outcome = { kind: 'keep', next: goal, kg };
    } else {
      const next = Math.min(lift.max, goal + (rating === 'facil' ? 2 : 1));
      p.reps = next;
      p.stall = 0;
      return { kind: 'up', from: goal, next, kg };
    }
  } else if (rating === 'dificil' && reps.length) {
    const low = Math.min(...reps);
    if (low < lift.min && hasKg) {
      p.kg = lighterLoad(kg, lift.inc);
      p.reps = lift.min;
      p.stall = 0;
      return { kind: 'load-down', from: kg, kg: p.kg, next: lift.min };
    }
    const next = Math.max(lift.min, Math.min(goal, low));
    p.reps = next;
    outcome = next < goal ? { kind: 'down', from: goal, next, kg } : { kind: 'keep', next: goal, kg };
  } else {
    p.reps = goal;
    outcome = { kind: 'keep', next: goal, kg };
  }

  p.stall = (p.stall || 0) + 1;
  if (p.stall >= STALL_LIMIT && hasKg) {
    p.kg = lighterLoad(kg, lift.inc);
    p.reps = lift.min;
    p.stall = 0;
    return { kind: 'reset', from: kg, kg: p.kg, next: lift.min };
  }
  return outcome;
}

export function createSession(state, plan) {
  const deload = deloadActive(state);
  const items = plan.ids.filter((id) => ROADMAP_BY_ID[id] || LIFT_BY_ID[id]).map((id) => {
    if (LIFT_BY_ID[id]) return liftItem(state, id, deload, plan.dayType);
    const { roadmap, step, index } = stepOf(id);
    const work = workFor(id);
    // Semana de descarga: una serie menos y objetivo al ~65 %.
    const goal = deload ? Math.max(1, Math.round(work * 0.65)) : work;
    const sets = plannedSets(state, id, step, deload);
    const role = skillRole(state, id);
    return {
      roadmapId: id,
      stepIndex: index,
      ...(role ? { role } : {}),
      type: step.type,
      target: step.target,
      goal,
      plannedSets: sets,
      side: !!step.side,
      rest: restFor(roadmap, step),
      rating: null,
      sets: Array.from({ length: sets }, () => ({ value: goal, done: false })),
    };
  });
  const now = Date.now();
  return {
    id: uid(),
    startedAt: now,
    lastActivityAt: now,
    dayType: plan.dayType,
    deload,
    // Días solo de gimnasio: calentamiento de pierna en vez del de calistenia.
    // (la práctica de pino al principio de un día de pierna no cambia el calentamiento)
    warmupKind: items.some((it) => it.liftId) && items.every((it) => it.liftId || it.roadmapId === PRACTICE_ID) ? 'pierna' : 'base',
    warmupDone: !(state.settings.warmup && plan.warmup !== false),
    warmupChecks: [],
    items,
    current: 0,
    rest: null,        // { endsAt, total }
    hold: null,        // { item, set, startsAt }
    ratePrompt: null,  // índice del ejercicio pendiente de valorar
    finishing: false,  // valorando los últimos ejercicios antes de terminar
    notes: '',
  };
}

export function warmupList(active) {
  return active?.warmupKind === 'pierna' ? LEG_WARMUP : WARMUP;
}

export function itemComplete(item) {
  return item.sets.length > 0 && item.sets.every((s) => s.done);
}

function allPlannedAtLeast(item, value) {
  const done = item.sets.filter((s) => s.done);
  return done.length >= item.plannedSets && done.every((s) => Number(s.value) >= value);
}

export const goalMet = (item) => allPlannedAtLeast(item, item.goal ?? item.target);
export const stepMet = (item) => allPlannedAtLeast(item, item.target);

// Siguiente ejercicio con series hechas que aún no se ha valorado.
export function nextUnrated(active) {
  const i = active.items.findIndex((it) => it.sets.some((s) => s.done) && !it.rating && !it.rateSkipped);
  return i >= 0 ? i : null;
}

// Aplica la valoración y el rendimiento de un ejercicio a su progreso.
// Devuelve el resultado para mostrarlo en el resumen y el calendario.
const STALL_LIMIT = 3; // exposiciones seguidas sin subir el objetivo

function applyProgress(p, roadmap, item, required) {
  const step = roadmap.steps[item.stepIndex];
  const rating = item.rating || 'normal'; // sin valorar cuenta como normal
  const goal = item.goal ?? step.target;
  const isLast = p.step >= roadmap.steps.length - 1;
  const doneValues = item.sets.filter((x) => x.done).map((x) => Number(x.value) || 0);

  const levelUp = (reason) => {
    p.stall = 0;
    p.resets = 0;
    if (isLast) {
      p.work = step.target;
      if (p.done) return { kind: 'keep', next: step.target };
      p.done = true;
      return { kind: 'completed', reason };
    }
    p.step += 1;
    p.passes = 0;
    p.work = defaultWork(roadmap.steps[p.step]);
    return { kind: 'levelup', reason, to: p.step, next: p.work };
  };

  let outcome;
  if (stepMet(item)) {
    p.work = step.target;
    if (rating === 'facil') return levelUp('facil');
    if (rating === 'normal') {
      p.passes += 1;
      if (p.passes >= required) return levelUp('passes');
      p.stall = 0;
      return { kind: 'pass', passes: p.passes, required, next: step.target };
    }
    outcome = { kind: 'consolidate', next: step.target };
  } else if (goalMet(item)) {
    if (rating === 'dificil') {
      p.work = goal;
      outcome = { kind: 'keep', next: goal };
    } else {
      const next = Math.min(step.target, goal + increment(step, roadmap, rating, goal));
      p.work = next;
      p.stall = 0;
      return { kind: 'up', from: goal, next };
    }
  } else if (rating === 'dificil' && doneValues.length) {
    // No se llegó y costó: recalibrar al mínimo conseguido.
    const next = Math.max(1, Math.min(goal, ...doneValues));
    p.work = next;
    outcome = next < goal ? { kind: 'down', from: goal, next } : { kind: 'keep', next: goal };
  } else {
    p.work = goal;
    outcome = { kind: 'keep', next: goal };
  }

  // Estancamiento: tras varias sesiones sin avanzar, reiniciar al ~80 % y reconstruir.
  p.stall = (p.stall || 0) + 1;
  if (p.stall >= STALL_LIMIT) {
    const base = p.work;
    const next = Math.max(1, Math.round(base * 0.8));
    p.work = next;
    p.stall = 0;
    p.resets = (p.resets || 0) + 1;
    return { kind: 'reset', from: base, next, suggestDrop: p.resets >= 2 && p.step > 0 };
  }
  return outcome;
}

// Cierra el entreno activo, lo guarda en el historial y aplica la progresión.
export function finishActiveSession() {
  const state = getState();
  const active = state.active;
  if (!active) return null;

  const endedAt = Date.now();
  let duration = endedAt - active.startedAt;
  if (duration > MAX_REASONABLE_SESSION) {
    duration = Math.max(60_000, (active.lastActivityAt || active.startedAt) - active.startedAt + 60_000);
  }
  const dateIso = new Date(endedAt).toISOString();
  const session = {
    id: active.id,
    startedAt: active.startedAt,
    endedAt,
    duration: Math.round(duration / 1000),
    dayType: active.dayType,
    deload: !!active.deload,
    warmupFull: (active.warmupChecks || []).length >= warmupList(active).length,
    items: [],
    levelUps: [],
    notes: active.notes || '',
  };

  update((s) => {
    for (const item of active.items) {
      const done = item.sets.filter((x) => x.done);
      if (!done.length) continue;
      if (item.liftId) {
        const lift = LIFT_BY_ID[item.liftId];
        const entry = {
          liftId: item.liftId,
          type: 'reps',
          min: item.min,
          max: item.max,
          target: item.target,
          goal: item.goal,
          plannedSets: item.plannedSets,
          side: false,
          sets: done.map((x) => Number(x.value) || 0),
          loads: done.map((x) => (x.kg == null ? null : Number(x.kg))),
          met: stepMet(item),
          goalMet: goalMet(item),
          rating: item.rating || null,
        };
        session.items.push(entry);
        if (!lift) continue;
        s.lifts ||= {};
        const p = (s.lifts[item.liftId] ||= { kg: null, reps: null, stall: 0 });
        entry.outcome = active.deload ? { kind: 'deload' } : applyLiftProgress(p, lift, item);
        continue;
      }
      const entry = {
        roadmapId: item.roadmapId,
        stepIndex: item.stepIndex,
        type: item.type,
        target: item.target,
        goal: item.goal ?? item.target,
        plannedSets: item.plannedSets,
        side: item.side,
        sets: done.map((x) => Number(x.value) || 0),
        met: stepMet(item),
        goalMet: goalMet(item),
        rating: item.rating || null,
      };
      session.items.push(entry);

      const roadmap = ROADMAP_BY_ID[item.roadmapId];
      const p = (s.progress[item.roadmapId] ||= { step: 0, passes: 0, done: false });
      if (p.step !== item.stepIndex) continue; // el nivel se cambió a mano durante el entreno
      if (active.deload) { entry.outcome = { kind: 'deload' }; continue; }
      const outcome = applyProgress(p, roadmap, item, passesRequired(s, roadmap));
      entry.outcome = outcome;
      if (outcome.kind === 'levelup' || outcome.kind === 'completed') {
        const from = item.stepIndex;
        const to = outcome.kind === 'levelup' ? outcome.to : from;
        const record = { roadmapId: item.roadmapId, from, to, reason: outcome.reason };
        if (outcome.kind === 'completed') record.completed = true;
        session.levelUps.push(record);
        s.levelLog.push({ date: dateIso, ...record });
      }
    }
    s.sessions.push(session);
    s.active = null;
    s.plan = null;
    if (['A', 'B', 'TA', 'TB', 'P'].includes(active.dayType)) s.lastDayType = active.dayType;
  });
  return session;
}

// Texto corto que explica qué cambia tras un ejercicio.
function liftOutcomeText(entry) {
  const o = entry.outcome;
  const sets = entry.plannedSets;
  const lift = LIFT_BY_ID[entry.liftId];
  const reps = (v) => `${v} ${v === 1 ? 'rep' : 'reps'}`;
  switch (o.kind) {
    case 'load-up':
      return `¡Sube el peso! Próxima vez: ${sets} × ${reps(o.next)} con ${fmtKg(o.kg)} (antes ${fmtKg(o.from)})`;
    case 'up':
      return `Próxima vez: ${sets} × ${reps(o.next)} con ${fmtKg(o.kg)} (antes ${reps(o.from)})`;
    case 'consolidate':
      return `Tope del rango, pero costó: repite ${sets} × ${reps(o.next)} con ${fmtKg(o.kg)} antes de subir peso`;
    case 'down':
      return `Recalibrado a tu mínimo de hoy: ${sets} × ${reps(o.next)} con ${fmtKg(o.kg)}`;
    case 'load-down':
      return `No llegaste al mínimo del rango (${lift?.min ?? o.next} reps): baja a ${fmtKg(o.kg)} y vuelve a ${reps(o.next)}`;
    case 'reset':
      return `Llevas ${STALL_LIMIT} sesiones sin avanzar: baja a ${fmtKg(o.kg)} (~10 %) y reconstruye desde ${reps(o.next)}`;
    case 'no-kg':
      return 'Tope del rango: apunta el peso que usas para que la app te lo suba';
    case 'deload':
      return 'Semana de descarga: sin cambios en tu progreso';
    default:
      return `Próxima vez: mantén ${sets} × ${reps(o.next)} con ${fmtKg(o.kg)}`;
  }
}

export function outcomeText(entry) {
  const o = entry.outcome;
  if (!o) return '';
  if (entry.liftId) return liftOutcomeText(entry);
  const r = ROADMAP_BY_ID[entry.roadmapId];
  const unit = (v) => (entry.type === 'hold' ? `${v} s` : `${v} ${v === 1 ? 'rep' : 'reps'}`);
  const sets = entry.plannedSets;
  switch (o.kind) {
    case 'levelup':
      return `${o.reason === 'facil' ? 'Te resultó fácil: s' : 'S'}ubes a «${r.steps[o.to].name}» (empiezas con ${r.steps[o.to].sets} × ${unit(o.next)})`;
    case 'completed':
      return '¡Ruta completada!';
    case 'pass':
      return `Meta del paso cumplida (${o.passes}/${o.required}). Repite para subir de nivel`;
    case 'consolidate':
      return `Meta cumplida, pero costó: consolida ${sets} × ${unit(o.next)} antes de avanzar`;
    case 'up':
      return `Próxima vez: ${sets} × ${unit(o.next)} (antes ${unit(o.from)})`;
    case 'down':
      return `Recalibrado a tu mínimo de hoy: ${sets} × ${unit(o.next)}`;
    case 'reset':
      return `Llevas ${STALL_LIMIT} sesiones sin avanzar: reiniciamos a ${sets} × ${unit(o.next)} para volver a subir${o.suggestDrop ? '. Si sigue costando, baja un paso desde Rutas' : ''}`;
    case 'deload':
      return 'Semana de descarga: sin cambios en tu progreso';
    default:
      return `Próxima vez: mantén ${sets} × ${unit(o.next)}`;
  }
}

// ───────────────────────────── Estadísticas ─────────────────────────────

export function startOfWeek(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - day);
  return d.getTime();
}

const WEEK = 7 * 24 * 60 * 60 * 1000;

function addWeeks(ts, n) {
  const d = new Date(ts);
  d.setDate(d.getDate() + n * 7);
  return d.getTime();
}

// Las prácticas cortas sueltas («Solo pino» en un día de descanso) no cuentan como entreno de la semana.
export const PRACTICE_DAY = 'pino';
export const isWorkout = (s) => s.dayType !== PRACTICE_DAY;

export function sessionsInWeek(state, weekStart, { all = false } = {}) {
  const end = addWeeks(weekStart, 1);
  return state.sessions.filter((s) => s.startedAt >= weekStart && s.startedAt < end && (all || isWorkout(s)));
}

export function weeklySeries(state, weeks = 8) {
  const current = startOfWeek(Date.now());
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = addWeeks(current, -i);
    const list = sessionsInWeek(state, ws);
    out.push({
      weekStart: ws,
      count: list.length,
      minutes: Math.round(list.reduce((a, s) => a + s.duration, 0) / 60),
    });
  }
  return out;
}

// Semanas seguidas cumpliendo el objetivo de días por semana.
export function weekStreak(state) {
  const goal = state.settings.daysPerWeek;
  let ws = startOfWeek(Date.now());
  let streak = 0;
  if (sessionsInWeek(state, ws).length >= goal) streak++;
  ws = addWeeks(ws, -1);
  while (sessionsInWeek(state, ws).length >= goal) {
    streak++;
    ws = addWeeks(ws, -1);
  }
  return streak;
}

export function totals(state) {
  const seconds = state.sessions.reduce((a, s) => a + s.duration, 0);
  return { sessions: state.sessions.length, seconds };
}

// Porcentaje del mapa completo de progresiones superado.
export function globalProgress() {
  let total = 0;
  let done = 0;
  for (const r of ROADMAPS) {
    const p = getProgress(r.id);
    total += r.steps.length;
    done += p.step + (p.done ? 1 : 0);
  }
  return total ? Math.round((done / total) * 100) : 0;
}

export function roadmapPercent(id) {
  const r = ROADMAP_BY_ID[id];
  const p = getProgress(id);
  return Math.round(((p.step + (p.done ? 1 : 0)) / r.steps.length) * 100);
}

// Mejor serie de cada sesión para una ruta (para la gráfica de progreso).
export function roadmapHistory(state, id) {
  const out = [];
  for (const s of state.sessions) {
    const item = s.items.find((x) => x.roadmapId === id);
    if (!item) continue;
    out.push({ date: s.startedAt, stepIndex: item.stepIndex, best: Math.max(...item.sets), type: item.type, met: item.met });
  }
  return out;
}

export function prereqStatus(roadmap) {
  return (roadmap.prereq || []).map((req) => {
    const r = ROADMAP_BY_ID[req.id];
    const p = getProgress(req.id);
    return { roadmap: r, step: req.step, stepName: r.steps[req.step].name, ok: p.step >= req.step || p.done };
  });
}

export { WEEK };
