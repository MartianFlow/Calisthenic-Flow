// Lógica de entrenamiento: generación de rutinas, subida de nivel y estadísticas.

import { ROADMAPS, ROADMAP_BY_ID, DAY_TEMPLATES } from './data/roadmaps.js';
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

export function defaultIds(state, dayType) {
  const ids = state.settings.goals.filter((id) => ROADMAP_BY_ID[id]);
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
    sec += step.sets * (work * sides + 20) + (step.sets - 1) * roadmap.rest + 90;
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

export const RATINGS = {
  facil: { label: 'Fácil', hint: 'Me sobraba' },
  normal: { label: 'Normal', hint: 'Costó, con buena técnica' },
  dificil: { label: 'Difícil', hint: 'Al límite' },
};

export function defaultWork(step) {
  return Math.max(1, Math.round(step.target * 0.6));
}

export function increments(step) {
  if (step.type === 'hold') {
    const small = Math.max(2, Math.round(step.target * 0.1));
    return { small, big: small * 2 };
  }
  return { small: 1, big: 2 };
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
  const items = plan.ids.filter((id) => ROADMAP_BY_ID[id]).map((id) => {
    const { roadmap, step, index } = stepOf(id);
    const goal = workFor(id);
    return {
      roadmapId: id,
      stepIndex: index,
      type: step.type,
      target: step.target,
      goal,
      plannedSets: step.sets,
      side: !!step.side,
      rest: roadmap.rest,
      rating: null,
      sets: Array.from({ length: step.sets }, () => ({ value: goal, done: false })),
    };
  });
  const now = Date.now();
  return {
    id: uid(),
    startedAt: now,
    lastActivityAt: now,
    dayType: plan.dayType,
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
function applyProgress(p, roadmap, item, required) {
  const step = roadmap.steps[item.stepIndex];
  const rating = item.rating || 'normal'; // sin valorar cuenta como normal
  const goal = item.goal ?? step.target;
  const inc = increments(step);
  const isLast = p.step >= roadmap.steps.length - 1;

  const levelUp = (reason) => {
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

  if (stepMet(item)) {
    p.work = step.target;
    if (rating === 'facil') return levelUp('facil');
    if (rating === 'normal') {
      p.passes += 1;
      if (p.passes >= required) return levelUp('passes');
      return { kind: 'pass', passes: p.passes, required, next: step.target };
    }
    return { kind: 'consolidate', next: step.target };
  }

  if (goalMet(item)) {
    if (rating === 'dificil') {
      p.work = goal;
      return { kind: 'keep', next: goal };
    }
    const next = Math.min(step.target, goal + (rating === 'facil' ? inc.big : inc.small));
    p.work = next;
    return { kind: 'up', from: goal, next };
  }

  if (rating === 'dificil') {
    const next = Math.max(1, goal - inc.small);
    p.work = next;
    return next < goal ? { kind: 'down', from: goal, next } : { kind: 'keep', next: goal };
  }
  p.work = goal;
  return { kind: 'keep', next: goal };
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
  const required = Math.max(1, state.settings.passesToLevelUp | 0);
  const dateIso = new Date(endedAt).toISOString();
  const session = {
    id: active.id,
    startedAt: active.startedAt,
    endedAt,
    duration: Math.round(duration / 1000),
    dayType: active.dayType,
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
      const outcome = applyProgress(p, roadmap, item, required);
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
      return `Bajamos a ${sets} × ${unit(o.next)} para consolidar`;
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
