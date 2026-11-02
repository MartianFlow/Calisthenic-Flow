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

export function createSession(state, plan) {
  const items = plan.ids.filter((id) => ROADMAP_BY_ID[id]).map((id) => {
    const { roadmap, step, index } = stepOf(id);
    const last = lastPerformance(state, id, index);
    const sets = Array.from({ length: step.sets }, (_, i) => ({
      value: last ? (last[i] ?? last[last.length - 1]) : step.target,
      done: false,
    }));
    return {
      roadmapId: id,
      stepIndex: index,
      type: step.type,
      target: step.target,
      plannedSets: step.sets,
      side: !!step.side,
      rest: roadmap.rest,
      sets,
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
    rest: null,   // { endsAt, total }
    hold: null,   // { item, set, startsAt }
    notes: '',
  };
}

export function itemComplete(item) {
  return item.sets.length > 0 && item.sets.every((s) => s.done);
}

export function itemMet(item) {
  const done = item.sets.filter((s) => s.done);
  return done.length >= item.plannedSets && done.every((s) => Number(s.value) >= item.target);
}

// Cierra el entreno activo, lo guarda en el historial y aplica subidas de nivel.
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
      const met = itemMet(item);
      const entry = {
        roadmapId: item.roadmapId,
        stepIndex: item.stepIndex,
        type: item.type,
        target: item.target,
        plannedSets: item.plannedSets,
        side: item.side,
        sets: done.map((x) => Number(x.value) || 0),
        met,
      };
      session.items.push(entry);
      if (!met) continue;

      const roadmap = ROADMAP_BY_ID[item.roadmapId];
      const p = (s.progress[item.roadmapId] ||= { step: 0, passes: 0, done: false });
      if (p.step !== item.stepIndex) continue; // el nivel se cambió a mano durante el entreno
      p.passes += 1;
      entry.passes = p.passes;
      entry.required = required;
      if (p.passes < required) continue;

      if (p.step < roadmap.steps.length - 1) {
        session.levelUps.push({ roadmapId: item.roadmapId, from: p.step, to: p.step + 1 });
        s.levelLog.push({ date: dateIso, roadmapId: item.roadmapId, from: p.step, to: p.step + 1 });
        p.step += 1;
        p.passes = 0;
      } else if (!p.done) {
        p.done = true;
        session.levelUps.push({ roadmapId: item.roadmapId, from: p.step, to: p.step, completed: true });
        s.levelLog.push({ date: dateIso, roadmapId: item.roadmapId, from: p.step, to: p.step, completed: true });
      }
    }
    s.sessions.push(session);
    s.active = null;
    s.plan = null;
    if (active.dayType === 'A' || active.dayType === 'B') s.lastDayType = active.dayType;
  });
  return session;
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
