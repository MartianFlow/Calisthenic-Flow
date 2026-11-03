// Progreso: estadísticas, gráfica semanal, subidas de nivel e historial.
// También el resumen tras terminar un entreno y el detalle de entrenos pasados.

import { headActions } from '../theme.js';
import { ROADMAP_BY_ID } from '../data/roadmaps.js';
import { LIFT_BY_ID } from '../data/gym.js';
import { getState, update } from '../store.js';
import { totals, weekStreak, weeklySeries, globalProgress, outcomeText, RATINGS } from '../logic.js';
import { dayLabel } from '../schedule.js';
import { esc, icon, fmtDuration, fmtDurationHtml, fmtDate, fmtLongDate, fmtTime, unitLabel, fmtKg } from '../ui.js';
import { weeklyBars } from '../charts.js';
import { navigate } from '../router.js';
import { takeCelebration } from './session.js';
import { burst, flash, confetti } from '../fx.js';
import { ACH_BY_ID, ITEM_BY_ID, RARITY, titleFor, totalXP, levelInfo } from '../game.js';
import { heroAvatar, levelBar, itemIcon } from './hero.js';
import { pixelIcon } from '../pixel.js';

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
        <div class="history-title">${esc(fmtDate(s.startedAt))} · ${esc(dayLabel(s.dayType))}</div>
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
    <header class="page-head row between">
      <div class="col"><div class="eyebrow">Tu evolución</div><h1>Progreso</h1></div>
      ${headActions(getState().settings.theme)}
    </header>
    <section class="tiles">
      ${tile('Entrenos', t.sessions)}
      ${tile('Tiempo total', t.seconds ? fmtDurationHtml(t.seconds) : '0 <small>min</small>')}
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

const OUTCOME_ICON = {
  levelup: 'star', completed: 'trophy', pass: 'check', consolidate: 'target', up: 'plus', down: 'minus', keep: 'target',
  'load-up': 'star', 'load-down': 'minus', reset: 'minus', 'no-kg': 'edit',
};
// Clase de color del resultado (las subidas de peso se pintan como subidas de nivel).
const OUTCOME_CLASS = { 'load-up': 'levelup', 'load-down': 'down', 'no-kg': 'keep' };

function ratingChip(item) {
  return item.rating && RATINGS[item.rating]
    ? `<span class="rate-chip ${item.rating}">${esc(RATINGS[item.rating].label)}</span>`
    : '<span class="pill tiny">Sin valorar</span>';
}

function outcomeLine(item) {
  if (item.outcome) {
    const k = item.outcome.kind;
    return `<div class="outcome ${OUTCOME_CLASS[k] || k}">${icon(OUTCOME_ICON[k] || 'target', 15)}<span>${esc(outcomeText(item))}</span></div>`;
  }
  return item.met ? `<div class="outcome pass">${icon('check', 15)}<span>Objetivo cumplido</span></div>` : '';
}

// Series de gimnasio: con el mismo peso en todas, el peso una vez y las reps de cada serie.
export function liftPills(item) {
  const loads = item.loads || [];
  const pill = (text, v) => `<span class="set-pill ${v >= item.goal ? 'met' : ''}">${esc(text)}</span>`;
  if (loads.length && loads.every((v) => v === loads[0])) {
    return `<span class="set-load">${esc(fmtKg(loads[0]))} ×</span> ${item.sets.map((v) => pill(String(v), v)).join(' ')}`;
  }
  return item.sets.map((v, i) => pill(`${fmtKg(loads[i])} × ${v}`, v)).join(' ');
}

// Ejercicio de gimnasio: peso × repeticiones de cada serie.
function liftBlock(item) {
  const lift = LIFT_BY_ID[item.liftId];
  const loads = item.loads || [];
  return `
    <li class="summary-item lift">
      <div class="row between">
        <div class="grow">
          <div class="eyebrow">Gimnasio · ${esc(lift?.muscle || '')}</div>
          <div class="ex-title">${esc(lift?.name || item.liftId)}</div>
        </div>
        ${ratingChip(item)}
      </div>
      <div class="set-pills">${liftPills(item)}
        <span class="muted tiny">objetivo ${item.goal} reps (rango ${item.min}–${item.max})</span></div>
      ${outcomeLine(item)}
    </li>`;
}

// Bloque de un ejercicio registrado: series, valoración y qué cambia después.
export function itemBlock(item) {
  if (item.liftId) return liftBlock(item);
  const r = ROADMAP_BY_ID[item.roadmapId];
  if (!r) return '';
  const step = r.steps[item.stepIndex];
  const goal = item.goal ?? item.target;
  const rating = ratingChip(item);
  const outcome = outcomeLine(item);
  return `
    <li class="summary-item">
      <div class="row between">
        <div class="grow">
          <div class="eyebrow">${esc(r.name)} · paso ${item.stepIndex + 1}</div>
          <div class="ex-title">${esc(step.name)}</div>
        </div>
        ${rating}
      </div>
      <div class="set-pills">${item.sets.map((v) => `<span class="set-pill ${v >= goal ? 'met' : ''}">${unitLabel(item.type, v)}</span>`).join('')}
        <span class="muted tiny">objetivo ${unitLabel(item.type, goal)}</span></div>
      ${outcome}
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
          ${l.reason === 'facil' && !l.completed ? '<div class="muted small">Te resultó fácil, así que avanzas directamente.</div>' : ''}
          ${!l.completed ? `<div class="muted small">Paso ${l.to + 1} de ${r.steps.length}</div>` : ''}
        </div>
      </div>`;
  }).join('');
  const sets = s.items.reduce((a, it) => a + it.sets.length, 0);
  return `
    <section class="tiles three">
      ${[['Duración', fmtDurationHtml(s.duration)], ['Ejercicios', s.items.length], ['Series', sets]].map(([l, v]) => tile(l, v)).join('')}
    </section>
    ${levelUps ? `<section class="card celebrate">${levelUps}</section>` : ''}
    <section class="card">
      <h3>Ejercicios</h3>
      <ul class="summary-list">${s.items.map((it) => itemBlock(it)).join('') || '<li class="muted">Sin series registradas.</li>'}</ul>
    </section>
    <section class="card">
      <label class="field">
        <span>Notas</span>
        <textarea rows="3" data-change="session-notes" data-id="${s.id}" placeholder="¿Cómo te has sentido? Molestias, sensaciones, ideas…">${esc(s.notes)}</textarea>
      </label>
    </section>`;
}

function rewardCard(s, state) {
  const g = s.game;
  if (!g) return '';
  const ach = g.achievements.map((id) => ACH_BY_ID[id]).filter(Boolean);
  const items = g.items.map((id) => ITEM_BY_ID[id]).filter(Boolean);
  const lvl = levelInfo(totalXP(state));
  return `
    <section class="px-panel reward-card">
      <div class="reward-top">
        <div class="px-scene mini">${heroAvatar(state, 120, 'idle')}</div>
        <div class="grow">
          <div class="px-gain">+${g.xp} EXP</div>
          ${g.levelAfter > g.levelBefore
            ? `<div class="px-levelup">¡LEVEL UP! LV ${g.levelAfter}</div><span class="px-title">${esc(titleFor(g.levelAfter))}</span>`
            : `<span class="px-title">LV ${lvl.level} · ${esc(titleFor(lvl.level))}</span>`}
          ${levelBar(lvl, 14)}
        </div>
      </div>
      ${ach.length ? `
        <p class="px-sub">Logros desbloqueados</p>
        <ul class="px-ach-list">${ach.map((a) => `
          <li class="px-ach done">
            <span class="px-badge" style="--rar:${{ bronce: '#d98a4a', plata: '#c9d1e0', oro: '#ffd23f', leyenda: '#ff4f9a' }[a.rarity]}">${pixelIcon({ constancia: 'flame', progreso: 'map', hitos: 'trophy', habitos: 'star' }[a.cat], '#fff', 32)}</span>
            <div class="grow"><strong>${esc(a.name)}</strong><div class="px-desc">${esc(a.desc)}</div></div>
            <span class="px-xp">+${RARITY[a.rarity].xp}</span>
          </li>`).join('')}</ul>` : ''}
      ${items.map((it) => `
        <div class="px-dialog">
          ${itemIcon(it, 40)}
          <p>¡Has conseguido <b>${esc(it.name)}</b>!</p>
        </div>`).join('')}
      ${items.length ? `<a class="px-btn" href="#/equipo">${pixelIcon('chest', '#fff', 24)} Equipar</a>` : ''}
    </section>`;
}

export function renderSummary({ id }) {
  const state = getState();
  const s = state.sessions.find((x) => x.id === id);
  if (!s) return '<div class="empty"><p>Entreno no encontrado.</p><a class="btn ghost" href="#/">Volver</a></div>';
  const loadUps = s.items.filter((it) => it.outcome?.kind === 'load-up').length;
  if (takeCelebration()) {
    setTimeout(() => { flash(); burst(null, { text: s.levelUps.length ? '¡NIVEL!' : '¡MÁS PESO!', big: true }); confetti({ count: 40 }); }, 350);
  }
  const title = s.levelUps.length ? '¡SUBES DE<br>NIVEL!' : loadUps ? '¡MÁS<br>PESO!' : '¡HECHO!';
  return `
    <header class="page-head center">
      <div class="burst-title ${s.levelUps.length || loadUps ? '' : 'pink'}">${title}</div>
      <h1>¡Entreno completado!</h1>
      <p class="muted">${esc(fmtLongDate(s.startedAt))}</p>
    </header>
    ${rewardCard(s, state)}
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
      <div class="eyebrow">${esc(dayLabel(s.dayType))} · ${fmtTime(s.startedAt)}</div>
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
