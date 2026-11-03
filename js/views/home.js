// Pantalla "Hoy": qué toca según tu plan semanal, tu héroe, la semana y tus objetivos.

import { headActions } from '../theme.js';
import { ROADMAPS, ROADMAP_BY_ID } from '../data/roadmaps.js';
import { LIFTS, LIFT_BY_ID } from '../data/gym.js';
import { getState, update } from '../store.js';
import {
  defaultIds, estimateMinutes, stepOf, createSession, startOfWeek, dayOrder, isGymLegs,
  sessionsInWeek, roadmapPercent, lastPerformance, lastLift, liftState, liftGoal, workFor, deloadActive, deloadSuggestion, startDeload,
  skillRole, plannedSets, skillPicks, PRACTICE_ID, PRACTICE_DAY, noSkillsYet, recommendedSkills,
  sessionLayout, accInfo, lastAccessory, trimmedRoutes,
} from '../logic.js';
import { todayInfo, buildWeek, DAY_INFO, WEEKDAYS, WD_SHORT, weekdayIndex } from '../schedule.js';
import { esc, icon, fmtClock, progressBar, fmtDate, fmtKg, fmtSeries, fmtLiftSeries, toast } from '../ui.js';
import { navigate } from '../router.js';
import { audio, wakeLock } from '../device.js';
import { heroMini } from './hero.js';
import { roleTag, prereqNote, achievedCard, skillsNotice, listText } from './skills.js';

let editing = false;

function weekStrip(state) {
  const ws = startOfWeek(Date.now());
  const list = sessionsInWeek(state, ws);
  const today = weekdayIndex();
  const trainedDays = new Set(list.map((s) => weekdayIndex(s.startedAt)));
  const goal = state.settings.daysPerWeek;
  const week = buildWeek(state);
  const dots = WD_SHORT.map((l, i) => {
    const type = week?.[i]?.type;
    const planned = type && type !== 'R';
    return `
    <div class="day ${trainedDays.has(i) ? 'on' : ''} ${i === today ? 'today' : ''} ${planned ? 'planned' : ''}">
      <span class="dot">${trainedDays.has(i) ? icon('check', 14) : planned ? `<b>${esc(DAY_INFO[type]?.badge || type)}</b>` : ''}</span>
      <span class="lbl">${l}</span>
    </div>`;
  }).join('');
  return `
    <section class="card week">
      <div class="row between">
        <h3>Esta semana</h3>
        <span class="pill ${list.length >= goal ? 'ok' : ''}">${list.length}/${goal} entrenos</span>
      </div>
      <div class="days">${dots}</div>
      <div class="row between wrap">
        <a class="link" href="#/plan">${icon('route', 16)} ${week ? 'Plan semanal' : 'Crear plan semanal'}</a>
        <a class="link" href="#/calendario">${icon('calendar', 16)} Calendario</a>
      </div>
    </section>`;
}

// Nombre del ejercicio con el icono ▶ pegado a la última palabra (no se queda solo en otra línea).
function titleWithPlay(name, hasVideo) {
  if (!hasVideo) return esc(name);
  const cut = name.lastIndexOf(' ');
  const play = `<span class="ex-play" aria-hidden="true">${icon('play', 11)}</span>`;
  return `${esc(name.slice(0, cut + 1))}<span class="nowrap">${esc(name.slice(cut + 1))}${play}</span>`;
}

function editButtons(id, idx) {
  if (!editing) return '';
  return `
        <div class="edit-btns">
          <button class="icon-btn up" data-action="plan-move" data-id="${id}" data-dir="-1" aria-label="Subir" ${idx === 0 ? 'disabled' : ''}>${icon('back', 18)}</button>
          <button class="icon-btn danger" data-action="plan-remove" data-id="${id}" aria-label="Quitar">${icon('close', 18)}</button>
        </div>`;
}

function liftRow(state, id, idx, dayType, pos = idx) {
  const lift = LIFT_BY_ID[id];
  const p = liftState(state, id);
  const last = lastLift(state, id);
  const sets = DAY_INFO[dayType]?.sets?.[id] ?? lift.sets;
  return `
    <li class="ex-row">
      <span class="num">${idx + 1}</span>
      <a class="grow ex-link" href="#/ejercicio/${id}" aria-label="Ver ${esc(lift.name)}: vídeo y técnica">
        <div class="ex-title">${titleWithPlay(lift.name, !!lift.video)}</div>
        <div class="muted small">Gimnasio · ${esc(lift.muscle)}</div>
        ${last ? `<div class="muted small">Última vez: ${esc(fmtLiftSeries(last.sets, last.loads))}</div>` : ''}
      </a>
      <div class="ex-target">${sets} × ${liftGoal(lift, p)}<small>${esc(fmtKg(p.kg))}</small></div>
      ${editButtons(id, pos)}
    </li>`;
}

// Complementario de la habilidad de foco (no se edita: va con su habilidad).
function accRow(state, e, idx) {
  const info = accInfo(e.acc);
  const last = lastAccessory(state, e.acc);
  const sets = deloadActive(state) ? Math.max(2, e.sets - 1) : e.sets;
  return `
    <li class="ex-row acc-row">
      <span class="num">${idx + 1}</span>
      <div class="grow">
        <div class="ex-title">${esc(info.name)}</div>
        <div class="muted small">${e.prep ? 'Preparación' : 'Complementario'} · ${esc(ROADMAP_BY_ID[e.of].name)}</div>
        ${last ? `<div class="muted small">Última vez: ${esc(fmtSeries(info.type, last))}</div>` : ''}
      </div>
      <div class="ex-target">${sets} × ${e.target}<small>${info.type === 'hold' ? 'seg' : 'reps'}${info.side ? ' /lado' : ''}</small></div>
    </li>`;
}

function exerciseRow(state, id, idx, dayType, trim = new Set(), pos = idx) {
  if (LIFT_BY_ID[id]) return liftRow(state, id, idx, dayType, pos);
  if (!ROADMAP_BY_ID[id]) return '';
  const { roadmap, step, index } = stepOf(id);
  const last = lastPerformance(state, id, index);
  const role = skillRole(state, id);
  const goal = workFor(id);
  const sets = Math.max(2, plannedSets(state, id, step, deloadActive(state)) - (trim.has(id) ? 1 : 0));
  const what = role && id === PRACTICE_ID ? 'Práctica de pino · 5–10 min' : `${esc(roadmap.name)} · paso ${index + 1}/${roadmap.steps.length}`;
  return `
    <li class="ex-row ${role ? `role-${role === 'foco' ? 'focus' : 'keep'}` : ''}">
      <span class="num">${idx + 1}</span>
      <a class="grow ex-link" href="#/ruta/${id}" aria-label="Ver ${esc(step.name)}: vídeo y técnica">
        <div class="ex-title">${titleWithPlay(step.name, !!step.video)}</div>
        <div class="muted small">${what} ${roleTag(role)}${trim.has(id) ? ' · <span class="trim-tag">−1 serie</span>' : ''}</div>
        ${last ? `<div class="muted small">Última vez: ${esc(fmtSeries(step.type, last))}</div>` : ''}
      </a>
      <div class="ex-target">${sets} × ${goal}<small>${step.type === 'hold' ? 'seg' : goal === 1 ? 'rep' : 'reps'}${step.side ? ' /lado' : ''}</small>
        ${goal < step.target ? `<small>meta ${step.target}</small>` : ''}</div>
      ${editButtons(id, pos)}
    </li>`;
}

function nextLabel(info) {
  if (!info.next) return '';
  return `${info.nextWeek ? 'La semana que viene, ' : ''}${WEEKDAYS[info.next.weekday].toLowerCase()}: ${DAY_INFO[info.next.type].label}`;
}

// Ejercicios de una rutina del plan: los de ese día de esta semana (con sus habilidades)
// o, si esta semana no toca, los de su plantilla.
export function idsForType(state, type) {
  const day = buildWeek(state)?.find((d) => d.type === type);
  if (day) return [...day.ids];
  return defaultIds(state, type);
}

// Rutinas del plan (Día A, Día B, Torso, Pierna…) para elegir con un toque.
function routineChoices(state, currentType) {
  const types = [...dayOrder(state)];
  for (const d of buildWeek(state) || []) if (d.type !== 'R' && !types.includes(d.type)) types.push(d.type);
  return `<div class="pick-chips" role="group" aria-label="Rutinas del plan">${types.map((t) => `
    <button class="goal-chip ${t === currentType ? 'on' : ''}" data-action="plan-pick" data-type="${t}" aria-pressed="${t === currentType}">${esc(DAY_INFO[t].label)}</button>`).join('')}</div>`;
}

// «Solo pino»: en un día de descanso, una práctica corta de pino sin calentamiento general.
function pinoOnly(state) {
  const { focus, maintain } = skillPicks(state);
  if (focus !== PRACTICE_ID && !maintain.includes(PRACTICE_ID)) return '';
  const today = new Date().toDateString();
  if (state.sessions.some((s) => s.dayType === PRACTICE_DAY && new Date(s.startedAt).toDateString() === today)) {
    return `<p class="pino-done small">${icon('check', 16)} Práctica de pino hecha hoy</p>`;
  }
  const { step } = stepOf(PRACTICE_ID);
  return `
    <div class="pino-only">
      <button class="btn primary" data-action="pino-only">${icon('play', 18)} Solo pino (10 min)</button>
      <span class="muted small">El equilibrio mejora con práctica corta y frecuente: ${esc(step.name)}, sin el resto del entreno.</span>
    </div>`;
}

function restCard(state, info) {
  const done = info.mode === 'done';
  return `
    <section class="card plan rest">
      <span class="eyebrow">${done ? '¡Hecho por hoy!' : 'Hoy toca descanso'}</span>
      <h2>${done ? 'Misión cumplida' : 'Recupera'}</h2>
      <p class="small">${done ? 'Buen trabajo. El músculo crece mientras descansas.' : esc(DAY_INFO.R.focus)}</p>
      ${info.next ? `<div class="next-up">${icon('next', 16)} Próximo: <strong>${esc(nextLabel(info))}</strong></div>` : ''}
      ${done ? '' : pinoOnly(state)}
      <div class="row gap wrap">
        <button class="btn ghost" data-action="train-anyway">${icon('play', 18)} ${done ? 'Entrenar otra vez' : 'Entrenar igualmente'}</button>
        <a class="btn ghost" href="#/plan">${icon('route', 18)} Ver plan</a>
      </div>
      <div class="pick">
        <span class="muted small">O elige una rutina de tu plan:</span>
        ${routineChoices(state, null)}
      </div>
    </section>`;
}

function exerciseRows(state, plan) {
  const trim = trimmedRoutes(plan.ids);
  return sessionLayout(state, plan.ids).map((e, i) => (e.acc ? accRow(state, e, i) : exerciseRow(state, e.id, i, plan.dayType, trim, plan.ids.indexOf(e.id)))).join('');
}

function planCard(state, info) {
  const plan = info.plan;
  const tpl = DAY_INFO[plan.dayType];
  const minutes = estimateMinutes(state, plan.ids);
  const available = ROADMAPS.filter((r) => !plan.ids.includes(r.id));
  const availableLifts = isGymLegs(state) ? LIFTS.filter((l) => !plan.ids.includes(l.id)) : [];
  const eyebrow = info.mode === 'scheduled' ? `Hoy toca · ${WEEKDAYS[weekdayIndex()]}` : plan.custom ? 'Entreno editado' : plan.picked ? 'Elegido para hoy' : 'Próximo entreno';
  return `
    <section class="card plan">
      <div class="row between">
        <div>
          <div class="eyebrow">${esc(eyebrow)}</div>
          <h2>${tpl ? esc(tpl.label) : 'Entreno personalizado'}${plan.custom ? ' <span class="pill">editado</span>' : ''}</h2>
          ${tpl ? `<div class="muted small">${esc(tpl.focus)}</div>` : ''}
        </div>
        <div class="est">${icon('timer', 18)}<span>≈ ${minutes} min</span></div>
      </div>
      <ol class="ex-list">${exerciseRows(state, plan)}</ol>
      ${editing ? '' : `<p class="muted tiny ex-hint">${icon('play', 11)} Toca un ejercicio para ver su vídeo y su técnica.</p>`}
      ${editing ? `
        <div class="edit-panel">
          <label class="field">
            <span>Añadir ejercicio</span>
            <select data-change="plan-add">
              <option value="">Elige un ejercicio…</option>
              <optgroup label="Rutas de calistenia">
              ${available.map((r) => `<option value="${r.id}">${esc(r.name)} — ${esc(stepOf(r.id).step.name)}</option>`).join('')}
              </optgroup>
              ${availableLifts.length ? `<optgroup label="Pierna en el gimnasio">
              ${availableLifts.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join('')}
              </optgroup>` : ''}
            </select>
          </label>
          <div class="field"><span>Entrenar otra rutina del plan</span>${routineChoices(state, plan.dayType)}</div>
          <button class="btn ghost" data-action="plan-reset">Restablecer</button>
        </div>` : ''}
      <div class="row gap">
        <button class="btn primary grow cta" data-action="start-session" ${plan.ids.length ? '' : 'disabled'}>${icon('play', 18)} Empezar entreno</button>
        ${editing
          ? `<button class="btn ghost square" data-action="plan-edit" aria-label="Listo: terminar de editar" title="Listo">${icon('check', 22)}</button>`
          : `<button class="btn ghost square" data-action="plan-edit" aria-label="Editar el entreno de hoy" title="Editar">${icon('edit', 20)}</button>`}
      </div>
    </section>`;
}

// Tus habilidades: la que aprendes (foco) y las que mantienes.
function skillRow(r, role) {
  const { step, index } = stepOf(r.id);
  return `
    <a class="goal ${role === 'foco' ? 'is-focus' : 'is-keep'}" href="#/ruta/${r.id}">
      <div class="row between"><strong>${esc(r.name)}</strong><span class="muted small">${index + 1}/${r.steps.length}</span></div>
      <div class="muted small">${esc(step.name)} ${roleTag(role)}</div>
      ${progressBar(roadmapPercent(r.id))}
    </a>`;
}

function goalsCard(state) {
  const { focus, maintain } = skillPicks(state);
  if (!focus && !maintain.length) {
    const rec = noSkillsYet(state) ? recommendedSkills(state).map((id) => ROADMAP_BY_ID[id].name) : [];
    return `
      <section class="card">
        <h3>Tus habilidades</h3>
        <p class="muted">Elige una habilidad para aprender (pino, front lever, muscle-up…) y, si ya dominas alguna, hasta 2 para mantener. Irán al principio de tus entrenos.</p>
        ${rec.length ? `<p class="small">${icon('star', 14)} Para empezar te recomendamos <strong>${esc(listText(rec))}</strong>: ya tienes la base o estás cerca.</p>` : ''}
        <button class="btn ghost" data-action="skills-review">${icon('target', 18)} Elegir habilidades</button>
      </section>`;
  }
  return `
    <section class="card">
      <div class="row between"><h3>Tus habilidades</h3><a class="link" href="#/rutas">Ver rutas</a></div>
      ${focus ? '' : `<p class="small">${icon('star', 14)} ¿Quieres aprender una nueva? <button class="link" data-action="skills-review">Elegir</button></p>`}
      <div class="goal-list">
        ${focus ? skillRow(ROADMAP_BY_ID[focus], 'foco') : ''}
        ${maintain.map((id) => skillRow(ROADMAP_BY_ID[id], 'mantener')).join('')}
      </div>
      ${prereqNote(state)}
    </section>`;
}

function deloadCard(state) {
  if (deloadActive(state)) {
    return `
      <section class="card deload-card">
        <span class="eyebrow">Semana de descarga</span>
        <h3>Recupera hasta el ${esc(fmtDate(state.deload.until))}</h3>
        <p class="small">Una serie menos y objetivos al ~65 %. Tus tendones y articulaciones se adaptan; esta semana no subes de nivel.</p>
        <button class="btn ghost small" data-action="deload-end">Terminar descarga</button>
      </section>`;
  }
  const sug = deloadSuggestion(state);
  if (!sug) return '';
  const why = sug.reason === 'stall'
    ? `Tienes ${sug.stalled} rutas estancadas.`
    : `Llevas ${sug.weeks} semanas entrenando sin descanso.`;
  return `
    <section class="card deload-card">
      <span class="eyebrow">¿Toca descarga?</span>
      <h3>Una semana más suave</h3>
      <p class="small">${why} Una semana de descarga (misma frecuencia, menos volumen) ayuda a recuperar y suele romper el estancamiento.</p>
      <div class="row gap wrap">
        <button class="btn primary small" data-action="deload-start">Empezar (7 días)</button>
        <button class="btn ghost small" data-action="deload-snooze">Ahora no</button>
      </div>
    </section>`;
}

export function render() {
  const state = getState();
  const active = state.active;
  const info = todayInfo(state);
  const hour = new Date().getHours();
  const hello = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  let main;
  if (active) {
    main = `
      <section class="card resume">
        <div class="row between">
          <div>
            <div class="eyebrow">Entreno en curso</div>
            <div class="big-clock" data-tick="elapsed">${fmtClock((Date.now() - active.startedAt) / 1000)}</div>
          </div>
          <button class="btn primary" data-action="go-session">${icon('play', 18)} Continuar</button>
        </div>
      </section>`;
  } else if (info.mode === 'rest' || info.mode === 'done') {
    main = restCard(state, info);
  } else {
    main = planCard(state, info);
  }
  return `
    <header class="page-head row between">
      <div class="col"><div class="eyebrow">${hello}</div><h1>Hoy</h1></div>
      ${headActions(state.settings.theme)}
    </header>
    ${skillsNotice(state)}
    ${achievedCard(state)}
    ${main}
    ${heroMini(state)}
    ${deloadCard(state)}
    ${weekStrip(state)}
    ${goalsCard(state)}
  `;
}

function mutatePlan(fn) {
  update((s) => {
    const base = todayInfo(s).plan;
    const plan = { dayType: base.dayType, ids: [...base.ids], custom: true };
    fn(plan, s);
    s.plan = plan;
  });
}

export const actions = {
  'start-session'() {
    const state = getState();
    const plan = todayInfo(state).plan;
    if (!plan.ids.length) return;
    audio.unlock();
    editing = false;
    update((s) => { s.active = createSession(s, plan); });
    wakeLock.request();
    navigate('#/entreno');
  },
  'pino-only'() {
    const state = getState();
    if (state.active && !confirm('Ya tienes un entreno en curso. ¿Descartarlo y empezar este?')) return;
    audio.unlock();
    update((s) => { s.active = createSession(s, { dayType: PRACTICE_DAY, ids: [PRACTICE_ID], warmup: 'extras' }); });
    wakeLock.request();
    navigate('#/entreno');
  },
  'train-anyway'() {
    update((s) => {
      const base = todayInfo(s).plan;
      s.plan = { dayType: base.dayType, ids: [...base.ids], custom: false };
    });
  },
  'go-session'() {
    audio.unlock();
    wakeLock.request();
    navigate('#/entreno');
  },
  'plan-edit'(_, ctx) {
    editing = !editing;
    ctx.rerender();
  },
  'plan-remove'(el) {
    mutatePlan((plan) => { plan.ids = plan.ids.filter((id) => id !== el.dataset.id); });
  },
  'plan-move'(el) {
    mutatePlan((plan) => {
      const i = plan.ids.indexOf(el.dataset.id);
      if (i > 0) [plan.ids[i - 1], plan.ids[i]] = [plan.ids[i], plan.ids[i - 1]];
    });
  },
  // Elige una rutina del plan para hoy (Día A, Día B, Torso, Pierna…).
  'plan-pick'(el) {
    const type = el.dataset.type;
    if (!DAY_INFO[type]) return;
    update((s) => { s.plan = { dayType: type, ids: idsForType(s, type), custom: false, picked: true }; });
    toast(`Hoy: ${DAY_INFO[type].label}`);
  },
  'plan-reset'() {
    update((s) => { s.plan = null; });
  },
  'deload-start'() { update((s) => startDeload(s)); },
  'deload-end'() { update((s) => { if (s.deload) s.deload.until = Date.now(); }); },
  'deload-snooze'() { update((s) => { s.deloadSnoozeUntil = Date.now() + 7 * 24 * 60 * 60 * 1000; }); },
};

export const changes = {
  'plan-add'(el) {
    const id = el.value;
    if (!id) return;
    mutatePlan((plan) => { if (!plan.ids.includes(id)) plan.ids.push(id); });
  },
};
