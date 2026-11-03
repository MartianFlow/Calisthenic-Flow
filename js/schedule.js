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
import {
  currentPlan, startOfWeek, skillPicks, baseIds, clashes, PRACTICE_ID, isWorkout, isGymLegs, splitOf, legType, myDays, myDayOf,
  dayAccepts, dayGroups, GROUPS, groupOf,
} from './logic.js';
import { getState } from './store.js';

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
  const gymLegs = isGymLegs(state);
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
  const split = splitOf(state);
  if (split === 'etp') {
    days = level.key === 'avanzado' ? 6 : 5;
    reasons.push(days === 6
      ? 'Empuje, tirón y pierna con nivel avanzado: 6 días, cada grupo 2 veces por semana, que es lo que mejor funciona.'
      : 'Empuje, tirón y pierna: con 5 días cada grupo se entrena 2 veces (2 de pierna, uno de tirón, otro de empuje y uno de torso completo). Con 3 días, cada grupo solo una vez.');
  } else if (split === 'propia') {
    days = Math.max(1, (state.settings.myWeek || []).filter(Boolean).length);
    reasons.push('A tu manera: entrenas los días a los que asignas uno de tus días. Abajo verás si algún grupo muscular se queda con un solo día.');
  } else if (split === 'torso-pierna' && !isGymLegs(state)) {
    days = level.key === 'avanzado' ? 5 : 4;
    reasons.push(days === 5
      ? 'Torso y pierna con nivel avanzado: 3 días de torso y 2 de pierna, cada músculo 2–3 veces por semana.'
      : `Torso y pierna con nivel ${level.label.toLowerCase()}: 2 días de torso y 2 de pierna, cada músculo 2 veces por semana.`);
  } else if (split === 'torso-pierna') {
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
  if (available < days && split !== 'propia') {
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

// Con la pierna en el gimnasio se eligen a la vez los días y si cada uno es de torso
// o de pierna, entre todas las combinaciones posibles (como mucho unas pocas cientos):
//   · nunca dos días de pierna seguidos, y lo más separados posible (hasta 72–96 h,
//     lo que tardan en recuperarse la sentadilla y el peso muerto pesados);
//   · nunca dos días de torso seguidos (habilidades de brazos rectos);
//   · y, a igualdad, menos días seguidos y empezar antes en la semana.
// Días de pierna: 1 con 2–3 días de entreno, 2 con 4 o más. Los torsos alternan TA/TB
// (empezando por TB las semanas ISO impares).
const circGap = (a, b) => ((b - a + 7) % 7) || 7;

function combos(list, k, start = 0, acc = [], out = []) {
  if (acc.length === k) { out.push([...acc]); return out; }
  for (let i = start; i < list.length; i++) combos(list, k, i + 1, [...acc, list[i]], out);
  return out;
}

function gymScore(days, isLeg) {
  const n = days.length;
  let adj = 0; let torsoAdj = 0; let legAdj = 0;
  for (let i = 0; n > 1 && i < n; i++) {
    const j = (i + 1) % n;
    if (circGap(days[i], days[j]) !== 1) continue;
    adj++;
    if (isLeg[i] && isLeg[j]) legAdj++;
    else if (!isLeg[i] && !isLeg[j]) torsoAdj++;
  }
  const legs = days.filter((_, i) => isLeg[i]);
  const legGap = legs.length === 2 ? Math.min(circGap(legs[0], legs[1]), circGap(legs[1], legs[0])) : 4;
  return -1000 * legAdj - 100 * torsoAdj + 10 * Math.min(legGap, 4) - adj - days[0] * 0.1;
}

// Días de pierna: torso/pierna, 1 con 2–3 días y 2 con 4 o más; empuje/tirón/pierna, 1 con
// 2–4 días y 2 con 5 o más.
function legCount(split, k) {
  if (k <= 1) return 0;
  if (split === 'etp') return k >= 5 ? 2 : 1;
  return k <= 3 ? 1 : 2;
}

// Los días de torso en orden: TA/TB alternos; o tirón y empuje alternos, con un torso
// completo cuando queda uno suelto (1, 3 o 5 días de torso). Las semanas impares empieza el otro.
function upperTypes(split, u, odd) {
  if (split !== 'etp') return Array.from({ length: u }, (_, i) => ['TA', 'TB'][(i + (odd ? 1 : 0)) % 2]);
  const pair = odd ? ['E', 'T'] : ['T', 'E'];
  const seq = Array.from({ length: u - (u % 2) }, (_, i) => pair[i % 2]);
  return u % 2 ? [...seq, 'TC'] : seq;
}

export function gymDays(available, n, oddWeek, split = 'torso-pierna', leg = 'P') {
  const avail = available.map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
  const k = Math.max(1, Math.min(n, avail.length));
  const legs = legCount(split, k);
  let best = null;
  for (const days of combos(avail, k)) {
    for (const legIdx of combos(days.map((_, i) => i), legs)) {
      const isLeg = days.map((_, i) => legIdx.includes(i));
      const score = gymScore(days, isLeg);
      if (!best || score > best.score) best = { score, days, isLeg };
    }
  }
  const upper = upperTypes(split, best.isLeg.filter((x) => !x).length, oddWeek);
  let t = 0;
  return { days: best.days, types: best.isLeg.map((isLeg) => (isLeg ? leg : upper[t++])) };
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
  // Nombres de una versión anterior (Pierna A/B), para el historial.
  PA: { ...LEG_DAYS.P, label: 'Pierna A', badge: 'PA' },
  PB: { ...LEG_DAYS.P, label: 'Pierna B', badge: 'PB' },
  S: { label: 'Día S', badge: 'S', focus: 'Habilidades · Core', ids: ['core'] },
  pino: { label: 'Solo pino', badge: 'PN', focus: 'Práctica corta de pino (unos 10 min)', ids: ['pino'] },
  R: { label: 'Descanso', badge: '—', focus: 'Recuperación activa: caminar, movilidad o estiramientos suaves.', ids: [] },
};

// Insignia de un día propio: las iniciales de sus palabras («Pecho y tríceps» → «PT»).
function badgeOf(name) {
  const words = String(name).split(/\s+/).filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(w));
  const letters = (words.length >= 2 ? words.slice(0, 2).map((w) => w[0]) : [...(words[0] || name || '·').slice(0, 2)]).join('');
  return letters.toUpperCase();
}

// Datos de un tipo de día: los fijos (DAY_INFO) o uno de tus días («A tu manera»).
export function dayInfo(type, state = getState()) {
  if (DAY_INFO[type]) return DAY_INFO[type];
  const d = myDayOf(state, type);
  if (d) return { label: d.name, badge: badgeOf(d.name), focus: `${d.ids.length} ejercicio${d.ids.length === 1 ? '' : 's'}`, ids: d.ids, mine: true };
  return { label: 'Entreno', badge: '·', focus: '', ids: [] };
}

// Nombre de un tipo de día para el historial («Torso A», «Pierna B», «Día A»…). Un día tuyo
// que ya no existe se nombra con lo que se guardó en el entreno.
export function dayLabel(type, session = null) {
  if (type === 'libre') return 'Entreno libre';
  if (DAY_INFO[type]) return DAY_INFO[type].label;
  return myDayOf(getState(), type)?.name || session?.dayName || 'Entreno';
}

// Reparto de las habilidades en la semana (ver logic.js, «foco y mantenimiento»):
// · Pino de foco: práctica corta en todos los días de entreno (también los de pierna).
// · Foco: en todos los días de torso que permita su tipo. Brazos rectos, flexión de pino y
//   muscle-up: como mucho 3 días y nunca seguidos.
// · Mantener: cada una 1–2 días, nunca seguidos, y como mucho una por sesión (el pino no cuenta).
// · Brazos rectos (entre todas): como mucho 2 por sesión, 3 días por semana y nunca en días seguidos.
// · Back lever y planche, nunca el mismo día.
const NOT_BACK_TO_BACK = ['hspu', 'muscleup'];

function placeSkills(state, chosen, types, odd) {
  const { focus, maintain } = skillPicks(state);
  const straight = (id) => !!ROADMAP_BY_ID[id]?.straightArm;
  const on = {};           // id → días (weekday) en que ya está
  const straightDays = new Set();
  const days = chosen.map((wd, k) => ({ wd, type: types[k], skills: [] }));
  // Días con torso (la que aprendes va en todos) y días que encajan con una habilidad de
  // mantener (su grupo: tirón, empuje…; en los de torso completo, todas).
  const torso = (d) => dayAccepts(state, d.type);
  const fitsGroup = (id, d) => dayAccepts(state, d.type, id);
  const count = (id) => (on[id] || []).length;
  const near = (id, wd) => (on[id] || []).some((x) => Math.abs(x - wd) === 1);

  const fits = (id, day, role) => {
    if (role === 'foco') {
      if ((straight(id) || NOT_BACK_TO_BACK.includes(id)) && (count(id) >= 3 || near(id, day.wd))) return false;
    } else if (count(id) >= 2 || near(id, day.wd)) return false;
    if (clashes(id, day.skills)) return false;
    if (straight(id)) {
      if (day.skills.filter(straight).length >= 2) return false;
      if (straightDays.has(day.wd - 1) || straightDays.has(day.wd + 1)) return false;
      if (!straightDays.has(day.wd) && straightDays.size >= 3) return false;
    }
    return true;
  };
  const put = (id, day) => {
    day.skills.push(id);
    (on[id] ||= []).push(day.wd);
    if (straight(id)) straightDays.add(day.wd);
  };

  // 1. El pino de foco en todos los días y el foco en los que permita su tipo.
  const main = focus && focus !== PRACTICE_ID ? focus : null;
  for (const day of days) {
    if (focus === PRACTICE_ID) put(PRACTICE_ID, day);
    if (torso(day) && main && fits(main, day, 'foco')) put(main, day);
  }

  // 2. Las de mantener, 1–2 días cada una y una por sesión (el pino de mantener va aparte),
  //    mejor en los días con menos habilidades y lejos de sus otros días. Primero un día cada
  //    una y luego el segundo; las semanas impares empieza la otra.
  const others = maintain.filter((id) => id !== PRACTICE_ID);
  const order = odd ? [...others].reverse() : others;
  const load = (d) => d.skills.filter((x) => x !== PRACTICE_ID).length;
  const gap = (id, d) => Math.min(7, ...(on[id] || []).map((x) => Math.abs(x - d.wd)));
  const best = (id, pool) => pool.sort((x, y) => load(x) - load(y) || gap(id, y) - gap(id, x) || x.wd - y.wd)[0];
  // Con días de un solo grupo, primero los de su grupo y, si no hay ninguno, cualquiera con torso.
  for (const match of [fitsGroup, (id, d) => count(id) === 0 && torso(d)]) {
    for (let round = 1; round <= 2; round++) {
      if (maintain.includes(PRACTICE_ID) && count(PRACTICE_ID) < round) {
        const d = best(PRACTICE_ID, days.filter((x) => torso(x) && match(PRACTICE_ID, x) && !x.skills.includes(PRACTICE_ID) && fits(PRACTICE_ID, x, 'mantener')));
        if (d) d.skills.unshift(PRACTICE_ID), (on[PRACTICE_ID] ||= []).push(d.wd);
      }
      for (const id of order) {
        if (count(id) >= round) continue;
        const d = best(id, days.filter((x) => torso(x) && match(id, x) && !x.skills.some((y) => others.includes(y)) && fits(id, x, 'mantener')));
        if (d) put(id, d);
      }
    }
  }

  // 3. Una de mantener que no ha cabido porque choca con el foco (back lever y planche):
  //    ocupa el sitio del foco el último día en que aparece, si así le quedan al menos 2.
  for (const id of others) {
    if (count(id) || !main || !clashes(id, [main]) || count(main) <= 2) continue;
    const day = [...days].reverse().find((d) => d.skills.includes(main) && load(d) === 1);
    if (!day) continue;
    day.skills = day.skills.map((x) => (x === main ? id : x));
    on[main] = on[main].filter((x) => x !== day.wd);
    on[id] = [day.wd];
  }
  // Orden dentro del día: pino, foco y la de mantener.
  const rank = (x) => (x === PRACTICE_ID ? 0 : x === main ? 1 : 2);
  for (const d of days) d.skills.sort((x, y) => rank(x) - rank(y));
  return days;
}

// Construye la semana: [{ weekday, type, skills, ids }] para L…D.
export function buildWeek(state, weekStart = startOfWeek(Date.now())) {
  const sched = state.settings.schedule;
  const split = splitOf(state);
  if (!sched && split !== 'propia') return null;
  const { focus, maintain } = skillPicks(state);
  const hasSkills = !!focus || maintain.length > 0;
  const odd = isoWeek(weekStart) % 2 === 1;
  let chosen;
  let types;
  if (split === 'propia') {
    // A tu manera: cada día de la semana lleva el día tuyo que le asignaste.
    const wk = state.settings.myWeek || [];
    chosen = [];
    types = [];
    wk.forEach((id, i) => { if (id && myDayOf(state, id)) { chosen.push(i); types.push(id); } });
    if (!chosen.length) return null;
  } else if (split === 'torso-pierna' || split === 'etp') {
    const n = Math.min(state.settings.daysPerWeek, sched.days.filter(Boolean).length);
    ({ days: chosen, types } = gymDays(sched.days, n, odd, split, legType(state)));
  } else {
    const n = Math.min(state.settings.daysPerWeek, sched.days.filter(Boolean).length);
    chosen = pickDays(sched.days, n);
    types = weekTemplate(chosen.length, hasSkills, odd);
  }
  const week = WD_SHORT.map((_, i) => ({ weekday: i, type: 'R', skills: [], ids: [] }));
  const days = placeSkills(state, chosen, types, odd).map((d) => {
    const base = baseIds(state, d.type);
    return { ...d, ids: [...d.skills, ...base.filter((id) => !d.skills.includes(id))] };
  });
  // Sustituir en vez de sumar: el muscle-up ocupa el sitio de las dominadas de su día si otro
  // día de la semana las tiene sin muscle-up (si no, solo les quita una serie: trimmedRoutes).
  for (const d of days) {
    if (!d.skills.includes('muscleup') || !d.ids.includes('dominadas')) continue;
    if (days.some((o) => o !== d && o.ids.includes('dominadas') && !o.skills.includes('muscleup'))) d.ids = d.ids.filter((id) => id !== 'dominadas');
  }
  for (const { wd, type, skills, ids } of days) week[wd] = { weekday: wd, type, skills, ids };
  return applyWeekMoves(state, week, weekStart);
}

// ─────────── Cambios solo para esta semana (mover entrenos de día) ───────────
// state.weekMoves = { start, sig, from[7] }: en cada día va el entreno que el plan ponía en
// el día from[i] (-1 = descanso). Vale solo para la semana que empieza en `start` y solo si
// el plan no ha cambiado desde entonces (`sig`); si no, se ignora y queda el plan normal.
const weekSig = (week) => week.map((d) => d.type).join(',');

function applyWeekMoves(state, week, weekStart) {
  const m = state.weekMoves;
  if (!m || m.start !== weekStart || m.sig !== weekSig(week) || !Array.isArray(m.from)) return week;
  return week.map((_, i) => {
    const src = m.from[i];
    if (src == null || src < 0 || !week[src]) return { weekday: i, type: 'R', skills: [], ids: [] };
    return { ...week[src], weekday: i, movedFrom: src !== i ? src : undefined };
  });
}

// Intercambia lo que hay en los días a y b de esta semana (entreno o descanso).
export function swapWeekDays(state, a, b, weekStart = startOfWeek(Date.now())) {
  const base = buildWeek({ ...state, weekMoves: null }, weekStart);
  if (!base) return;
  const sig = weekSig(base);
  const m = state.weekMoves;
  const from = m && m.start === weekStart && m.sig === sig ? [...m.from] : base.map((d) => (d.type === 'R' ? -1 : d.weekday));
  [from[a], from[b]] = [from[b], from[a]];
  const untouched = from.every((v, i) => v === (base[i].type === 'R' ? -1 : i));
  state.weekMoves = untouched ? null : { start: weekStart, sig, from };
}

// ¿Esta semana tiene entrenos movidos de día (y siguen valiendo)?
export function weekChanged(state) {
  const m = state.weekMoves;
  if (!m || m.start !== startOfWeek(Date.now())) return false;
  const base = buildWeek({ ...state, weekMoves: null });
  return !!base && m.sig === weekSig(base);
}

// Aviso si, tras mover, quedan seguidos dos días de pierna, dos con brazos rectos o dos con
// la misma flexión de pino o muscle-up.
export function weekWarning(week, state = getState()) {
  const name = (id) => ROADMAP_BY_ID[id].name;
  const legDay = (t) => t === 'P' || t === 'PC' || (myDayOf(state, t) && !dayAccepts(state, t) && dayGroups(state, t).has('pierna'));
  for (let i = 0; i < 6; i++) {
    const a = week[i];
    const b = week[i + 1];
    if (a.type === 'R' || b.type === 'R') continue;
    if (legDay(a.type) && legDay(b.type)) return 'Ojo: quedan dos días de pierna seguidos. Mejor dejar 48–72 h entre ellos.';
    const sa = a.skills.filter((id) => ROADMAP_BY_ID[id]?.straightArm);
    const sb = b.skills.filter((id) => ROADMAP_BY_ID[id]?.straightArm);
    if (sa.length && sb.length) {
      const same = sa.find((id) => sb.includes(id));
      return same
        ? `Ojo: ${name(same)} queda en dos días seguidos. Los tendones necesitan descanso entre sesiones.`
        : `Ojo: quedan dos días seguidos con brazos rectos (${name(sa[0])} y ${name(sb[0])}). Los tendones necesitan descanso entre sesiones.`;
    }
    const hard = NOT_BACK_TO_BACK.find((id) => a.skills.includes(id) && b.skills.includes(id));
    if (hard) return `Ojo: ${name(hard)} queda en dos días seguidos. Mejor dejar un día de descanso entre medias.`;
  }
  return '';
}

// Cuántos días por semana se trabaja cada grupo (empuje, tirón, pierna), con lo que lleva cada
// día y sus habilidades. Avisa de los que se quedan en 1 día (con 2 se progresa más) o en ninguno.
export const FREQ_GROUPS = ['empuje', 'tiron', 'pierna'];
export function groupDays(state, week) {
  const out = Object.fromEntries(FREQ_GROUPS.map((g) => [g, 0]));
  for (const d of week || []) {
    if (d.type === 'R') continue;
    // (el pino es una práctica corta: no cuenta como día de empuje)
    const g = new Set([...d.ids, ...(d.skills || [])].filter((id) => id !== PRACTICE_ID).map((id) => groupOf(id, state)));
    for (const k of FREQ_GROUPS) if (g.has(k)) out[k]++;
  }
  return out;
}

export function frequencyWarnings(state, week) {
  if (!week) return [];
  const counts = groupDays(state, week);
  const name = (g) => (g === 'pierna' ? 'la pierna' : `el ${GROUPS[g].label.toLowerCase()}`);
  const list = (gs) => (gs.length === 1 ? gs[0] : `${gs.slice(0, -1).join(', ')} y ${gs[gs.length - 1]}`);
  const one = FREQ_GROUPS.filter((g) => counts[g] === 1).map(name);
  const none = FREQ_GROUPS.filter((g) => counts[g] === 0).map(name);
  const out = [];
  if (one.length) {
    const text = list(one);
    out.push(`${text[0].toUpperCase()}${text.slice(1)} solo se ${one.length === 1 ? 'entrena' : 'entrenan'} 1 día por semana: con 2 se progresa más. Añade un día o algún ejercicio de ${one.length === 1 ? 'ese grupo' : 'esos grupos'} en otro día.`);
  }
  if (none.length) out.push(`Ningún día trabaja ${list(none)}.`);
  return out;
}

// Qué toca hoy según el plan semanal (o la alternancia A/B si no hay plan).
export function todayInfo(state, now = Date.now()) {
  if (state.plan?.ids?.length) return { mode: 'custom', plan: state.plan };
  const week = buildWeek(state);
  if (!week) return { mode: 'free', plan: currentPlan(state) };
  const wd = weekdayIndex(now);
  const today = week[wd];
  const trainedToday = state.sessions.some((s) => isWorkout(s) && new Date(s.startedAt).toDateString() === new Date(now).toDateString());
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
