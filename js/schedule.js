// Plan semanal: cuántos días entrenar y cómo repartirlos según tu nivel, tus
// objetivos y los días que tienes libres.
//
// Reglas (ver docs/investigacion-principios.md):
// · Cada patrón de movimiento 2–3 veces por semana; cuerpo completo A/B para
//   principiantes e intermedios (r/bodyweightfitness RR).
// · Repartir los días para dejar descanso entre sesiones duras.
// · Habilidades de brazos rectos (front lever, planche, back lever): como mucho
//   3 días por semana, nunca en días seguidos y máximo 2 por sesión.
// · Un día S (habilidades + core) solo cuando hay objetivos y 5 o más días.
// · Pierna en el gimnasio: torso/pierna (T-P-T-P-T con 5 días). Las habilidades van
//   en los días de torso; los de pierna se reparten para no caer seguidos.

import { ROADMAP_BY_ID, ROADMAPS, DAY_TEMPLATES } from './data/roadmaps.js';
import { LEG_DAYS } from './data/gym.js';
import { getProgress } from './store.js';
import { currentPlan, startOfWeek, TORSO_TYPES } from './logic.js';

export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const WD_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const DEFAULT_DAYS = [true, false, true, false, true, false, false];

export const weekdayIndex = (ts = Date.now()) => (new Date(ts).getDay() + 6) % 7;

const routeFrac = (r) => {
  const p = getProgress(r.id);
  return (p.step + (p.done ? 1 : 0)) / r.steps.length;
};

// Rutas de pierna de calistenia: no cuentan si la pierna se entrena en el gimnasio.
export const LEG_ROUTES = ['piernas', 'bisagra'];

// Nivel de entrenamiento: media de lo recorrido en cada ruta que entrenas.
// · Básicos de fuerza: fracción de la ruta superada (paso actual / pasos).
// · Habilidades (las que son objetivo o en las que ya has avanzado): empezar una ya
//   exige la base de sus prerrequisitos, así que su escala va de ese punto de partida
//   al 100 %. Ej.: el front lever pide haber llegado a «Dominadas (volumen)» (5/10
//   superado) y a «Elevaciones de rodillas colgado» (4/10) → arranca en el 45 %.
// Cortes [criterio propio]: < 30 % principiante, < 60 % intermedio, resto avanzado.
export function trainingLevel(state) {
  const gymLegs = state.settings.legs === 'gym';
  const parts = [];
  for (const r of ROADMAPS) {
    if (r.category === 'fuerza') {
      if (gymLegs && LEG_ROUTES.includes(r.id)) continue;
      parts.push(routeFrac(r));
      continue;
    }
    const p = getProgress(r.id);
    const active = state.settings.goals.includes(r.id) || p.step > 0 || p.done;
    if (!active) continue;
    const reqs = r.prereq || [];
    const base = reqs.length
      ? reqs.reduce((a, q) => a + q.step / ROADMAP_BY_ID[q.id].steps.length, 0) / reqs.length
      : 0;
    parts.push(base + routeFrac(r) * (1 - base));
  }
  const frac = parts.length ? parts.reduce((a, v) => a + v, 0) / parts.length : 0;
  if (frac < 0.3) return { key: 'principiante', label: 'Principiante', frac };
  if (frac < 0.6) return { key: 'intermedio', label: 'Intermedio', frac };
  return { key: 'avanzado', label: 'Avanzado', frac };
}

export function recommendDays(state) {
  const level = trainingLevel(state);
  const goals = state.settings.goals.filter((id) => ROADMAP_BY_ID[id]);
  const straight = goals.filter((id) => ROADMAP_BY_ID[id].straightArm).length;
  const available = (state.settings.schedule?.days || DEFAULT_DAYS).filter(Boolean).length;
  let days = 3;
  const reasons = [];
  if (state.settings.legs === 'gym') {
    if (level.key === 'avanzado') {
      days = 5;
      reasons.push('Nivel avanzado con la pierna en el gimnasio: 3 días de torso (tirón, empuje y habilidades) y 2 de pierna. Cada músculo se trabaja 2–3 veces por semana, que es lo que mejor funciona.');
    } else {
      days = 4;
      reasons.push(`Nivel ${level.label.toLowerCase()} con la pierna en el gimnasio: 2 días de torso y 2 de pierna, así cada músculo se trabaja 2 veces por semana. Con más nivel, un 3.er día de torso.`);
    }
  } else if (level.key === 'principiante') {
    days = 3;
    reasons.push('Nivel principiante: 3 días de cuerpo completo dan 2–3 estímulos por patrón y 48 h para recuperar, como la Recommended Routine.');
  } else if (level.key === 'intermedio') {
    days = goals.length ? 4 : 3;
    reasons.push(goals.length
      ? 'Nivel intermedio con habilidades objetivo: un 4.º día da más práctica sin pasar de 3 días por semana en brazos rectos.'
      : 'Nivel intermedio: 3 días siguen siendo suficientes; añade un 4.º si te recuperas bien.');
  } else {
    days = goals.length >= 2 ? 5 : 4;
    reasons.push(goals.length >= 2
      ? 'Nivel avanzado con varias habilidades: 5 días, uno de ellos ligero (Día S) para técnica.'
      : 'Nivel avanzado: 4 días alternando A y B permiten más volumen por patrón.');
  }
  if (straight) reasons.push(`Tienes ${straight} habilidad${straight > 1 ? 'es' : ''} de brazos rectos: como mucho 3 días por semana y nunca en días seguidos (los tendones se adaptan despacio).`);
  if (available < days) {
    reasons.push(`Solo marcaste ${available} día${available === 1 ? '' : 's'} libre${available === 1 ? '' : 's'}: el plan se ajusta a ${available}.`);
    days = Math.max(2, available);
  }
  return { days, level, reasons };
}

// Elige n días de los disponibles repartiéndolos lo más posible en la semana.
export function pickDays(available, n) {
  const avail = available.map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
  if (n >= avail.length) return avail;
  let best = null;
  const combos = (start, acc) => {
    if (acc.length === n) {
      const gaps = acc.map((d, i) => ((acc[(i + 1) % n] - d + 7) % 7) || 7);
      const minGap = Math.min(...gaps);
      const consecutive = gaps.filter((g) => g === 1).length;
      const score = minGap * 100 - consecutive * 10 - acc[0] * 0.1;
      if (!best || score > best.score) best = { score, days: [...acc] };
      return;
    }
    for (let i = start; i < avail.length; i++) combos(i + 1, [...acc, avail[i]]);
  };
  combos(0, []);
  return best.days;
}

function isoWeek(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 864e5 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// Con la pierna en el gimnasio: T = torso, P = pierna. Los torsos alternan TA/TB
// (empezando por TB las semanas ISO impares) y los días de pierna PA/PB.
const GYM_SLOTS = {
  1: 'T', 2: 'TP', 3: 'TPT', 4: 'TPTP', 5: 'TPTPT', 6: 'TPTTPT', 7: 'TPTTPTT',
};
export function gymWeekTemplate(n, oddWeek) {
  const slots = GYM_SLOTS[Math.max(1, Math.min(7, n))].split('');
  const legDays = slots.filter((x) => x === 'P').length;
  let t = oddWeek ? 1 : 0;
  let l = legDays === 1 && oddWeek ? 1 : 0; // con un solo día de pierna, alterna PA/PB cada semana
  return slots.map((x) => (x === 'T' ? ['TA', 'TB'][t++ % 2] : ['PA', 'PB'][l++ % 2]));
}

export function weekTemplate(n, hasGoals, oddWeek) {
  switch (n) {
    case 1: return ['A'];
    case 2: return ['A', 'B'];
    case 3: return oddWeek ? ['B', 'A', 'B'] : ['A', 'B', 'A'];
    case 4: return ['A', 'B', 'A', 'B'];
    case 5: return hasGoals ? ['A', 'B', 'S', 'A', 'B'] : ['A', 'B', 'A', 'B', 'A'];
    default: return hasGoals ? ['A', 'B', 'S', 'A', 'B', 'S', 'A'].slice(0, n) : ['A', 'B', 'A', 'B', 'A', 'B', 'A'].slice(0, n);
  }
}

export const DAY_INFO = {
  ...DAY_TEMPLATES,
  ...LEG_DAYS,
  S: { label: 'Día S', badge: 'S', focus: 'Habilidades · Core', ids: ['core'] },
  R: { label: 'Descanso', badge: '—', focus: 'Recuperación activa: caminar, movilidad o estiramientos suaves.', ids: [] },
};

// Nombre de un tipo de día para el historial («Torso A», «Pierna B», «Día A»…).
export function dayLabel(type) {
  if (type === 'libre') return 'Entreno libre';
  return DAY_INFO[type]?.label || `Día ${type}`;
}

// Construye la semana: [{ weekday, type, skills, ids }] para L…D.
export function buildWeek(state, weekStart = startOfWeek(Date.now())) {
  const sched = state.settings.schedule;
  if (!sched) return null;
  const goals = state.settings.goals.filter((id) => ROADMAP_BY_ID[id]);
  const n = Math.min(state.settings.daysPerWeek, sched.days.filter(Boolean).length);
  const chosen = pickDays(sched.days, n);
  const odd = isoWeek(weekStart) % 2 === 1;
  const types = state.settings.legs === 'gym'
    ? gymWeekTemplate(chosen.length, odd)
    : weekTemplate(chosen.length, goals.length > 0, odd);
  const week = WD_SHORT.map((_, i) => ({ weekday: i, type: 'R', skills: [], ids: [] }));
  const count = {};
  const lastDay = {};
  let rot = 0;
  chosen.forEach((wd, k) => {
    const type = types[k];
    const maxSkills = type === 'S' ? 3 : TORSO_TYPES.includes(type) ? 2 : 0;
    const skills = [];
    let straight = 0;
    for (let j = 0; j < goals.length && skills.length < maxSkills; j++) {
      const g = goals[(rot + j) % goals.length];
      const isStraight = ROADMAP_BY_ID[g].straightArm;
      if (isStraight && (straight >= 2 || (count[g] || 0) >= 3 || lastDay[g] === wd - 1)) continue;
      skills.push(g);
      count[g] = (count[g] || 0) + 1;
      lastDay[g] = wd;
      if (isStraight) straight++;
    }
    if (maxSkills && goals.length > maxSkills) rot = (rot + 1) % goals.length;
    const base = DAY_INFO[type].ids;
    week[wd] = { weekday: wd, type, skills, ids: [...skills, ...base.filter((id) => !skills.includes(id))] };
  });
  return week;
}

// Qué toca hoy según el plan semanal (o la alternancia A/B si no hay plan).
export function todayInfo(state, now = Date.now()) {
  if (state.plan?.ids?.length) return { mode: 'custom', plan: state.plan };
  const week = buildWeek(state);
  if (!week) return { mode: 'free', plan: currentPlan(state) };
  const wd = weekdayIndex(now);
  const today = week[wd];
  const trainedToday = state.sessions.some((s) => new Date(s.startedAt).toDateString() === new Date(now).toDateString());
  if (today.type !== 'R' && !trainedToday) {
    return { mode: 'scheduled', today, week, plan: { dayType: today.type, ids: today.ids } };
  }
  // Próximo día de entreno (esta semana o la siguiente).
  let next = week.slice(wd + 1).find((d) => d.type !== 'R');
  let nextWeek = false;
  if (!next) {
    const following = buildWeek(state, startOfWeek(now + 7 * 864e5));
    next = following?.find((d) => d.type !== 'R');
    nextWeek = true;
  }
  return {
    mode: trainedToday ? 'done' : 'rest',
    today, week, next, nextWeek,
    plan: next ? { dayType: next.type, ids: next.ids } : currentPlan(state),
  };
}
