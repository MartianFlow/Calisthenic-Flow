// Efectos de cómic: onomatopeyas, rebotes, latidos y destellos.

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const WORDS = ['¡POW!', '¡BAM!', '¡ZAS!', '¡BOOM!', '¡WHAM!', '¡YEAH!', '¡TOMA!'];
const COLORS = ['', 'pink', 'cyan'];
let wordIndex = 0;

// Lanza una onomatopeya sobre un elemento (o en el centro de la pantalla).
export function burst(target, { text, color, big = false } = {}) {
  if (reduceMotion()) return;
  const el = document.createElement('div');
  el.className = `fx-burst ${color ?? COLORS[wordIndex % COLORS.length]} ${big ? 'big' : ''}`;
  el.textContent = text || WORDS[wordIndex++ % WORDS.length];
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  if (target?.getBoundingClientRect) {
    const r = target.getBoundingClientRect();
    x = Math.min(window.innerWidth - 70, Math.max(70, r.left + r.width / 2));
    y = Math.max(80, r.top + r.height / 2);
  }
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

// Reinicia una animación de clase (bump, beat, shake, stamp…).
export function replay(el, cls) {
  if (!el || reduceMotion()) return;
  el.classList.remove(cls);
  void el.offsetWidth; // fuerza reflow para reiniciar la animación
  el.classList.add(cls);
}

export const bump = (el) => replay(el, 'bump');
export const beat = (el) => replay(el, 'beat');
export const shake = (el) => replay(el, 'shake');

export function flash() {
  if (reduceMotion()) return;
  const el = document.createElement('div');
  el.className = 'fx-flash';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 500);
}

// Asigna el índice de escalonado (--i) a los hijos para las animaciones de entrada.
export function stagger(container) {
  [...container.children].forEach((child, i) => child.style.setProperty('--i', i));
}
