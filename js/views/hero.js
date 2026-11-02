// Héroe: personaje digital, nivel, atributos, logros y equipo.

import { getState, update } from '../store.js';
import {
  totalXP, levelInfo, titleFor, attributes, achievementStatus, ACH_CATEGORIES, RARITY,
  ITEMS, SLOTS, ITEM_BY_ID, equipped, itemUnlocked, unlockText, XP_RULES,
} from '../game.js';
import { avatarSVG, SKINS, HAIRS, HAIR_STYLES } from '../avatar.js';
import { esc, icon, fmtDate, progressBar } from '../ui.js';
import { burst } from '../fx.js';

const CAT_ICON = { constancia: 'flame', progreso: 'route', hitos: 'trophy', habitos: 'star' };
let achFilter = 'todos';

export function heroData(state = getState()) {
  const xp = totalXP(state);
  const lvl = levelInfo(xp);
  const attrs = attributes(state);
  const attrMap = Object.fromEntries(attrs.map((a) => [a.key, a.value]));
  return { xp, lvl, title: titleFor(lvl.level), attrs, attrMap, equip: equipped(state), look: state.game.look };
}

export function heroAvatar(state, size = 220, className = '') {
  const d = heroData(state);
  return avatarSVG({ attrs: d.attrMap, equip: d.equip, look: d.look, size, className });
}

export function levelBar(lvl) {
  return `
    <div class="xp-bar" role="progressbar" aria-valuenow="${lvl.pct}" aria-valuemin="0" aria-valuemax="100">
      <span style="width:${lvl.pct}%"></span>
      <em>${lvl.into} / ${lvl.need} XP</em>
    </div>`;
}

// Tarjeta pequeña para la pantalla Hoy.
export function heroMini(state) {
  const d = heroData(state);
  return `
    <a class="card hero-mini" href="#/heroe">
      <div class="hero-mini-avatar">${heroAvatar(state, 92)}</div>
      <div class="grow">
        <div class="row gap"><span class="lvl-badge">NV ${d.lvl.level}</span><strong class="hero-title">${esc(d.title)}</strong></div>
        <div class="muted small">${esc(state.game.name)}</div>
        ${levelBar(d.lvl)}
      </div>
    </a>`;
}

function attrRows(attrs) {
  return `<ul class="attr-list">${attrs.map((a) => `
    <li>
      <span class="attr-label">${esc(a.label)}</span>
      <div class="attr-bar"><span style="width:${Math.max(3, a.value)}%; background:${a.color}"></span></div>
      <span class="rank r-${a.rank}">${a.rank}</span>
    </li>`).join('')}</ul>`;
}

function achBadge(a) {
  return `<span class="ach-badge ${a.rarity} ${a.done ? 'done' : ''}">${icon(a.done ? CAT_ICON[a.cat] : 'lock', 20)}</span>`;
}

function achRow(a) {
  const pct = a.goal ? Math.round((a.current / a.goal) * 100) : 0;
  return `
    <li class="ach ${a.done ? 'done' : 'locked'}">
      ${achBadge(a)}
      <div class="grow">
        <strong>${esc(a.name)}</strong>
        <div class="muted small">${esc(a.desc)}</div>
        ${!a.done && a.goal > 1 ? `<div class="ach-progress">${progressBar(pct)}<span class="muted tiny">${a.current} / ${a.goal}</span></div>` : ''}
        ${a.reward ? `<div class="ach-reward">${icon('star', 13)} Premio: ${esc(a.reward.name)}</div>` : ''}
      </div>
      <div class="ach-side">
        <span class="rarity ${a.rarity}">${esc(RARITY[a.rarity].label)}</span>
        <span class="xp-tag">+${RARITY[a.rarity].xp} XP</span>
        ${a.done ? `<span class="muted tiny">${esc(fmtDate(a.date))}</span>` : ''}
      </div>
    </li>`;
}

export function render() {
  const state = getState();
  const d = heroData(state);
  const ach = achievementStatus(state);
  const doneCount = ach.filter((a) => a.done).length;
  const recent = ach.filter((a) => a.done).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const next = ach.filter((a) => !a.done).sort((a, b) => b.current / b.goal - a.current / a.goal).slice(0, 3);
  const unlockedItems = ITEMS.filter((it) => itemUnlocked(it, state, d.lvl.level)).length;
  return `
    <header class="page-head row between">
      <div class="col"><span class="eyebrow">Tu personaje</span><h1>Héroe</h1></div>
      <a class="icon-btn" href="#/ajustes" aria-label="Ajustes">${icon('gear')}</a>
    </header>

    <section class="card hero-card">
      <div class="hero-stage">${heroAvatar(state, 230, 'idle')}</div>
      <div class="hero-id">
        <span class="lvl-badge big">NV ${d.lvl.level}</span>
        <div class="grow">
          <h2>${esc(state.game.name)}</h2>
          <span class="hero-title">${esc(d.title)}</span>
        </div>
        <button class="icon-btn" data-action="hero-rename" aria-label="Cambiar nombre">${icon('edit', 18)}</button>
      </div>
      ${levelBar(d.lvl)}
      <p class="muted tiny">${d.xp.toLocaleString('es-ES')} XP en total · siguiente título: ${esc(titleFor(nextTitleLevel(d.lvl.level)))} (nivel ${nextTitleLevel(d.lvl.level)})</p>
    </section>

    <section class="card">
      <h3>Atributos</h3>
      ${attrRows(d.attrs)}
      <p class="muted tiny">Suben con tu progreso real en las rutas. El aguante sube con las horas entrenadas. Rango E → S.</p>
    </section>

    <section class="card">
      <div class="row between"><h3>Logros</h3><a class="link" href="#/logros">${doneCount}/${ach.length} ${icon('next', 16)}</a></div>
      ${progressBar(Math.round((doneCount / ach.length) * 100))}
      ${recent.length ? `<p class="eyebrow">Últimos</p><ul class="ach-list">${recent.map(achRow).join('')}</ul>` : ''}
      <p class="eyebrow">Más cerca</p>
      <ul class="ach-list">${next.map(achRow).join('')}</ul>
    </section>

    <section class="card">
      <div class="row between"><h3>Equipo</h3><a class="link" href="#/equipo">${unlockedItems}/${ITEMS.length} ${icon('next', 16)}</a></div>
      <div class="equip-chips">${Object.entries(d.equip).map(([slot, id]) => ITEM_BY_ID[id] ? `
        <span class="equip-chip"><i style="background:${ITEM_BY_ID[id].color}"></i>${esc(ITEM_BY_ID[id].name)}</span>` : '').join('')}</div>
      <a class="btn primary" href="#/equipo">${icon('star', 18)} Personalizar héroe</a>
    </section>

    <section class="card">
      <h3>Cómo ganar XP</h3>
      <ul class="xp-rules">
        <li><span>Entreno terminado</span><b>+${XP_RULES.session}</b></li>
        <li><span>Cada serie</span><b>+${XP_RULES.set}</b></li>
        <li><span>Cada ejercicio valorado</span><b>+${XP_RULES.rated}</b></li>
        <li><span>Cada minuto (máx. 60)</span><b>+${XP_RULES.minute}</b></li>
        <li><span>Superar un paso</span><b>+${XP_RULES.levelUp}</b></li>
        <li><span>Completar una ruta</span><b>+${XP_RULES.routeDone}</b></li>
        <li><span>Logros</span><b>+50 a +1000</b></li>
      </ul>
    </section>
  `;
}

function nextTitleLevel(level) {
  return [3, 5, 8, 12, 16, 20, 25, 30].find((l) => l > level) || 30;
}

export function renderAchievements() {
  const state = getState();
  const ach = achievementStatus(state);
  const done = ach.filter((a) => a.done);
  const xp = done.reduce((a, x) => a + RARITY[x.rarity].xp, 0);
  const list = ach.filter((a) => (achFilter === 'todos' ? true : achFilter === 'hechos' ? a.done : !a.done));
  return `
    <header class="page-head">
      <a class="back" href="#/heroe">${icon('back', 18)} Héroe</a>
      <span class="eyebrow">Tabla de logros</span>
      <h1>Logros</h1>
    </header>
    <section class="tiles three">
      <div class="tile"><span class="eyebrow">Conseguidos</span><div class="tile-num">${done.length}<small>/${ach.length}</small></div></div>
      <div class="tile"><span class="eyebrow">XP de logros</span><div class="tile-num">${xp}</div></div>
      <div class="tile"><span class="eyebrow">Leyendas</span><div class="tile-num">${done.filter((a) => a.rarity === 'leyenda').length}</div></div>
    </section>
    <div class="segmented">
      ${[['todos', 'Todos'], ['hechos', 'Conseguidos'], ['pendientes', 'Pendientes']].map(([k, l]) => `
        <button class="${achFilter === k ? 'on' : ''}" data-action="ach-filter" data-value="${k}">${l}</button>`).join('')}
    </div>
    ${Object.entries(ACH_CATEGORIES).map(([cat, label]) => {
      const items = list.filter((a) => a.cat === cat);
      if (!items.length) return '';
      return `
        <section class="card">
          <div class="row between"><h3>${esc(label)}</h3><span class="muted small">${ach.filter((a) => a.cat === cat && a.done).length}/${ach.filter((a) => a.cat === cat).length}</span></div>
          <ul class="ach-list">${items.map(achRow).join('')}</ul>
        </section>`;
    }).join('')}
  `;
}

export function renderEquipment() {
  const state = getState();
  const d = heroData(state);
  const look = state.game.look;
  const slotSection = (slot, label) => {
    const items = ITEMS.filter((it) => it.slot === slot);
    const optional = !['top', 'bottom', 'feet'].includes(slot);
    const current = d.equip[slot];
    return `
      <div class="slot">
        <span class="slot-label">${esc(label)}</span>
        <div class="item-grid">
          ${optional ? `<button class="item ${!current ? 'on' : ''}" data-action="equip" data-slot="${slot}" data-item="">
            <i class="swatch none"></i><span>Nada</span></button>` : ''}
          ${items.map((it) => {
            const ok = itemUnlocked(it, state, d.lvl.level);
            return `<button class="item ${current === it.id ? 'on' : ''} ${ok ? '' : 'locked'}" data-action="equip" data-slot="${slot}" data-item="${it.id}" ${ok ? '' : 'aria-disabled="true"'}>
              <i class="swatch" style="background:${it.color}">${ok ? '' : icon('lock', 14)}</i>
              <span>${esc(it.name)}</span>
              ${ok ? '' : `<small>${esc(unlockText(it))}</small>`}
            </button>`;
          }).join('')}
        </div>
      </div>`;
  };
  return `
    <header class="page-head">
      <a class="back" href="#/heroe">${icon('back', 18)} Héroe</a>
      <span class="eyebrow">Personaliza</span>
      <h1>Equipo</h1>
    </header>
    <section class="card equip-preview">
      <div class="hero-stage small">${heroAvatar(state, 180, 'idle')}</div>
      <p class="muted small center">Los artículos se desbloquean al subir de nivel y con los logros. Tu físico crece con tus atributos.</p>
    </section>
    <section class="card">
      <h3>Apariencia</h3>
      <div class="slot"><span class="slot-label">Piel</span><div class="swatches">${SKINS.map((c, i) => `
        <button class="swatch-btn ${look.skin === i ? 'on' : ''}" style="background:${c}" data-action="look" data-key="skin" data-value="${i}" aria-label="Tono ${i + 1}"></button>`).join('')}</div></div>
      <div class="slot"><span class="slot-label">Pelo</span><div class="swatches">${HAIRS.map((c, i) => `
        <button class="swatch-btn ${look.hair === i ? 'on' : ''}" style="background:${c}" data-action="look" data-key="hair" data-value="${i}" aria-label="Color ${i + 1}"></button>`).join('')}</div></div>
      <div class="slot"><span class="slot-label">Peinado</span><div class="goal-picker">${Object.entries(HAIR_STYLES).map(([k, l]) => `
        <button class="goal-chip ${look.hairStyle === k ? 'on' : ''}" data-action="look" data-key="hairStyle" data-value="${k}">${esc(l)}</button>`).join('')}</div></div>
    </section>
    <section class="card">
      <h3>Artículos</h3>
      ${Object.entries(SLOTS).map(([slot, label]) => slotSection(slot, label)).join('')}
    </section>
  `;
}

export const actions = {
  'hero-rename'() {
    const current = getState().game.name;
    const name = prompt('Nombre de tu héroe', current);
    if (name && name.trim()) update((s) => { s.game.name = name.trim().slice(0, 24); });
  },
  'ach-filter'(el, ctx) {
    achFilter = el.dataset.value;
    ctx.rerender();
  },
  equip(el) {
    const slot = el.dataset.slot;
    const id = el.dataset.item;
    const state = getState();
    if (id) {
      const it = ITEM_BY_ID[id];
      if (!itemUnlocked(it, state, levelInfo(totalXP(state)).level)) {
        burst(el, { text: unlockText(it).toUpperCase(), color: 'pink' });
        return;
      }
    }
    update((s) => {
      s.game.equipped ||= {};
      if (id) s.game.equipped[slot] = id; else delete s.game.equipped[slot];
    });
    if (id) burst(document.querySelector('.hero-stage'), { text: '¡NUEVO LOOK!', color: 'cyan' });
  },
  look(el) {
    const key = el.dataset.key;
    const v = key === 'hairStyle' ? el.dataset.value : Number(el.dataset.value);
    update((s) => { s.game.look = { ...s.game.look, [key]: v }; });
  },
};
