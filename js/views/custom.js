// Mis ejercicios: los que crea la persona (del gimnasio, con banda, de movilidad…).
// Lista en Rutas, formulario para crearlos o editarlos y en qué días van fijos.

import { getState, update, cleanCustom, CUSTOM_LIMITS } from '../store.js';
import { GROUPS, customOf, activeCustom, liftState, liftGoal, uid, planDayTypes } from '../logic.js';
import { DAY_INFO } from '../schedule.js';
import { esc, icon, toast, fmtKg, kgInput, parseKg } from '../ui.js';
import { navigate } from '../router.js';
import { parseVideo } from '../video.js';
import { unlockCheck } from './hero.js';

export const MEASURES = { reps: 'Repeticiones', hold: 'Segundos' };
const INCS = [1, 2.5, 5];
const SETS = [2, 3, 4, 5];

const unitOf = (c, v) => (c.kind === 'hold' ? `${v} s` : `${v} ${v === 1 ? 'rep' : 'reps'}`);
export const rangeText = (c) => (c.kind === 'hold' ? `${c.min}–${c.max} s` : `${c.min}–${c.max} reps`);
export const groupText = (c) => [GROUPS[c.group]?.label, c.muscle].filter(Boolean).join(' · ');
const dayLabels = (days) => days.filter((d) => DAY_INFO[d]).map((d) => DAY_INFO[d].label);

// Objetivo de hoy de un ejercicio propio: «3 × 10» con sus kilos o segundos.
export function customTarget(state, c) {
  const p = liftState(state, c.id);
  const goal = liftGoal(c, p);
  return { sets: c.sets, goal, kg: c.load ? p.kg : null, unit: c.kind === 'hold' ? 'seg' : goal === 1 ? 'rep' : 'reps' };
}

// Tarjeta de la lista (Rutas).
function customCard(state, c, planTypes) {
  const t = customTarget(state, c);
  const days = dayLabels((c.days || []).filter((d) => planTypes.includes(d)));
  return `
    <a class="card route-card custom-card ${c.archived ? 'archived' : ''}" href="#/ejercicio/${esc(c.id)}">
      <div class="row between">
        <div class="grow">
          <div class="eyebrow">${esc(groupText(c))}</div>
          <h3>${esc(c.name)}</h3>
        </div>
        <span class="pill tiny ${c.load ? 'accent' : ''}">${c.load ? 'Con peso' : esc(MEASURES[c.kind])}</span>
      </div>
      <div class="muted small">${t.sets} × ${esc(rangeText(c))}${c.side ? ' por lado' : ''}${c.load ? ` · ahora ${esc(fmtKg(t.kg))}` : ''}</div>
      <div class="muted tiny">${c.archived ? 'Archivado: no sale en tus entrenos' : days.length ? `${icon('calendar', 13)} ${esc(days.join(', '))}` : 'En ningún día fijo: añádelo a un entreno desde Hoy → Editar'}</div>
    </a>`;
}

// Sección de Rutas.
export function myExercisesSection(state) {
  const planTypes = planDayTypes(state);
  const list = activeCustom(state);
  const archived = (state.custom || []).filter((c) => c.archived);
  return `
    <section id="mis-ejercicios">
      <div class="section-head">
        <h2>Mis ejercicios</h2>
        <p class="muted small">Los que añades tú: del gimnasio, con banda, de movilidad… Suben con el mismo sistema: un rango de repeticiones y, si llevan peso, más kilos al llegar arriba.</p>
      </div>
      <div class="route-grid">
        ${list.map((c) => customCard(state, c, planTypes)).join('')}
        <a class="card custom-new" href="#/mis-ejercicios/nuevo">${icon('plus', 22)}<span><strong>Crear ejercicio</strong><span class="muted small block">Nombre, cómo se mide, series, rango y en qué días va.</span></span></a>
      </div>
      ${archived.length ? `
        <details class="archived-list">
          <summary>${icon('box', 16)} Archivados (${archived.length})</summary>
          <div class="route-grid">${archived.map((c) => customCard(state, c, planTypes)).join('')}</div>
        </details>` : ''}
    </section>`;
}

// ─────────────────────────── Formulario ───────────────────────────
// El borrador vive aquí mientras se edita; antes de repintar se copian los campos de texto
// del formulario, así no se pierde lo escrito al tocar un botón.
let draft = null;
let draftKey = null;

function newDraft() {
  return { id: null, name: '', kind: 'reps', load: false, inc: 2.5, kg: '', group: 'empuje', muscle: '', sets: 3, min: 8, max: 12, side: false, video: '', cues: '', days: [] };
}

function draftFrom(c) {
  const p = liftState(getState(), c.id);
  return { ...c, kg: c.load ? kgInput(p.kg) : '', cues: (c.cues || []).join('\n'), days: [...(c.days || [])] };
}

function syncDraft() {
  const form = document.querySelector('[data-custom-form]');
  if (!form || !draft) return;
  for (const key of ['name', 'muscle', 'video', 'cues', 'kg']) {
    const el = form.elements.namedItem(key);
    if (el) draft[key] = el.value;
  }
}

function seg(key, options, current, label) {
  return `<div class="segmented" role="radiogroup" aria-label="${esc(label)}">${options.map(([v, l]) => `
    <button type="button" role="radio" aria-checked="${v === current}" class="${v === current ? 'on' : ''}" data-action="cx-set" data-key="${key}" data-value="${v}">${esc(l)}</button>`).join('')}</div>`;
}

function rangeStepper(which, value) {
  return `
    <div class="range-box">
      <span class="muted tiny">${which === 'min' ? 'Desde' : 'Hasta'}</span>
      <div class="stepper">
        <button type="button" class="step-btn" data-action="cx-range" data-key="${which}" data-dir="-1" aria-label="${which === 'min' ? 'Mínimo' : 'Máximo'}: menos">${icon('minus', 18)}</button>
        <span class="val" data-cx="${which}">${value}</span>
        <button type="button" class="step-btn" data-action="cx-range" data-key="${which}" data-dir="1" aria-label="${which === 'min' ? 'Mínimo' : 'Máximo'}: más">${icon('plus', 18)}</button>
      </div>
    </div>`;
}

function hasHistory(state, id) {
  return state.sessions.some((s) => s.items.some((it) => it.customId === id));
}

export function renderForm({ id }) {
  const state = getState();
  const key = id || 'nuevo';
  const existing = id ? customOf(id, state) : null;
  if (id && !existing) return '<div class="empty"><p>Ejercicio no encontrado.</p><a class="btn ghost" href="#/rutas">Volver</a></div>';
  if (draftKey !== key || !draft) { draft = existing ? draftFrom(existing) : newDraft(); draftKey = key; }
  const d = draft;
  const types = planDayTypes(state);
  const unit = d.kind === 'hold' ? 'segundos' : 'repeticiones';
  return `
    <header class="page-head">
      <button class="back" data-action="go-back" data-fallback="#/rutas">${icon('back', 18)} Volver</button>
      <div class="eyebrow">Mis ejercicios</div>
      <h1>${existing ? 'Editar ejercicio' : 'Nuevo ejercicio'}</h1>
    </header>
    <form class="card custom-form" data-custom-form autocomplete="off" onsubmit="return false">
      <label class="field"><span>Nombre</span>
        <input class="text-input" name="name" maxlength="${CUSTOM_LIMITS.name}" value="${esc(d.name)}" placeholder="Ej.: Curl de bíceps con mancuerna" enterkeyhint="done">
      </label>

      <div class="field"><span>Qué trabaja</span>
        <div class="goal-picker" role="radiogroup" aria-label="Grupo muscular">${Object.entries(GROUPS).map(([g, info]) => `
          <button type="button" class="goal-chip ${d.group === g ? 'on' : ''}" role="radio" aria-checked="${d.group === g}" data-action="cx-set" data-key="group" data-value="${g}">${esc(info.label)}</button>`).join('')}</div>
        <span class="muted small hint">${esc(GROUPS[d.group].label)}: ${esc(GROUPS[d.group].hint)}.</span>
      </div>
      <label class="field"><span>Músculo <small class="muted">· opcional</small></span>
        <input class="text-input" name="muscle" maxlength="${CUSTOM_LIMITS.muscle}" value="${esc(d.muscle)}" placeholder="Ej.: Bíceps" enterkeyhint="done">
      </label>

      <div class="field"><span>Cómo se mide</span>${seg('kind', Object.entries(MEASURES), d.kind, 'Cómo se mide')}</div>
      ${d.kind === 'reps' ? `
        <button type="button" class="toggle-row" data-action="cx-toggle" data-key="load" role="switch" aria-checked="${d.load}">
          <span class="grow"><span>Con peso (kg)</span><span class="muted small block">Mancuernas, barra, máquina o lastre: al llegar arriba del rango, la app te sube el peso.</span></span>
          <span class="switch ${d.load ? 'on' : ''}"><span></span></span>
        </button>` : ''}
      ${d.kind === 'reps' && d.load ? `
        <div class="field"><span>Cuánto sube cada vez</span>${seg('inc', INCS.map((v) => [v, `${String(v).replace('.', ',')} kg`]), d.inc, 'Cuánto sube el peso')}</div>
        <label class="load-row" for="cx-kg">
          <span class="load-label">Peso</span>
          <span class="grow muted small">Con el que lo haces ahora <span class="block">(opcional)</span></span>
          <span class="load-field small"><input id="cx-kg" class="load-input" name="kg" type="text" inputmode="decimal" value="${esc(d.kg)}" placeholder="—"><small>kg</small></span>
        </label>` : ''}

      <div class="field"><span>Series</span>${seg('sets', SETS.map((v) => [v, String(v)]), d.sets, 'Series')}</div>
      <div class="field"><span>Rango de ${unit}</span>
        <div class="range-row">${rangeStepper('min', d.min)}${rangeStepper('max', d.max)}</div>
        <span class="muted small hint">Empiezas en ${esc(unitOf(d, d.min))} y subes con Fácil o Normal. ${d.load ? `Al hacer ${esc(unitOf(d, d.max))} en todas las series, sube el peso y vuelves a ${esc(unitOf(d, d.min))}.` : `Al llegar a ${esc(unitOf(d, d.max))} en todas las series, te propone una variante más difícil.`}</span>
      </div>
      <button type="button" class="toggle-row" data-action="cx-toggle" data-key="side" role="switch" aria-checked="${d.side}">
        <span class="grow"><span>Por lado</span><span class="muted small block">Cada serie con un lado y luego con el otro.</span></span>
        <span class="switch ${d.side ? 'on' : ''}"><span></span></span>
      </button>

      <div class="field"><span>En qué días va</span>
        <div class="goal-picker" role="group" aria-label="Días del plan">${types.map((t) => `
          <button type="button" class="goal-chip keep ${d.days.includes(t) ? 'on' : ''}" aria-pressed="${d.days.includes(t)}" data-action="cx-day" data-value="${esc(t)}">${esc(DAY_INFO[t].label)}</button>`).join('')}</div>
        <span class="muted small hint">Va al final de esos días de tu plan (antes del core, si lo hay). Si no marcas ninguno, lo añades a un entreno suelto desde Hoy → Editar.</span>
      </div>

      <label class="field"><span>Vídeo <small class="muted">· opcional</small></span>
        <input class="text-input" name="video" type="url" inputmode="url" maxlength="300" value="${esc(d.video)}" placeholder="Enlace de YouTube u otra web" enterkeyhint="done">
      </label>
      <label class="field"><span>Claves técnicas <small class="muted">· opcional, una por línea</small></span>
        <textarea name="cues" rows="3" maxlength="${CUSTOM_LIMITS.cues * CUSTOM_LIMITS.cue}" placeholder="Ej.: Codos pegados al cuerpo">${esc(d.cues)}</textarea>
      </label>

      <div class="row gap">
        <button type="button" class="btn primary grow" data-action="cx-save">${icon('check', 18)} Guardar</button>
        <button type="button" class="btn ghost" data-action="cx-cancel">Cancelar</button>
      </div>
      ${existing ? `
        <div class="row gap wrap cx-danger">
          <button type="button" class="btn ghost small" data-action="cx-archive" data-id="${esc(existing.id)}">${icon('box', 16)} ${existing.archived ? 'Recuperar' : 'Archivar'}</button>
          ${hasHistory(state, existing.id) ? '' : `<button type="button" class="btn danger-outline small" data-action="cx-delete" data-id="${esc(existing.id)}">${icon('trash', 16)} Borrar</button>`}
        </div>
        <p class="muted tiny">${hasHistory(state, existing.id) ? 'Archivar lo quita de tus entrenos sin borrar lo que ya entrenaste.' : 'Aún no lo has entrenado: puedes borrarlo del todo.'}</p>` : ''}
    </form>`;
}

const RANGE = { reps: { step: 1 }, hold: { step: 5 } };

function rerenderForm(ctx) { ctx.rerender(); }

export const actions = {
  'cx-set'(el, ctx) {
    syncDraft();
    const k = el.dataset.key;
    const v = el.dataset.value;
    if (k === 'kind') {
      if (draft.kind === v) return;
      draft.kind = v;
      if (v === 'hold') { draft.load = false; draft.min = 20; draft.max = 40; } else { draft.min = 8; draft.max = 12; }
    } else if (k === 'sets' || k === 'inc') draft[k] = Number(v);
    else draft[k] = v;
    rerenderForm(ctx);
  },
  'cx-toggle'(el, ctx) {
    syncDraft();
    draft[el.dataset.key] = !draft[el.dataset.key];
    rerenderForm(ctx);
  },
  'cx-range'(el, ctx) {
    syncDraft();
    const [lo, hi] = CUSTOM_LIMITS[draft.kind];
    const step = RANGE[draft.kind].step * Number(el.dataset.dir);
    const k = el.dataset.key;
    const next = Math.min(hi, Math.max(lo, draft[k] + step));
    draft[k] = next;
    if (k === 'min' && draft.max < next) draft.max = next;
    if (k === 'max' && draft.min > next) draft.min = next;
    rerenderForm(ctx);
  },
  'cx-day'(el, ctx) {
    syncDraft();
    const t = el.dataset.value;
    draft.days = draft.days.includes(t) ? draft.days.filter((x) => x !== t) : [...draft.days, t];
    rerenderForm(ctx);
  },
  'cx-cancel'() {
    const back = draft?.id ? `#/ejercicio/${draft.id}` : '#/rutas';
    draft = null; draftKey = null;
    navigate(back, { replace: true });
  },
  'cx-save'() {
    syncDraft();
    const d = draft;
    if (!d) return;
    if (!d.name.trim()) { toast('Ponle un nombre al ejercicio'); document.querySelector('[name="name"]')?.focus(); return; }
    const kg = d.load ? parseKg(d.kg) : null;
    if (d.load && Number.isNaN(kg)) { toast('Escribe el peso en kg, por ejemplo 12,5'); return; }
    if (d.video.trim() && !parseVideo(d.video)) { toast('El enlace del vídeo no parece válido'); return; }
    const isNew = !d.id;
    const id = d.id || `c-${uid()}`;
    const clean = cleanCustom({ ...d, id, cues: d.cues.split('\n'), createdAt: d.createdAt || Date.now() });
    if (!clean) { toast('No se pudo guardar el ejercicio'); return; }
    update((s) => {
      s.custom ||= [];
      const i = s.custom.findIndex((c) => c.id === id);
      if (i >= 0) s.custom[i] = { ...clean, archived: s.custom[i].archived };
      else s.custom.push(clean);
      if (d.load && kg != null) {
        s.lifts ||= {};
        const p = (s.lifts[id] ||= { kg: null, reps: null, stall: 0 });
        p.kg = kg;
      }
      // El entreno de hoy (sin editar) se recalcula con el ejercicio nuevo.
      if (s.plan && !s.plan.custom && !s.plan.picked) s.plan = null;
    }, { silent: true });
    draft = null; draftKey = null;
    const days = dayLabels(clean.days.filter((t) => planDayTypes(getState()).includes(t)));
    navigate(`#/ejercicio/${id}`, { replace: true });
    toast(`${isNew ? 'Creado' : 'Guardado'}${days.length ? `: va en ${days.join(', ')}` : ''}`);
    unlockCheck();
  },
  'cx-archive'(el) {
    const id = el.dataset.id;
    const c = customOf(id);
    if (!c) return;
    const { name, archived } = c; // (c es el mismo objeto que cambia dentro de update)
    update((s) => {
      const x = s.custom.find((y) => y.id === id);
      x.archived = !x.archived;
      if (s.plan && !s.plan.custom) s.plan = null;
    });
    draft = null; draftKey = null;
    toast(archived ? `${name} vuelve a tus entrenos` : `${name} archivado`);
    navigate(`#/ejercicio/${id}`, { replace: true });
  },
  'cx-delete'(el) {
    const id = el.dataset.id;
    const c = customOf(id);
    if (!c || !confirm(`¿Borrar «${c.name}»?`)) return;
    update((s) => {
      s.custom = s.custom.filter((x) => x.id !== id);
      if (s.lifts) delete s.lifts[id];
      if (s.plan) s.plan.ids = s.plan.ids.filter((x) => x !== id);
      if (s.plan && !s.plan.ids.length) s.plan = null;
    });
    draft = null; draftKey = null;
    toast('Ejercicio borrado');
    navigate('#/rutas', { replace: true });
  },
};
