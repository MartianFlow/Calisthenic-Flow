// Comprobaciones de maquetación que se ejecutan dentro de la página (Playwright).
// Las usan tests/tools/auditar-diseno.js (auditoría completa con capturas) y
// tests/e2e/layout.spec.js (versión rápida en cada push).
//
// Devuelve una lista de problemas { kind, el, msg }:
//   scroll-x      la página se puede desplazar en horizontal
//   off-screen    un elemento se sale por un lado de la pantalla
//   spill         texto, icono o caja que se sale de la caja con borde o fondo que lo contiene
//   cut           texto recortado por una caja con overflow: hidden (sin «…» a propósito)
//   overlap       dos textos (o un texto y un icono) se pisan
//   hidden-fixed  contenido que ninguna posición del scroll deja ver por culpa de una barra fija
//   contrast      texto con contraste menor que 3:1 con su fondo

function inPage(opts) {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const out = [];
  const SKIP = '.fx-burst, .fx-flash, #toast, script, style, noscript';

  const label = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.') : '';
    const txt = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}${txt ? ` «${txt}»` : ''}`;
  };
  const styleCache = new Map();
  const cs = (el) => { let s = styleCache.get(el); if (!s) { s = getComputedStyle(el); styleCache.set(el, s); } return s; };
  const visible = (el) => {
    // el contenido de un <details> cerrado no se pinta (salvo su <summary>)
    const det = el.closest('details:not([open])');
    if (det && !el.closest('summary')) return false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const s = cs(e);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    }
    return true;
  };
  const fixedRoot = (el) => {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const p = cs(e).position;
      if (p === 'fixed' || p === 'sticky') return e;
    }
    return null;
  };
  // Zona visible de un elemento tras recortarlo con los contenedores con overflow
  // (incluido él mismo: un texto puede quedar recortado por su propia caja).
  const clipOf = (el, self = false) => {
    const r = { left: -1e9, top: -1e9, right: 1e9, bottom: 1e9, by: null };
    for (let e = self ? el : el.parentElement; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
      const s = cs(e);
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
        const b = e.getBoundingClientRect();
        if (s.overflowX !== 'visible' && (b.left > r.left || b.right < r.right)) { r.left = Math.max(r.left, b.left); r.right = Math.min(r.right, b.right); r.by ||= e; }
        if (s.overflowY !== 'visible' && (b.top > r.top || b.bottom < r.bottom)) { r.top = Math.max(r.top, b.top); r.bottom = Math.min(r.bottom, b.bottom); r.by ||= e; }
      }
      if (s.position === 'fixed') break;
    }
    return r;
  };
  const intersect = (a, b) => ({
    left: Math.max(a.left, b.left), top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right), bottom: Math.min(a.bottom, b.bottom),
  });
  const hasBox = (s) => (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent')
    || s.backgroundImage !== 'none' || parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderLeftWidth) > 0;
  const positioned = (s) => s.position === 'absolute' || s.position === 'fixed';
  const scroller = (s) => ['auto', 'scroll'].includes(s.overflowX) || ['auto', 'scroll'].includes(s.overflowY);
  // Caja visible (borde o fondo) que contiene a un elemento. Se para en los elementos
  // posicionados (insignias que sobresalen a propósito) y en los carruseles.
  const boxOf = (el, self) => {
    for (let e = self ? el : el.parentElement; e && e !== document.body; e = e.parentElement) {
      const s = cs(e);
      if (s.display !== 'inline' && s.display !== 'contents' && hasBox(s)) return e;
      if (positioned(s) || scroller(s)) return null;
    }
    return null;
  };
  const beyond = (r, b, tol = 2.5) => r.left < b.left - tol || r.right > b.right + tol || r.top < b.top - tol || r.bottom > b.bottom + tol;
  const px = (n) => `${Math.round(n)}px`;

  // 1) Scroll horizontal de la página
  const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  if (sw > vw + 1) {
    // Culpable probable: el elemento más interno cuyo contenido llega más allá de la pantalla
    // (también los que el resto de comprobaciones ignora, como el texto interno de un <select>).
    let culprit = null;
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width && r.left + el.scrollWidth > vw + 1) culprit = el;
    }
    out.push({ kind: 'scroll-x', el: culprit ? label(culprit) : '', msg: `ancho del contenido ${sw}px > pantalla ${vw}px` });
  }

  const all = [...document.body.querySelectorAll('*')].filter((el) => !el.closest(SKIP) && !(el instanceof SVGElement && el.tagName.toLowerCase() !== 'svg'));

  // 2) Elementos fuera de la pantalla (solo el más externo de cada rama)
  const offending = new Set();
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.right <= vw + 1.5 && r.left >= -1.5) continue;
    if (!visible(el)) continue;
    const clip = clipOf(el);
    if (clip.right <= vw + 1.5 && clip.left >= -1.5) continue; // recortado por un contenedor (p. ej. carrusel)
    offending.add(el);
    if (offending.has(el.parentElement)) continue;
    out.push({ kind: 'off-screen', el: label(el), msg: `ocupa de ${Math.round(r.left)} a ${Math.round(r.right)}px (pantalla ${vw}px)` });
  }

  // Cajas de texto (una por línea) e iconos pequeños
  const boxes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  while (walker.nextNode()) {
    const t = walker.currentNode;
    if (!t.textContent.trim()) continue;
    const el = t.parentElement;
    if (!el || el.closest(SKIP) || el.closest('svg') || !visible(el)) continue;
    const clip = clipOf(el, true);
    range.selectNodeContents(t);
    for (const raw of range.getClientRects()) {
      if (raw.width < 2 || raw.height < 2) continue;
      const r = intersect(raw, clip);
      const cut = r.right - r.left < raw.width - 2.5 || r.bottom - r.top < raw.height - 2.5;
      const empty = r.right - r.left < 2 || r.bottom - r.top < 2;
      boxes.push({ el, raw, r: empty ? null : r, clip, cut, fixed: fixedRoot(el), text: true });
    }
  }
  for (const svg of document.querySelectorAll('svg')) {
    if (svg.closest(SKIP) || svg.closest('.chart') || svg.closest('.px-scene')) continue;
    const raw = svg.getBoundingClientRect();
    if (raw.width < 2 || raw.width > 40 || raw.height > 40 || !visible(svg)) continue;
    const clip = clipOf(svg);
    const r = intersect(raw, clip);
    if (r.right - r.left < 2 || r.bottom - r.top < 2) continue;
    boxes.push({ el: svg, raw, r, clip, cut: r.right - r.left < raw.width - 2.5, fixed: fixedRoot(svg), text: false });
  }

  // 3a) Texto o icono que se sale de su caja (botón, pastilla, tarjeta…)
  const spilled = new Set();
  for (const b of boxes) {
    if (!b.r) continue;
    const box = boxOf(b.el, true);
    if (!box || spilled.has(box)) continue;
    const br = box.getBoundingClientRect();
    if (beyond(b.r, br)) { // la parte visible (lo recortado a propósito se mira en 3c)
      spilled.add(box);
      out.push({ kind: 'spill', el: label(box), msg: `${b.text ? 'el texto' : 'un icono'} «${label(b.el).slice(0, 50)}» se sale de la caja` });
    }
  }
  // 3b) Caja que se sale de la caja que la contiene (p. ej. el ✓ de una serie)
  for (const el of all) {
    if (el instanceof SVGElement || spilled.has(el)) continue;
    const s = cs(el);
    if (positioned(s) || s.display === 'inline' || !hasBox(s) || !visible(el)) continue;
    const parent = boxOf(el, false);
    if (!parent || spilled.has(parent)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const pr = parent.getBoundingClientRect();
    if (beyond(r, pr, 3)) {
      spilled.add(parent);
      out.push({ kind: 'spill', el: label(parent), msg: `«${label(el).slice(0, 50)}» se sale ${px(Math.max(r.right - pr.right, pr.left - r.left, r.bottom - pr.bottom, pr.top - r.top))}` });
    }
  }
  // 3c) Texto cortado por una caja con overflow: hidden (sin «…» ni límite de líneas a propósito)
  const cutSeen = new Set();
  for (const b of boxes) {
    if (!b.text || !b.cut || !b.clip.by || cutSeen.has(b.clip.by)) continue;
    const s = cs(b.clip.by);
    const hidden = ['hidden', 'clip'].includes(s.overflowX) || ['hidden', 'clip'].includes(s.overflowY);
    const intended = s.textOverflow === 'ellipsis' || s.webkitLineClamp !== 'none' || cs(b.el).textOverflow === 'ellipsis' || cs(b.el).webkitLineClamp !== 'none';
    if (!hidden || intended || scroller(s)) continue;
    cutSeen.add(b.clip.by);
    out.push({ kind: 'cut', el: label(b.clip.by), msg: `recorta el texto «${label(b.el).slice(0, 50)}»` });
  }

  // 4) Textos e iconos que se pisan
  const seen = new Set();
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (!a.r || !b.r || a.el === b.el || a.fixed !== b.fixed) continue;
      if (!a.text && !b.text) continue;
      if (a.text && b.text && (a.el.contains(b.el) || b.el.contains(a.el))) continue;
      const x = intersect(a.r, b.r);
      const w = x.right - x.left, h = x.bottom - x.top;
      if (w <= 3 || h <= 3) continue;
      const minH = Math.min(a.r.bottom - a.r.top, b.r.bottom - b.r.top);
      if (h < minH * 0.3) continue; // solape del interlineado, no de las letras
      const key = `${label(a.el)}|${label(b.el)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ kind: 'overlap', el: label(a.el), msg: `pisa a ${label(b.el)} (${Math.round(w)}×${Math.round(h)}px)` });
    }
  }

  // 5) Contenido que una barra fija tapa siempre (ni haciendo scroll hasta el final se ve)
  const docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  const maxScroll = Math.max(0, docH - vh);
  const bars = [...document.querySelectorAll('.tabbar, .rest-bar')].filter((b) => visible(b) && cs(b).position === 'fixed');
  const barTop = Math.min(vh, ...bars.map((b) => b.getBoundingClientRect().top));
  const lastBoxes = boxes.filter((b) => b.r && !b.fixed).map((b) => ({ ...b, absBottom: b.r.bottom + window.scrollY }));
  for (const b of lastBoxes) {
    const bottomAtEnd = b.absBottom - maxScroll;
    if (bottomAtEnd > barTop + 2) {
      out.push({ kind: 'hidden-fixed', el: label(b.el), msg: `queda ${Math.round(bottomAtEnd - barTop)}px bajo la barra fija incluso al final del scroll` });
      break;
    }
  }

  // 6) Contraste del texto con su fondo (fondo sólido más cercano)
  if (opts.contrast) {
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
    const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const bodyBg = parse(cs(document.documentElement).getPropertyValue('--bg').trim().replace(/^#(..)(..)(..)$/, (_, r, g, b) => `rgb(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)})`)) || { r: 0, g: 0, b: 0, a: 1 };
    const bgOf = (el) => {
      for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
        const s = cs(e);
        if (s.backgroundImage !== 'none' && e !== document.body) return null; // degradado o imagen: no se puede calcular
        const c = parse(s.backgroundColor);
        if (c && c.a >= 0.95) return c;
      }
      return bodyBg;
    };
    const done = new Set();
    for (const b of boxes) {
      if (!b.text || done.has(b.el) || b.el.closest(':disabled, [aria-disabled="true"]')) continue;
      done.add(b.el);
      const s = cs(b.el);
      if (s.textShadow !== 'none') continue; // títulos con contorno de tinta
      const fg = parse(s.color);
      const bg = bgOf(b.el);
      if (!fg || !bg) continue;
      let op = 1;
      for (let e = b.el; e && e.nodeType === 1; e = e.parentElement) op *= Number(cs(e).opacity);
      const a = fg.a * op;
      const mix = { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a) };
      const l1 = lum(mix), l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      if (ratio < 3) out.push({ kind: 'contrast', el: label(b.el), msg: `contraste ${ratio.toFixed(2)}:1 (${s.color} sobre rgb(${bg.r}, ${bg.g}, ${bg.b}))` });
    }
  }
  return out;
}

async function auditPage(page, opts = { contrast: true }) {
  return page.evaluate(inPage, opts);
}

module.exports = { auditPage };
