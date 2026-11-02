// Punto de entrada: rutas, delegación de eventos y temporizadores.

import { addRoute, resolve } from './router.js';
import { getState, subscribe } from './store.js';
import { fmtClock } from './ui.js';
import { wakeLock } from './device.js';
import { stagger } from './fx.js';
import * as video from './video.js';
import * as home from './views/home.js';
import * as session from './views/session.js';
import * as roadmaps from './views/roadmaps.js';
import * as progress from './views/progress.js';
import * as settings from './views/settings.js';
import * as calendar from './views/calendar.js';
import * as hero from './views/hero.js';
import * as planView from './views/plan.js';
import { syncAchievements } from './game.js';
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
addRoute('/bienvenida', settings.renderOnboarding, { tab: null });

const actions = {
  ...home.actions,
  ...session.actions,
  ...roadmaps.actions,
  ...progress.actions,
  ...settings.actions,
  ...calendar.actions,
  ...video.actions,
  ...hero.actions,
  ...planView.actions,
  'chart-tip'(el) {
    const fig = el.closest('.chart');
    if (!fig) return;
    fig.querySelector('[data-chart-tip]').textContent = el.dataset.tip;
    fig.querySelectorAll('.sel').forEach((n) => n.classList.remove('sel'));
    el.parentNode.classList.add('sel');
  },
};

const changes = { ...home.changes, ...progress.changes, ...settings.changes, ...session.changes, ...planView.changes };

const viewEl = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
let currentRoute = null;
let lastPath = null;
let enterTimer = null;

function render() {
  const state = getState();
  applyTheme(state.settings.theme); // también tras importar una copia o borrar los datos
  let hash = location.hash || '#/';
  if (!state.onboarded && hash !== '#/bienvenida') {
    history.replaceState(null, '', '#/bienvenida');
    hash = '#/bienvenida';
  }
  const route = resolve(hash) || resolve('#/');
  currentRoute = route;
  viewEl.innerHTML = route.view(route.params);
  document.body.classList.toggle('no-tabs', route.options.tab === null);
  document.body.dataset.route = route.path.split('/')[1] || 'hoy';
  tabbar.querySelectorAll('a').forEach((a) => {
    const on = a.dataset.tab === route.options.tab;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  // Animación de entrada solo al cambiar de pantalla (no en cada actualización).
  if (route.path !== lastPath) {
    window.scrollTo(0, 0);
    document.getElementById('toast')?.classList.remove('show');
    lastPath = route.path;
    stagger(viewEl);
    viewEl.classList.remove('enter');
    void viewEl.offsetWidth;
    viewEl.classList.add('enter');
    clearTimeout(enterTimer);
    enterTimer = setTimeout(() => viewEl.classList.remove('enter'), 1100);
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
  fn(el, ctx, event);
});

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
update((s) => { if (s.onboarded) syncAchievements(s); }, { silent: true });
render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW', err));
}
navigator.storage?.persist?.().catch(() => {});
