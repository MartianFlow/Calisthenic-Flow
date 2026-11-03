// Héroe: personaje en pixel art, nivel, atributos, logros y equipo (estilo RPG retro).

import { headActions } from '../theme.js';
import { getState, update } from '../store.js';
import {
  totalXP, levelInfo, titleFor, attributes, achievementStatus, ACH_CATEGORIES, RARITY,
  ITEMS, SLOTS, ITEM_BY_ID, ACH_BY_ID, equipped, itemUnlocked, unlockText, XP_RULES,
  weekMissions, syncMissions, syncAchievements,
} from '../game.js';
import { avatarSVG, SKINS, HAIRS, HAIR_STYLES } from '../avatar.js';
import { pixelIcon } from '../pixel.js';
import { esc, icon, fmtDate, toast } from '../ui.js';
import { burst, replay } from '../fx.js';

const CAT_ICON = { constancia: 'flame', progreso: 'map', hitos: 'trophy', habilidades: 'heart', habitos: 'star', secretos: 'question' };
const RARITY_COLOR = { bronce: '#d98a4a', plata: '#c9d1e0', oro: '#ffd23f', leyenda: '#ff4f9a' };
let achFilter = 'todos';

const ICON_BY_ITEM = {
  gorra: 'head-cap', corona: 'head-crown', gorro: 'head-beanie', 'gorro-navidad': 'head-beanie', auriculares: 'head-phones',
  'casco-vikingo': 'head-horns', halo: 'head-halo', 'gafas-sol': 'face-sun', 'gafas-estrella': 'face-star',
  parche: 'face-patch', bigote: 'face-stache', visor: 'face-visor', toalla: 'neck-towel', cadena: 'neck-chain',
  alas: 'back-wings', 'alas-oscuras': 'back-wings',
};
export function itemIconName(it) {
  if (!it) return 'none';
  if (ICON_BY_ITEM[it.id]) return ICON_BY_ITEM[it.id];
  if (it.slot === 'pet') return `pet-${it.id}`;
  if (it.slot === 'head') return 'head-band';
  if (it.slot === 'face') return 'face-mask';
  return it.slot;
}

export function itemIcon(it, size = 32, locked = false) {
  return pixelIcon(itemIconName(it), it?.color || '#ffffff', size, { silhouette: locked });
}

export function heroData(state = getState()) {
  const xp = totalXP(state);
  const lvl = levelInfo(xp);
  const attrs = attributes(state);
  const attrMap = Object.fromEntries(attrs.map((a) => [a.key, a.value]));
  return { xp, lvl, title: titleFor(lvl.level), attrs, attrMap, equip: equipped(state), look: state.game.look };
}

export function heroAvatar(state, size = 200, className = '') {
  const d = heroData(state);
  return avatarSVG({ attrs: d.attrMap, equip: d.equip, look: d.look, size, className });
}

// Barra de XP por segmentos (estilo barra de vida).
export function levelBar(lvl, segments = 20) {
  const filled = Math.round((lvl.pct / 100) * segments);
  return `
    <div class="px-bar xp" role="progressbar" aria-valuenow="${lvl.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Experiencia">
      ${Array.from({ length: segments }, (_, i) => `<i class="${i < filled ? 'on' : ''}"></i>`).join('')}
    </div>
    <div class="px-bar-label"><span>EXP</span><span>${lvl.into}/${lvl.need}</span></div>`;
}

function segBar(value, color, segments = 10) {
  const filled = Math.round((value / 100) * segments);
  return `<div class="px-bar" style="--seg:${color}">${Array.from({ length: segments }, (_, i) => `<i class="${i < filled ? 'on' : ''}"></i>`).join('')}</div>`;
}

// Misiones de la semana (cambian cada lunes).
export function missionsPanel(state) {
  const list = weekMissions(state);
  const done = list.filter((m) => m.done).length;
  return `
    <section class="px-panel missions-panel">
      <div class="row between"><h3 class="px-h">${pixelIcon('scroll', '#fff', 24)} Misiones</h3><span class="px-sub">${done}/${list.length}</span></div>
      <p class="px-desc">Cambian cada lunes. +${XP_RULES.mission} EXP cada una y +${XP_RULES.missionsAll} más si haces las ${list.length}.</p>
      <ul class="px-missions">${list.map((m) => `
        <li class="${m.done ? 'done' : ''}">
          <span class="px-check">${m.done ? pixelIcon('star', '#ffd23f', 20) : ''}</span>
          <div class="grow">
            <span class="px-mission-text">${esc(m.text)}</span>
            ${m.done ? '' : `<div class="px-ach-progress">${segBar(Math.round((m.cur / m.goal) * 100), '#18e0ff', 10)}<span>${m.cur}/${m.goal}${m.unit ? ` ${m.unit}` : ''}</span></div>`}
          </div>
          <span class="px-xp">+${XP_RULES.mission}</span>
        </li>`).join('')}</ul>
    </section>`;
}

// Comprueba logros y misiones fuera del entreno (tocar al héroe, cambiar el tema, equiparse…)
// y celebra el primero que se consiga.
export function unlockCheck() {
  let fresh = [];
  update((s) => { syncMissions(s); fresh = syncAchievements(s); }, { silent: true });
  const a = ACH_BY_ID[fresh[0]];
  if (!a) return;
  const reward = ITEMS.find((it) => it.unlock?.ach === a.id);
  toast(`${a.secret ? '¡Logro secreto!' : '¡Logro!'} ${a.name}${reward ? ` · Nuevo: ${reward.name}` : ''}`);
  burst(null, { text: a.secret ? '¡SECRETO!' : '¡LOGRO!', big: true });
}

// Tarjeta pequeña para la pantalla Hoy.
export function heroMini(state) {
  const d = heroData(state);
  const missions = weekMissions(state);
  return `
    <a class="px-panel hero-mini" href="#/heroe">
      <div class="px-scene mini">${heroAvatar(state, 80, 'idle')}</div>
      <div class="grow">
        <div class="row gap"><span class="px-lv">LV ${d.lvl.level}</span><span class="px-title">${esc(d.title)}</span></div>
        <div class="px-name">${esc(state.game.name)}</div>
        ${levelBar(d.lvl, 14)}
        <span class="px-mini-missions">${pixelIcon('scroll', '#fff', 16)} Misiones ${missions.filter((m) => m.done).length}/${missions.length}</span>
      </div>
    </a>`;
}

function attrRows(attrs) {
  return `<ul class="px-attrs">${attrs.map((a) => `
    <li>
      <span class="px-attr-label">${esc(a.label)}</span>
      ${segBar(Math.max(a.value, 0), a.color)}
      <span class="px-rank r-${a.rank}">${a.rank}</span>
    </li>`).join('')}</ul>`;
}

function achBadge(a) {
  const hidden = a.secret && !a.done;
  return `<span class="px-badge ${a.done ? '' : 'locked'} ${hidden ? 'secret' : ''}" style="--rar:${RARITY_COLOR[a.rarity]}">
    ${pixelIcon(a.done ? CAT_ICON[a.cat] : hidden ? 'question' : 'lock', '#ffffff', 32)}</span>`;
}

// Los secretos no dicen qué piden hasta conseguirlos: solo una pista.
function achRow(a) {
  const pct = a.goal ? Math.round((a.current / a.goal) * 100) : 0;
  const hidden = a.secret && !a.done;
  return `
    <li class="px-ach ${a.done ? 'done' : 'locked'} ${a.secret ? 'is-secret' : ''}">
      ${achBadge(a)}
      <div class="grow">
        <strong>${hidden ? '???' : esc(a.name)}</strong>
        <div class="px-desc">${hidden ? `Pista: ${esc(a.hint)}` : esc(a.desc)}</div>
        ${!a.done && !hidden && a.goal > 1 ? `<div class="px-ach-progress">${segBar(pct, '#3ccf5a', 10)}<span>${a.current}/${a.goal}</span></div>` : ''}
        ${a.reward ? `<div class="px-reward">${itemIcon(a.reward, 20, !a.done)} ${a.done || !hidden ? esc(a.reward.name) : '???'}</div>` : ''}
      </div>
      <div class="px-ach-side">
        <span class="px-rarity" style="--rar:${RARITY_COLOR[a.rarity]}">${esc(RARITY[a.rarity].label)}</span>
        <span class="px-xp">+${RARITY[a.rarity].xp}</span>
        ${a.done ? `<span class="px-date">${esc(fmtDate(a.date))}</span>` : ''}
      </div>
    </li>`;
}

function nextTitleLevel(level) {
  return [3, 5, 8, 12, 16, 20, 25, 30].find((l) => l > level) || 30;
}

export function render() {
  const state = getState();
  const d = heroData(state);
  const ach = achievementStatus(state);
  const doneCount = ach.filter((a) => a.done).length;
  const recent = ach.filter((a) => a.done).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const next = ach.filter((a) => !a.done && !a.secret).sort((a, b) => b.current / b.goal - a.current / a.goal).slice(0, 3);
  const secrets = ach.filter((a) => a.secret);
  const unlockedItems = ITEMS.filter((it) => itemUnlocked(it, state, d.lvl.level)).length;
  return `
    <header class="page-head row between">
      <div class="col"><span class="eyebrow">Tu personaje</span><h1>Héroe</h1></div>
      ${headActions(state.settings.theme)}
    </header>

    <section class="px-panel hero-card">
      <div class="px-scene hero-poke" data-action="hero-poke" role="button" aria-label="Tu héroe">${heroAvatar(state, 240, 'idle')}</div>
      <div class="hero-id">
        <span class="px-lv big">LV<b>${d.lvl.level}</b></span>
        <div class="grow">
          <div class="px-name big">${esc(state.game.name)}</div>
          <span class="px-title">${esc(d.title)}</span>
        </div>
        <button class="px-btn icon" data-action="hero-rename" aria-label="Cambiar nombre">${icon('edit', 18)}</button>
      </div>
      ${levelBar(d.lvl)}
      <p class="px-desc">${d.xp.toLocaleString('es-ES')} EXP en total · próximo título: ${esc(titleFor(nextTitleLevel(d.lvl.level)))} (LV ${nextTitleLevel(d.lvl.level)})</p>
    </section>

    <section class="px-panel">
      <h3 class="px-h">Atributos</h3>
      ${attrRows(d.attrs)}
      <p class="px-desc">Suben con tu progreso real en las rutas; el aguante, con las horas entrenadas. Rango E → S.</p>
    </section>

    ${missionsPanel(state)}

    <section class="px-panel">
      <div class="row between"><h3 class="px-h">Logros</h3><a class="px-link" href="#/logros">${doneCount}/${ach.length} ▶</a></div>
      ${segBar(Math.round((doneCount / ach.length) * 100), '#ffd23f', 20)}
      <p class="px-desc">${secrets.filter((a) => a.done).length} de ${secrets.length} secretos descubiertos.</p>
      ${recent.length ? `<p class="px-sub">Últimos</p><ul class="px-ach-list">${recent.map(achRow).join('')}</ul>` : ''}
      <p class="px-sub">Más cerca</p>
      <ul class="px-ach-list">${next.map(achRow).join('')}</ul>
    </section>

    <section class="px-panel">
      <div class="row between"><h3 class="px-h">Equipo</h3><a class="px-link" href="#/equipo">${unlockedItems}/${ITEMS.length} ▶</a></div>
      <div class="px-inv">${Object.values(d.equip).map((id) => ITEM_BY_ID[id]).filter(Boolean).map((it) => `
        <span class="px-slot" title="${esc(it.name)}">${itemIcon(it, 32)}</span>`).join('')}</div>
      <a class="px-btn" href="#/equipo">${pixelIcon('chest', '#ffffff', 24)} Personalizar héroe</a>
    </section>

    <section class="px-panel">
      <h3 class="px-h">Cómo ganar EXP</h3>
      <ul class="px-rules">
        <li><span>Entreno terminado</span><b>+${XP_RULES.session}</b></li>
        <li><span>Cada serie</span><b>+${XP_RULES.set}</b></li>
        <li><span>Cada ejercicio valorado</span><b>+${XP_RULES.rated}</b></li>
        <li><span>Cada minuto (máx. 60)</span><b>+${XP_RULES.minute}</b></li>
        <li><span>Superar un paso</span><b>+${XP_RULES.levelUp}</b></li>
        <li><span>Completar una ruta</span><b>+${XP_RULES.routeDone}</b></li>
        <li><span>Cada récord personal</span><b>+${XP_RULES.record}</b></li>
        <li><span>Cada misión de la semana</span><b>+${XP_RULES.mission}</b></li>
        <li><span>Logros</span><b>+50…1000</b></li>
      </ul>
    </section>
  `;
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
    <section class="px-panel px-stats">
      <div><span class="px-sub">Logros</span><b>${done.length}/${ach.length}</b></div>
      <div><span class="px-sub">EXP</span><b>${xp}</b></div>
      <div><span class="px-sub">Leyenda</span><b>${done.filter((a) => a.rarity === 'leyenda').length}</b></div>
    </section>
    <div class="px-tabs" role="tablist">
      ${[['todos', 'Todos'], ['hechos', 'Conseguidos'], ['pendientes', 'Pendientes']].map(([k, l]) => `
        <button class="${achFilter === k ? 'on' : ''}" role="tab" aria-selected="${achFilter === k}" data-action="ach-filter" data-value="${k}">${achFilter === k ? '▶ ' : ''}${l}</button>`).join('')}
    </div>
    ${Object.entries(ACH_CATEGORIES).map(([cat, label]) => {
      const items = list.filter((a) => a.cat === cat);
      if (!items.length) return '';
      return `
        <section class="px-panel">
          <div class="row between"><h3 class="px-h">${pixelIcon(CAT_ICON[cat], '#fff', 24)} ${esc(label)}</h3><span class="px-sub">${ach.filter((a) => a.cat === cat && a.done).length}/${ach.filter((a) => a.cat === cat).length}</span></div>
          <ul class="px-ach-list">${items.map(achRow).join('')}</ul>
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
      <div class="px-slot-row">
        <span class="px-sub">${esc(label)}</span>
        <div class="px-items">
          ${optional ? `<button class="px-item ${!current ? 'on' : ''}" data-action="equip" data-slot="${slot}" data-item="" aria-label="Sin ${esc(label.toLowerCase())}">
            ${pixelIcon('none', '#fff', 32)}<span>Nada</span></button>` : ''}
          ${items.map((it) => {
            const ok = itemUnlocked(it, state, d.lvl.level);
            return `<button class="px-item ${current === it.id ? 'on' : ''} ${ok ? '' : 'locked'}" data-action="equip" data-slot="${slot}" data-item="${it.id}" ${ok ? '' : 'aria-disabled="true"'}>
              ${itemIcon(it, 32, !ok)}
              <span>${ok ? esc(it.name) : '???'}</span>
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
    <section class="px-panel equip-preview">
      <div class="px-scene">${heroAvatar(state, 200, 'idle')}</div>
      <p class="px-desc center">Los artículos se consiguen al subir de nivel y con los logros. Tu físico crece con tus atributos.</p>
    </section>
    <section class="px-panel">
      <h3 class="px-h">Apariencia</h3>
      <div class="px-slot-row"><span class="px-sub">Piel</span><div class="px-swatches">${SKINS.map((c, i) => `
        <button class="px-swatch ${look.skin === i ? 'on' : ''}" style="background:${c}" data-action="look" data-key="skin" data-value="${i}" aria-label="Tono ${i + 1}"></button>`).join('')}</div></div>
      <div class="px-slot-row"><span class="px-sub">Pelo</span><div class="px-swatches">${HAIRS.map((c, i) => `
        <button class="px-swatch ${look.hair === i ? 'on' : ''}" style="background:${c}" data-action="look" data-key="hair" data-value="${i}" aria-label="Color ${i + 1}"></button>`).join('')}</div></div>
      <div class="px-slot-row"><span class="px-sub">Peinado</span><div class="px-tabs wrap">${Object.entries(HAIR_STYLES).map(([k, l]) => `
        <button class="${look.hairStyle === k ? 'on' : ''}" data-action="look" data-key="hairStyle" data-value="${k}">${look.hairStyle === k ? '▶ ' : ''}${esc(l)}</button>`).join('')}</div></div>
    </section>
    <section class="px-panel">
      <h3 class="px-h">Inventario</h3>
      ${Object.entries(SLOTS).map(([slot, label]) => slotSection(slot, label)).join('')}
    </section>
  `;
}

export const actions = {
  'hero-rename'() {
    const current = getState().game.name;
    const name = prompt('Nombre de tu héroe', current);
    if (name && name.trim()) update((s) => { s.game.name = name.trim().slice(0, 24); });
    unlockCheck();
  },
  // Tocar al héroe: da un salto (y tiene un logro secreto).
  'hero-poke'(el) {
    update((s) => { s.game.pokes = (s.game.pokes || 0) + 1; }, { silent: true });
    replay(el.querySelector('svg'), 'poked');
    const words = ['¡JA!', '¡EH!', '¡HUP!', '¡OYE!', '¡JE!'];
    burst(el, { text: words[getState().game.pokes % words.length], color: 'cyan' });
    unlockCheck();
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
    if (id) burst(document.querySelector('.px-scene'), { text: '¡EQUIPADO!', color: 'cyan' });
    unlockCheck();
  },
  look(el) {
    const key = el.dataset.key;
    const v = key === 'hairStyle' ? el.dataset.value : Number(el.dataset.value);
    update((s) => { s.game.look = { ...s.game.look, [key]: v }; });
  },
};
