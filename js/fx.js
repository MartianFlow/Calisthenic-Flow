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

// Pulsación: rebote breve del elemento tocado (o de su copia tras repintar la vista).
// La clase se quita al acabar para no tapar otras animaciones del elemento.
export function tap(el) {
  if (!el || reduceMotion()) return;
  el.classList.remove('tapped');
  void el.offsetWidth;
  el.classList.add('tapped');
  const done = (e) => {
    if (e.target !== el) return;
    el.classList.remove('tapped');
    el.removeEventListener('animationend', done);
  };
  el.addEventListener('animationend', done);
}

// Las cifras grandes cuentan desde cero al entrar en la pantalla.
const COUNT_SEL = '.tile-num, .cal-stats strong, .hero-num, .px-stats b, .px-gain, .px-lv b';
export function countUp(root, duration = 900) {
  if (reduceMotion()) return;
  const nodes = [];
  for (const el of root.querySelectorAll(COUNT_SEL)) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (/\d/.test(node.nodeValue)) nodes.push({ node, text: node.nodeValue });
    }
  }
  if (!nodes.length) return;
  const show = (e) => {
    for (const n of nodes) n.node.nodeValue = e >= 1 ? n.text : n.text.replace(/\d+/g, (m) => String(Math.round(Number(m) * e)));
  };
  show(0);
  const start = performance.now();
  const frame = (now) => {
    const t = Math.min(1, (now - start) / duration);
    show(t >= 1 ? 1 : 1 - Math.pow(1 - t, 3));
    if (t < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// Índice de escalonado (--i) para las filas de las listas: entran una tras otra.
const LISTS = '.ex-list, .history, .log, .px-ach-list, .week-list, .summary-list, .lift-weights, .goal-list, .checklist, .sets, .path, .px-bar, .px-attrs, .px-items, .route-grid, .tiles, .rate-opts, .cal-grid';
export function staggerLists(root) {
  for (const list of root.querySelectorAll(LISTS)) {
    [...list.children].forEach((child, i) => child.style.setProperty('--i', i));
  }
}

// Los paneles que quedan por debajo de la pantalla aparecen al llegar a ellos con el scroll.
let revealer = null;
export function reveal(container) {
  revealer?.disconnect();
  revealer = null;
  if (reduceMotion() || !('IntersectionObserver' in window)) return;
  const limit = window.innerHeight * 0.95;
  const targets = [...container.children].filter((el) => el.getBoundingClientRect().top > limit
    && getComputedStyle(el).position === 'static');
  if (!targets.length) return;
  revealer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('revealed');
      revealer?.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -6% 0px' });
  for (const el of targets) {
    el.classList.add('reveal');
    revealer.observe(el);
  }
}

// Lluvia de confeti de cómic (fin del entreno, subidas de nivel, bienvenida).
const CONFETTI = ['#ffe500', '#ff2d87', '#18e0ff', '#3dff8b', '#ffffff'];
export function confetti({ count = 46 } = {}) {
  if (reduceMotion()) return;
  const box = document.createElement('div');
  box.className = 'fx-confetti';
  box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('i');
    const w = 6 + Math.random() * 7;
    piece.style.cssText = [
      `left:${Math.random() * 100}%`,
      `width:${w}px`,
      `height:${w * (1.2 + Math.random())}px`,
      `background:${CONFETTI[i % CONFETTI.length]}`,
      `--dx:${Math.round((Math.random() - 0.5) * 180)}px`,
      `--r:${Math.round(Math.random() * 900 - 450)}deg`,
      `--d:${(1.5 + Math.random() * 1.4).toFixed(2)}s`,
      `--delay:${(Math.random() * 0.4).toFixed(2)}s`,
    ].join(';');
    box.appendChild(piece);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3600);
}
