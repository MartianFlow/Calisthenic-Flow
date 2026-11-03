// Habilidades: una de foco (la que aprendes) y hasta 2 de mantenimiento (las que ya dominas).
// Piezas comunes de Ajustes, Hoy, Rutas, el resumen y la bienvenida, y sus acciones.

import { ROADMAPS, ROADMAP_BY_ID } from '../data/roadmaps.js';
import { getState, update, getProgress, setSkills, MAX_MAINTAIN } from '../store.js';
import { skillPicks, prereqStatus, recommendedSkills, noSkillsYet, focusMissing } from '../logic.js';
import { esc, icon, toast, targetLabel } from '../ui.js';
import { navigate } from '../router.js';

export const skillRoutes = () => ROADMAPS.filter((r) => r.category === 'habilidad');

// «el front lever», «la planche», «el L-sit»…
const FEMININE = ['planche', 'hspu'];
export function theName(id) {
  const r = ROADMAP_BY_ID[id];
  if (!r) return '';
  const name = id === 'lsit' ? r.name : r.name[0].toLowerCase() + r.name.slice(1);
  return `${FEMININE.includes(id) ? 'la' : 'el'} ${name}`;
}

const names = (ids) => ids.map((id) => ROADMAP_BY_ID[id]?.name).filter(Boolean);
export const listText = (list) => (list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}`);

// Etiqueta pequeña para las listas de ejercicios.
export function roleTag(role) {
  if (!role) return '';
  return `<span class="role-tag ${role === 'foco' ? 'focus' : 'keep'}">${role === 'foco' ? 'foco' : 'mantener'}</span>`;
}

// Aviso con los básicos que le faltan a la habilidad de foco.
export function prereqNote(state) {
  const missing = focusMissing(state);
  if (!missing.length) return '';
  const { focus } = skillPicks(state);
  const what = missing.map((p) => `<strong>${esc(p.stepName)} ${esc(targetLabel(p.roadmap.steps[p.step]))}</strong>`);
  return `
    <p class="wiz-note prereq-note">${icon('lock', 14)}<span>Para ${esc(theName(focus))}: llega a ${what.join(' y a ')}.
      Mientras, entrenas sus primeros pasos, que son variantes fáciles, y esos básicos suben de prioridad.</span></p>`;
}

// Selector de Ajustes: «Quiero aprender» (una) y «Quiero mantener» (hasta 2).
export function skillsSettings(state) {
  const { focus, maintain } = skillPicks(state);
  const rec = noSkillsYet(state) ? recommendedSkills(state) : [];
  const lock = (r) => (prereqStatus(r).some((p) => !p.ok) ? ` <span class="muted">${icon('lock', 12)}</span>` : '');
  const done = (r) => (getProgress(r.id).done ? ` <span class="muted">${icon('trophy', 12)}</span>` : '');
  return `
    <div class="field"><span>Quiero aprender <small class="muted">· una</small></span>
      <div class="goal-picker" role="radiogroup" aria-label="Habilidad que quieres aprender">${skillRoutes().map((r) => {
        const on = focus === r.id;
        return `<button class="goal-chip ${on ? 'on' : ''}" data-action="set-focus" data-id="${r.id}" data-toggle="1" role="radio" aria-checked="${on}">
          ${on ? icon('star', 15) : ''}${esc(r.name)}${on ? '' : lock(r) + done(r)}${rec.includes(r.id) && !on ? '<span class="rec-tag">Recomendada</span>' : ''}</button>`;
      }).join('')}</div>
      <span class="muted small hint">Va en todos tus días de torso, al principio y con todo el volumen. Las de brazos rectos (front lever, planche y back lever), 3 días como mucho y nunca seguidos. El pino, una práctica corta cada día que entrenas.</span>
    </div>
    ${prereqNote(state)}
    <div class="field"><span>Quiero mantener <small class="muted">· hasta ${MAX_MAINTAIN}, las que ya dominas</small></span>
      <div class="goal-picker" role="group" aria-label="Habilidades que quieres mantener">
        <button class="goal-chip none ${maintain.length ? '' : 'on'}" data-action="maintain-none" aria-pressed="${!maintain.length}">Aún no domino ninguna</button>
        ${skillRoutes().filter((r) => r.id !== focus).map((r) => {
          const on = maintain.includes(r.id);
          return `<button class="goal-chip keep ${on ? 'on' : ''}" data-action="toggle-maintain" data-id="${r.id}" aria-pressed="${on}">${on ? icon('shield', 15) : ''}${esc(r.name)}${on ? '' : done(r)}</button>`;
        }).join('')}
      </div>
      <span class="muted small hint">Cada una, 1–2 días por semana y una por entreno, con 3 series de calidad sin llegar al fallo. Si te salen fáciles, siguen subiendo.</span>
    </div>`;
}

// Botones para pasar el foco a mantener (si ya hay 2, eligiendo cuál deja de mantenerse).
export function toMaintainButtons(state, primary = true) {
  const { focus, maintain } = skillPicks(state);
  if (!focus) return '';
  if (maintain.length < MAX_MAINTAIN) {
    return `<button class="btn ${primary ? 'primary' : 'ghost'} small" data-action="focus-to-maintain" data-id="${focus}">${icon('shield', 16)} Pasar a mantener</button>`;
  }
  return `<span class="muted small block swap-label">Pasar a mantener en lugar de:</span>${maintain.map((m) => `
    <button class="btn ${primary ? 'primary' : 'ghost'} small" data-action="focus-to-maintain" data-id="${focus}" data-replace="${m}" aria-label="Pasar a mantener en lugar de ${esc(ROADMAP_BY_ID[m].name)}">${icon('shield', 16)} ${esc(ROADMAP_BY_ID[m].name)}</button>`).join('')}`;
}

// Al conseguir la habilidad de foco (ruta completada): propone pasarla a mantener y elegir otra.
export function achievedCard(state) {
  const { focus } = skillPicks(state);
  if (!focus || !getProgress(focus).done || state.notices?.focusDone === focus) return '';
  return `
    <section class="card achieved-card">
      <span class="eyebrow">¡Habilidad conseguida!</span>
      <h3>Ya tienes ${esc(theName(focus))}</h3>
      <p class="small">Has completado su ruta. Pásala a mantener (1–2 días por semana, pocas series) y elige otra habilidad para aprender.</p>
      <div class="row gap wrap">
        ${toMaintainButtons(state)}
        <button class="btn ghost small" data-action="focus-keep" data-id="${focus}">Seguir con ella</button>
      </div>
    </section>`;
}

// Aviso único tras actualizar desde una versión con «objetivos» sin distinguir.
export function skillsNotice(state) {
  if (!state.notices?.skills) return '';
  const { focus, maintain } = skillPicks(state);
  const now = focus
    ? `Hemos puesto <strong>${esc(ROADMAP_BY_ID[focus].name)}</strong> como la que aprendes${maintain.length ? ` y <strong>${esc(listText(names(maintain)))}</strong> para mantener` : ''}.`
    : '';
  return `
    <section class="card notice-card">
      <span class="eyebrow">Novedad</span>
      <h3>Aprende una, mantén las demás</h3>
      <p class="small">Ahora eliges <strong>una habilidad para aprender</strong>, que se entrena más días y con más volumen, y <strong>hasta 2 que ya dominas para mantener</strong>, 1–2 días por semana. ${now} Revísalo en Ajustes.</p>
      <div class="row gap wrap">
        <button class="btn primary small" data-action="skills-review">${icon('star', 16)} Elegir en Ajustes</button>
        <button class="btn ghost small" data-action="skills-notice-ok">Vale</button>
      </div>
    </section>`;
}

function goToSkills() {
  navigate('#/ajustes');
  setTimeout(() => document.getElementById('habilidades')?.scrollIntoView({ block: 'start' }), 80);
}

function change(fn) {
  update((s) => {
    const st = s.settings;
    const next = fn({ focus: st.focus, maintain: [...(st.maintain || [])] }, s);
    if (!next) return;
    setSkills(st, next.focus, next.maintain);
    s.plan = null;
  });
}

// Lo usan Ajustes, Rutas y la bienvenida. Devuelven true si cambió algo.
export function setFocus(id, { toggle = false } = {}) {
  if (!ROADMAP_BY_ID[id]) return false;
  const prev = getState().settings.focus;
  if (prev === id && !toggle) return false;
  change((cur) => ({ focus: prev === id ? null : id, maintain: cur.maintain.filter((x) => x !== id) }));
  if (prev && prev !== id && !getState().settings.maintain.includes(prev)) {
    toast(`Ahora aprendes ${theName(id)}. ${ROADMAP_BY_ID[prev].name} deja de ser tu foco`);
  }
  return true;
}

export function toggleMaintain(id) {
  const { maintain } = getState().settings;
  if (!ROADMAP_BY_ID[id]) return false;
  if (!maintain.includes(id) && maintain.length >= MAX_MAINTAIN) {
    toast(`Como mucho ${MAX_MAINTAIN} para mantener. Quita una primero`);
    return false;
  }
  change((cur, s) => ({
    focus: cur.focus === id ? null : cur.focus,
    maintain: cur.maintain.includes(id) ? cur.maintain.filter((x) => x !== id) : [...cur.maintain, id],
  }));
  return true;
}

export function clearMaintain() {
  change((cur) => ({ focus: cur.focus, maintain: [] }));
}

export const actions = {
  'set-focus'(el) { setFocus(el.dataset.id, { toggle: el.dataset.toggle === '1' }); },
  'toggle-maintain'(el) { toggleMaintain(el.dataset.id); },
  'maintain-none'() { clearMaintain(); },
  'skill-remove'(el) {
    const id = el.dataset.id;
    change((cur) => ({ focus: cur.focus === id ? null : cur.focus, maintain: cur.maintain.filter((x) => x !== id) }));
    toast(`${ROADMAP_BY_ID[id]?.name || ''} ya no está entre tus habilidades`);
  },
  // El foco pasa a mantener (en lugar de `data-replace` si ya había 2) y se elige otro para aprender.
  'focus-to-maintain'(el) {
    const id = el.dataset.id;
    const replace = el.dataset.replace;
    const cur = getState().settings;
    if (cur.focus !== id) return;
    if (!replace && cur.maintain.length >= MAX_MAINTAIN) { toast(`Ya mantienes ${MAX_MAINTAIN}: elige cuál dejar`); return; }
    change((c, s) => {
      if (s.notices) delete s.notices.focusDone;
      return { focus: null, maintain: [id, ...c.maintain.filter((x) => x !== replace)] };
    });
    toast(`${ROADMAP_BY_ID[id].name} pasa a mantener. Elige qué quieres aprender ahora`);
    goToSkills();
  },
  'focus-keep'(el) {
    update((s) => { s.notices = { ...(s.notices || {}), focusDone: el.dataset.id }; });
  },
  'skills-review'() {
    update((s) => { if (s.notices) delete s.notices.skills; }, { silent: true });
    goToSkills();
  },
  'skills-notice-ok'() {
    update((s) => { if (s.notices) delete s.notices.skills; });
  },
};
