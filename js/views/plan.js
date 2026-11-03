// Plan semanal recomendado: días disponibles, cuántos entrenar y reparto A/B/S.

import { ROADMAP_BY_ID } from '../data/roadmaps.js';
import { LIFTS, LIFT_BY_ID } from '../data/gym.js';
import { getState, update } from '../store.js';
import { stepOf, liftState, isGymLegs, sessionsInWeek, startOfWeek, skillRole, skillPicks } from '../logic.js';
import {
  WEEKDAYS, WD_SHORT, DEFAULT_DAYS, DAY_INFO, recommendDays, buildWeek, weekdayIndex,
  swapWeekDays, weekChanged, weekWarning,
} from '../schedule.js';
import { esc, icon, fmtKg, kgInput, parseKg, toast } from '../ui.js';
import { navigate } from '../router.js';

let moving = null; // día (0–6) cuyo entreno se está moviendo

export function dayChips(days) {
  return `<div class="wd-picker">${WD_SHORT.map((d, i) => `
    <button class="wd-chip ${days[i] ? 'on' : ''}" data-action="plan-day" data-i="${i}" aria-pressed="${!!days[i]}" aria-label="${WEEKDAYS[i]}">${d}</button>`).join('')}</div>`;
}

export function daysSegmented(state, rec) {
  return `<div class="segmented">${[2, 3, 4, 5, 6].map((n) => `
    <button class="${state.settings.daysPerWeek === n ? 'on' : ''} ${rec.days === n ? 'rec' : ''}" data-action="set-setting" data-key="daysPerWeek" data-value="${n}" aria-label="${n} días${rec.days === n ? ' (recomendado)' : ''}">${n}${rec.days === n ? '<i>★</i>' : ''}</button>`).join('')}</div>`;
}

// Dónde se entrena la pierna: con las rutas de calistenia o en el gimnasio con pesos.
export function legsSegmented(state) {
  const cur = state.settings.legs;
  return `<div class="segmented" role="radiogroup" aria-label="Pierna">${[['calistenia', 'Calistenia'], ['gym', 'Gimnasio']].map(([v, l]) => `
    <button role="radio" aria-checked="${cur === v}" class="${cur === v ? 'on' : ''}" data-action="set-legs" data-value="${v}">${l}</button>`).join('')}</div>`;
}

function liftWeights(state) {
  return `
    <ul class="lift-weights">${LIFTS.map((l) => {
      const p = liftState(state, l.id);
      return `
      <li>
        <label for="kg-${l.id}" class="grow"><strong>${esc(l.name)}</strong><span class="muted tiny block">${l.sets} × ${l.min}–${l.max} · sube ${esc(fmtKg(l.inc))}</span></label>
        <span class="load-field small">
          <input id="kg-${l.id}" class="load-input" type="text" inputmode="decimal" autocomplete="off" value="${esc(kgInput(p.kg))}" placeholder="—" data-change="lift-kg" data-id="${l.id}">
          <small>kg</small>
        </span>
      </li>`;
    }).join('')}</ul>`;
}

function legsCard(state) {
  const gym = isGymLegs(state);
  return `
    <section class="card legs-card">
      <h3>Pierna</h3>
      ${legsSegmented(state)}
      <p class="muted small">${gym
        ? 'Los días de torso hacen dominadas, fondos, remo, flexiones y core, con tus habilidades al principio. La pierna va en 2 días propios de gimnasio, con pesos y progresión por kilos.'
        : 'La pierna se entrena con las rutas de calistenia (sentadillas, pistol, curl nórdico) dentro de los días A y B.'}</p>
      ${gym ? `
        <h4>Tus pesos de trabajo</h4>
        <p class="muted small">Apunta el peso con el que haces hoy cada ejercicio. La app lo subirá cuando completes el rango de repeticiones. También puedes cambiarlo durante el entreno.</p>
        ${liftWeights(state)}` : ''}
    </section>`;
}

function chipFor(d, id) {
  const lift = LIFT_BY_ID[id];
  if (lift) {
    const kg = liftState(getState(), id).kg;
    return `<a class="mini-chip lift" href="#/ejercicio/${id}">${esc(lift.name)}${kg != null ? `<small> · ${esc(fmtKg(kg))}</small>` : ''}</a>`;
  }
  const r = ROADMAP_BY_ID[id];
  if (!r) return '';
  const role = d.skills.includes(id) ? skillRole(getState(), id) : null;
  const cls = role === 'mantener' ? 'skill keep' : d.skills.includes(id) ? 'skill' : '';
  return `<a class="mini-chip ${cls}" href="#/ruta/${id}">${esc(r.name)}<small> · ${esc(stepOf(id).step.name)}</small></a>`;
}

// Botones de cada día: entrenar esa rutina hoy y moverla a otro día (solo esta semana).
// Mientras se mueve un entreno, los días de hoy en adelante ofrecen «Aquí».
function dayActions(d, ctx) {
  const done = ctx.trained.has(d.weekday);
  if (ctx.moving !== null) {
    if (d.weekday === ctx.moving) return '<div class="week-actions"><span class="pill tiny accent">Moviendo…</span></div>';
    if (d.weekday < ctx.today || done) return '';
    return `<div class="week-actions"><button class="btn primary small" data-action="week-move-to" data-day="${d.weekday}">${icon('check', 16)} ${d.type === 'R' ? 'Aquí' : 'Cambiar aquí'}</button></div>`;
  }
  if (d.type === 'R') return '';
  if (done) return `<div class="week-actions"><span class="pill tiny ok">${icon('check', 13)} Hecho</span></div>`;
  return `
    <div class="week-actions">
      ${d.weekday !== ctx.today ? `<button class="btn ghost small" data-action="week-train-today" data-day="${d.weekday}">${icon('play', 15)} Entrenar hoy</button>` : ''}
      <button class="btn ghost small" data-action="week-move" data-day="${d.weekday}">${icon('swap', 16)} Mover</button>
    </div>`;
}

function dayRow(d, ctx) {
  const info = DAY_INFO[d.type];
  const isToday = d.weekday === ctx.today;
  const names = d.ids.map((id) => chipFor(d, id)).join('');
  const cls = [
    isToday ? 'today' : '',
    ctx.moving === d.weekday ? 'moving' : '',
    ctx.moving !== null && ctx.moving !== d.weekday && d.weekday >= ctx.today && !ctx.trained.has(d.weekday) ? 'target' : '',
    d.weekday < ctx.today ? 'past' : '',
  ].join(' ');
  return `
    <li class="week-row type-${d.type} ${cls}">
      <div class="week-day"><strong>${WD_SHORT[d.weekday]}</strong><span class="muted tiny">${WEEKDAYS[d.weekday].slice(0, 3)}</span></div>
      <span class="type-badge t-${d.type}">${esc(info.badge || d.type)}</span>
      <div class="grow">
        <div class="week-title">${esc(info.label)}${isToday ? ' <span class="pill tiny accent">Hoy</span>' : ''}${d.movedFrom !== undefined ? ` <span class="pill tiny">${icon('swap', 12)} del ${esc(WEEKDAYS[d.movedFrom].toLowerCase())}</span>` : ''}</div>
        ${d.type === 'R' ? `<div class="muted small">${esc(info.focus)}</div>` : `<div class="mini-chips">${names}</div>`}
      </div>
      ${ctx.enabled ? dayActions(d, ctx) : ''}
    </li>`;
}

// Esta semana: entrenar cualquier rutina hoy o mover entrenos de día.
function weekCard(state, week) {
  const ctx = {
    enabled: !!state.settings.schedule,
    today: weekdayIndex(),
    moving,
    trained: new Set(sessionsInWeek(state, startOfWeek(Date.now())).map((s) => weekdayIndex(s.startedAt))),
  };
  const src = moving !== null ? week[moving] : null;
  const warning = weekWarning(week);
  return `
    <section class="card week-card ${moving !== null ? 'is-moving' : ''}">
      <h3>Esta semana</h3>
      ${src
        ? `<div class="move-banner">
            <p><strong>¿A qué día pasas el ${esc(DAY_INFO[src.type].label)} del ${esc(WEEKDAYS[moving].toLowerCase())}?</strong> Si ese día ya tiene entreno, se intercambian.</p>
            <button class="btn ghost small" data-action="week-move-cancel">${icon('close', 16)} Cancelar</button>
          </div>`
        : '<p class="muted small">¿Un día no puedes? Toca «Mover» y elige otro. ¿Te apetece otra rutina? «Entrenar hoy». Los cambios valen solo para esta semana.</p>'}
      ${weekChanged(state) && moving === null ? `
        <div class="week-changed">
          <span>${icon('swap', 16)} Has movido entrenos esta semana. La que viene vuelve a tu plan.</span>
          <button class="link" data-action="week-reset">Deshacer cambios</button>
        </div>` : ''}
      ${warning ? `<p class="wiz-note">${icon('info', 14)}<span>${esc(warning)}</span></p>` : ''}
      <ol class="week-list">${week.map((d) => dayRow(d, ctx)).join('')}</ol>
      <p class="muted tiny">Toca un ejercicio para ver su vídeo y su técnica.</p>
    </section>`;
}

// Cómo se reparten tus habilidades (en rosa la que aprendes, en cian las que mantienes).
function skillReasons(state) {
  const { focus, maintain } = skillPicks(state);
  return `
        <li>La habilidad que aprendes (<span class="role-tag focus">foco</span>) va al principio en todos los días de torso; las de brazos rectos, la flexión de pino y el muscle-up, 3 días como mucho y nunca seguidos.${focus === 'pino' ? ' El pino, como práctica corta, en todos tus días de entreno.' : ''}</li>
        <li>Las que mantienes (<span class="role-tag keep">mantener</span>), 1–2 días por semana cada una y una por entreno, con 3 series de calidad.${maintain.length ? '' : ' Ahora no tienes ninguna.'}</li>
        <li>Brazos rectos (front lever, planche, back lever): como mucho 2 por sesión, 3 días por semana y nunca en días seguidos. Back lever y planche, nunca el mismo día.</li>`;
}

function legend(state) {
  if (isGymLegs(state)) {
    const row = (t) => `<li><span class="type-badge t-${t}">${esc(DAY_INFO[t].badge)}</span><div><strong>${esc(DAY_INFO[t].label)}</strong><span class="muted small">${esc(DAY_INFO[t].focus)}</span></div></li>`;
    return `
      <ul class="split-legend">${['TA', 'TB', 'P'].map(row).join('')}</ul>
      <ul class="reasons">
        <li>Torso y pierna alternos: con 5 días, torso lunes-miércoles-viernes y pierna martes-jueves (o los días que elijas).</li>
        <li>Cada día de torso trabaja los 4 patrones (tirón vertical y horizontal, fondos y flexiones), como la Recommended Routine. A y B cambian el orden: lo que va primero es lo que más fuerza gana.</li>
        <li>Los días de pierna son tu rutina completa, siempre en el mismo orden para poder comparar los pesos. Si puedes, sepáralos 72 h (por ejemplo martes y viernes): marca también el sábado como disponible.</li>
        ${skillReasons(state)}
        <li>Cada 5–6 semanas, una semana de descarga.</li>
      </ul>`;
  }
  return `
      <ul class="split-legend">
        <li><span class="type-badge t-A">A</span><div><strong>Día A</strong><span class="muted small">${esc(DAY_INFO.A.focus)}</span></div></li>
        <li><span class="type-badge t-B">B</span><div><strong>Día B</strong><span class="muted small">${esc(DAY_INFO.B.focus)}</span></div></li>
        <li><span class="type-badge t-S">S</span><div><strong>Día S</strong><span class="muted small">Tus habilidades y core; un día más ligero que solo aparece con 5 o más días y habilidades elegidas.</span></div></li>
      </ul>
      <ul class="reasons">
        <li>Cada patrón (tirón, empuje, pierna, core) se trabaja 2–3 veces por semana.</li>
        ${skillReasons(state)}
        <li>Cada 5–6 semanas, una semana de descarga.</li>
      </ul>`;
}

export function render() {
  const state = getState();
  const sched = state.settings.schedule || { days: DEFAULT_DAYS };
  const rec = recommendDays(state);
  const week = buildWeek({ ...state, settings: { ...state.settings, schedule: sched } });
  const trainDays = week.filter((d) => d.type !== 'R').length;
  return `
    <header class="page-head">
      <a class="back" href="#/">${icon('back', 18)} Hoy</a>
      <span class="eyebrow">Tu semana</span>
      <h1>Plan semanal</h1>
    </header>

    ${weekCard(state, week)}

    <section class="card rec-card">
      <span class="eyebrow">Recomendado para ti</span>
      <div class="row gap">
        <div class="hero-num">${rec.days}<small> días</small></div>
        <span class="pill accent">${esc(rec.level.label)}</span>
      </div>
      <ul class="reasons">${rec.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      ${state.settings.daysPerWeek !== rec.days ? `<button class="btn primary small" data-action="set-setting" data-key="daysPerWeek" data-value="${rec.days}">Usar ${rec.days} días</button>` : ''}
    </section>

    <section class="card">
      <h3>¿Qué días puedes entrenar?</h3>
      ${dayChips(sched.days)}
      <div class="field"><span>Días de entreno por semana</span>${daysSegmented(state, rec)}</div>
      ${!state.settings.schedule ? '<button class="btn primary" data-action="plan-enable">Activar plan semanal</button>' : ''}
      <p class="muted small">El plan reparte los ${trainDays} días para dejar descanso entre sesiones. ★ = recomendado.</p>
    </section>

    ${legsCard(state)}


    <section class="card">
      <h3>Cómo se reparte</h3>
      ${legend(state)}
    </section>
  `;
}

export const actions = {
  'week-move'(el, ctx) {
    moving = Number(el.dataset.day);
    ctx.rerender();
    document.querySelector('.week-card')?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
  },
  'week-move-cancel'(_, ctx) {
    moving = null;
    ctx.rerender();
  },
  'week-move-to'(el) {
    const from = moving;
    const to = Number(el.dataset.day);
    moving = null;
    if (from === null || from === to) { update(() => {}); return; }
    const type = buildWeek(getState())?.[from]?.type;
    update((s) => { swapWeekDays(s, from, to); });
    if (type && type !== 'R') toast(`${DAY_INFO[type].label} pasa al ${WEEKDAYS[to].toLowerCase()}`);
  },
  'week-reset'() {
    moving = null;
    update((s) => { s.weekMoves = null; });
    toast('Semana como en tu plan');
  },
  // Hace hoy la rutina de otro día de la semana (sin moverla de su día).
  'week-train-today'(el) {
    const day = buildWeek(getState())?.[Number(el.dataset.day)];
    if (!day || day.type === 'R') return;
    moving = null;
    update((s) => { s.plan = { dayType: day.type, ids: [...day.ids], custom: false, picked: true }; });
    toast(`Hoy: ${DAY_INFO[day.type].label}`);
    navigate('#/');
  },
  'plan-day'(el) {
    const i = Number(el.dataset.i);
    update((s) => {
      const days = [...(s.settings.schedule?.days || DEFAULT_DAYS)];
      days[i] = !days[i];
      if (!days.some(Boolean)) days[i] = true;
      s.settings.schedule = { days };
      s.plan = null;
    });
  },
  'plan-enable'() {
    update((s) => { s.settings.schedule = { days: [...DEFAULT_DAYS] }; s.plan = null; });
  },
  'set-legs'(el) {
    const value = el.dataset.value === 'gym' ? 'gym' : 'calistenia';
    update((s) => {
      if (s.settings.legs === value) return;
      s.settings.legs = value;
      s.plan = null;
      s.lastDayType = null;
    });
  },
};

export const changes = {
  'lift-kg'(el) {
    const id = el.dataset.id;
    if (!LIFT_BY_ID[id]) return;
    const kg = parseKg(el.value);
    if (Number.isNaN(kg)) { toast('Escribe el peso en kg, por ejemplo 62,5'); return; }
    el.value = kgInput(kg);
    update((s) => {
      s.lifts ||= {};
      const p = (s.lifts[id] ||= { kg: null, reps: null, stall: 0 });
      p.kg = kg;
    }, { silent: true });
  },
};
