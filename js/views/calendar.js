// Calendario: marca los días entrenados y, al tocar un día, muestra qué se entrenó,
// cómo se valoró cada ejercicio y cómo cambió el progreso.

import { headActions } from '../theme.js';
import { ROADMAP_BY_ID } from '../data/roadmaps.js';
import { getState } from '../store.js';
import { dayLabel } from '../schedule.js';
import { esc, icon, fmtDuration, fmtDurationHtml, fmtLongDate, fmtTime } from '../ui.js';
import { itemBlock } from './progress.js';

let viewMonth = null; // { y, m }
let selected = null;  // 'YYYY-MM-DD'
let monthDir = 0;     // al cambiar de mes, el nuevo entra desde ese lado (1 = siguiente)

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthFmt = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function sessionsByDay(state) {
  const map = new Map();
  for (const s of state.sessions) {
    const k = keyOf(new Date(s.startedAt));
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(s);
  }
  return map;
}

function monthGrid(byDay, y, m) {
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const todayKey = keyOf(new Date());
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push('<span class="cal-cell empty"></span>');
  for (let d = 1; d <= days; d++) {
    const date = new Date(y, m, d);
    const k = keyOf(date);
    const list = byDay.get(k) || [];
    const trained = list.length > 0;
    const levelUp = list.some((s) => s.levelUps.length);
    const cls = [
      'cal-cell',
      trained ? 'on' : '',
      levelUp ? 'lvl' : '',
      k === todayKey ? 'today' : '',
      k === selected ? 'sel' : '',
      k > todayKey ? 'future' : '',
    ].join(' ');
    const label = `${fmtLongDate(date)}${trained ? ', entrenado' : ''}${levelUp ? ', subida de nivel' : ''}`;
    cells.push(`
      <button class="${cls}" data-action="cal-select" data-day="${k}" aria-label="${esc(label)}" aria-pressed="${k === selected}">
        <span class="n">${d}</span>
        ${levelUp ? `<span class="cal-badge">${icon('star', 10)}</span>` : ''}
      </button>`);
  }
  return cells.join('');
}

function monthStats(state, y, m) {
  const list = state.sessions.filter((s) => {
    const d = new Date(s.startedAt);
    return d.getFullYear() === y && d.getMonth() === m;
  });
  const days = new Set(list.map((s) => keyOf(new Date(s.startedAt)))).size;
  const seconds = list.reduce((a, s) => a + s.duration, 0);
  const levels = list.reduce((a, s) => a + s.levelUps.length, 0);
  return `
    <div class="cal-stats">
      <div><strong>${days}</strong><span class="muted tiny">${days === 1 ? 'día' : 'días'}</span></div>
      <div><strong>${seconds ? fmtDurationHtml(seconds) : '0 <small>min</small>'}</strong><span class="muted tiny">entrenando</span></div>
      <div><strong>${levels}</strong><span class="muted tiny">${levels === 1 ? 'subida' : 'subidas'} de nivel</span></div>
    </div>`;
}

function dayDetail(byDay) {
  const [y, m, d] = selected.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const list = byDay.get(selected) || [];
  const isToday = selected === keyOf(new Date());
  const isFuture = selected > keyOf(new Date());

  let body;
  if (!list.length) {
    body = isToday
      ? `<p class="muted">Aún no has entrenado hoy.</p><a class="btn primary" href="#/">${icon('play', 18)} Ir al entreno de hoy</a>`
      : `<p class="muted">${isFuture ? 'Día por llegar.' : 'Día de descanso.'}</p>`;
  } else {
    body = list.map((s) => {
      const levelUps = s.levelUps.map((l) => {
        const r = ROADMAP_BY_ID[l.roadmapId];
        if (!r) return '';
        return `<div class="levelup small-lvl"><span class="node on small">${icon(l.completed ? 'trophy' : 'star', 14)}</span>
          <div><strong>${esc(r.name)}</strong> <span class="muted small">${l.completed ? 'ruta completada' : `→ ${esc(r.steps[l.to].name)}`}</span></div></div>`;
      }).join('');
      return `
        <article class="cal-session">
          <div class="row between">
            <div class="grow">
              <div class="eyebrow">${esc(dayLabel(s.dayType))} · ${fmtTime(s.startedAt)}</div>
              <strong>${fmtDuration(s.duration)} · ${s.items.length} ${s.items.length === 1 ? 'ejercicio' : 'ejercicios'}</strong>
            </div>
            <a class="link" href="#/sesion/${s.id}">Detalle ${icon('next', 14)}</a>
          </div>
          ${levelUps ? `<div class="cal-levels">${levelUps}</div>` : ''}
          <ul class="summary-list">${s.items.map((it) => itemBlock(it)).join('')}</ul>
          ${s.notes ? `<p class="muted small note">“${esc(s.notes)}”</p>` : ''}
        </article>`;
    }).join('');
  }
  return `
    <section class="card">
      <h3 class="cap">${esc(fmtLongDate(date))}</h3>
      ${body}
    </section>`;
}

export function render() {
  const state = getState();
  const now = new Date();
  if (!viewMonth) viewMonth = { y: now.getFullYear(), m: now.getMonth() };
  if (!selected) selected = keyOf(now);
  const { y, m } = viewMonth;
  const byDay = sessionsByDay(state);
  const title = monthFmt.format(new Date(y, m, 1));
  const isCurrentMonth = y === now.getFullYear() && m === now.getMonth();
  const dirClass = monthDir;
  monthDir = 0;

  return `
    <header class="page-head row between">
      <div class="col"><div class="eyebrow">Tus días de entreno</div><h1>Calendario</h1></div>
      ${headActions(getState().settings.theme)}
    </header>
    <section class="card">
      <div class="row between">
        <button class="icon-btn" data-action="cal-month" data-dir="-1" aria-label="Mes anterior">${icon('back', 18)}</button>
        <h2 class="cap">${esc(title)}</h2>
        <button class="icon-btn" data-action="cal-month" data-dir="1" aria-label="Mes siguiente" ${isCurrentMonth ? 'disabled' : ''}>${icon('next', 18)}</button>
      </div>
      <div class="cal-grid ${dirClass ? `month-in-${dirClass > 0 ? 'r' : 'l'}` : ''}" role="grid">
        ${WEEKDAYS.map((w) => `<span class="cal-wd">${w}</span>`).join('')}
        ${monthGrid(byDay, y, m)}
      </div>
      <div class="cal-legend muted tiny">
        <span><i class="lg on"></i> Entrenado</span>
        <span><i class="lg lvl">${icon('star', 9)}</i> Subida de nivel</span>
        <span><i class="lg today"></i> Hoy</span>
      </div>
      ${monthStats(state, y, m)}
    </section>
    ${dayDetail(byDay)}
  `;
}

export const actions = {
  'cal-month'(el, ctx) {
    const dir = Number(el.dataset.dir);
    const d = new Date(viewMonth.y, viewMonth.m + dir, 1);
    viewMonth = { y: d.getFullYear(), m: d.getMonth() };
    monthDir = dir;
    ctx.rerender();
  },
  'cal-select'(el, ctx) {
    selected = el.dataset.day;
    ctx.rerender();
    document.querySelector('.cal-session, .card:last-of-type')?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  },
};
