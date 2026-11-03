// «A tu manera»: tus días (nombre y ejercicios) y en qué día de la semana va cada uno.
// Las habilidades no se eligen aquí: se colocan solas según lo que trabaja cada día.

import { ROADMAPS, ROADMAP_BY_ID } from '../data/roadmaps.js';
import { LIFTS, LIFT_BY_ID } from '../data/gym.js';
import { getState, update, MY_DAYS_MAX, MY_DAY_NAME } from '../store.js';
import { stepOf, customOf, activeCustom, myDays, uid, GROUPS, groupOf, splitOf } from '../logic.js';
import { WEEKDAYS, buildWeek, frequencyWarnings, dayInfo } from '../schedule.js';
import { esc, icon, toast } from '../ui.js';
import { syncMyWeek } from './plan.js';
import { unlockCheck } from './hero.js';

function exName(id) {
  const c = customOf(id);
  if (c) return { name: c.name, what: `Tuyo · ${GROUPS[c.group]?.label || ''}` };
  if (LIFT_BY_ID[id]) return { name: LIFT_BY_ID[id].name, what: 'Gimnasio · Pierna' };
  if (ROADMAP_BY_ID[id]) return { name: ROADMAP_BY_ID[id].name, what: `Ahora: ${stepOf(id).step.name}` };
  return null;
}

// Ejercicios que se pueden añadir a un día (los básicos de las rutas, los de gimnasio y los tuyos).
function addSelect(day) {
  const free = (id) => !day.ids.includes(id);
  const routes = ROADMAPS.filter((r) => r.category === 'fuerza' && free(r.id));
  const lifts = LIFTS.filter((l) => free(l.id));
  const mine = activeCustom().filter((c) => free(c.id));
  return `
    <label class="field"><span class="small">Añadir ejercicio</span>
      <select data-change="myday-add" data-id="${esc(day.id)}">
        <option value="">Elige un ejercicio…</option>
        ${routes.length ? `<optgroup label="Rutas de calistenia">${routes.map((r) => `<option value="${r.id}">${esc(r.name)} — ${esc(stepOf(r.id).step.name)}</option>`).join('')}</optgroup>` : ''}
        ${mine.length ? `<optgroup label="Mis ejercicios">${mine.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</optgroup>` : ''}
        ${lifts.length ? `<optgroup label="Pierna en el gimnasio">${lifts.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join('')}</optgroup>` : ''}
      </select>
    </label>`;
}

function dayCard(state, day, i) {
  const info = dayInfo(day.id, state);
  const groups = [...new Set(day.ids.map((id) => groupOf(id, state)).filter(Boolean))].map((g) => GROUPS[g].label);
  return `
    <section class="card myday-card" data-day="${esc(day.id)}">
      <div class="row gap myday-head">
        <span class="type-badge t-mine">${esc(info.badge)}</span>
        <label class="grow">
          <input class="text-input" maxlength="${MY_DAY_NAME}" value="${esc(day.name)}" data-change="myday-name" data-id="${esc(day.id)}" aria-label="Nombre del día ${i + 1}" enterkeyhint="done">
        </label>
      </div>
      ${groups.length ? `<p class="muted small">Trabaja: ${esc(groups.join(', '))}</p>` : ''}
      ${day.ids.length ? `<ol class="ex-list myday-list">${day.ids.map((id, k) => {
        const ex = exName(id);
        if (!ex) return '';
        return `
          <li class="ex-row">
            <span class="num">${k + 1}</span>
            <div class="grow"><div class="ex-title">${esc(ex.name)}</div><div class="muted small">${esc(ex.what)}</div></div>
            <div class="edit-btns">
              <button class="icon-btn up" data-action="myday-move" data-id="${esc(day.id)}" data-ex="${esc(id)}" aria-label="Subir ${esc(ex.name)}" ${k === 0 ? 'disabled' : ''}>${icon('back', 18)}</button>
              <button class="icon-btn danger" data-action="myday-remove" data-id="${esc(day.id)}" data-ex="${esc(id)}" aria-label="Quitar ${esc(ex.name)}">${icon('close', 18)}</button>
            </div>
          </li>`;
      }).join('')}</ol>` : '<p class="muted small">Aún no tiene ejercicios.</p>'}
      ${addSelect(day)}
      <button class="link muted myday-del" data-action="myday-del" data-id="${esc(day.id)}">${icon('trash', 15)} Borrar este día</button>
    </section>`;
}

function weekCard(state) {
  const days = myDays(state);
  const wk = state.settings.myWeek || [];
  return `
    <section class="card myweek-card">
      <h3>Tu semana</h3>
      <p class="muted small">Elige qué día tuyo va cada día de la semana. Los que dejes en «Descanso» no entrenas.</p>
      <ul class="myweek">${WEEKDAYS.map((name, i) => `
        <li><label for="myweek-${i}"><strong>${esc(name)}</strong></label>
          <select id="myweek-${i}" data-change="myweek-set" data-i="${i}">
            <option value="" ${wk[i] ? '' : 'selected'}>Descanso</option>
            ${days.map((d) => `<option value="${esc(d.id)}" ${wk[i] === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
          </select></li>`).join('')}</ul>
    </section>`;
}

export function render() {
  const state = getState();
  const days = myDays(state);
  const week = buildWeek(state);
  const warn = splitOf(state) === 'propia' ? frequencyWarnings(state, week) : [];
  return `
    <header class="page-head">
      <a class="back" href="#/plan">${icon('back', 18)} Plan</a>
      <span class="eyebrow">A tu manera</span>
      <h1>Tus días</h1>
      <p class="muted">Crea tus días con los ejercicios que quieras: por ejemplo «Pecho y tríceps», «Espalda y bíceps» y «Pierna». Después, elige qué día de la semana va cada uno.</p>
    </header>
    ${splitOf(state) === 'propia' ? '' : `<p class="wiz-note">${icon('info', 14)}<span>Ahora tu semana no usa estos días. Para usarlos, elige «A tu manera» en el Plan semanal.</span></p>`}
    ${days.map((d, i) => dayCard(state, d, i)).join('')}
    ${days.length < MY_DAYS_MAX ? `<button class="btn ghost block" data-action="myday-new">${icon('plus', 18)} Añadir un día</button>` : ''}
    ${days.length ? weekCard(state) : ''}
    ${warn.length ? `<section class="card freq-card"><h3>Cómo queda</h3>${warn.map((t) => `<p class="wiz-note">${icon('info', 14)}<span>${esc(t)}</span></p>`).join('')}</section>` : ''}
    <section class="card">
      <h3>Tus habilidades</h3>
      <p class="muted small">No hace falta añadirlas: se colocan solas al principio de cada día. La que aprendes va en tus días con torso; las que mantienes, en los días con ejercicios de su grupo (front lever, muscle-up y back lever con tirón; planche y flexión de pino con empuje). El pino, si es tu foco, cada día.</p>
      <p class="muted small">Tus ejercicios propios se crean en Rutas → Mis ejercicios. <a class="link" href="#/mis-ejercicios/nuevo">${icon('plus', 14)} Crear uno</a></p>
    </section>`;
}

function editDay(id, fn) {
  update((s) => {
    const d = (s.settings.myDays || []).find((x) => x.id === id);
    if (!d) return;
    fn(d, s);
    s.plan = null;
  });
}

export const actions = {
  'myday-new'() {
    if (myDays(getState()).length >= MY_DAYS_MAX) return;
    update((s) => {
      s.settings.myDays ||= [];
      s.settings.myDays.push({ id: `d-${uid()}`, name: `Día ${s.settings.myDays.length + 1}`, ids: [] });
    });
    requestAnimationFrame(() => [...document.querySelectorAll('.myday-card')].pop()?.scrollIntoView({ block: 'center' }));
  },
  'myday-del'(el) {
    const id = el.dataset.id;
    const d = myDays(getState()).find((x) => x.id === id);
    if (!d || !confirm(`¿Borrar «${d.name}»? Tus entrenos ya hechos no se borran.`)) return;
    update((s) => {
      s.settings.myDays = s.settings.myDays.filter((x) => x.id !== id);
      s.settings.myWeek = (s.settings.myWeek || []).map((x) => (x === id ? null : x));
      for (const c of s.custom || []) c.days = (c.days || []).filter((x) => x !== id);
      if (s.settings.split === 'propia') syncMyWeek(s);
      s.plan = null;
    });
  },
  'myday-move'(el) {
    editDay(el.dataset.id, (d) => {
      const i = d.ids.indexOf(el.dataset.ex);
      if (i > 0) [d.ids[i - 1], d.ids[i]] = [d.ids[i], d.ids[i - 1]];
    });
  },
  'myday-remove'(el) {
    const ex = el.dataset.ex;
    editDay(el.dataset.id, (d, s) => {
      d.ids = d.ids.filter((x) => x !== ex);
      // (un ejercicio tuyo con este día marcado volvería a salir: se desmarca también)
      const c = (s.custom || []).find((x) => x.id === ex);
      if (c) c.days = (c.days || []).filter((x) => x !== d.id);
    });
  },
};

export const changes = {
  'myday-name'(el) {
    const name = el.value.trim().slice(0, MY_DAY_NAME);
    if (!name) { toast('Ponle un nombre al día'); el.value = myDays(getState()).find((d) => d.id === el.dataset.id)?.name || ''; return; }
    editDay(el.dataset.id, (d) => { d.name = name; });
  },
  'myday-add'(el) {
    const id = el.value;
    if (!id) return;
    editDay(el.dataset.id, (d) => { if (!d.ids.includes(id)) d.ids.push(id); });
  },
  'myweek-set'(el) {
    const i = Number(el.dataset.i);
    const value = el.value || null;
    update((s) => {
      const wk = [...(s.settings.myWeek || Array(7).fill(null))];
      wk[i] = value;
      s.settings.myWeek = wk;
      if (s.settings.split === 'propia') syncMyWeek(s);
      s.plan = null;
      s.weekMoves = null;
    });
    unlockCheck();
  },
};
