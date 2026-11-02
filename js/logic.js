// Lógica de entrenamiento: generación de rutinas, subida de nivel y estadísticas.

import { ROADMAPS, ROADMAP_BY_ID, DAY_TEMPLATES, WARMUP } from './data/roadmaps.js';
import { getState, getProgress, update } from './store.js';

const MAX_REASONABLE_SESSION = 3 * 60 * 60 * 1000;

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function stepOf(id) {
  const roadmap = ROADMAP_BY_ID[id];
  const progress = getProgress(id);
  return { roadmap, step: roadmap.steps[progress.step], index: progress.step, progress };
}

export function nextDayType(state) {
  return state.lastDayType === 'A' ? 'B' : 'A';
}

// Habilidades por sesión: máximo 2 (carga de tendones en brazos rectos). Con 3
// objetivos se van rotando entre sesiones.
export const MAX_SKILLS_PER_SESSION = 2;

export function sessionGoals(state) {
  const goals = state.settings.goals.filter((id) => ROADMAP_BY_ID[id]);
  if (goals.length <= MAX_SKILLS_PER_SESSION) return goals;
  const n = state.sessions.filter((s) => s.dayType === 'A' || s.dayType === 'B').length;
  return Array.from({ length: MAX_SKILLS_PER_SESSION }, (_, i) => goals[(n + i) % goals.length]);
}

export function defaultIds(state, dayType) {
  const ids = sessionGoals(state);
  for (const id of DAY_TEMPLATES[dayType].ids) if (!ids.includes(id)) ids.push(id);
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

export function estimateMinutes(state, ids, withWarmup = state.settings.warmup) {
  let sec = withWarmup ? 6 * 60 : 0;
  for (const id of ids) {
    const { roadmap, step } = stepOf(id);
    const work = step.type === 'hold' ? step.target : step.target * 3;
    const sides = step.side ? 2 : 1;
    sec += step.sets * (work * sides + 20) + (step.sets - 1) * restFor(roadmap, step) + 90;
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

// Descanso entre series según el paso (la investigación desaconseja un valor fijo por ruta).
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
  const stalled = Object.values(state.progress).filter((p) => (p.stall || 0) >= 2).length;
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

export function createSession(state, plan) {
  const deload = deloadActive(state);
  const items = plan.ids.filter((id) => ROADMAP_BY_ID[id]).map((id) => {
    const { roadmap, step, index } = stepOf(id);
    const work = workFor(id);
    // Semana de descarga: una serie menos y objetivo al ~65 %.
    const goal = deload ? Math.max(1, Math.round(work * 0.65)) : work;
    const sets = deload ? Math.max(2, step.sets - 1) : step.sets;
    return {
      roadmapId: id,
      stepIndex: index,
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
    warmupFull: (active.warmupChecks || []).length >= WARMUP.length,
    items: [],
    levelUps: [],
    notes: active.notes || '',
  };

  update((s) => {
    for (const item of active.items) {
      const done = item.sets.filter((x) => x.done);
      if (!done.length) continue;
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
    if (active.dayType === 'A' || active.dayType === 'B') s.lastDayType = active.dayType;
  });
  return session;
}

// Texto corto que explica qué cambia tras un ejercicio.
export function outcomeText(entry) {
  const o = entry.outcome;
  if (!o) return '';
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

export function sessionsInWeek(state, weekStart) {
  const end = addWeeks(weekStart, 1);
  return state.sessions.filter((s) => s.startedAt >= weekStart && s.startedAt < end);
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
