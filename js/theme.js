// Tema claro u oscuro. «auto» sigue al iPhone (prefers-color-scheme); «light» y
// «dark» lo fuerzan con data-theme en <html>. Desde la pantalla de inicio de iOS
// la app no siempre recibe el modo del sistema, por eso se puede elegir a mano.
// index.html aplica el tema guardado antes de pintar, para que no parpadee.

import { icon } from './ui.js';

const COLORS = { dark: '#050507', light: '#fff2bd' };

export const THEMES = [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']];

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  else delete root.dataset.theme;
  // Color de la barra de estado: el del tema elegido, o uno por cada modo del sistema.
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const mode = /dark/.test(meta.media) ? 'dark' : 'light';
    meta.content = COLORS[theme === 'light' || theme === 'dark' ? theme : mode];
  }
}

// Tema que se ve ahora mismo («auto» depende del modo del iPhone).
export function effectiveTheme(theme) {
  if (theme === 'light' || theme === 'dark') return theme;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

// Aplica un tema con un fundido suave de colores en vez de un salto brusco.
export function fadeToTheme(theme) {
  const root = document.documentElement;
  root.classList.add('theme-fade');
  setTimeout(() => root.classList.remove('theme-fade'), 600);
  applyTheme(theme);
}

// Botón de modo claro / oscuro de las cabeceras: muestra el modo al que se cambia.
export function themeButton(theme) {
  const dark = effectiveTheme(theme) === 'dark';
  return `<button class="icon-btn theme-btn" data-action="theme-toggle" aria-label="${dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}" title="${dark ? 'Modo claro' : 'Modo oscuro'}">${icon(dark ? 'sun' : 'moon')}</button>`;
}

// Botones de la cabecera de las pantallas principales: tema y Ajustes.
export function headActions(theme) {
  return `<div class="head-btns">${themeButton(theme)}<a class="icon-btn" href="#/ajustes" aria-label="Ajustes" title="Ajustes">${icon('gear')}</a></div>`;
}
