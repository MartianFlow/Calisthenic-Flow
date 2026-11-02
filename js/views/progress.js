// Progreso: estadísticas, gráfica semanal, subidas de nivel e historial.
// También el resumen tras terminar un entreno y el detalle de entrenos pasados.

import { ROADMAP_BY_ID } from '../data/roadmaps.js';
import { getState, update } from '../store.js';
import { totals, weekStreak, weeklySeries, globalProgress } from '../logic.js';
import { esc, icon, fmtDuration, fmtDate, fmtLongDate, fmtTime, unitLabel } from '../ui.js';
import { weeklyBars } from '../charts.js';
import { navigate } from '../router.js';

function tile(label, value, sub = '') {
  return `<div class="tile"><div class="eyebrow">${esc(label)}</div><div class="tile-num">${value}</div>${sub ? `<div class="muted tiny">${sub}</div>` : ''}</div>`;
}

function levelLogList(state) {
  const log = [...state.levelLog].reverse().slice(0, 8);
  if (!log.length) return '<p class="muted">Cuando superes un paso aparecerá aquí.</p>';
  return `<ul class="log">${log.map((l) => {
    const r = ROADMAP_BY_ID[l.roadmapId];
    if (!r) return '';
    const text = l.completed
      ? `Ruta completada: <strong>${esc(r.steps[l.to].name)}</strong>`
      : `${l.manual ? 'Ajuste manual a' : 'Subiste a'} <strong>${esc(r.steps[l.to].name)}</strong>`;
    return `<li><span class="node small ${l.manual ? '' : 'on'}">${icon(l.completed ? 'trophy' : l.manual ? 'edit' : 'star', 14)}</span>
      <div class="grow"><div>${esc(r.name)}</div><div class="muted small">${text}</div></div>
      <span class="muted tiny">${fmtDate(l.date)}</span></li>`;
  }).join('')}</ul>`;
}

function historyList(state) {
  const list = [...state.sessions].reverse();
  if (!list.length) return '<p class="muted">Aún no has registrado ningún entreno. ¡El primero es el más importante!</p>';
  return `<ul class="history">${list.map((s) => `
    <li><a href="#/sesion/${s.id}" class="history-row">
      <div class="grow">
        <div class="history-title">${esc(fmtDate(s.startedAt))} · ${s.dayType === 'libre' ? 'Libre' : `Día ${esc(s.dayType)}`}</div>
        <div class="muted small">${fmtDuration(s.duration)} · ${s.items.length} ${s.items.length === 1 ? 'ejercicio' : 'ejercicios'}</div>
      </div>
      ${s.levelUps.length ? `<span class="pill accent tiny">${icon('star', 13)} +${s.levelUps.length}</span>` : ''}
      ${icon('next', 18)}
    </a></li>`).join('')}</ul>`;
}

export function render() {
  const state = getState();
  const t = totals(state);
  const streak = weekStreak(state);
  const series = weeklySeries(state, 8);
  return `
    <header class="page-head">
      <div class="eyebrow">Tu evolución</div>
      <h1>Progreso</h1>
    </header>
    <section class="tiles">
      ${tile('Entrenos', t.sessions)}
      ${tile('Tiempo total', t.seconds ? fmtDuration(t.seconds) : '0 min')}
      ${tile('Racha', `${streak}`, `${streak === 1 ? 'semana' : 'semanas'} con ${state.settings.daysPerWeek}+ entrenos`)}
      ${tile('Mapa', `${globalProgress()}%`, 'de todas las rutas')}
    </section>
    <section class="card">
      <h3>Minutos por semana</h3>
      ${weeklyBars(series, { caption: 'Últimas 8 semanas' })}
    </section>
    <section class="card">
      <h3>Subidas de nivel</h3>
      ${levelLogList(state)}
    </section>
    <section class="card">
      <h3>Historial</h3>
      ${historyList(state)}
    </section>
  `;
}

function itemBlock(item, state) {
  const r = ROADMAP_BY_ID[item.roadmapId];
  if (!r) return '';
  const step = r.steps[item.stepIndex];
  let status = '';
  if (item.met && item.required) {
    status = item.passes >= item.required
      ? '<span class="pill ok tiny">Objetivo cumplido</span>'
      : `<span class="pill ok tiny">Objetivo cumplido · ${item.passes}/${item.required}</span>`;
  } else if (item.met) {
    status = '<span class="pill ok tiny">Objetivo cumplido</span>';
  } else {
    status = `<span class="pill tiny">Objetivo: ${item.target}${item.type === 'hold' ? ' s' : ' reps'}</span>`;
  }
  return `
    <li class="summary-item">
      <div class="row between">
        <div>
          <div class="eyebrow">${esc(r.name)} · paso ${item.stepIndex + 1}</div>
          <div class="ex-title">${esc(step.name)}</div>
        </div>
        ${status}
      </div>
      <div class="set-pills">${item.sets.map((v) => `<span class="set-pill ${v >= item.target ? 'met' : ''}">${unitLabel(item.type, v)}</span>`).join('')}</div>
    </li>`;
}

function sessionBody(s, state) {
  const levelUps = s.levelUps.map((l) => {
    const r = ROADMAP_BY_ID[l.roadmapId];
    if (!r) return '';
    return `
      <div class="levelup">
        <span class="node on">${icon(l.completed ? 'trophy' : 'star', 18)}</span>
        <div>
          <div class="eyebrow">${esc(r.name)}</div>
          <div><strong>${l.completed ? '¡Ruta completada!' : `Nuevo nivel: ${esc(r.steps[l.to].name)}`}</strong></div>
          ${!l.completed ? `<div class="muted small">Paso ${l.to + 1} de ${r.steps.length}</div>` : ''}
        </div>
      </div>`;
  }).join('');
  const sets = s.items.reduce((a, it) => a + it.sets.length, 0);
  return `
    <section class="tiles three">
      ${[['Duración', fmtDuration(s.duration)], ['Ejercicios', s.items.length], ['Series', sets]].map(([l, v]) => tile(l, v)).join('')}
    </section>
    ${levelUps ? `<section class="card celebrate">${levelUps}</section>` : ''}
    <section class="card">
      <h3>Ejercicios</h3>
      <ul class="summary-list">${s.items.map((it) => itemBlock(it, state)).join('') || '<li class="muted">Sin series registradas.</li>'}</ul>
    </section>
    <section class="card">
      <label class="field">
        <span>Notas</span>
        <textarea rows="3" data-change="session-notes" data-id="${s.id}" placeholder="¿Cómo te has sentido? Molestias, sensaciones, ideas…">${esc(s.notes)}</textarea>
      </label>
    </section>`;
}

export function renderSummary({ id }) {
  const state = getState();
  const s = state.sessions.find((x) => x.id === id);
  if (!s) return '<div class="empty"><p>Entreno no encontrado.</p><a class="btn ghost" href="#/">Volver</a></div>';
  return `
    <header class="page-head center">
      <div class="badge-big">${icon(s.levelUps.length ? 'trophy' : 'flame', 34)}</div>
      <h1>¡Entreno completado!</h1>
      <p class="muted">${esc(fmtLongDate(s.startedAt))}</p>
    </header>
    ${sessionBody(s, state)}
    <a class="btn primary block" href="#/">Volver a Hoy</a>
  `;
}

export function renderDetail({ id }) {
  const state = getState();
  const s = state.sessions.find((x) => x.id === id);
  if (!s) return '<div class="empty"><p>Entreno no encontrado.</p><a class="btn ghost" href="#/progreso">Volver</a></div>';
  return `
    <header class="page-head">
      <a class="back" href="#/progreso">${icon('back', 18)} Progreso</a>
      <div class="eyebrow">${s.dayType === 'libre' ? 'Entreno libre' : `Día ${esc(s.dayType)}`} · ${fmtTime(s.startedAt)}</div>
      <h1>${esc(fmtLongDate(s.startedAt))}</h1>
    </header>
    ${sessionBody(s, state)}
    <button class="btn danger-outline block" data-action="delete-session" data-id="${s.id}">${icon('trash', 18)} Borrar entreno</button>
    <p class="muted tiny center">Borrar un entreno no deshace las subidas de nivel. Puedes ajustar tu nivel desde Rutas.</p>
  `;
}

export const actions = {
  'delete-session'(el) {
    if (!confirm('¿Borrar este entreno del historial?')) return;
    update((s) => { s.sessions = s.sessions.filter((x) => x.id !== el.dataset.id); });
    navigate('#/progreso', { replace: true });
  },
};

export const changes = {
  'session-notes'(el) {
    update((s) => {
      const session = s.sessions.find((x) => x.id === el.dataset.id);
      if (session) session.notes = el.value;
    }, { silent: true });
  },
};
