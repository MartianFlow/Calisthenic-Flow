// Ficha de un ejercicio de gimnasio: vídeo de técnica, objetivo de hoy, peso de
// trabajo e historial. Se abre tocando el ejercicio en Hoy o en el Plan semanal,
// sin tener que empezar el entreno.

import { LIFT_BY_ID } from '../data/gym.js';
import { getState } from '../store.js';
import { liftState, liftGoal, outcomeText } from '../logic.js';
import { esc, icon, fmtClock, fmtDate, fmtKg, kgInput } from '../ui.js';
import { progressLine } from '../charts.js';
import { navigate } from '../router.js';
import { videoCard } from '../video.js';

// Sesiones en las que se hizo el ejercicio, de la más reciente a la más antigua.
function liftHistory(state, id) {
  const out = [];
  for (const s of state.sessions) {
    const item = s.items.find((x) => x.liftId === id);
    if (item?.sets.length) out.push({ date: s.startedAt, item });
  }
  return out.reverse();
}

const workingKg = (item) => {
  const loads = (item.loads || []).filter((v) => v != null);
  return loads.length ? Math.min(...loads) : null;
};

export function renderLift({ id }) {
  const lift = LIFT_BY_ID[id];
  if (!lift) return '<div class="empty"><p>Ejercicio no encontrado.</p><a class="btn ghost" href="#/">Volver</a></div>';
  const state = getState();
  const p = liftState(state, id);
  const goal = liftGoal(lift, p);
  const history = liftHistory(state, id);
  const points = history.filter((h) => workingKg(h.item) != null).reverse()
    .map((h) => ({ date: h.date, value: workingKg(h.item) }));

  return `
    <header class="page-head">
      <button class="back" data-action="go-back" data-fallback="#/">${icon('back', 18)} Volver</button>
      <div class="eyebrow">Gimnasio · ${esc(lift.muscle)}</div>
      <h1>${esc(lift.name)}</h1>
    </header>

    <section class="card">
      ${videoCard({ name: lift.name, video: lift.video, query: `${lift.name} técnica gimnasio` })}
      <div class="work-box">
        <div><span class="muted small">Tu objetivo ahora</span><strong>${lift.sets} × ${goal} · ${esc(fmtKg(p.kg))}</strong></div>
        ${icon('next', 18)}
        <div><span class="muted small">Para subir peso</span><strong>${lift.sets} × ${lift.max}</strong></div>
      </div>
      <p class="muted small">Rango ${lift.min}–${lift.max} reps dejando ${esc(lift.rir)} en reserva · descanso ${fmtClock(lift.rest)}. Cuando hagas ${lift.max} en todas las series, la app te sube ${esc(fmtKg(lift.inc))}.</p>
      <label class="load-row" for="kg-${lift.id}">
        <span class="load-label">Peso</span>
        <span class="grow muted small">Peso de trabajo actual</span>
        <span class="load-field small">
          <input id="kg-${lift.id}" class="load-input" type="text" inputmode="decimal" autocomplete="off" value="${esc(kgInput(p.kg))}" placeholder="—" data-change="lift-kg" data-id="${lift.id}">
          <small>kg</small>
        </span>
      </label>
    </section>

    <section class="card">
      <h3>Claves técnicas</h3>
      <ul class="cue-list">${lift.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    </section>

    <section class="card">
      <h3>Tu historial</h3>
      ${points.length >= 2 ? progressLine(points, {
        unit: 'kg', label: 'peso', caption: 'Peso de trabajo en cada sesión · toca un punto',
        floor: Math.floor((Math.min(...points.map((pt) => pt.value)) * 0.85) / 5) * 5,
      }) : ''}
      ${history.length ? `
        <ul class="summary-list">${history.slice(0, 8).map(({ date, item }) => `
          <li class="summary-item lift">
            <div class="eyebrow">${esc(fmtDate(date))}</div>
            <div class="set-pills">${item.sets.map((v, i) => `<span class="set-pill ${v >= item.goal ? 'met' : ''}">${esc(fmtKg(item.loads?.[i]))} × ${v}</span>`).join('')}</div>
            ${item.outcome ? `<div class="outcome">${esc(outcomeText(item))}</div>` : ''}
          </li>`).join('')}</ul>`
        : '<p class="muted">Aún no lo has entrenado con la app. Aquí verás tus pesos y repeticiones de cada sesión.</p>'}
    </section>
  `;
}

export const actions = {
  // Vuelve a la pantalla anterior (Hoy, Plan…) o, si se abrió directamente, a la indicada.
  'go-back'(el) {
    if (history.length > 1) history.back();
    else navigate(el.dataset.fallback || '#/');
  },
};
