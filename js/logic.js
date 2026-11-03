// Lógica de entrenamiento: generación de rutinas, subida de nivel y estadísticas.

import { ROADMAPS, ROADMAP_BY_ID, DAY_TEMPLATES, WARMUP, EXTRA_EXERCISES, SKILL_WARMUP } from './data/roadmaps.js';
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

// ─────────────────────────── Ejercicios propios ───────────────────────────
// Los crea la persona (Rutas → Mis ejercicios): repeticiones o segundos, con o sin peso.
// Suben con la misma progresión doble que la pierna del gimnasio (rango de repeticiones y,
// si llevan peso, más kilos al llegar arriba). Su progreso va en state.lifts[id].
export const GROUPS = {
  empuje: { label: 'Empuje', hint: 'pecho, hombro y tríceps' },
  tiron: { label: 'Tirón', hint: 'espalda y bíceps' },
  pierna: { label: 'Pierna', hint: 'cuádriceps, isquios, glúteo y gemelo' },
  core: { label: 'Core', hint: 'abdomen y lumbar' },
  otro: { label: 'Otro', hint: 'movilidad, cardio…' },
};
export const CUSTOM_REST = { load: 120, free: 90 };

export const customOf = (id, state = getState()) => (id && (state.custom || []).find((c) => c.id === id)) || null;
export const isCustom = (id, state = getState()) => !!customOf(id, state);
export const activeCustom = (state = getState()) => (state.custom || []).filter((c) => !c.archived);

// Con la forma de un ejercicio de gimnasio, para reutilizar su progresión.
export function customDef(c) {
  return {
    id: c.id, name: c.name, muscle: c.muscle || GROUPS[c.group]?.label || '', sets: c.sets, min: c.min, max: c.max,
    inc: c.load ? c.inc : 0, rest: c.load ? CUSTOM_REST.load : CUSTOM_REST.free, rir: '1–2', cues: c.cues || [],
    load: !!c.load, type: c.kind, side: !!c.side, failureOk: false, custom: true,
  };
}

// Nombre del ejercicio de un ítem de entreno (paso de una ruta o ejercicio de gimnasio).
export function itemName(item) {
  if (item.customId) return customOf(item.customId)?.name || item.name || '';
  if (item.liftId) return LIFT_BY_ID[item.liftId]?.name || item.liftId;
  if (item.acc) return accInfo(item.acc)?.name || '';
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

// Tipos de día de tu plan, donde puede ir fijo un ejercicio propio.
export function planDayTypes(state) {
  return dayOrder(state);
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

// ─────────────────────────── Complementarios (cambios 1, 6 y 13) ───────────────────────────
// Ejercicios de apoyo fijos de la habilidad de foco: casi todos son un paso de alguna ruta
// (`ref: 'ruta/key'`, con su nombre, claves y vídeo) y unos pocos son nuevos (EXTRA_EXERCISES).
// Series y repeticiones fijas, sin valoración ni progreso por pasos. En los dos primeros
// pasos de la habilidad, como mucho uno; después, dos. Las de mantener no llevan.
const BEGINNER_STEPS = 2;
export const ACC_REST = 90;

export function accInfo(key) {
  const extra = EXTRA_EXERCISES[key];
  if (extra) return { ...extra, side: false, video: null };
  const [rid, sk] = String(key).split('/');
  const r = ROADMAP_BY_ID[rid];
  const step = r?.steps.find((x) => x.key === sk);
  if (!step) return null;
  return { name: step.name, type: step.type, side: !!step.side, cues: step.cues, video: step.video, routeId: rid, routeName: r.name };
}

export function accessoriesFor(state, skillId, dayIds = []) {
  const r = ROADMAP_BY_ID[skillId];
  if (!r?.accessories || skillRole(state, skillId) !== 'foco') return [];
  const step = getProgress(skillId).step;
  const max = step < BEGINNER_STEPS ? 1 : 2;
  const out = [];
  for (const a of r.accessories) {
    if (out.length >= max) break;
    const key = a.ref || a.id;
    if (!accInfo(key)) continue;
    if (a.fromStep != null && step < a.fromStep) continue;
    if (a.ref) {
      const [rid, sk] = a.ref.split('/');
      const idx = ROADMAP_BY_ID[rid].steps.findIndex((x) => x.key === sk);
      // Si ya es el paso actual de una ruta de hoy, no se repite.
      if ((rid === skillId || dayIds.includes(rid)) && getProgress(rid).step === idx) continue;
      // Sustituir en vez de sumar: con el front lever en straddle o más y remo hoy, no se suma
      // otro remo (entra el jalón con banda).
      if (a.ref === 'remo/tuck-fl' && dayIds.includes('remo') && step >= 3) continue;
    }
    out.push({ acc: key, of: skillId, sets: a.sets, target: a.target, prep: !!a.prep });
  }
  return out;
}

// L-sit entre tus habilidades y hoy no toca: compresión ligera después del core (se tolera a diario).
function lsitCoreExtra(state, ids) {
  if (!skillRole(state, 'lsit') || ids.includes('lsit') || !ids.includes('core') || getProgress('lsit').step < 1) return null;
  return { acc: 'lsit/compresion', of: 'lsit', sets: 2, target: 8, prep: false };
}

// Orden real del entreno: práctica de pino (y sus complementarios) → preparación de cada
// habilidad justo antes de ella → habilidades → sus complementarios → básicos del día.
// Respeta el orden de `ids` (también el de un entreno editado) y solo inserta los complementarios.
export function sessionLayout(state, ids) {
  const isSkill = (id) => ROADMAP_BY_ID[id]?.category === 'habilidad';
  const main = ids.filter((id) => isSkill(id) && id !== PRACTICE_ID);
  const last = main.length ? ids.indexOf(main[main.length - 1]) : -1;
  const accs = Object.fromEntries(ids.filter(isSkill).map((id) => [id, accessoriesFor(state, id, ids)]));
  const extra = lsitCoreExtra(state, ids);
  const out = [];
  ids.forEach((id, i) => {
    if (main.includes(id)) out.push(...accs[id].filter((a) => a.prep));
    out.push({ id });
    if (id === PRACTICE_ID && accs[id]) out.push(...accs[id]);
    if (i === last) for (const m of main) out.push(...accs[m].filter((a) => !a.prep));
    if (extra && id === 'core') out.push(extra);
  });
  return out;
}

// Sustituir en vez de sumar (cambio 8): con muscle-up, las dominadas del día llevan una serie
// menos; con flexión de pino, los fondos (o, si no hay, las flexiones). Mínimo 2 series.
export function trimmedRoutes(ids) {
  const out = new Set();
  if (ids.includes('muscleup') && ids.includes('dominadas')) out.add('dominadas');
  if (ids.includes('hspu')) out.add(ids.includes('fondos') ? 'fondos' : 'flexiones');
  return out;
}

// Ejercicios fijos de un tipo de día (sin habilidades).
export function templateIds(dayType) {
  return LEG_DAYS[dayType] ? LEG_DAYS[dayType].ids : dayType === 'S' ? ['core'] : DAY_TEMPLATES[dayType]?.ids || [];
}

// Los de la plantilla más tus ejercicios de ese día (antes del core, que cierra el entreno),
// con los básicos que le faltan al foco primero.
export function baseIds(state, dayType) {
  const base = [...templateIds(dayType)];
  const mine = activeCustom(state).filter((c) => (c.days || []).includes(dayType) && !base.includes(c.id)).map((c) => c.id);
  const at = base.indexOf('core');
  base.splice(at >= 0 ? at : base.length, 0, ...mine);
  return prioritizeBase(state, base);
}

export function defaultIds(state, dayType) {
  const ids = sessionGoals(state, dayType);
  for (const id of baseIds(state, dayType)) if (!ids.includes(id)) ids.push(id);
  return ids;
}

// Plan del próximo entreno: el personalizado si existe, si no el de la plantilla.
export function currentPlan(state) {
  if (state.plan && state.plan.ids?.length) return state.plan;
  const dayType = nextDayType(state);
  return { dayType, ids: defaultIds(state, dayType), custom: false };
}

export function lastAccessory(state, key) {
  for (let i = state.sessions.length - 1; i >= 0; i--) {
    const item = state.sessions[i].items.find((x) => x.acc === key);
    if (item && item.sets.length) return item.sets;
  }
  return null;
}

export function lastPerformance(state, roadmapId, stepIndex) {
  for (let i = state.sessions.length - 1; i >= 0; i--) {
    const item = state.sessions[i].items.find((x) => x.roadmapId === roadmapId && x.stepIndex === stepIndex);
    if (item && item.sets.length) return item.sets;
  }
  return null;
}

// Último registro de un ejercicio de gimnasio o propio: { sets: reps[], loads: kg[] }.
export function lastLift(state, liftId) {
  for (let i = state.sessions.length - 1; i >= 0; i--) {
    const item = state.sessions[i].items.find((x) => (x.liftId || x.customId) === liftId);
    if (item && item.sets.length) return { sets: item.sets, loads: item.loads || [] };
  }
  return null;
}

export function estimateMinutes(state, ids, withWarmup = state.settings.warmup) {
  let sec = withWarmup ? 6 * 60 : 0;
  const trim = trimmedRoutes(ids);
  const block = (sets, work, sides, rest, extra) => sets * (work * sides + 20) + (sets - 1) * restSeconds(state, rest) + extra;
  for (const e of sessionLayout(state, ids)) {
    if (e.acc) {
      const info = accInfo(e.acc);
      sec += block(e.sets, info.type === 'hold' ? e.target : e.target * 3, info.side ? 2 : 1, ACC_REST, 45);
      continue;
    }
    const lift = LIFT_BY_ID[e.id];
    if (lift) {
      sec += lift.sets * (((lift.min + lift.max) / 2) * 3.5 + 25) + (lift.sets - 1) * restSeconds(state, lift.rest) + 90;
      continue;
    }
    const c = customOf(e.id, state);
    if (c) {
      const work = c.kind === 'hold' ? (c.min + c.max) / 2 : ((c.min + c.max) / 2) * 3.5;
      sec += c.sets * (work * (c.side ? 2 : 1) + 25) + (c.sets - 1) * restSeconds(state, customDef(c).rest) + 60;
      continue;
    }
    if (!ROADMAP_BY_ID[e.id]) continue;
    const { roadmap, step } = stepOf(e.id);
    const sets = Math.max(2, plannedSets(state, e.id, step) - (trim.has(e.id) ? 1 : 0));
    sec += block(sets, step.type === 'hold' ? step.target : step.target * 3, step.side ? 2 : 1, restFor(roadmap, step), 90);
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

// Aviso de copia de seguridad: cada 2 semanas como mínimo y con 3 entrenos nuevos desde la última
// copia (los datos solo viven en el iPhone). «Ahora no» lo aplaza una semana.
export const BACKUP_EVERY_DAYS = 14;
export function backupDue(state, now = Date.now()) {
  const b = state.backup || {};
  if (b.snoozeUntil && b.snoozeUntil > now) return null;
  const sessions = state.sessions;
  if (sessions.length < 3) return null;
  const since = b.last || sessions[0].startedAt;
  if (now - since < BACKUP_EVERY_DAYS * DAY_MS) return null;
  const newer = sessions.filter((x) => x.startedAt > (b.last || 0)).length;
  if (newer < 3) return null;
  return { last: b.last, days: Math.floor((now - (b.last || since)) / DAY_MS), newer };
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

// Ejercicios propios sin peso: al llegar arriba del rango no hay kilos que subir («top»), y
// en los de segundos cada subida es mayor.
function applyLiftProgress(p, lift, item) {
  const rating = item.rating || 'normal';
  const free = lift.custom && !lift.load;
  const bump = lift.type === 'hold' ? (rating === 'facil' ? 5 : 2) : rating === 'facil' ? 2 : 1;
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
      if (free) { p.reps = lift.max; return { kind: 'top', next: lift.max }; }
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
      const next = Math.min(lift.max, goal + bump);
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
  if (p.stall >= STALL_LIMIT && free && goal > lift.min) {
    p.reps = lift.min;
    p.stall = 0;
    return { kind: 'reset', from: goal, next: lift.min };
  }
  return outcome;
}

function customItem(state, c, deload) {
  const p = liftState(state, c.id);
  const goal = deload ? c.min : liftGoal(c, p);
  const kg = !c.load || p.kg == null ? null : deload ? lighterLoad(p.kg, c.inc) : p.kg;
  const sets = deload ? Math.max(2, c.sets - 1) : c.sets;
  return {
    customId: c.id,
    name: c.name,
    group: c.group,
    type: c.kind,
    load: !!c.load,
    min: c.min,
    max: c.max,
    target: c.max,
    goal,
    kg,
    plannedSets: sets,
    side: !!c.side,
    rest: customDef(c).rest,
    rating: null,
    sets: Array.from({ length: sets }, () => ({ value: goal, ...(c.load ? { kg } : {}), done: false })),
  };
}

function accItem(e, deload) {
  const info = accInfo(e.acc);
  const sets = deload ? Math.max(2, e.sets - 1) : e.sets;
  return {
    accessoryOf: e.of,
    acc: e.acc,
    ...(e.prep ? { prep: true } : {}),
    type: info.type,
    target: e.target,
    goal: e.target,
    plannedSets: sets,
    side: info.side,
    rest: ACC_REST,
    rating: null,
    sets: Array.from({ length: sets }, () => ({ value: e.target, done: false })),
  };
}

// Calentamiento extra según las habilidades del entreno (se guarda en el entreno para que una
// recarga no desordene las casillas marcadas, que van por índice).
function warmupExtras(ids) {
  const join = (l) => (l.length <= 1 ? l.join('') : `${l.slice(0, -1).join(', ')} y ${l[l.length - 1]}`);
  return SKILL_WARMUP.map((w) => {
    const forIds = w.for.filter((id) => ids.includes(id));
    if (!forIds.length) return null;
    return { name: w.name, detail: `${w.detail} · para ${join(forIds.map((id) => ROADMAP_BY_ID[id].name.toLowerCase().replace('l-sit', 'L-sit')))}` };
  }).filter(Boolean);
}

export function createSession(state, plan) {
  const deload = deloadActive(state);
  const ids = plan.ids.filter((id) => ROADMAP_BY_ID[id] || LIFT_BY_ID[id] || customOf(id, state));
  const trim = trimmedRoutes(ids);
  const items = sessionLayout(state, ids).map((e) => {
    if (e.acc) return accItem(e, deload);
    const id = e.id;
    if (LIFT_BY_ID[id]) return liftItem(state, id, deload, plan.dayType);
    const c = customOf(id, state);
    if (c) return customItem(state, c, deload);
    const { roadmap, step, index } = stepOf(id);
    const work = workFor(id);
    // Semana de descarga: una serie menos y objetivo al ~65 %.
    const goal = deload ? Math.max(1, Math.round(work * 0.65)) : work;
    const trimmed = trim.has(id);
    const sets = Math.max(2, plannedSets(state, id, step, deload) - (trimmed ? 1 : 0));
    const role = skillRole(state, id);
    return {
      roadmapId: id,
      stepIndex: index,
      ...(role ? { role } : {}),
      ...(trimmed ? { trimmed: true } : {}),
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
  const extras = warmupExtras(ids);
  // «Solo pino»: sin el calentamiento general, solo el específico (muñecas y hombros).
  const onlyExtras = plan.warmup === 'extras';
  const warmupKind = onlyExtras ? 'pino'
    // (la práctica de pino al principio de un día de pierna no cambia el calentamiento)
    : items.some((it) => it.liftId) && items.every((it) => it.liftId || it.group === 'pierna' || it.roadmapId === PRACTICE_ID || it.accessoryOf === PRACTICE_ID) ? 'pierna' : 'base';
  return {
    id: uid(),
    startedAt: now,
    lastActivityAt: now,
    dayType: plan.dayType,
    deload,
    warmupKind,
    warmupExtra: extras,
    warmupDone: !(state.settings.warmup && plan.warmup !== false) || (onlyExtras && !extras.length),
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
  const extra = active?.warmupExtra || [];
  if (active?.warmupKind === 'pino') return extra;
  if (active?.warmupKind === 'pierna') return [...LEG_WARMUP, ...extra];
  // Antes de las series de aproximación, que cierran el calentamiento.
  return extra.length ? [...WARMUP.slice(0, -1), ...extra, WARMUP[WARMUP.length - 1]] : WARMUP;
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
  const i = active.items.findIndex((it) => !it.accessoryOf && it.sets.some((s) => s.done) && !it.rating && !it.rateSkipped);
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
    // Brazos rectos: los tendones se adaptan en meses, así que «Fácil» en la meta cuenta como
    // sesión superada y no como subida inmediata (cambios 5 y 9).
    if (rating === 'facil' && !roadmap.straightArm) return levelUp('facil');
    if (rating === 'normal' || rating === 'facil') {
      p.passes += 1;
      if (p.passes >= required) return levelUp('passes');
      p.stall = 0;
      return { kind: 'pass', passes: p.passes, required, next: step.target, ...(rating === 'facil' ? { slow: true } : {}) };
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
      if (item.customId) {
        // Se guarda el nombre: el historial sigue legible aunque luego lo cambies o lo borres.
        const c = customOf(item.customId, s);
        const entry = {
          customId: item.customId,
          name: c?.name || item.name || '',
          group: c?.group || item.group || 'otro',
          type: item.type,
          load: !!item.load,
          min: item.min,
          max: item.max,
          target: item.target,
          goal: item.goal,
          plannedSets: item.plannedSets,
          side: item.side,
          sets: done.map((x) => Number(x.value) || 0),
          ...(item.load ? { loads: done.map((x) => (x.kg == null ? null : Number(x.kg))) } : {}),
          met: stepMet(item),
          goalMet: goalMet(item),
          rating: item.rating || null,
        };
        session.items.push(entry);
        if (!c) continue;
        s.lifts ||= {};
        const p = (s.lifts[item.customId] ||= { kg: null, reps: null, stall: 0 });
        entry.outcome = active.deload ? { kind: 'deload' } : applyLiftProgress(p, customDef(c), item);
        continue;
      }
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
      if (item.accessoryOf) {
        // Complementario: se guarda con sus series (cuentan para la EXP), sin progreso.
        session.items.push({
          accessoryOf: item.accessoryOf,
          acc: item.acc,
          type: item.type,
          target: item.target,
          goal: item.goal,
          plannedSets: item.plannedSets,
          side: item.side,
          sets: done.map((x) => Number(x.value) || 0),
          met: stepMet(item),
          goalMet: goalMet(item),
          rating: null,
        });
        continue;
      }
      const entry = {
        roadmapId: item.roadmapId,
        stepIndex: item.stepIndex,
        ...(item.role ? { role: item.role } : {}),
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
      // Con una serie menos (sustituir en vez de sumar), la meta cumplida no sube de paso.
      if (item.trimmed && stepMet(item)) {
        p.work = item.target;
        p.stall = 0;
        entry.outcome = { kind: 'trimmed', next: item.target };
        continue;
      }
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
  const lift = LIFT_BY_ID[entry.liftId] || entry;
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

// Ejercicio propio sin peso (repeticiones o segundos).
function freeOutcomeText(entry) {
  const o = entry.outcome;
  const sets = entry.plannedSets;
  const unit = (v) => (entry.type === 'hold' ? `${v} s` : `${v} ${v === 1 ? 'rep' : 'reps'}`);
  switch (o.kind) {
    case 'top':
      return `¡Tope del rango (${sets} × ${unit(o.next)})! Si te sale fácil, pasa a una variante más difícil o ponle peso: edita el ejercicio`;
    case 'up':
      return `Próxima vez: ${sets} × ${unit(o.next)} (antes ${unit(o.from)})`;
    case 'consolidate':
      return `Tope del rango, pero costó: repite ${sets} × ${unit(o.next)} hasta que salga con margen`;
    case 'down':
      return `Recalibrado a tu mínimo de hoy: ${sets} × ${unit(o.next)}`;
    case 'reset':
      return `Llevas ${STALL_LIMIT} sesiones sin avanzar: vuelve a ${sets} × ${unit(o.next)} y reconstruye`;
    case 'deload':
      return 'Semana de descarga: sin cambios en tu progreso';
    default:
      return `Próxima vez: mantén ${sets} × ${unit(o.next)}`;
  }
}

export function outcomeText(entry) {
  const o = entry.outcome;
  if (!o) return '';
  if (entry.customId) return entry.load ? liftOutcomeText(entry) : freeOutcomeText(entry);
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
      return o.slow
        ? `Te resultó fácil, pero en brazos rectos se pide la meta en ${o.required} sesiones (${o.passes}/${o.required}): los tendones se adaptan más despacio que el músculo`
        : `Meta del paso cumplida (${o.passes}/${o.required}). Repite para subir de nivel`;
    case 'trimmed':
      return `Meta cumplida con una serie menos (hoy tocaba también la habilidad). Para subir, cúmplela con todas las series`;
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
