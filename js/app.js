// Punto de entrada: rutas, delegación de eventos y temporizadores.

import { addRoute, resolve } from './router.js';
import { getState, subscribe } from './store.js';
import { fmtClock } from './ui.js';
import { wakeLock } from './device.js';
import { stagger, staggerLists, countUp, reveal, tap } from './fx.js';
import * as video from './video.js';
import * as home from './views/home.js';
import * as session from './views/session.js';
import * as roadmaps from './views/roadmaps.js';
import * as progress from './views/progress.js';
import * as settings from './views/settings.js';
import * as onboarding from './views/onboarding.js';
import * as calendar from './views/calendar.js';
import * as hero from './views/hero.js';
import * as planView from './views/plan.js';
import * as exercise from './views/exercise.js';
import * as skills from './views/skills.js';
import * as custom from './views/custom.js';
import { syncAchievements, syncMissions } from './game.js';
import { applyTheme } from './theme.js';
import { update } from './store.js';

addRoute('/', home.render, { tab: 'hoy' });
addRoute('/calendario', calendar.render, { tab: 'calendario' });
addRoute('/rutas', roadmaps.renderList, { tab: 'rutas' });
addRoute('/ruta/:id', roadmaps.renderDetail, { tab: 'rutas' });
addRoute('/entreno', session.render, { tab: null, tick: session.tick });
addRoute('/resumen/:id', progress.renderSummary, { tab: 'progreso' });
addRoute('/progreso', progress.render, { tab: 'progreso' });
addRoute('/sesion/:id', progress.renderDetail, { tab: 'progreso' });
addRoute('/ajustes', settings.render, { tab: 'ajustes' });
addRoute('/heroe', hero.render, { tab: 'heroe' });
addRoute('/logros', hero.renderAchievements, { tab: 'heroe' });
addRoute('/equipo', hero.renderEquipment, { tab: 'heroe' });
addRoute('/plan', planView.render, { tab: 'hoy' });
addRoute('/ejercicio/:id', exercise.renderLift, { tab: 'hoy' });
addRoute('/mis-ejercicios/nuevo', () => custom.renderForm({}), { tab: 'rutas' });
addRoute('/mis-ejercicios/:id', custom.renderForm, { tab: 'rutas' });
addRoute('/bienvenida', onboarding.render, { tab: null });

const actions = {
  ...home.actions,
  ...session.actions,
  ...roadmaps.actions,
  ...progress.actions,
  ...settings.actions,
  ...onboarding.actions,
  ...calendar.actions,
  ...video.actions,
  ...hero.actions,
  ...planView.actions,
  ...exercise.actions,
  ...skills.actions,
  ...custom.actions,
  // Baja hasta una sección de la misma pantalla (los enlaces con # cambiarían de ruta).
  'scroll-to'(el) {
    document.getElementById(el.dataset.target)?.scrollIntoView({ block: 'start', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  },
  'chart-tip'(el) {
    const fig = el.closest('.chart');
    if (!fig) return;
    fig.querySelector('[data-chart-tip]').textContent = el.dataset.tip;
    fig.querySelectorAll('.sel').forEach((n) => n.classList.remove('sel'));
    el.parentNode.classList.add('sel');
  },
};

const changes = { ...home.changes, ...progress.changes, ...settings.changes, ...session.changes, ...planView.changes, ...onboarding.changes };

const viewEl = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
let currentRoute = null;
let lastPath = null;
let pendingReload = false; // hay una versión nueva esperando a que acabe el entreno
let enterTimer = null;

// La letra pixel (Press Start 2P) dibuja las mayúsculas con tilde más bajas, para que
// quepa la tilde en su celda de 8 px, y parecen minúsculas («TIRóN»). En sus textos en
// mayúsculas se quita la tilde (la ñ se queda), como en los juegos retro.
const PX_CAPS = '.px-h, .px-sub, .px-title, .px-attr-label, .px-btn, .px-tabs button, .px-rarity';
function pixelCaps(root) {
  for (const el of root.querySelectorAll(PX_CAPS)) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const t = walker.currentNode;
      const plain = t.nodeValue.normalize('NFD').replace(/[\u0301\u0308]/g, '').normalize('NFC');
      if (plain !== t.nodeValue) t.nodeValue = plain;
    }
  }
}

// Dirección de la transición entre pantallas: entre pestañas, según su orden en la
// barra; al entrar en un detalle, desde la derecha; al volver, desde la izquierda.
const TAB_ORDER = ['hoy', 'calendario', 'rutas', 'heroe', 'progreso'];
const TAB_ROOTS = { '/': 'hoy', '/calendario': 'calendario', '/rutas': 'rutas', '/heroe': 'heroe', '/progreso': 'progreso' };
function routeDir(prev, next) {
  if (!prev) return 'up';
  const modal = (r) => r.path === '/entreno' || r.path === '/bienvenida' || r.path.startsWith('/resumen/');
  if (modal(next) || modal(prev)) return 'up';
  const from = TAB_ORDER.indexOf(TAB_ROOTS[prev.path]);
  const to = TAB_ORDER.indexOf(TAB_ROOTS[next.path]);
  if (from >= 0 && to >= 0) return to >= from ? 'r' : 'l';
  return to >= 0 ? 'l' : 'r';
}

// Pastilla amarilla de la pestaña activa: se desliza de una pestaña a otra.
const tabInd = document.createElement('span');
tabInd.className = 'tab-ind';
tabInd.setAttribute('aria-hidden', 'true');
tabbar.prepend(tabInd);
let lastTab = null;
function placeTabIndicator(tab) {
  const a = tabbar.querySelector(`a[data-tab="${tab}"]`);
  tabbar.classList.toggle('has-ind', !!a);
  if (!a) { lastTab = null; return; }
  tabInd.style.setProperty('--tab', [...tabbar.querySelectorAll('a')].indexOf(a));
  if (!tabInd.dataset.ready) requestAnimationFrame(() => { tabInd.dataset.ready = '1'; });
  if (lastTab && lastTab !== tab) tap(tabInd);
  lastTab = tab;
}

function render() {
  const state = getState();
  applyTheme(state.settings.theme); // también tras importar una copia o borrar los datos
  let hash = location.hash || '#/';
  if (!state.onboarded && hash !== '#/bienvenida') {
    history.replaceState(null, '', '#/bienvenida');
    hash = '#/bienvenida';
  }
  const route = resolve(hash) || resolve('#/');
  if (pendingReload && route.path !== '/entreno') { location.reload(); return; }
  const prevRoute = currentRoute;
  currentRoute = route;
  viewEl.innerHTML = route.view(route.params);
  pixelCaps(viewEl);
  document.body.classList.toggle('no-tabs', route.options.tab === null);
  document.body.dataset.route = route.path.split('/')[1] || 'hoy';
  tabbar.querySelectorAll('a').forEach((a) => {
    const on = a.dataset.tab === route.options.tab;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  placeTabIndicator(route.options.tab);
  staggerLists(viewEl);
  // Animación de entrada solo al cambiar de pantalla (no en cada actualización).
  if (route.path !== lastPath) {
    window.scrollTo(0, 0);
    document.getElementById('toast')?.classList.remove('show');
    lastPath = route.path;
    viewEl.dataset.dir = routeDir(prevRoute, route);
    stagger(viewEl);
    viewEl.classList.remove('enter');
    void viewEl.offsetWidth;
    viewEl.classList.add('enter');
    clearTimeout(enterTimer);
    enterTimer = setTimeout(() => viewEl.classList.remove('enter'), 1500);
    reveal(viewEl);
    countUp(viewEl);
  } else if (viewEl.classList.contains('enter')) {
    stagger(viewEl);
  }
}

const ctx = { rerender: render };

document.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (!fn) return;
  event.preventDefault();
  const path = currentRoute?.path;
  const key = tapKey(el);
  fn(el, ctx, event);
  // Rebote del elemento tocado. Si la vista se repintó, se busca su copia nueva.
  if (currentRoute?.path === path) tap(el.isConnected ? el : document.querySelector(key));
});

function tapKey(el) {
  return Object.entries(el.dataset).map(([k, v]) => {
    const attr = k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    return `[data-${attr}="${CSS.escape(v)}"]`;
  }).join('');
}

document.addEventListener('change', (event) => {
  const el = event.target.closest('[data-change]');
  if (!el) return;
  changes[el.dataset.change]?.(el, ctx, event);
});

subscribe(render);
window.addEventListener('hashchange', () => { video.closeVideo(); render(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') video.closeVideo(); });

setInterval(() => {
  if (currentRoute?.options.tick) {
    currentRoute.options.tick(ctx);
    return;
  }
  const active = getState().active;
  const el = document.querySelector('[data-tick="elapsed"]');
  if (active && el) el.textContent = fmtClock((Date.now() - active.startedAt) / 1000);
}, 250);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && getState().active && currentRoute?.path === '/entreno') {
    wakeLock.request();
  }
});

// Logros conseguidos con el historial existente (sin celebración).
update((s) => { if (s.onboarded) { syncMissions(s); syncAchievements(s); } }, { silent: true });
render();

// Actualizaciones. Al volver a la app (iOS la retoma sin recargar) se comprueba si
// hay versión nueva; cuando la nueva toma el control, la app se recarga sola. Todo
// el estado está en localStorage, así que no se pierde nada. Durante un entreno se
// espera a salir de la pantalla del entreno.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || pendingReload) return;
    pendingReload = true;
    if (currentRoute?.path !== '/entreno') location.reload();
  });
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch((err) => console.warn('SW', err));
}
navigator.storage?.persist?.().catch(() => {});
