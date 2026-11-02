// Lista de rutas (Fuerza / Habilidades) y detalle de cada ruta.

import { ROADMAPS, ROADMAP_BY_ID, CATEGORIES } from '../data/roadmaps.js';
import { getState, update, setStep } from '../store.js';
import {
  stepOf, roadmapPercent, globalProgress, prereqStatus, roadmapHistory, createSession, workFor, passesRequired, restFor,
} from '../logic.js';
import { esc, icon, targetLabel, progressBar, toast, unitLabel, fmtRest } from '../ui.js';
import { progressLine } from '../charts.js';
import { navigate } from '../router.js';
import { audio, wakeLock } from '../device.js';
import { videoCard } from '../video.js';

const MAX_GOALS = 3;

function roadmapCard(state, r) {
  const { step, index, progress } = stepOf(r.id);
  const isGoal = state.settings.goals.includes(r.id);
  const prereqs = prereqStatus(r);
  const missing = prereqs.filter((p) => !p.ok);
  return `
    <a class="card route-card ${isGoal ? 'goal-on' : ''}" href="#/ruta/${r.id}">
      <div class="row between">
        <div>
          <div class="eyebrow">${esc(r.group)}</div>
          <h3>${esc(r.name)}</h3>
        </div>
        <div class="route-level">${progress.done ? icon('trophy', 20) : `<span>${index + 1}</span><small>/${r.steps.length}</small>`}</div>
      </div>
      <div class="muted small">${progress.done ? 'Ruta completada' : esc(step.name) + ' · ' + esc(targetLabel(step))}</div>
      ${progressBar(roadmapPercent(r.id))}
      ${isGoal ? `<span class="pill accent tiny">${icon('star', 13)} Objetivo</span>` : ''}
      ${r.category === 'habilidad' && missing.length && index === 0
        ? `<div class="muted tiny">${icon('lock', 13)} Recomendado antes: ${missing.map((m) => `${esc(m.roadmap.name)} paso ${m.step + 1}`).join(', ')}</div>`
        : ''}
    </a>`;
}

export function renderList() {
  const state = getState();
  const pct = globalProgress();
  const groups = Object.entries(CATEGORIES).map(([key, cat]) => `
    <section>
      <div class="section-head">
        <h2>${esc(cat.label)}</h2>
        <p class="muted small">${esc(cat.hint)}</p>
      </div>
      <div class="route-grid">
        ${ROADMAPS.filter((r) => r.category === key).map((r) => roadmapCard(state, r)).join('')}
      </div>
    </section>`).join('');
  return `
    <header class="page-head">
      <div class="eyebrow">Tu mapa</div>
      <h1>Rutas</h1>
    </header>
    <section class="card">
      <div class="row between">
        <div>
          <div class="eyebrow">Mapa completado</div>
          <div class="hero-num">${pct}<small>%</small></div>
        </div>
        <p class="muted small narrow">Toca una ruta para ver todos sus pasos, ajustar tu nivel o marcarla como objetivo.</p>
      </div>
      ${progressBar(pct)}
    </section>
    ${groups}
  `;
}

function stepItem(r, s, i, progress) {
  const state = i < progress.step || (progress.done && i === progress.step) ? 'done' : i === progress.step ? 'current' : 'next';
  return `
    <li class="path-step ${state}">
      <span class="node">${state === 'done' ? icon('check', 16) : i + 1}</span>
      <details ${state === 'current' ? 'open' : ''}>
        <summary>
          <span class="grow">
            <span class="step-name">${esc(s.name)}</span>
            <span class="muted small">${esc(targetLabel(s))}</span>
          </span>
          ${state === 'current' ? '<span class="pill accent tiny">Actual</span>' : ''}
        </summary>
        ${videoCard(s, r.name)}
        <ul class="cue-list">${s.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
        ${state !== 'current' ? `<button class="btn ghost small" data-action="set-level" data-id="${r.id}" data-step="${i}">Establecer como nivel actual</button>` : ''}
      </details>
    </li>`;
}

export function renderDetail({ id }) {
  const r = ROADMAP_BY_ID[id];
  if (!r) return '<div class="empty"><p>Ruta no encontrada.</p><a class="btn ghost" href="#/rutas">Volver</a></div>';
  const state = getState();
  const { step, index, progress } = stepOf(id);
  const isGoal = state.settings.goals.includes(id);
  const prereqs = prereqStatus(r);
  const required = passesRequired(state, r);
  const history = roadmapHistory(state, id).filter((h) => h.stepIndex === index);
  const unit = step.type === 'hold' ? 's' : 'reps';
  const work = workFor(id);

  return `
    <header class="page-head">
      <a class="back" href="#/rutas">${icon('back', 18)} Rutas</a>
      <div class="eyebrow">${esc(CATEGORIES[r.category].label)} · ${esc(r.group)}</div>
      <h1>${esc(r.name)}</h1>
      <p class="muted">${esc(r.summary)}</p>
      <p class="muted small">Material: ${esc(r.equipment)}</p>
    </header>

    <section class="card">
      <div class="row between">
        <div>
          <div class="eyebrow">${progress.done ? 'Ruta completada' : 'Nivel actual'}</div>
          <h2>${esc(step.name)}</h2>
          <div class="muted small">Paso ${index + 1} de ${r.steps.length} · ${esc(targetLabel(step))} · descanso ${fmtRest(restFor(r, step))}</div>
        </div>
        <div class="route-level big">${progress.done ? icon('trophy', 28) : `<span>${index + 1}</span><small>/${r.steps.length}</small>`}</div>
      </div>
      ${progressBar(roadmapPercent(id))}
      ${!progress.done && work < step.target ? `
        <div class="work-box">
          <div><span class="muted small">Tu objetivo ahora</span><strong>${step.sets} × ${esc(unitLabel(step.type, work))}</strong></div>
          ${icon('next', 18)}
          <div><span class="muted small">Meta del paso</span><strong>${esc(targetLabel(step))}</strong></div>
        </div>
        <p class="muted small">Tras cada ejercicio valoras si fue Fácil, Normal o Difícil: el objetivo sube más o menos según tu respuesta hasta llegar a la meta.</p>` : ''}
      ${!progress.done && work >= step.target ? `
        <div class="passes">
          ${Array.from({ length: required }, (_, i) => `<span class="pass ${i < progress.passes ? 'on' : ''}">${icon('check', 14)}</span>`).join('')}
          <span class="muted small">Meta cumplida (Normal) en ${progress.passes} de ${required} ${required === 1 ? 'sesión' : 'sesiones'} para subir. Si te resulta Fácil, subes directamente.</span>
        </div>` : ''}
      <div class="row gap wrap">
        <button class="btn primary" data-action="train-only" data-id="${id}">${icon('play', 18)} Entrenar solo esta ruta</button>
        ${r.category === 'habilidad'
          ? `<button class="btn ${isGoal ? 'accent-outline' : 'ghost'}" data-action="toggle-goal" data-id="${id}">${icon('star', 18)} ${isGoal ? 'Es tu objetivo' : 'Marcar como objetivo'}</button>`
          : ''}
      </div>
    </section>

    ${prereqs.length ? `
      <section class="card">
        <h3>Antes de empezar se recomienda</h3>
        <ul class="prereqs">
          ${prereqs.map((p) => `
            <li class="${p.ok ? 'ok' : ''}">
              <span class="node small">${p.ok ? icon('check', 14) : icon('lock', 14)}</span>
              <a href="#/ruta/${p.roadmap.id}">${esc(p.roadmap.name)}</a>
              <span class="muted small">paso ${p.step + 1}: ${esc(p.stepName)}</span>
            </li>`).join('')}
        </ul>
      </section>` : ''}

    ${history.length >= 2 ? `
      <section class="card">
        <h3>Tu progreso en este paso</h3>
        ${progressLine(history.map((h) => ({ date: h.date, value: h.best })), { target: step.target, unit })}
      </section>` : history.length === 1 ? `
      <section class="card">
        <h3>Tu progreso en este paso</h3>
        <p class="muted small">Mejor serie hasta ahora: <strong class="accent-text">${history[0].best} ${unit}</strong> (objetivo ${step.target} ${unit}). La gráfica aparecerá a partir de la segunda sesión.</p>
      </section>` : ''}

    <section class="card">
      <h3>Hoja de ruta</h3>
      <ol class="path">${r.steps.map((s, i) => stepItem(r, s, i, progress)).join('')}</ol>
    </section>
  `;
}

export const actions = {
  'set-level'(el) {
    const id = el.dataset.id;
    const step = Number(el.dataset.step);
    const r = ROADMAP_BY_ID[id];
    if (!confirm(`¿Poner tu nivel de ${r.name} en el paso ${step + 1} (${r.steps[step].name})?`)) return;
    setStep(id, step);
    toast('Nivel actualizado');
  },
  'toggle-goal'(el) {
    const id = el.dataset.id;
    const goals = getState().settings.goals;
    if (!goals.includes(id) && goals.length >= MAX_GOALS) {
      toast(`Máximo ${MAX_GOALS} objetivos a la vez. Quita uno en Ajustes.`);
      return;
    }
    update((s) => {
      const g = s.settings.goals;
      s.settings.goals = g.includes(id) ? g.filter((x) => x !== id) : [...g, id];
      s.plan = null;
    });
  },
  'train-only'(el) {
    const id = el.dataset.id;
    const state = getState();
    if (state.active && !confirm('Ya tienes un entreno en curso. ¿Descartarlo y empezar este?')) return;
    audio.unlock();
    update((s) => { s.active = createSession(s, { dayType: 'libre', ids: [id] }); });
    wakeLock.request();
    navigate('#/entreno');
  },
};
