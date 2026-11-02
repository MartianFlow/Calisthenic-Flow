// Pantalla "Hoy": qué toca según tu plan semanal, tu héroe, la semana y tus objetivos.

import { ROADMAPS, ROADMAP_BY_ID } from '../data/roadmaps.js';
import { getState, update } from '../store.js';
import {
  defaultIds, estimateMinutes, stepOf, createSession, startOfWeek,
  sessionsInWeek, roadmapPercent, lastPerformance, workFor, deloadActive, deloadSuggestion, startDeload,
} from '../logic.js';
import { todayInfo, buildWeek, DAY_INFO, WEEKDAYS, WD_SHORT, weekdayIndex } from '../schedule.js';
import { esc, icon, fmtClock, progressBar, unitLabel, fmtDate } from '../ui.js';
import { navigate } from '../router.js';
import { audio, wakeLock } from '../device.js';
import { heroMini } from './hero.js';

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
      <span class="dot">${trainedDays.has(i) ? icon('check', 14) : planned ? `<b>${type}</b>` : ''}</span>
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

function exerciseRow(state, id, idx) {
  const { roadmap, step, index } = stepOf(id);
  const last = lastPerformance(state, id, index);
  const isGoal = state.settings.goals.includes(id);
  const goal = workFor(id);
  return `
    <li class="ex-row">
      <span class="num">${idx + 1}</span>
      <div class="grow">
        <div class="ex-title">${esc(step.name)}</div>
        <div class="muted small">${esc(roadmap.name)} · paso ${index + 1}/${roadmap.steps.length}${isGoal ? ' · <span class="accent-text">objetivo</span>' : ''}</div>
        ${last ? `<div class="muted small">Última vez: ${last.map((v) => unitLabel(step.type, v)).join(' · ')}</div>` : ''}
      </div>
      <div class="ex-target">${step.sets} × ${esc(unitLabel(step.type, goal))}${step.side ? '<small> /lado</small>' : ''}
        ${goal < step.target ? `<div class="muted tiny">meta ${step.target}${step.type === 'hold' ? ' s' : ''}</div>` : ''}</div>
      ${editing ? `
        <div class="edit-btns">
          <button class="icon-btn up" data-action="plan-move" data-id="${id}" data-dir="-1" aria-label="Subir" ${idx === 0 ? 'disabled' : ''}>${icon('back', 18)}</button>
          <button class="icon-btn danger" data-action="plan-remove" data-id="${id}" aria-label="Quitar">${icon('close', 18)}</button>
        </div>` : ''}
    </li>`;
}

function nextLabel(info) {
  if (!info.next) return '';
  return `${info.nextWeek ? 'La semana que viene, ' : ''}${WEEKDAYS[info.next.weekday].toLowerCase()}: ${DAY_INFO[info.next.type].label}`;
}

function restCard(info) {
  const done = info.mode === 'done';
  return `
    <section class="card plan rest">
      <span class="eyebrow">${done ? '¡Hecho por hoy!' : 'Hoy toca descanso'}</span>
      <h2>${done ? 'Misión cumplida' : 'Recupera'}</h2>
      <p class="small">${done ? 'Buen trabajo. El músculo crece mientras descansas.' : esc(DAY_INFO.R.focus)}</p>
      ${info.next ? `<div class="next-up">${icon('next', 16)} Próximo: <strong>${esc(nextLabel(info))}</strong></div>` : ''}
      <div class="row gap wrap">
        <button class="btn ghost" data-action="train-anyway">${icon('play', 18)} ${done ? 'Entrenar otra vez' : 'Entrenar igualmente'}</button>
        <a class="btn ghost" href="#/plan">${icon('route', 18)} Ver plan</a>
      </div>
    </section>`;
}

function planCard(state, info) {
  const plan = info.plan;
  const tpl = DAY_INFO[plan.dayType];
  const minutes = estimateMinutes(state, plan.ids);
  const available = ROADMAPS.filter((r) => !plan.ids.includes(r.id));
  const eyebrow = info.mode === 'scheduled' ? `Hoy toca · ${WEEKDAYS[weekdayIndex()]}` : plan.custom ? 'Entreno editado' : 'Próximo entreno';
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
      <ol class="ex-list">${plan.ids.map((id, i) => exerciseRow(state, id, i)).join('')}</ol>
      ${editing ? `
        <div class="edit-panel">
          <label class="field">
            <span>Añadir ejercicio</span>
            <select data-change="plan-add">
              <option value="">Elige una ruta…</option>
              ${available.map((r) => `<option value="${r.id}">${esc(r.name)} — ${esc(stepOf(r.id).step.name)}</option>`).join('')}
            </select>
          </label>
          <div class="row gap">
            <button class="btn ghost" data-action="plan-switch">${icon('swap', 18)} Cambiar de día</button>
            <button class="btn ghost" data-action="plan-reset">Restablecer</button>
          </div>
        </div>` : ''}
      <div class="row gap">
        <button class="btn primary grow cta" data-action="start-session" ${plan.ids.length ? '' : 'disabled'}>${icon('play', 18)} Empezar entreno</button>
        <button class="btn ghost" data-action="plan-edit">${editing ? 'Listo' : `${icon('edit', 18)} Editar`}</button>
      </div>
    </section>`;
}

function goalsCard(state) {
  const goals = state.settings.goals.map((id) => ROADMAP_BY_ID[id]).filter(Boolean);
  if (!goals.length) {
    return `
      <section class="card">
        <h3>Tus objetivos</h3>
        <p class="muted">Elige hasta 3 habilidades (muscle-up, pino, front lever…) y se añadirán al principio de tus entrenos.</p>
        <a class="btn ghost" href="#/rutas">${icon('target', 18)} Elegir habilidades</a>
      </section>`;
  }
  return `
    <section class="card">
      <div class="row between"><h3>Tus objetivos</h3><a class="link" href="#/rutas">Ver rutas</a></div>
      <div class="goal-list">
        ${goals.map((r) => {
          const { step, index } = stepOf(r.id);
          return `
          <a class="goal" href="#/ruta/${r.id}">
            <div class="row between"><strong>${esc(r.name)}</strong><span class="muted small">${index + 1}/${r.steps.length}</span></div>
            <div class="muted small">${esc(step.name)}</div>
            ${progressBar(roadmapPercent(r.id))}
          </a>`;
        }).join('')}
      </div>
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
    main = restCard(info);
  } else {
    main = planCard(state, info);
  }
  return `
    <header class="page-head row between">
      <div class="col"><div class="eyebrow">${hello}</div><h1>Hoy</h1></div>
      <a class="icon-btn" href="#/ajustes" aria-label="Ajustes">${icon('gear')}</a>
    </header>
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
  'plan-switch'() {
    update((s) => {
      const base = todayInfo(s).plan;
      const order = s.settings.goals.length ? ['A', 'B', 'S'] : ['A', 'B'];
      const dayType = order[(order.indexOf(base.dayType) + 1) % order.length] || 'A';
      const ids = dayType === 'S'
        ? [...s.settings.goals.filter((id) => ROADMAP_BY_ID[id]).slice(0, 3), 'core']
        : defaultIds(s, dayType);
      s.plan = { dayType, ids, custom: false };
    });
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
