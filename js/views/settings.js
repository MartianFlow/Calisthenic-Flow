// Ajustes y copia de seguridad. La bienvenida (configuración inicial) está en onboarding.js.

import { getState, update, replaceState, resetState, clampRest, REST_RANGE } from '../store.js';
import { deloadActive } from '../logic.js';
import { esc, icon, toast, fmtClock } from '../ui.js';
import { navigate } from '../router.js';
import { audio } from '../device.js';
import { legsSegmented } from './plan.js';
import { THEMES, fadeToTheme, effectiveTheme } from '../theme.js';
import { versionLabel } from '../version.js';
import { bump } from '../fx.js';
import { resetWizard } from './onboarding.js';
import { skillsSettings } from './skills.js';
import { unlockCheck } from './hero.js';

function segmented(key, options, current) {
  return `<div class="segmented" role="radiogroup">${options.map(([value, label]) => `
    <button role="radio" aria-checked="${value === current}" class="${value === current ? 'on' : ''}"
      data-action="set-setting" data-key="${key}" data-value="${value}">${esc(label)}</button>`).join('')}</div>`;
}

export function toggle(key, on, label, hint = '') {
  return `
    <button class="toggle-row" data-action="toggle-setting" data-key="${key}" role="switch" aria-checked="${on}">
      <span class="grow"><span>${esc(label)}</span>${hint ? `<span class="muted small block">${esc(hint)}</span>` : ''}</span>
      <span class="switch ${on ? 'on' : ''}"><span></span></span>
    </button>`;
}

const REST_PRESETS = [60, 80, 90, 120, 180];
const restText = (sec) => (sec < 60 ? `${sec} s` : sec % 60 ? fmtClock(sec) : `${sec / 60} min`);

// Descanso entre series: el mismo para todo (con −/+ y atajos) o el recomendado para cada ejercicio.
// En la letra Bangers la «IJ» de «FIJO» parece una «U»: un espacio finísimo (&#8202;) las separa.
export function restPicker(state) {
  const st = state.settings;
  const fixed = st.restMode !== 'auto';
  return `
    <div class="rest-picker">
      <div class="segmented" role="radiogroup" aria-label="Tipo de descanso">
        <button role="radio" aria-checked="${fixed}" class="${fixed ? 'on' : ''}" data-action="set-rest-mode" data-value="fixed" aria-label="Fijo">Fi&#8202;jo</button>
        <button role="radio" aria-checked="${!fixed}" class="${!fixed ? 'on' : ''}" data-action="set-rest-mode" data-value="auto">Según ejercicio</button>
      </div>
      ${fixed ? `
        <div class="rest-stepper">
          <button class="step-btn" data-action="rest-default" data-dir="-1" aria-label="${REST_RANGE.step} segundos menos" ${st.restSec <= REST_RANGE.min ? 'disabled' : ''}>${icon('minus', 18)}</button>
          <span class="val" data-rest-default>${fmtClock(st.restSec)}<small>min</small></span>
          <button class="step-btn" data-action="rest-default" data-dir="1" aria-label="${REST_RANGE.step} segundos más" ${st.restSec >= REST_RANGE.max ? 'disabled' : ''}>${icon('plus', 18)}</button>
        </div>
        <div class="rest-presets">${REST_PRESETS.map((sec) => `
          <button class="mini-btn ${sec === st.restSec ? 'on' : ''}" data-action="rest-preset" data-sec="${sec}" aria-pressed="${sec === st.restSec}">${restText(sec)}</button>`).join('')}
        </div>
        <p class="muted small">El mismo descanso en todos los ejercicios. Durante el descanso puedes sumar o quitar 15 s.</p>`
      : `<p class="muted small">Cada ejercicio usa el descanso recomendado: 3 min en series pesadas de 1–5 repeticiones, 2–2,5 min en dominadas, fondos y habilidades de brazos rectos, y 1–1,5 min en el resto.</p>`}
    </div>`;
}

// Cuenta atrás antes de cada isometría (para colocarse). Durante la cuenta atrás, «+5 s» la alarga.
export function prepPicker(state) {
  return `
    <div class="field"><span>Cuenta atrás de las isometrías</span>
      ${segmented('holdPrep', [[3, '3 s'], [5, '5 s'], [10, '10 s'], [15, '15 s']], state.settings.holdPrep)}
      <span class="muted small hint">Tiempo para colocarte antes de que empiece a contar. Mientras cuenta, «+5 s» te da más.</span>
    </div>`;
}

export function render() {
  const state = getState();
  const st = state.settings;
  return `
    <header class="page-head">
      <div class="eyebrow">Configuración</div>
      <h1>Ajustes</h1>
    </header>

    <section class="card skills-card" id="habilidades">
      <h3>Habilidades</h3>
      <p class="muted small">Céntrate en aprender una y mantén las que ya dominas. Se practican al principio del entreno, cuando estás fresco. ${icon('lock', 12)} = se recomienda más base antes · ${icon('trophy', 12)} = ruta completada.</p>
      ${skillsSettings(state)}
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
      <div class="field"><span>Descanso entre series</span>${restPicker(state)}</div>
      ${prepPicker(state)}
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
      <p class="muted small">La app se actualiza sola cuando hay conexión. Si alguna vez ves algo antiguo, pulsa «Actualizar la app».</p>
      <button class="btn ghost small" data-action="app-update">${icon('download', 16)} Actualizar la app</button>
      <p class="muted tiny" data-app-version>Calisthenic Flow · ${esc(versionLabel())}</p>
    </section>
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
  async 'app-update'() {
    toast('Buscando la última versión…');
    try {
      const reg = await navigator.serviceWorker?.getRegistration?.();
      await reg?.update();
    } catch { /* sin conexión: se recarga con la copia guardada */ }
    location.reload();
  },
  'set-rest-mode'(el) {
    const value = el.dataset.value === 'auto' ? 'auto' : 'fixed';
    update((s) => { s.settings.restMode = value; });
  },
  'rest-default'(el) {
    update((s) => { s.settings.restSec = clampRest(s.settings.restSec + Number(el.dataset.dir) * REST_RANGE.step); });
    bump(document.querySelector('[data-rest-default]'));
  },
  'rest-preset'(el) {
    update((s) => { s.settings.restSec = clampRest(el.dataset.sec); });
    bump(document.querySelector('[data-rest-default]'));
  },
  // Botón de las cabeceras: alterna entre claro y oscuro sin salir de la pantalla.
  'theme-toggle'() {
    const next = effectiveTheme(getState().settings.theme) === 'dark' ? 'light' : 'dark';
    fadeToTheme(next);
    update((s) => { s.settings.theme = next; s.game.themeFlips = (s.game.themeFlips || 0) + 1; });
    unlockCheck();
  },
  'set-theme'(el) {
    const value = el.dataset.value;
    if (!THEMES.some(([v]) => v === value)) return;
    fadeToTheme(value);
    update((s) => {
      if (value !== s.settings.theme) s.game.themeFlips = (s.game.themeFlips || 0) + 1;
      s.settings.theme = value;
    });
    unlockCheck();
  },
  'toggle-setting'(el) {
    const key = el.dataset.key;
    update((s) => { s.settings[key] = !s.settings[key]; });
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
    resetWizard();
    navigate('#/bienvenida', { replace: true });
  },
};

export const changes = {
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
