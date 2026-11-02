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

import { ROADMAP_BY_ID, ROADMAPS, DAY_TEMPLATES } from './data/roadmaps.js';
import { getProgress } from './store.js';
import { currentPlan, startOfWeek } from './logic.js';

export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const WD_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const DEFAULT_DAYS = [true, false, true, false, true, false, false];

export const weekdayIndex = (ts = Date.now()) => (new Date(ts).getDay() + 6) % 7;

export function trainingLevel(state) {
  const basics = ROADMAPS.filter((r) => r.category === 'fuerza');
  const frac = basics.reduce((a, r) => {
    const p = getProgress(r.id);
    return a + (p.step + (p.done ? 1 : 0)) / r.steps.length;
  }, 0) / basics.length;
  if (state.sessions.length < 8 || frac < 0.3) return { key: 'principiante', label: 'Principiante', frac };
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
  if (level.key === 'principiante') {
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
  S: { label: 'Día S', focus: 'Habilidades · Core', ids: ['core'] },
  R: { label: 'Descanso', focus: 'Recuperación activa: caminar, movilidad o estiramientos suaves.', ids: [] },
};

// Construye la semana: [{ weekday, type, skills, ids }] para L…D.
export function buildWeek(state, weekStart = startOfWeek(Date.now())) {
  const sched = state.settings.schedule;
  if (!sched) return null;
  const goals = state.settings.goals.filter((id) => ROADMAP_BY_ID[id]);
  const n = Math.min(state.settings.daysPerWeek, sched.days.filter(Boolean).length);
  const chosen = pickDays(sched.days, n);
  const types = weekTemplate(chosen.length, goals.length > 0, isoWeek(weekStart) % 2 === 1);
  const week = WD_SHORT.map((_, i) => ({ weekday: i, type: 'R', skills: [], ids: [] }));
  const count = {};
  const lastDay = {};
  let rot = 0;
  chosen.forEach((wd, k) => {
    const type = types[k];
    const maxSkills = type === 'S' ? 3 : 2;
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
    if (goals.length > maxSkills) rot = (rot + 1) % goals.length;
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
