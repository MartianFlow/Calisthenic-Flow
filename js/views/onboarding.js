// Bienvenida: configuración inicial paso a paso.
// Tú (experiencia y pierna) → nivel en cada básico → habilidades (las que ya dominas, la que
// quieres aprender y su nivel) →
// semana (días) → entreno (descanso, calentamiento y sonido) → héroe → resumen.
// Cada respuesta se guarda al momento en el estado; aquí solo se recuerda en qué paso se va.

import { ROADMAPS, ROADMAP_BY_ID } from '../data/roadmaps.js';
import { getState, update, getProgress } from '../store.js';
import { prereqStatus, skillPicks, recommendedSkills, noSkillsYet } from '../logic.js';
import { esc, icon, targetLabel, progressBar, fmtClock } from '../ui.js';
import { navigate } from '../router.js';
import { recommendDays, trainingLevel, DEFAULT_DAYS, LEG_ROUTES, WD_SHORT } from '../schedule.js';
import { dayChips, daysSegmented } from './plan.js';
import { restPicker, prepPicker, toggle } from './settings.js';
import { setFocus, toggleMaintain, clearMaintain, skillRoutes, listText } from './skills.js';
import { MAX_MAINTAIN } from '../store.js';
import { heroAvatar } from './hero.js';
import { SKINS, HAIRS, HAIR_STYLES } from '../avatar.js';
import { burst, flash, confetti } from '../fx.js';

const SECTIONS = ['Tú', 'Nivel', 'Habilidades', 'Semana', 'Héroe'];

// Punto de partida según la experiencia (paso de cada básico: el primero que aún no sale).
export const EXPERIENCE = [
  {
    key: 'cero', title: 'Empiezo de cero', level: 1,
    text: 'No entreno o hace tiempo que lo dejé. Empiezas por lo más básico de cada ruta.',
    steps: { dominadas: 0, remo: 0, flexiones: 0, fondos: 0, piernas: 0, bisagra: 0, core: 0 },
  },
  {
    key: 'base', title: 'Tengo algo de base', level: 2,
    text: 'Hago flexiones y sentadillas, pero todavía no encadeno varias dominadas.',
    steps: { dominadas: 3, remo: 2, flexiones: 2, fondos: 2, piernas: 2, bisagra: 1, core: 2 },
  },
  {
    key: 'habitual', title: 'Entreno a menudo', level: 3,
    text: 'Hago series de dominadas, fondos y flexiones sin problema.',
    steps: { dominadas: 5, remo: 3, flexiones: 4, fondos: 4, piernas: 3, bisagra: 2, core: 4 },
  },
];

const LEGS = [
  {
    key: 'calistenia', title: 'Con calistenia', icon: 'route',
    text: 'Sentadillas, zancadas, pistol y curl nórdico dentro de tus entrenos de cuerpo completo.',
  },
  {
    key: 'gym', title: 'En el gimnasio', icon: 'trophy',
    text: '2 días propios de pierna con máquinas y pesos. La app te dice cuándo subir el peso.',
  },
];

// ─────────── Paso en curso (se recuerda si iOS recarga la app a mitad) ───────────
const WIZ_STORE = 'calisthenic-flow:bienvenida';
let wiz = loadWiz();
let shownKey = null;  // último paso pintado, para animar solo al cambiar de paso
let dir = 1;          // 1 = adelante, -1 = atrás
let fills = [];       // relleno de cada tramo de la barra en la última pintura

function loadWiz() {
  try {
    return { key: 'intro', exp: null, daysSet: false, editing: false, ...JSON.parse(sessionStorage.getItem(WIZ_STORE) || '{}') };
  } catch {
    return { key: 'intro', exp: null, daysSet: false, editing: false };
  }
}
function saveWiz() {
  try { sessionStorage.setItem(WIZ_STORE, JSON.stringify(wiz)); } catch { /* modo privado */ }
}
export function resetWizard() {
  wiz = { key: 'intro', exp: null, daysSet: false, editing: false };
  shownKey = null;
  fills = [];
  try { sessionStorage.removeItem(WIZ_STORE); } catch { /* modo privado */ }
}

function steps(state) {
  const gym = state.settings.legs === 'gym';
  const basics = ROADMAPS.filter((r) => r.category === 'fuerza' && !(gym && LEG_ROUTES.includes(r.id)));
  const goals = state.settings.goals.map((id) => ROADMAP_BY_ID[id]).filter(Boolean);
  return [
    { key: 'intro', section: -1 },
    { key: 'experiencia', section: 0 },
    { key: 'pierna', section: 0 },
    ...basics.map((r, i) => ({ key: `nivel-${r.id}`, kind: 'nivel', roadmap: r, section: 1, n: i + 1, of: basics.length })),
    { key: 'mantener', section: 2 },
    { key: 'foco', section: 2 },
    ...goals.map((r, i) => ({ key: `nivel-${r.id}`, kind: 'nivel', roadmap: r, section: 2, goal: true, n: i + 1, of: goals.length })),
    { key: 'dias', section: 3 },
    { key: 'entreno', section: 3 },
    { key: 'heroe', section: 4 },
    { key: 'listo', section: 4 },
  ];
}

function currentIndex(list) {
  const i = list.findIndex((s) => s.key === wiz.key);
  return i < 0 ? 0 : i;
}

function go(key, direction) {
  dir = direction;
  wiz.key = key;
  saveWiz();
  window.scrollTo({ top: 0 });
}

function move(delta) {
  // Cambiando una respuesta desde el resumen: al terminar (o con atrás) se vuelve a él,
  // sin repetir el resto de preguntas.
  if (wiz.editing) {
    wiz.editing = false;
    go('listo', delta);
    update(() => {});
    return;
  }
  const list = steps(getState());
  const i = currentIndex(list);
  const next = list[Math.min(list.length - 1, Math.max(0, i + delta))];
  // Al llegar a la semana por primera vez, propone los días recomendados para su nivel.
  if (next.key === 'dias' && !wiz.daysSet) {
    wiz.daysSet = true;
    update((s) => { s.settings.daysPerWeek = recommendDays(s).days; s.plan = null; }, { silent: true });
  }
  go(next.key, delta);
  update(() => {});
}

// ─────────── Barra de progreso por tramos (Tú · Nivel · Objetivos · Semana · Héroe) ───────────
function progressHead(list, i) {
  const step = list[i];
  const now = SECTIONS.map((_, k) => {
    if (k < step.section) return 100;
    if (k > step.section) return 0;
    const inSection = list.filter((s) => s.section === k);
    return Math.round(((inSection.indexOf(step) + 1) / inSection.length) * 100);
  });
  const before = fills.length ? fills : now;
  fills = now;
  return `
    <header class="wiz-head">
      <button class="icon-btn" data-action="wiz-back" aria-label="${wiz.editing ? 'Volver al resumen' : 'Paso anterior'}">${icon('back', 20)}</button>
      <div class="wiz-track">
        <div class="wiz-bars" role="progressbar" aria-label="Progreso de la configuración" aria-valuenow="${i}" aria-valuemin="1" aria-valuemax="${list.length - 1}">
          ${now.map((v, k) => `<span class="${k === step.section ? 'on' : ''}"><i style="--from:${before[k]}%;--to:${v}%"></i></span>`).join('')}
        </div>
        <div class="wiz-section">${esc(SECTIONS[step.section])} <span class="muted">· ${wiz.editing ? 'cambiando' : `paso ${i} de ${list.length - 1}`}</span></div>
      </div>
    </header>`;
}

// ─────────── Pasos ───────────
function intro() {
  return `
    <section class="wiz-intro">
      <div class="intro-art" aria-hidden="true">
        <span class="intro-rays"></span>
        <div class="badge-big">${icon('route', 40)}</div>
      </div>
      <h1>Calisthenic Flow</h1>
      <p class="intro-lead">Tu entrenador de calistenia de bolsillo</p>
      <ul class="intro-feats">
        <li><span class="feat-ic y">${icon('route', 22)}</span><div><strong>Rutas paso a paso</strong><span>Del primer ejercicio a la dominada a una mano, el pino o el front lever.</span></div></li>
        <li><span class="feat-ic p">${icon('timer', 22)}</span><div><strong>Entreno guiado</strong><span>Series, descansos y cronómetro. Tú solo dices si fue fácil, normal o difícil.</span></div></li>
        <li><span class="feat-ic c">${icon('shield', 22)}</span><div><strong>Tu héroe sube contigo</strong><span>Experiencia, niveles, logros y equipo con cada entreno.</span></div></li>
      </ul>
      <p class="muted small center">Unas preguntas rápidas (2–3 minutos) y tendrás tu plan.</p>
    </section>`;
}

function optionCard({ key, title, text }, on, action, extra = '') {
  return `
    <button class="wiz-option ${on ? 'on' : ''}" data-action="${action}" data-value="${key}" role="radio" aria-checked="${on}">
      ${extra}
      <span class="grow"><strong>${esc(title)}</strong><span>${esc(text)}</span></span>
      <span class="wiz-radio">${on ? icon('check', 18) : ''}</span>
    </button>`;
}

function experienceBody() {
  return `
    <span class="eyebrow">Sobre ti</span>
    <h2 class="wiz-title">¿Cuánta experiencia tienes?</h2>
    <p class="wiz-hint">Así preparamos un punto de partida. En los siguientes pasos lo afinas ruta por ruta.</p>
    <div class="wiz-options" role="radiogroup" aria-label="Experiencia">
      ${EXPERIENCE.map((e) => optionCard(e, wiz.exp === e.key, 'wiz-exp',
        `<span class="exp-bars" aria-hidden="true">${[1, 2, 3].map((n) => `<i class="${n <= e.level ? 'on' : ''}"></i>`).join('')}</span>`)).join('')}
    </div>`;
}

function legsBody(state) {
  return `
    <span class="eyebrow">Sobre ti</span>
    <h2 class="wiz-title">¿Dónde entrenas pierna?</h2>
    <p class="wiz-hint">El torso siempre se entrena con calistenia. Puedes cambiarlo más tarde en Ajustes.</p>
    <div class="wiz-options" role="radiogroup" aria-label="Pierna">
      ${LEGS.map((l) => optionCard(l, state.settings.legs === l.key, 'wiz-legs', `<span class="opt-ic">${icon(l.icon, 24)}</span>`)).join('')}
    </div>`;
}

function videoButton(s) {
  const v = s.video;
  if (!v) return '<span class="wiz-play none" aria-hidden="true"></span>';
  return `<button class="wiz-play" data-action="video-open" data-id="${esc(v.id)}" data-start="${v.start || 0}" data-title="${esc(v.title || '')}" data-name="${esc(s.name)}" aria-label="Ver vídeo: ${esc(s.name)}">${icon('play', 14)}</button>`;
}

function levelBody(state, step) {
  const r = step.roadmap;
  const p = getProgress(r.id);
  const missing = step.goal ? prereqStatus(r).filter((q) => !q.ok) : [];
  const learn = step.goal && state.settings.focus === r.id;
  return `
    <span class="eyebrow">${step.goal ? `${learn ? 'La que aprendes' : 'La que mantienes'} · habilidad ${step.n} de ${step.of}` : `Básico ${step.n} de ${step.of}`}</span>
    <h2 class="wiz-title">${esc(r.name)}</h2>
    <p class="muted small wiz-sub">${esc(r.group)} · ${esc(r.equipment)}</p>
    <p class="wiz-hint">Toca el <strong>primer ejercicio que todavía no te sale</strong> con el objetivo indicado. Si dudas, elige el anterior: subirás rápido.</p>
    ${missing.length ? `<p class="wiz-note">${icon('lock', 14)}<span>Se recomienda llegar antes a ${missing.map((q) => `<strong>${esc(q.stepName)}</strong> en ${esc(q.roadmap.name)}`).join(' y a ')}. Puedes empezar igualmente por el primer paso.</span></p>` : ''}
    <ol class="wiz-steps">
      ${r.steps.map((s, i) => {
        const cls = i < p.step ? 'done' : i === p.step ? 'on' : '';
        return `
        <li class="wiz-step ${cls}" style="--i:${i}">
          <button class="wiz-step-main" data-action="wiz-level" data-id="${r.id}" data-step="${i}" aria-pressed="${i === p.step}">
            <span class="node">${i < p.step ? icon('check', 16) : i + 1}</span>
            <span class="grow">
              <strong>${esc(s.name)}</strong>
              <small>${esc(targetLabel(s))}${i === p.step ? ' · <b>empiezas aquí</b>' : i < p.step ? ' · ya te sale' : ''}</small>
            </span>
          </button>
          ${videoButton(s)}
        </li>`;
      }).join('')}
    </ol>`;
}

function skillCard(r, { on, action, cls = '', note = '', mark = 'star', disabled = false, base = true }) {
  const missing = base && prereqStatus(r).some((q) => !q.ok);
  return `
        <button class="skill-card ${cls} ${on ? 'on' : ''}" data-action="${action}" data-id="${r.id}" aria-pressed="${on}" ${disabled ? 'disabled' : ''}>
          <span class="skill-check">${on ? icon(mark, 16) : ''}</span>
          <strong>${esc(r.name)}</strong>
          <small>${esc(r.group)}</small>
          ${note || (missing ? `<span class="skill-lock">${icon('lock', 12)} Pide más base</span>` : '')}
        </button>`;
}

// ¿Cuáles ya dominas? (para mantener; hasta 2, o ninguna)
function keepBody(state) {
  const { focus, maintain } = skillPicks(state);
  return `
    <span class="eyebrow">Habilidades</span>
    <h2 class="wiz-title">¿Ya dominas alguna habilidad?</h2>
    <p class="wiz-hint">Elige hasta ${MAX_MAINTAIN} que ya te salgan para <strong>mantenerlas</strong>: 1–2 días por semana con pocas series de calidad. Después eliges la que quieres aprender.</p>
    <button class="wiz-option none-option ${maintain.length ? '' : 'on'}" data-action="wiz-keep-none" role="radio" aria-checked="${!maintain.length}">
      <span class="opt-ic">${icon('route', 24)}</span>
      <span class="grow"><strong>Aún no domino ninguna</strong><span>Vamos a por la primera. Te recomendamos por cuál empezar.</span></span>
      <span class="wiz-radio">${maintain.length ? '' : icon('check', 18)}</span>
    </button>
    <div class="skill-grid">
      ${skillRoutes().map((r) => skillCard(r, {
        on: maintain.includes(r.id), action: 'wiz-keep', cls: 'keep', mark: 'shield', base: false,
        note: focus === r.id ? `<span class="skill-lock">${icon('star', 12)} La quieres aprender</span>` : '',
      })).join('')}
    </div>
    <p class="wiz-count"><b>${maintain.length}</b> de ${MAX_MAINTAIN} para mantener</p>`;
}

// ¿Cuál quieres aprender? (una: el foco)
function focusBody(state) {
  const { focus, maintain } = skillPicks(state);
  const rec = noSkillsYet(state) ? recommendedSkills(state) : [];
  const recNames = rec.map((id) => ROADMAP_BY_ID[id].name);
  return `
    <span class="eyebrow">Habilidades</span>
    <h2 class="wiz-title">¿Qué habilidad quieres aprender?</h2>
    <p class="wiz-hint">Elige <strong>una</strong> para centrarte en ella: irá al principio de tus entrenos, en todos los días que tocan y con más volumen. Cuando la consigas, pasa a mantener y eliges otra.</p>
    ${rec.length ? `<p class="wiz-rec"><span class="wiz-rec-star">${icon('star', 18)}</span><span><strong>Para empezar:</strong> ${esc(listText(recNames))}. Ya tienes la base o estás cerca.</span></p>` : ''}
    <div class="skill-grid">
      ${skillRoutes().filter((r) => !maintain.includes(r.id)).map((r) => skillCard(r, {
        on: focus === r.id, action: 'wiz-focus',
        note: rec.includes(r.id) ? `<span class="skill-rec">${icon('star', 12)} Recomendada para empezar</span>` : '',
      })).join('')}
    </div>`;
}

function daysBody(state) {
  const rec = recommendDays(state);
  return `
    <span class="eyebrow">Tu semana</span>
    <h2 class="wiz-title">¿Qué días puedes entrenar?</h2>
    <p class="wiz-hint">Marca los días que tienes libres. La app reparte los entrenos para que descanses entre uno y otro.</p>
    ${dayChips(state.settings.schedule?.days || DEFAULT_DAYS)}
    <div class="field"><span>Días de entreno por semana</span>${daysSegmented(state, rec)}</div>
    <div class="wiz-rec">
      <span class="wiz-rec-star">${icon('star', 18)}</span>
      <p><strong>Para ti: ${rec.days} días.</strong> ${esc(rec.reasons[0])}</p>
    </div>`;
}

function trainingBody(state) {
  const st = state.settings;
  return `
    <span class="eyebrow">Tu entreno</span>
    <h2 class="wiz-title">¿Cuánto descansas entre series?</h2>
    <p class="wiz-hint">Usa siempre el mismo descanso o deja que la app ponga el recomendado para cada ejercicio. Durante el entreno puedes sumar o quitar 15 s.</p>
    <section class="card">${restPicker(state)}</section>
    <section class="card">${prepPicker(state)}</section>
    <section class="card wiz-toggles">
      ${toggle('warmup', st.warmup, 'Calentamiento guiado', 'Una lista de movilidad de 5–6 minutos antes de empezar')}
      ${toggle('sound', st.sound, 'Sonido al acabar el descanso', 'Con el modo silencio del iPhone desactivado')}
    </section>`;
}

function heroBody(state) {
  const look = state.game.look;
  const name = state.game.name === 'Tu héroe' ? '' : state.game.name;
  return `
    <span class="eyebrow">Tu héroe</span>
    <h2 class="wiz-title">Crea tu héroe</h2>
    <p class="wiz-hint">Gana experiencia con cada entreno, sube de nivel y consigue logros y equipo. Su físico crece con tus atributos.</p>
    <section class="px-panel wiz-hero">
      <div class="px-scene">${heroAvatar(state, 150, 'idle')}</div>
      <label class="px-slot-row"><span class="px-sub">Nombre</span>
        <input class="px-input" type="text" maxlength="24" autocomplete="off" enterkeyhint="done" value="${esc(name)}" placeholder="Tu héroe" data-change="wiz-hero-name" aria-label="Nombre de tu héroe">
      </label>
      <div class="px-slot-row"><span class="px-sub">Piel</span><div class="px-swatches">${SKINS.map((c, i) => `
        <button class="px-swatch ${look.skin === i ? 'on' : ''}" style="background:${c}" data-action="look" data-key="skin" data-value="${i}" aria-label="Tono ${i + 1}"></button>`).join('')}</div></div>
      <div class="px-slot-row"><span class="px-sub">Pelo</span><div class="px-swatches">${HAIRS.map((c, i) => `
        <button class="px-swatch ${look.hair === i ? 'on' : ''}" style="background:${c}" data-action="look" data-key="hair" data-value="${i}" aria-label="Color ${i + 1}"></button>`).join('')}</div></div>
      <div class="px-slot-row"><span class="px-sub">Peinado</span><div class="px-tabs wrap">${Object.entries(HAIR_STYLES).map(([k, l]) => `
        <button class="${look.hairStyle === k ? 'on' : ''}" data-action="look" data-key="hairStyle" data-value="${k}">${esc(l)}</button>`).join('')}</div></div>
    </section>`;
}

function summaryRow(ic, label, value, key, extra = '') {
  return `
    <li>
      <span class="sum-ic">${icon(ic, 20)}</span>
      <div class="grow"><span class="muted small">${esc(label)}</span><strong>${value}</strong>${extra}</div>
      <button class="link" data-action="wiz-goto" data-key="${key}">Cambiar</button>
    </li>`;
}

// Una pastilla por ruta con su paso actual: al tocarla se cambia solo el nivel de esa ruta.
function routeChips(state) {
  const chips = steps(state).filter((s) => s.kind === 'nivel').map(({ key, roadmap: r }) => {
    const p = getProgress(r.id);
    return `<button class="sum-route" data-action="wiz-goto" data-key="${key}" aria-label="Cambiar el nivel de ${esc(r.name)}: paso ${p.step + 1} de ${r.steps.length}">${esc(r.name)} <b>${p.step + 1}/${r.steps.length}</b></button>`;
  });
  return `<span class="muted tiny sum-hint">Toca una ruta para cambiar solo su nivel:</span><div class="sum-routes">${chips.join('')}</div>`;
}

function doneBody(state) {
  const st = state.settings;
  const level = trainingLevel(state);
  const days = st.schedule?.days || DEFAULT_DAYS;
  const { focus, maintain } = skillPicks(state);
  const keep = maintain.map((id) => ROADMAP_BY_ID[id].name);
  const rest = st.restMode === 'auto' ? 'Según el ejercicio' : `${fmtClock(st.restSec)} entre series`;
  return `
    <div class="burst-title">¡LISTO!</div>
    <h2 class="wiz-title center">Tu plan está preparado</h2>
    <ul class="wiz-summary">
      ${summaryRow('chart', 'Tu nivel', esc(level.label), 'experiencia', progressBar(Math.round(level.frac * 100)) + routeChips(state))}
      ${summaryRow('calendar', 'Tu semana', `${st.daysPerWeek} días por semana`, 'dias',
        `<span class="sum-days">${WD_SHORT.map((d, i) => `<i class="${days[i] ? 'on' : ''}">${d}</i>`).join('')}</span>`)}
      ${summaryRow('star', 'Quieres aprender', focus ? esc(ROADMAP_BY_ID[focus].name) : 'Ninguna por ahora', 'foco')}
      ${summaryRow('shield', 'Mantienes', keep.length ? esc(listText(keep)) : 'Ninguna todavía', 'mantener')}
      ${summaryRow('route', 'Pierna', st.legs === 'gym' ? 'En el gimnasio' : 'Con calistenia', 'pierna')}
      ${summaryRow('timer', 'Descanso', esc(rest), 'entreno')}
    </ul>
    <p class="muted small center">Todo se puede cambiar después en Ajustes y en el Plan semanal.</p>`;
}

const BODIES = {
  experiencia: experienceBody,
  pierna: legsBody,
  nivel: levelBody,
  mantener: keepBody,
  foco: focusBody,
  dias: daysBody,
  entreno: trainingBody,
  heroe: heroBody,
  listo: doneBody,
};

function footer(state, step) {
  if (step.key === 'intro') {
    return `
      <button class="btn primary block cta" data-action="wiz-next">Empezar ${icon('next', 20)}</button>
      <label class="link muted wiz-import">${icon('upload', 16)} Ya tengo una copia<input type="file" accept="application/json,.json" data-change="import-data" hidden></label>`;
  }
  if (step.key === 'listo') {
    return `<button class="btn primary block cta" data-action="finish-onboarding">${icon('play', 20)} ¡A entrenar!</button>`;
  }
  if (wiz.editing) {
    return `<button class="btn primary block" data-action="wiz-next">${icon('check', 20)} Guardar y volver al resumen</button>`;
  }
  if (step.key === 'experiencia' && !wiz.exp) {
    return '<button class="btn primary block" data-action="wiz-next" disabled>Elige una opción</button>';
  }
  const skip = step.key === 'foco' && !state.settings.focus;
  return `<button class="btn ${skip ? 'ghost' : 'primary'} block" data-action="wiz-next">${skip ? 'Ahora no, seguir' : 'Siguiente'} ${icon('next', 20)}</button>`;
}

export function render() {
  const state = getState();
  const list = steps(state);
  const i = currentIndex(list);
  const step = list[i];
  const changed = shownKey !== step.key;
  shownKey = step.key;
  const anim = changed ? (dir > 0 ? 'wiz-in-fwd' : 'wiz-in-back') : '';
  const body = step.key === 'intro' ? intro() : BODIES[step.kind || step.key](state, step);
  return `
    ${step.key === 'intro' ? '' : progressHead(list, i)}
    <div class="wiz-body ${anim}" data-step="${esc(step.key)}">${body}</div>
    <div class="wiz-foot">${footer(state, step)}</div>
    ${step.key === 'intro' ? '<p class="muted tiny center">Tus datos se guardan solo en este iPhone.</p>' : ''}`;
}

// Tras elegir una opción única, avanza solo (dejando ver la selección un momento).
let autoTimer = null;
function autoAdvance(fromKey) {
  clearTimeout(autoTimer);
  autoTimer = setTimeout(() => { if (wiz.key === fromKey) move(1); }, 420);
}

export const actions = {
  'wiz-next'() { move(1); },
  'wiz-back'() { clearTimeout(autoTimer); move(-1); },
  'wiz-goto'(el) {
    const key = el.dataset.key;
    if (!steps(getState()).some((s) => s.key === key)) return;
    clearTimeout(autoTimer);
    wiz.editing = true;
    go(key, 1);
    update(() => {});
  },
  'wiz-exp'(el) {
    const exp = EXPERIENCE.find((e) => e.key === el.dataset.value);
    if (!exp) return;
    // Elegir otra vez la misma no toca los niveles que se hayan afinado ruta por ruta.
    const changed = wiz.exp !== exp.key;
    wiz.exp = exp.key;
    saveWiz();
    update((s) => {
      if (!changed) return;
      for (const [id, step] of Object.entries(exp.steps)) s.progress[id] = { step, passes: 0, done: false };
      s.plan = null;
    });
    autoAdvance('experiencia');
  },
  'wiz-legs'(el) {
    const value = el.dataset.value === 'gym' ? 'gym' : 'calistenia';
    update((s) => {
      s.settings.legs = value;
      s.plan = null;
      s.lastDayType = null;
    });
    autoAdvance('pierna');
  },
  // Elegir la habilidad que aprende: avanza sola (tocar la elegida la quita y no avanza).
  'wiz-focus'(el) {
    const id = el.dataset.id;
    const was = getState().settings.focus === id;
    setFocus(id, { toggle: true });
    if (!was) autoAdvance('foco');
  },
  'wiz-keep'(el) { toggleMaintain(el.dataset.id); },
  'wiz-keep-none'() {
    clearMaintain();
    autoAdvance('mantener');
  },
  'wiz-level'(el) {
    const id = el.dataset.id;
    const step = Number(el.dataset.step);
    if (!ROADMAP_BY_ID[id]) return;
    update((s) => { s.progress[id] = { step, passes: 0, done: false }; s.plan = null; });
  },
  'finish-onboarding'() {
    update((s) => {
      s.onboarded = true;
      s.settings.schedule ||= { days: [...DEFAULT_DAYS] };
      for (const r of ROADMAPS) if (!s.progress[r.id]) s.progress[r.id] = { step: 0, passes: 0, done: false };
    }, { silent: true });
    resetWizard();
    navigate('#/', { replace: true });
    flash();
    burst(null, { text: '¡A ENTRENAR!', big: true });
    confetti({ count: 60 });
  },
};

export const changes = {
  'wiz-hero-name'(el) {
    // Sin repintar: si se pinta al salir del campo, el toque en «Siguiente» se perdería.
    const name = el.value.trim().slice(0, 24);
    update((s) => { s.game.name = name || 'Tu héroe'; }, { silent: true });
  },
};
