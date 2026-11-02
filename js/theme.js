// Tema claro u oscuro. «auto» sigue al iPhone (prefers-color-scheme); «light» y
// «dark» lo fuerzan con data-theme en <html>. Desde la pantalla de inicio de iOS
// la app no siempre recibe el modo del sistema, por eso se puede elegir a mano.
// index.html aplica el tema guardado antes de pintar, para que no parpadee.

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
