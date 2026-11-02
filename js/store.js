// Estado de la app, persistido en localStorage del propio iPhone.
// Nada sale del dispositivo: no hay servidor ni cuenta.

import { ROADMAPS, ROADMAP_BY_ID } from './data/roadmaps.js';
import { LEGACY_V1 } from './data/legacy.js';

const DATA_VERSION = 2;

const KEY = 'calisthenic-flow:v1';
const listeners = new Set();

export function defaultState() {
  return {
    version: DATA_VERSION,
    onboarded: false,
    settings: {
      goals: [],            // ids de habilidades en foco (máx. 3)
      daysPerWeek: 3,
      passesToLevelUp: 2,   // sesiones cumpliendo el objetivo para subir de paso
      sound: true,
      warmup: true,
    },
    progress: {},           // id → { step, passes, done }
    levelLog: [],           // { date, roadmapId, from, to }
    sessions: [],           // historial de entrenos
    active: null,           // entreno en curso
    plan: null,             // { dayType, ids } plan personalizado del siguiente entreno
    lastDayType: null,
    deload: null,           // { start, until } semana de descarga
    deloadSnoozeUntil: null,
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (err) {
    console.warn('No se pudo leer el estado guardado', err);
  }
  return defaultState();
}

// v1 → v2: las rutas se revisaron con la investigación (pasos nuevos, fusionados o
// eliminados). El progreso se guardaba por índice: se recoloca por nombre del paso.
function legacyIndex(id, oldIdx) {
  const r = ROADMAP_BY_ID[id];
  const names = LEGACY_V1[id];
  if (!r || !names) return oldIdx | 0;
  for (let i = Math.min(oldIdx | 0, names.length - 1); i >= 0; i--) {
    const j = r.steps.findIndex((st) => st.name === names[i] || st.was?.includes(names[i]));
    if (j >= 0) return j;
  }
  return 0;
}

function migrate(s) {
  if ((s.version || 1) >= DATA_VERSION) return s;
  for (const [id, p] of Object.entries(s.progress || {})) {
    if (!p) continue;
    p.step = legacyIndex(id, p.step);
    p.passes = 0;
  }
  for (const sess of s.sessions || []) {
    for (const it of sess.items || []) it.stepIndex = legacyIndex(it.roadmapId, it.stepIndex);
  }
  for (const l of s.levelLog || []) {
    l.from = legacyIndex(l.roadmapId, l.from);
    l.to = legacyIndex(l.roadmapId, l.to);
  }
  for (const it of s.active?.items || []) it.stepIndex = legacyIndex(it.roadmapId, it.stepIndex);
  s.plan = null;
  s.version = DATA_VERSION;
  return s;
}

// Completa campos que falten (versiones antiguas o copias importadas).
export function normalize(data) {
  const base = defaultState();
  migrate(data);
  const s = { ...base, ...data, settings: { ...base.settings, ...(data.settings || {}) } };
  s.progress = s.progress && typeof s.progress === 'object' ? s.progress : {};
  s.levelLog = Array.isArray(s.levelLog) ? s.levelLog : [];
  s.sessions = Array.isArray(s.sessions) ? s.sessions : [];
  s.settings.goals = (s.settings.goals || []).filter((id) => ROADMAP_BY_ID[id]);
  for (const id of Object.keys(s.progress)) {
    const r = ROADMAP_BY_ID[id];
    if (!r) { delete s.progress[id]; continue; }
    const p = s.progress[id];
    p.step = Math.min(Math.max(0, p.step | 0), r.steps.length - 1);
    p.passes = Math.max(0, p.passes | 0);
  }
  return s;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('No se pudo guardar', err);
  }
}

export function getState() {
  return state;
}

export function update(mutator, { silent = false } = {}) {
  mutator(state);
  save();
  if (!silent) listeners.forEach((fn) => fn(state));
}

export function replaceState(next) {
  state = normalize(next);
  save();
  listeners.forEach((fn) => fn(state));
}

export function resetState() {
  replaceState(defaultState());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getProgress(id) {
  return state.progress[id] || { step: 0, passes: 0, done: false };
}

export function setStep(id, step) {
  const r = ROADMAP_BY_ID[id];
  const clamped = Math.min(Math.max(0, step), r.steps.length - 1);
  update((s) => {
    const prev = s.progress[id]?.step ?? 0;
    s.progress[id] = { step: clamped, passes: 0, done: false };
    if (prev !== clamped) {
      s.levelLog.push({ date: new Date().toISOString(), roadmapId: id, from: prev, to: clamped, manual: true });
    }
  });
}

export function allRoadmaps() {
  return ROADMAPS;
}
