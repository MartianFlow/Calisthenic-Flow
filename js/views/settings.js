// Ajustes, copia de seguridad y bienvenida (configuración inicial).

import { ROADMAPS, ROADMAP_BY_ID } from '../data/roadmaps.js';
import { getState, update, replaceState, resetState, getProgress } from '../store.js';
import { prereqStatus, deloadActive } from '../logic.js';
import { esc, icon, targetLabel, toast } from '../ui.js';
import { navigate } from '../router.js';
import { audio } from '../device.js';
import { recommendDays, DEFAULT_DAYS } from '../schedule.js';
import { dayChips, daysSegmented, legsSegmented } from './plan.js';
import { THEMES, applyTheme } from '../theme.js';

const MAX_GOALS = 3;
const skills = () => ROADMAPS.filter((r) => r.category === 'habilidad');
const basics = () => ROADMAPS.filter((r) => r.category === 'fuerza');

function segmented(key, options, current) {
  return `<div class="segmented" role="radiogroup">${options.map(([value, label]) => `
    <button role="radio" aria-checked="${value === current}" class="${value === current ? 'on' : ''}"
      data-action="set-setting" data-key="${key}" data-value="${value}">${esc(label)}</button>`).join('')}</div>`;
}

function toggle(key, on, label, hint = '') {
  return `
    <button class="toggle-row" data-action="toggle-setting" data-key="${key}" role="switch" aria-checked="${on}">
      <span class="grow"><span>${esc(label)}</span>${hint ? `<span class="muted small block">${esc(hint)}</span>` : ''}</span>
      <span class="switch ${on ? 'on' : ''}"><span></span></span>
    </button>`;
}

function goalPicker(state) {
  return `<div class="goal-picker">${skills().map((r) => {
    const on = state.settings.goals.includes(r.id);
    const missing = prereqStatus(r).filter((p) => !p.ok).length;
    return `<button class="goal-chip ${on ? 'on' : ''}" data-action="toggle-goal-setting" data-id="${r.id}" aria-pressed="${on}">
      ${on ? icon('star', 15) : ''}${esc(r.name)}${missing && !on ? ` <span class="muted">${icon('lock', 12)}</span>` : ''}
    </button>`;
  }).join('')}</div>`;
}

function levelSelect(r) {
  const p = getProgress(r.id);
  return `
    <label class="field level-field">
      <span>${esc(r.name)} <span class="muted small">${esc(r.group)}</span></span>
      <select data-change="set-level-select" data-id="${r.id}">
        ${r.steps.map((s, i) => `<option value="${i}" ${i === p.step ? 'selected' : ''}>${i + 1}. ${esc(s.name)} (${esc(targetLabel(s))})</option>`).join('')}
      </select>
    </label>`;
}

export function render() {
  const state = getState();
  const st = state.settings;
  return `
    <header class="page-head">
      <div class="eyebrow">Configuración</div>
      <h1>Ajustes</h1>
    </header>

    <section class="card">
      <h3>Habilidades objetivo</h3>
      <p class="muted small">Hasta ${MAX_GOALS}. Se practican al inicio del entreno, cuando estás fresco, con un máximo de 2 por sesión (si eliges 3, se van rotando). ${icon('lock', 12)} = se recomienda más base antes.</p>
      ${goalPicker(state)}
    </section>

    <section class="card">
      <h3>Plan semanal</h3>
      <a class="btn ghost" href="#/plan">${icon('route', 18)} ${state.settings.schedule ? `${st.daysPerWeek} días por semana · ver plan` : 'Crear plan semanal'}</a>
      <div class="field"><span>Pierna</span>${legsSegmented(state)}</div>
      ${st.legs === 'gym' ? '<p class="muted small">Tus pesos de pierna se apuntan en «Plan semanal» o durante el entreno.</p>' : ''}
      <div class="field"><span>Sesiones con la meta cumplida para subir en habilidades</span>${segmented('passesToLevelUp', [[1, '1'], [2, '2'], [3, '3']], st.passesToLevelUp)}</div>
      <p class="muted small">En los básicos de fuerza basta 1 sesión. En habilidades de brazos rectos se recomiendan 2, porque los tendones se adaptan más despacio que el músculo.</p>
      ${deloadActive(state)
        ? `<button class="btn ghost small" data-action="deload-end">Terminar semana de descarga</button>`
        : `<button class="btn ghost small" data-action="deload-start">Empezar semana de descarga</button>`}
      <p class="muted small">Descarga: 7 días con una serie menos y objetivos al ~65 %. Recomendada cada 5–6 semanas o si te estancas.</p>
    </section>

    <section class="card">
      <h3>Apariencia</h3>
      <div class="segmented" role="radiogroup" aria-label="Tema">${THEMES.map(([value, label]) => `
        <button role="radio" aria-checked="${st.theme === value}" class="${st.theme === value ? 'on' : ''}" data-action="set-theme" data-value="${value}">${esc(label)}</button>`).join('')}</div>
      <p class="muted small">Automático sigue el modo claro u oscuro del iPhone. Si desde la pantalla de inicio no cambia, elige Claro u Oscuro.</p>
    </section>

    <section class="card">
      <h3>Entreno</h3>
      ${toggle('warmup', st.warmup, 'Calentamiento guiado', 'Lista de movilidad antes de los ejercicios')}
      ${toggle('sound', st.sound, 'Sonido al acabar el descanso', 'El iPhone debe tener el modo silencio desactivado')}
      <button class="btn ghost small" data-action="test-sound">${icon('timer', 16)} Probar sonido</button>
    </section>

    <section class="card">
      <h3>Tus datos</h3>
      <p class="muted small">Todo se guarda solo en este iPhone. Haz una copia de vez en cuando por si cambias de móvil o borras la app.</p>
      <div class="row gap wrap">
        <button class="btn ghost" data-action="export-data">${icon('download', 18)} Exportar copia</button>
        <label class="btn ghost">${icon('upload', 18)} Importar copia<input type="file" accept="application/json,.json" data-change="import-data" hidden></label>
      </div>
      <button class="btn danger-outline small" data-action="reset-data">${icon('trash', 16)} Borrar todos los datos</button>
    </section>

    <section class="card">
      <h3>Instalar en el iPhone</h3>
      <ol class="muted small steps-list">
        <li>Abre esta página en <strong>Safari</strong>.</li>
        <li>Pulsa el botón <strong>Compartir</strong>.</li>
        <li>Elige <strong>Añadir a pantalla de inicio</strong>.</li>
      </ol>
      <p class="muted tiny">Calisthenic Flow · v2.0</p>
    </section>
  `;
}

export function renderOnboarding() {
  const state = getState();
  const rec = recommendDays(state);
  const goals = state.settings.goals.map((id) => ROADMAP_BY_ID[id]).filter(Boolean);
  return `
    <header class="page-head">
      <div class="badge-big">${icon('route', 34)}</div>
      <h1>Calisthenic Flow</h1>
      <p class="muted">Tu hoja de ruta de calistenia: progresiones paso a paso, entrenos recomendados según tu nivel y registro de tu evolución.</p>
    </header>

    <section class="card">
      <div class="eyebrow">Paso 1</div>
      <h2>Tu nivel en los básicos</h2>
      <p class="muted small">En cada ruta, elige el <strong>primer ejercicio que todavía no puedas completar</strong> con el objetivo indicado. Si dudas, quédate un paso por debajo: subirás rápido.</p>
      ${basics().map(levelSelect).join('')}
    </section>

    <section class="card">
      <div class="eyebrow">Paso 2</div>
      <h2>¿Qué habilidades quieres conseguir?</h2>
      <p class="muted small">Elige hasta ${MAX_GOALS}. Puedes cambiarlas cuando quieras.</p>
      ${goalPicker(state)}
      ${goals.map(levelSelect).join('')}
    </section>

    <section class="card">
      <div class="eyebrow">Paso 3</div>
      <h2>¿Qué días puedes entrenar?</h2>
      ${dayChips(state.settings.schedule?.days || DEFAULT_DAYS)}
      <div class="field"><span>¿Dónde entrenas pierna?</span>${legsSegmented(state)}</div>
      <div class="field"><span>Días de entreno por semana <span class="muted small">(★ recomendado: ${rec.days})</span></span>${daysSegmented(state, rec)}</div>
      <p class="muted small">${esc(rec.reasons[0])} Podrás ver y ajustar tu semana en «Plan semanal».</p>
    </section>

    <button class="btn primary block" data-action="finish-onboarding">${icon('check', 18)} Empezar</button>
    <p class="muted tiny center">Tus datos se guardan solo en este dispositivo.</p>
  `;
}

function downloadBackup(json) {
  const date = new Date().toISOString().slice(0, 10);
  const name = `calisthenic-flow-${date}.json`;
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file], title: 'Copia de Calisthenic Flow' }).catch(() => {});
    return;
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export const actions = {
  'set-setting'(el) {
    const key = el.dataset.key;
    const value = Number(el.dataset.value);
    update((s) => { s.settings[key] = value; if (key === 'daysPerWeek') s.plan = null; });
  },
  'set-theme'(el) {
    const value = el.dataset.value;
    if (!THEMES.some(([v]) => v === value)) return;
    applyTheme(value);
    update((s) => { s.settings.theme = value; });
  },
  'toggle-setting'(el) {
    const key = el.dataset.key;
    update((s) => { s.settings[key] = !s.settings[key]; });
  },
  'toggle-goal-setting'(el) {
    const id = el.dataset.id;
    const goals = getState().settings.goals;
    if (!goals.includes(id) && goals.length >= MAX_GOALS) {
      toast(`Máximo ${MAX_GOALS} objetivos. Quita uno primero.`);
      return;
    }
    update((s) => {
      const g = s.settings.goals;
      s.settings.goals = g.includes(id) ? g.filter((x) => x !== id) : [...g, id];
      s.plan = null;
    });
  },
  'test-sound'() {
    audio.unlock();
    const wasOn = getState().settings.sound;
    if (!wasOn) { toast('Activa el sonido primero'); return; }
    audio.beep({ times: 3 });
  },
  'export-data'() {
    downloadBackup(JSON.stringify({ app: 'calisthenic-flow', exportedAt: new Date().toISOString(), data: getState() }, null, 2));
  },
  'reset-data'() {
    if (!confirm('¿Borrar TODOS tus datos (historial, niveles y ajustes)? No se puede deshacer.')) return;
    if (!confirm('¿Seguro? Si no tienes copia, se perderá todo.')) return;
    resetState();
    navigate('#/bienvenida', { replace: true });
  },
  'finish-onboarding'() {
    update((s) => {
      s.onboarded = true;
      s.settings.schedule ||= { days: [...DEFAULT_DAYS] };
      for (const r of ROADMAPS) if (!s.progress[r.id]) s.progress[r.id] = { step: 0, passes: 0, done: false };
    });
    navigate('#/', { replace: true });
  },
};

export const changes = {
  'set-level-select'(el) {
    const id = el.dataset.id;
    const step = Number(el.value);
    update((s) => { s.progress[id] = { step, passes: 0, done: false }; s.plan = null; }, { silent: true });
  },
  async 'import-data'(el) {
    const file = el.files?.[0];
    el.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const data = parsed?.app === 'calisthenic-flow' ? parsed.data : parsed;
      if (!data || typeof data !== 'object' || !Array.isArray(data.sessions)) throw new Error('formato');
      if (!confirm(`Se importarán ${data.sessions.length} entrenos y reemplazarán tus datos actuales. ¿Continuar?`)) return;
      replaceState({ ...data, active: null, onboarded: true });
      toast('Copia importada');
      navigate('#/', { replace: true });
    } catch {
      toast('No se pudo leer el archivo de copia');
    }
  },
};
