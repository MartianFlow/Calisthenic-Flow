// Plan semanal recomendado: días disponibles, cuántos entrenar y reparto A/B/S.

import { ROADMAP_BY_ID } from '../data/roadmaps.js';
import { getState, update } from '../store.js';
import { stepOf } from '../logic.js';
import {
  WEEKDAYS, WD_SHORT, DEFAULT_DAYS, DAY_INFO, recommendDays, buildWeek, weekdayIndex,
} from '../schedule.js';
import { esc, icon } from '../ui.js';

export function dayChips(days) {
  return `<div class="wd-picker">${WD_SHORT.map((d, i) => `
    <button class="wd-chip ${days[i] ? 'on' : ''}" data-action="plan-day" data-i="${i}" aria-pressed="${!!days[i]}" aria-label="${WEEKDAYS[i]}">${d}</button>`).join('')}</div>`;
}

export function daysSegmented(state, rec) {
  return `<div class="segmented">${[2, 3, 4, 5, 6].map((n) => `
    <button class="${state.settings.daysPerWeek === n ? 'on' : ''} ${rec.days === n ? 'rec' : ''}" data-action="set-setting" data-key="daysPerWeek" data-value="${n}" aria-label="${n} días${rec.days === n ? ' (recomendado)' : ''}">${n}${rec.days === n ? '<i>★</i>' : ''}</button>`).join('')}</div>`;
}

function dayRow(d, isToday) {
  const info = DAY_INFO[d.type];
  const names = d.ids.map((id) => {
    const r = ROADMAP_BY_ID[id];
    const skill = d.skills.includes(id);
    return `<span class="mini-chip ${skill ? 'skill' : ''}">${esc(r.name)}<small> · ${esc(stepOf(id).step.name)}</small></span>`;
  }).join('');
  return `
    <li class="week-row type-${d.type} ${isToday ? 'today' : ''}">
      <div class="week-day"><strong>${WD_SHORT[d.weekday]}</strong><span class="muted tiny">${WEEKDAYS[d.weekday].slice(0, 3)}</span></div>
      <span class="type-badge t-${d.type}">${d.type === 'R' ? '—' : d.type}</span>
      <div class="grow">
        <div class="week-title">${esc(info.label)}${isToday ? ' <span class="pill tiny accent">Hoy</span>' : ''}</div>
        ${d.type === 'R' ? `<div class="muted small">${esc(info.focus)}</div>` : `<div class="mini-chips">${names}</div>`}
      </div>
    </li>`;
}

export function render() {
  const state = getState();
  const sched = state.settings.schedule || { days: DEFAULT_DAYS };
  const rec = recommendDays(state);
  const week = buildWeek({ ...state, settings: { ...state.settings, schedule: sched } });
  const todayIdx = weekdayIndex();
  const trainDays = week.filter((d) => d.type !== 'R').length;
  return `
    <header class="page-head">
      <a class="back" href="#/">${icon('back', 18)} Hoy</a>
      <span class="eyebrow">Tu semana</span>
      <h1>Plan semanal</h1>
    </header>

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

    <section class="card">
      <h3>Tu semana</h3>
      <ol class="week-list">${week.map((d) => dayRow(d, d.weekday === todayIdx)).join('')}</ol>
    </section>

    <section class="card">
      <h3>Cómo se reparte</h3>
      <ul class="split-legend">
        <li><span class="type-badge t-A">A</span><div><strong>Día A</strong><span class="muted small">${esc(DAY_INFO.A.focus)}</span></div></li>
        <li><span class="type-badge t-B">B</span><div><strong>Día B</strong><span class="muted small">${esc(DAY_INFO.B.focus)}</span></div></li>
        <li><span class="type-badge t-S">S</span><div><strong>Día S</strong><span class="muted small">Habilidades objetivo y core; un día más ligero que solo aparece con 5 o más días y objetivos.</span></div></li>
      </ul>
      <ul class="reasons">
        <li>Cada patrón (tirón, empuje, pierna, core) se trabaja 2–3 veces por semana.</li>
        <li>Habilidades de brazos rectos (front lever, planche, back lever): máximo 3 días por semana, nunca seguidos y máximo 2 por sesión.</li>
        <li>Las habilidades van al principio, cuando estás fresco.</li>
        <li>Cada 5–6 semanas, una semana de descarga.</li>
      </ul>
    </section>
  `;
}

export const actions = {
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
};
