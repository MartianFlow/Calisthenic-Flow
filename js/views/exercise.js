// Ficha de un ejercicio de gimnasio: vídeo de técnica, objetivo de hoy, peso de
// trabajo e historial. Se abre tocando el ejercicio en Hoy o en el Plan semanal,
// sin tener que empezar el entreno.

import { LIFT_BY_ID } from '../data/gym.js';
import { getState } from '../store.js';
import { liftState, liftGoal, outcomeText, restSeconds, customOf, customDef, planDayTypes } from '../logic.js';
import { dayInfo } from '../schedule.js';
import { esc, icon, fmtClock, fmtDate, fmtKg, kgInput, unitLabel } from '../ui.js';
import { progressLine } from '../charts.js';
import { liftPills, freePills } from './progress.js';
import { navigate } from '../router.js';
import { videoCard, userVideoCard } from '../video.js';
import { groupText, rangeText } from './custom.js';

// Sesiones en las que se hizo el ejercicio, de la más reciente a la más antigua.
function liftHistory(state, id) {
  const out = [];
  for (const s of state.sessions) {
    const item = s.items.find((x) => (x.liftId || x.customId) === id);
    if (item?.sets.length) out.push({ date: s.startedAt, item });
  }
  return out.reverse();
}

const workingKg = (item) => {
  const loads = (item.loads || []).filter((v) => v != null);
  return loads.length ? Math.min(...loads) : null;
};

// Ficha de un ejercicio propio: lo mismo, con su rango y sus días, y el botón de editar.
function renderCustom(state, c) {
  const def = customDef(c);
  const p = liftState(state, c.id);
  const goal = liftGoal(c, p);
  const history = liftHistory(state, c.id);
  const best = (it) => (c.load ? workingKg(it) : Math.max(0, ...it.sets));
  // (si cambiaste «con peso», la gráfica solo usa las sesiones con la medida de ahora)
  const points = history.filter((h) => !!h.item.load === !!c.load).reverse()
    .map((h) => ({ date: h.date, value: best(h.item) })).filter((pt) => pt.value > 0);
  const u = (v) => unitLabel(c.kind, v);
  const types = planDayTypes(state);
  const days = (c.days || []).filter((t) => types.includes(t)).map((t) => dayInfo(t).label);
  return `
    <header class="page-head">
      <button class="back" data-action="go-back" data-fallback="#/rutas">${icon('back', 18)} Volver</button>
      <div class="eyebrow">Tu ejercicio · ${esc(groupText(c))}</div>
      <h1>${esc(c.name)}</h1>
      ${c.archived ? '<span class="pill tiny">Archivado</span>' : ''}
    </header>

    <section class="card">
      ${userVideoCard(c.name, c.video)}
      <div class="work-box">
        <div><span class="muted small">Tu objetivo ahora</span><strong>${c.sets} × ${esc(u(goal))}</strong>${c.side ? ' <span class="small">por lado</span>' : ''}${c.load ? ` <span class="small">con ${esc(fmtKg(p.kg))}</span>` : ''}</div>
        ${icon('next', 18)}
        <div><span class="muted small">${c.load ? 'Para subir peso' : 'Tope del rango'}</span><strong>${c.sets} × ${esc(u(c.max))}</strong>${c.load ? ` <span class="small">+${esc(fmtKg(c.inc))}</span>` : ''}</div>
      </div>
      <p class="muted small">Rango ${esc(rangeText(c))} · descanso ${fmtClock(restSeconds(state, def.rest))}. ${c.load
        ? `Cuando hagas ${esc(u(c.max))} en todas las series, la app te sube ${esc(fmtKg(c.inc))}.`
        : `Cuando hagas ${esc(u(c.max))} en todas las series, te propone una variante más difícil.`}</p>
      ${c.load ? `
        <label class="load-row" for="kg-${esc(c.id)}">
          <span class="load-label">Peso</span>
          <span class="grow muted small">Peso de trabajo actual</span>
          <span class="load-field small">
            <input id="kg-${esc(c.id)}" class="load-input" type="text" inputmode="decimal" autocomplete="off" value="${esc(kgInput(p.kg))}" placeholder="—" data-change="lift-kg" data-id="${esc(c.id)}">
            <small>kg</small>
          </span>
        </label>` : ''}
      <p class="small">${icon('calendar', 14)} ${c.archived ? 'Archivado: no sale en tus entrenos.' : days.length ? `Va en <strong>${esc(days.join(', '))}</strong>.` : 'En ningún día fijo: añádelo a un entreno desde Hoy → Editar.'}</p>
      <a class="btn ghost" href="#/mis-ejercicios/${esc(c.id)}">${icon('edit', 18)} Editar ejercicio</a>
    </section>

    ${c.cues?.length ? `
    <section class="card">
      <h3>Claves técnicas</h3>
      <ul class="cue-list">${c.cues.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </section>` : ''}

    <section class="card">
      <h3>Tu historial</h3>
      ${points.length >= 2 ? progressLine(points, {
        unit: c.load ? 'kg' : c.kind === 'hold' ? 's' : 'reps', label: c.load ? 'peso' : 'mejor serie',
        caption: `${c.load ? 'Peso de trabajo' : 'Mejor serie'} en cada sesión · toca un punto`,
        floor: c.load ? Math.floor((Math.min(...points.map((pt) => pt.value)) * 0.85) / 5) * 5 : 0,
      }) : ''}
      ${history.length ? `
        <ul class="summary-list">${history.slice(0, 8).map(({ date, item }) => `
          <li class="summary-item lift">
            <div class="eyebrow">${esc(fmtDate(date))}</div>
            <div class="set-pills">${item.load ? liftPills(item) : freePills(item)}</div>
            ${item.outcome ? `<div class="outcome">${esc(outcomeText(item))}</div>` : ''}
          </li>`).join('')}</ul>`
        : '<p class="muted">Aún no lo has entrenado. Aquí verás tus series de cada sesión.</p>'}
    </section>
  `;
}

export function renderLift({ id }) {
  const custom = customOf(id);
  if (custom) return renderCustom(getState(), custom);
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
        <div><span class="muted small">Tu objetivo ahora</span><strong>${lift.sets} × ${goal}</strong> <span class="small">con ${esc(fmtKg(p.kg))}</span></div>
        ${icon('next', 18)}
        <div><span class="muted small">Para subir peso</span><strong>${lift.sets} × ${lift.max}</strong> <span class="small">+${esc(fmtKg(lift.inc))}</span></div>
      </div>
      <p class="muted small">Rango ${lift.min}–${lift.max} reps dejando ${esc(lift.rir)} en reserva · descanso ${fmtClock(restSeconds(state, lift.rest))}. Cuando hagas ${lift.max} en todas las series, la app te sube ${esc(fmtKg(lift.inc))}.</p>
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
            <div class="set-pills">${liftPills(item)}</div>
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
