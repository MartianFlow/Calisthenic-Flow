// Personaje digital estilo cómic (SVG). Su físico crece con los atributos reales:
// bíceps con el tirón, hombros y pecho con el empuje, piernas con la ruta de piernas,
// abdominales marcados con el core. Lleva los artículos equipados.

import { ITEM_BY_ID } from './game.js';

export const SKINS = ['#f6d2b8', '#e8b48f', '#c98a5e', '#8d5a3b', '#5c3a26'];
export const HAIRS = ['#1b1b1b', '#5a3a22', '#e2b44c', '#ff2d87', '#18e0ff'];
export const HAIR_STYLES = { puntas: 'Puntas', corto: 'Corto', rapado: 'Rapado', cresta: 'Cresta', mono: 'Moño' };

const INK = '#050507';
const SW = 4;

const f = (v) => Math.round(v * 10) / 10;
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

function limb(p1, p2, w, color) {
  return {
    outline: `<line x1="${f(p1.x)}" y1="${f(p1.y)}" x2="${f(p2.x)}" y2="${f(p2.y)}" stroke="${INK}" stroke-width="${f(w + SW * 2)}" stroke-linecap="round"/>`,
    fill: `<line x1="${f(p1.x)}" y1="${f(p1.y)}" x2="${f(p2.x)}" y2="${f(p2.y)}" stroke="${color}" stroke-width="${f(w)}" stroke-linecap="round"/>`,
  };
}

function burstPoints(cx, cy, n, r1, r2, jitter = 0) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n - Math.PI / 2;
    const r = (i % 2 ? r2 : r1) + (jitter ? Math.sin(i * 2.3) * jitter : 0);
    pts.push(`${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`);
  }
  return pts.join(' ');
}

function aura(item) {
  if (!item) return '';
  const jitter = item.id === 'aura-fuego' ? 12 : 0;
  const n = item.id === 'aura-rayos' ? 12 : 16;
  return `<g class="hero-aura">
    <polygon points="${burstPoints(100, 118, n, 97, 70, jitter * 0.8)}" fill="${item.color}" stroke="${INK}" stroke-width="3" stroke-linejoin="round" opacity="0.95"/>
    <polygon points="${burstPoints(100, 118, n, 76, 56, jitter / 2)}" fill="#ffffff" opacity="0.35"/>
  </g>`;
}

function hair(style, color) {
  const fill = `fill="${color}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;
  switch (style) {
    case 'corto':
      return `<path d="M78 42 Q76 20 100 19 Q124 20 122 42 Q112 32 100 33 Q88 32 78 42 Z" ${fill}/>`;
    case 'rapado':
      return `<path d="M79 38 Q80 23 100 23 Q120 23 121 38 Q110 30 100 30 Q90 30 79 38 Z" ${fill}/>`;
    case 'cresta':
      return `<path d="M79 38 Q80 26 100 26 Q120 26 121 38 Q110 31 100 31 Q90 31 79 38 Z" ${fill}/><polygon points="93,30 94,12 99,18 101,6 106,16 108,30" ${fill}/>`;
    case 'mono':
      return `<circle cx="100" cy="15" r="8" ${fill}/><path d="M78 42 Q76 20 100 19 Q124 20 122 42 Q112 32 100 33 Q88 32 78 42 Z" ${fill}/>`;
    default: // puntas
      return `<polygon points="78,43 75,28 84,30 83,17 93,25 100,10 107,25 117,17 116,30 125,28 122,43 112,33 100,35 88,33" ${fill}/>`;
  }
}

function headItem(item) {
  if (!item) return '';
  const st = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;
  if (item.id === 'gorra') {
    return `<path d="M77 38 Q78 15 100 15 Q122 15 123 38 Z" fill="${item.color}" ${st}/>
      <ellipse cx="100" cy="38" rx="30" ry="5.5" fill="${item.color}" ${st}/>
      <circle cx="100" cy="16" r="3" fill="${INK}"/>`;
  }
  if (item.id === 'corona') {
    return `<polygon points="80,26 82,7 91,18 100,3 109,18 118,7 120,26" fill="${item.color}" ${st}/>
      <circle cx="100" cy="19" r="3" fill="#ff2d87" stroke="${INK}" stroke-width="2"/>
      <circle cx="88" cy="21" r="2.2" fill="#18e0ff" stroke="${INK}" stroke-width="1.5"/>
      <circle cx="112" cy="21" r="2.2" fill="#18e0ff" stroke="${INK}" stroke-width="1.5"/>`;
  }
  // cintas
  return `<path d="M121 34 L134 28 M121 37 L133 43" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
    <path d="M121 34 L134 28 M121 37 L133 43" stroke="${item.color}" stroke-width="4" stroke-linecap="round"/>
    <rect x="77.5" y="31" width="45" height="8" rx="2" fill="${item.color}" ${st}/>`;
}

function faceItem(item) {
  if (!item) return '';
  if (item.id === 'gafas-sol') {
    return `<path d="M83 41 H97 V47 Q97 52 90 52 Q83 52 83 47 Z M103 41 H117 V47 Q117 52 110 52 Q103 52 103 47 Z" fill="${INK}" stroke="${INK}" stroke-width="2"/>
      <path d="M97 43 H103" stroke="${INK}" stroke-width="3"/>
      <path d="M86 44 L90 44 M106 44 L110 44" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>`;
  }
  if (item.id === 'gafas-estrella') {
    return `<polygon points="${burstPoints(90, 46, 5, 9, 4)}" fill="${item.color}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <polygon points="${burstPoints(110, 46, 5, 9, 4)}" fill="${item.color}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M98 45 H102" stroke="${INK}" stroke-width="2.4"/>`;
  }
  // antifaz
  return `<path d="M79 41 Q100 35 121 41 L121 51 Q110 55 100 49 Q90 55 79 51 Z" fill="${item.color}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="91" cy="46" rx="4.2" ry="3.4" fill="#fff"/><ellipse cx="109" cy="46" rx="4.2" ry="3.4" fill="#fff"/>
    <circle cx="92" cy="46.5" r="2" fill="${INK}"/><circle cx="110" cy="46.5" r="2" fill="${INK}"/>`;
}

// attrs: { tiron, empuje, piernas, core } en 0–100.
export function avatarSVG({ attrs, equip = {}, look = {}, size = 220, className = '' }) {
  const pull = (attrs.tiron || 0) / 100;
  const push = (attrs.empuje || 0) / 100;
  const legsA = (attrs.piernas || 0) / 100;
  const coreA = (attrs.core || 0) / 100;
  const skin = SKINS[look.skin ?? 1] || SKINS[1];
  const hairColor = HAIRS[look.hair ?? 0] || HAIRS[0];
  const item = (slot) => (equip[slot] ? ITEM_BY_ID[equip[slot]] : null);

  const hs = 30 + push * 12 + pull * 4;       // media anchura de hombros
  const ww = 19 + coreA * 3 + push * 2;       // media cintura
  const at = 15 + pull * 9 + push * 3;        // grosor del brazo
  const ft = 13 + pull * 6;                   // grosor del antebrazo
  const lw = 15 + legsA * 10;                 // grosor de pierna
  const top = item('top');
  const bottom = item('bottom');
  const feet = item('feet');
  const wrists = item('wrists');
  const back = item('back');
  const neck = item('neck');

  // Brazos en pose de doble bíceps
  const arms = [-1, 1].map((side) => {
    const S = { x: 100 + side * (hs - 6), y: 90 };
    const E = { x: 100 + side * (hs + 28), y: 94 };
    const F = { x: 100 + side * (hs + 26), y: 58 };
    const up = limb(S, E, at, skin);
    const fore = limb(E, F, ft, skin);
    const mid = lerp(S, E, 0.5);
    const rx = at * 0.62 + pull * 3;
    const ry = at * 0.5 + pull * 7;
    const x1 = mid.x - rx;
    const x2 = mid.x + rx;
    const bulge = `<path d="M${f(x1)} ${f(mid.y)} A${f(rx)} ${f(ry)} 0 0 1 ${f(x2)} ${f(mid.y)} Z" fill="${skin}"/>
      <path d="M${f(x1)} ${f(mid.y)} A${f(rx)} ${f(ry)} 0 0 1 ${f(x2)} ${f(mid.y)}" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`;
    let band = '';
    if (wrists) {
      const b = limb(lerp(E, F, 0.5), lerp(E, F, 0.72), ft + 5, wrists.color);
      band = b.outline.replace(`stroke-linecap="round"`, 'stroke-linecap="butt"') + b.fill.replace(`stroke-linecap="round"`, 'stroke-linecap="butt"');
    }
    const fist = `<circle cx="${f(F.x)}" cy="${f(F.y)}" r="${f(ft * 0.58 + 2)}" fill="${skin}" stroke="${INK}" stroke-width="${SW}"/>`;
    return up.outline + fore.outline + up.fill + fore.fill + bulge + band + fist;
  }).join('');

  // Piernas y zapatillas
  const legs = [-1, 1].map((side) => {
    const cx = 100 + side * (ww * 0.55 + 2);
    const l = limb({ x: cx, y: 166 }, { x: cx + side * 2, y: 206 }, lw, skin);
    const shoeX = side < 0 ? cx - lw / 2 - 9 : cx - lw / 2 - 1;
    const shoe = `<rect x="${f(shoeX)}" y="205" width="${f(lw + 12)}" height="12" rx="6" fill="${feet?.color || '#fff'}" stroke="${INK}" stroke-width="${SW}"/>
      <path d="M${f(shoeX + 4)} 213 H${f(shoeX + lw + 8)}" stroke="${INK}" stroke-width="2" opacity="0.5"/>`;
    return l.outline + l.fill + shoe;
  }).join('');

  const torso = `M${f(100 - hs)} 84 C${f(100 - hs)} 104 ${f(100 - ww - 2)} 120 ${f(100 - ww)} 146 L${f(100 + ww)} 146 C${f(100 + ww + 2)} 120 ${f(100 + hs)} 104 ${f(100 + hs)} 84 Q100 74 ${f(100 - hs)} 84 Z`;
  const shirt = `M${f(100 - hs + 5)} 86 Q100 102 ${f(100 + hs - 5)} 86 C${f(100 + hs - 6)} 104 ${f(100 + ww + 4)} 116 ${f(100 + ww + 1)} 127 L${f(100 - ww - 1)} 127 C${f(100 - ww - 4)} 116 ${f(100 - hs + 6)} 104 ${f(100 - hs + 5)} 86 Z`;
  const pecs = push > 0.2
    ? `<path d="M${f(100 - hs * 0.55)} 108 Q${f(100 - hs * 0.25)} 114 100 108 Q${f(100 + hs * 0.25)} 114 ${f(100 + hs * 0.55)} 108" fill="none" stroke="${INK}" stroke-width="2.4" opacity="0.55"/>`
    : '';
  const abs = coreA >= 0.2
    ? `<g stroke="${INK}" stroke-width="2.4" stroke-linecap="round" opacity="0.75">
        <path d="M100 129 V144"/><path d="M${f(100 - ww + 7)} 134 H${f(100 + ww - 7)}"/><path d="M${f(100 - ww + 7)} 140 H${f(100 + ww - 7)}"/>
      </g>`
    : '';
  const shorts = `M${f(100 - ww - 1)} 143 L${f(100 + ww + 1)} 143 L${f(100 + ww + 6)} 172 L103 172 L100 162 L97 172 L${f(100 - ww - 6)} 172 Z`;
  const cape = back
    ? `<path d="M${f(100 - hs + 4)} 86 L${f(100 - hs - 26)} 214 Q100 228 ${f(100 + hs + 26)} 214 L${f(100 + hs - 4)} 86 Z" fill="${back.color}" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round"/>
       <path d="M${f(100 - hs - 10)} 190 Q100 200 ${f(100 + hs + 10)} 190" fill="none" stroke="${INK}" stroke-width="2" opacity="0.35"/>`
    : '';
  const medal = neck
    ? `<path d="M90 80 L100 101 L110 80" fill="none" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
       <path d="M90 80 L100 101 L110 80" fill="none" stroke="#ff2d87" stroke-width="4" stroke-linejoin="round"/>
       <circle cx="100" cy="106" r="8.5" fill="${neck.color}" stroke="${INK}" stroke-width="3"/>
       <polygon points="${burstPoints(100, 106, 5, 4.5, 2)}" fill="#fff" opacity="0.8"/>`
    : '';

  return `<svg class="hero-svg ${className}" width="${size}" height="${f(size * 1.2)}" viewBox="0 0 200 240" role="img" aria-label="Tu personaje" xmlns="http://www.w3.org/2000/svg">
    ${aura(item('aura'))}
    <ellipse cx="100" cy="222" rx="56" ry="7" fill="${INK}" opacity="0.28"/>
    <g class="hero-body" stroke-linejoin="round">
      ${cape}
      ${legs}
      <path d="${shorts}" fill="${bottom?.color || '#1d1a24'}" stroke="${INK}" stroke-width="${SW}"/>
      <path d="M100 162 V150" stroke="${INK}" stroke-width="2" opacity="0.5"/>
      <rect x="92" y="60" width="16" height="22" fill="${skin}" stroke="${INK}" stroke-width="${SW}"/>
      <path d="${torso}" fill="${skin}" stroke="${INK}" stroke-width="${SW}"/>
      ${abs}
      <path d="${shirt}" fill="${top?.color || '#fff'}" stroke="${INK}" stroke-width="${SW}"/>
      ${pecs}
      ${medal}
      ${arms}
      <circle cx="78" cy="47" r="5" fill="${skin}" stroke="${INK}" stroke-width="3"/>
      <circle cx="122" cy="47" r="5" fill="${skin}" stroke="${INK}" stroke-width="3"/>
      <circle cx="100" cy="45" r="22.5" fill="${skin}" stroke="${INK}" stroke-width="${SW}"/>
      ${hair(look.hairStyle, hairColor)}
      <path d="M86 38 L95 40.5 M105 40.5 L114 38" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>
      <ellipse cx="91" cy="46.5" rx="4.4" ry="5.4" fill="#fff" stroke="${INK}" stroke-width="2"/>
      <ellipse cx="109" cy="46.5" rx="4.4" ry="5.4" fill="#fff" stroke="${INK}" stroke-width="2"/>
      <circle cx="92" cy="47.5" r="2.4" fill="${INK}"/><circle cx="110" cy="47.5" r="2.4" fill="${INK}"/>
      <path d="M91 55 Q100 64 109 55 Z" fill="#fff" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
      ${faceItem(item('face'))}
      ${headItem(item('head'))}
    </g>
  </svg>`;
}
