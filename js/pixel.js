// Motor de pixel art: rejilla de colores, contorno negro automático, sombreado
// lateral y salida a SVG nítido (un <rect> por tramo horizontal de color).
// También contiene los iconos 16×16 de artículos y logros.

const OUTLINE = '#050507';

export function shade(hex, amt = -0.28) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = amt < 0 ? c * (1 + amt) : c + (255 - c) * amt;
    return Math.max(0, Math.min(255, Math.round(v)));
  });
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export class Grid {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Array(w * h).fill(null);
    this.tag = new Array(w * h).fill(null); // capa a la que pertenece cada píxel
  }
  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) { return this.inside(x, y) ? this.px[y * this.w + x] : null; }
  set(x, y, c, tag = null) {
    if (!this.inside(x, y)) return;
    this.px[y * this.w + x] = c;
    this.tag[y * this.w + x] = tag;
  }
  rect(x, y, w, h, c, tag) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c, tag);
  }
  // Elipse rellena con centro en (cx, cy) (admite medios píxeles).
  ellipse(cx, cy, rx, ry, c, tag) {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) {
      for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
        const dx = (i + 0.5 - cx) / rx;
        const dy = (j + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1.05) this.set(i, j, c, tag);
      }
    }
  }
  // Pinta un sprite de texto: cada letra es una clave de la paleta, '.' = vacío.
  sprite(rows, x, y, palette, tag) {
    rows.forEach((row, j) => {
      [...row].forEach((ch, i) => {
        if (ch !== '.' && palette[ch]) this.set(x + i, y + j, palette[ch], tag);
      });
    });
  }
  mirrorX(fn) {
    fn((x) => x);
    fn((x) => this.w - 1 - x);
  }
  // Sombra: los píxeles en el borde derecho/inferior de su color se oscurecen.
  shadeEdges({ skip = [] } = {}) {
    const out = [...this.px];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.get(x, y);
        if (!c || skip.includes(c)) continue;
        const r = this.get(x + 1, y);
        const b = this.get(x, y + 1);
        if (r === null || b === null) out[y * this.w + x] = shade(c);
      }
    }
    this.px = out;
  }
  // Contorno negro de 1 px alrededor de todo lo dibujado.
  outline(color = OUTLINE) {
    const add = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        const n = [this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)];
        if (n.some((c) => c && c !== color)) add.push([x, y]);
      }
    }
    add.forEach(([x, y]) => this.set(x, y, color, 'outline'));
  }
  // Halo alrededor de la silueta (para auras), con tramado en el anillo exterior.
  glow(color, width = 2) {
    let ring = new Set();
    for (let k = 0; k < width; k++) {
      const add = [];
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          if (this.get(x, y)) continue;
          const n = [this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)];
          if (n.some(Boolean) && (k === 0 || (x + y) % 2 === 0)) add.push([x, y]);
        }
      }
      add.forEach(([x, y]) => { this.set(x, y, k === 0 ? color : shade(color, 0.35), 'aura'); ring.add(`${x},${y}`); });
    }
    return ring;
  }
  toSVG({ size = 160, className = '', label = '', tagClass = {} } = {}) {
    let rects = '';
    const groups = {};
    for (let y = 0; y < this.h; y++) {
      let x = 0;
      while (x < this.w) {
        const c = this.get(x, y);
        const t = this.tag[y * this.w + x];
        if (!c) { x++; continue; }
        let len = 1;
        while (x + len < this.w && this.get(x + len, y) === c && this.tag[y * this.w + x + len] === t) len++;
        const r = `<rect x="${x}" y="${y}" width="${len}" height="1" fill="${c}"/>`;
        if (t && tagClass[t]) (groups[t] ||= []).push(r); else rects += r;
        x += len;
      }
    }
    const extra = Object.entries(groups).map(([t, rs]) => `<g class="${tagClass[t]}">${rs.join('')}</g>`).join('');
    const h = Math.round((size * this.h) / this.w);
    return `<svg class="pixel-svg ${className}" width="${size}" height="${h}" viewBox="0 0 ${this.w} ${this.h}" shape-rendering="crispEdges" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'} xmlns="http://www.w3.org/2000/svg">${extra}${rects}</svg>`;
  }
}

// ─────────────────────────────── Iconos 16×16 ───────────────────────────────
// Solo relleno: el contorno se añade solo. C = color del artículo, c = su sombra,
// W = brillo, el resto son colores fijos.

const FIXED = {
  W: '#ffffff', Y: '#ffd23f', y: '#c99a12', R: '#ff3b5c', r: '#b3123a', G: '#3ccf5a', P: '#f3dfa2',
  p: '#c9a85e', g: '#8b86a0', h: '#5b5670', B: '#2b2d6e', O: '#ff8a1f', K: OUTLINE,
};

export const ICONS = {
  top: [
    '................', '................', '....CCC..CCC....', '..CCCCCCCCCCCC..', '.CCCWCCCCCCCCCC.',
    '.CCCWCCCCCCCCCC.', '..cCCCCCCCCCCc..', '....CCCCCCCC....', '....CCCCCCCC....', '....CCCCCCCC....',
    '....CCCCCCCc....', '....CCCCCCcc....', '....cccccccc....', '................', '................', '................',
  ],
  bottom: [
    '................', '................', '................', '...cccccccccc...', '...CWCCCCCCCC...',
    '...CWCCCCCCCC...', '...CCCCCCCCCC...', '...CCCC..CCCC...', '...CCCC..CCCC...', '...CCCC..CCCC...',
    '...cccc..cccc...', '................', '................', '................', '................', '................',
  ],
  feet: [
    '................', '................', '................', '................', '.....CCC........',
    '.....CWCC.......', '.....CWCCC......', '....CCCCCCCC....', '...CCCCCCCCCCC..', '...CCCCCCCCCCc..',
    '...WWWWWWWWWWW..', '................', '................', '................', '................', '................',
  ],
  wrists: [
    '................', '................', '................', '................', '....CCCCCCCC....',
    '...CWWCCCCCCC...', '...CCCCCCCCCC...', '...CCCCCCCCCC...', '...cccccccccc...', '....cccccccc....',
    '................', '................', '................', '................', '................', '................',
  ],
  'head-band': [
    '................', '................', '................', '................', '................',
    '..CCCCCCCCCCC...', '..CWWCCCCCCCCC..', '..ccccccccccc...', '............CC..', '.............CC.',
    '................', '................', '................', '................', '................', '................',
  ],
  'head-cap': [
    '................', '................', '................', '.....CCCCC......', '....CCCCCCC.....',
    '...CCWCCCCCC....', '...CCCCCCCCC....', '...cccccccccccc.', '..........cccc..', '................',
    '................', '................', '................', '................', '................', '................',
  ],
  'head-crown': [
    '................', '................', '................', '..C....C....C...', '..CC..CCC..CC...',
    '..CCC.CWC.CCC...', '..CCCCCCCCCCC...', '..CCRCCCCCRCC...', '..CCCCCCCCCCC...', '..ccccccccccc...',
    '................', '................', '................', '................', '................', '................',
  ],
  'face-sun': [
    '................', '................', '................', '................', '................',
    '.CCCCC..CCCCC...', '.CWCCCCCCWCCC...', '.CCCCC..CCCCC...', '..CCC....CCC....', '................',
    '................', '................', '................', '................', '................', '................',
  ],
  'face-star': [
    '................', '................', '................', '...C.....C......', '..CCC...CCC.....',
    '.CCWCCCCCWCCC...', '.CCCCC.CCCCC....', '..CCC...CCC.....', '.CC.CC.CC.CC....', '................',
    '................', '................', '................', '................', '................', '................',
  ],
  'face-mask': [
    '................', '................', '................', '................', '..CCCCCCCCCCCC..',
    '.CCC..CCCC..CCC.', '.CCC..CCCC..CCC.', '..CCCCC..CCCCC..', '................', '................',
    '................', '................', '................', '................', '................', '................',
  ],
  neck: [
    '................', '...R.......R....', '...RR.....RR....', '....RR...RR.....', '.....RR.RR......',
    '......RRR.......', '.....CCCCC......', '....CCCWCCC.....', '...CCCWWWCCC....', '...CCCCWCCCC....',
    '...CCCCCCCCC....', '....cCCCCCc.....', '.....ccccc......', '................', '................', '................',
  ],
  back: [
    '................', '................', '....CCCCCCCC....', '...CCCCCCCCCC...', '...CCCCCCCCCC...',
    '..CCCCCCCCCCCC..', '..CCCcCCCCcCCC..', '..CCCcCCCCcCCC..', '.CCCCcCCCCcCCCC.', '.CCCCcCCCCcCCCC.',
    '.CCCcCCCCCCcCCC.', '.cccccccccccccc.', '................', '................', '................', '................',
  ],
  aura: [
    '.......C........', '.......C........', '......CCC.......', '.C....CWC....C..', '..C..CCWCC..C...',
    '...CCCWWWCCC....', '.CCCWWWWWWWCCC..', '...CCCWWWCCC....', '..C..CCWCC..C...', '.C....CWC....C..',
    '......CCC.......', '.......C........', '.......C........', '................', '................', '................',
  ],
  none: [
    '................', '................', '................', '...h.......h....', '....h.....h.....',
    '.....h...h......', '......h.h.......', '.......h........', '......h.h.......', '.....h...h......',
    '....h.....h.....', '...h.......h....', '................', '................', '................', '................',
  ],
  // Logros
  flame: [
    '.......R........', '......RR........', '......RRR.......', '.....RRRR...R...', '.....RRRRR..RR..',
    '....RRRROORRRR..', '...RRRROOOORRR..', '...RRROOYYOORR..', '...RROOYYYYORR..', '...RROYYWWYORR..',
    '....ROYYWWYOR...', '.....OYYYYYO....', '......OOOOO.....', '................', '................', '................',
  ],
  trophy: [
    '................', '...YYYYYYYYYY...', '.YYYYWYYYYYYYYY.', '.Y.YYWYYYYYYY.Y.', '.Y.YYWYYYYYYY.Y.',
    '..YYYYYYYYYYYY..', '....YYYYYYYY....', '.....YYYYYY.....', '......yYYy......', '.......YY.......',
    '.......YY.......', '.....yyyyyy.....', '....YYYYYYYY....', '....yyyyyyyy....', '................', '................',
  ],
  map: [
    '................', '................', '..PPPPPPPPPPPP..', '..PPPPPPPPPPPP..', '..PPRPPPPPPPPP..',
    '..PPRRPPPPGGPP..', '..PPPRPPPPGGPP..', '..PPPRRRPPPPPP..', '..PPPPPRPPPPPP..', '..PPPPPRRRRPPP..',
    '..PPPPPPPPPRPP..', '..PPPPPPPPRRRP..', '..pppppppppppp..', '................', '................', '................',
  ],
  star: [
    '................', '.......Y........', '......YYY.......', '......YWY.......', '.YYYYYYWYYYYYY..',
    '..YYYYYWYYYYY...', '...YYYYYYYYY....', '....YYYYYYY.....', '....YYYYYYY.....', '...YYYYyYYYY....',
    '...YYYy.yYYY....', '..YYy.....yYY...', '..Yy.......yY...', '................', '................', '................',
  ],
  lock: [
    '................', '................', '.....hhhhh......', '....hh...hh.....', '....h.....h.....',
    '....h.....h.....', '...ggggggggg....', '...gggggWggg....', '...ggggKgggg....', '...ggggKgggg....',
    '...ggggggggg....', '...hhhhhhhhh....', '................', '................', '................', '................',
  ],
  chest: [
    '................', '................', '................', '...pppppppppp...', '..pPPPPPPPPPPp..',
    '..pPPPPPPPPPPp..', '..YYYYYYYYYYYY..', '..pPPPPYYPPPPp..', '..pPPPPYYPPPPp..', '..pPPPPPPPPPPp..',
    '..pPPPPPPPPPPp..', '..pppppppppppp..', '................', '................', '................', '................',
  ],
  heart: [
    '................', '................', '...RRR...RRR....', '..RRWRR.RRRRR...', '..RWRRRRRRRRR...',
    '..RRRRRRRRRRR...', '...RRRRRRRRR....', '....RRRRRRR.....', '.....RRRRR......', '......RRR.......',
    '.......R........', '................', '................', '................', '................', '................',
  ],
};

// Mascotas (8×8): C = su color, c = sombra, W = blanco, K = tinta, R = rojo, O = naranja.
// El héroe las lleva a su lado y el icono es el mismo sprite al doble.
export const PET_SPRITES = {
  gato: ['C....C..', 'CC..CC..', 'CCCCCC..', 'CKCCKC..', 'CCRRCC.C', '.CCCC..C', '.CCCCCC.', '.C..C...'],
  perro: ['cCCCCc..', 'cCCCCc..', 'cKCCKc..', '.CCKC...', '.CRRC..C', '.CCCCCCC', '.CCCCCC.', '.C.C.C.C'],
  pollito: ['..CC....', '.CCCC...', '.CKCC...', 'OCCCCC..', '.CCCCCC.', '.CCCCCC.', '..CCCC..', '..O..O..'],
  slime: ['........', '...CC...', '..CCCC..', '.CWCCCC.', '.CKCCKC.', 'CCCCCCCC', 'CCCCCCCC', '.cccccc.'],
  fantasma: ['..CCCC..', '.CCCCCC.', 'CCKCCKCC', 'CCKCCKCC', 'CCCCCCCC', 'CCCKKCCC', 'CCCCCCCC', 'C.CC.CC.'],
  dragon: ['C......C', 'CC.CC.CC', '.CCCCCC.', '.CKCCKC.', '..CCCC..', '.cCWWCc.', 'cCCWWCCc', '.C....C.'],
};
// Icono = sprite al doble (16×16); se pinta con 1 px de margen para que quepa el contorno.
const double = (rows) => rows.flatMap((r) => { const d = [...r.padEnd(8, '.')].map((ch) => ch + ch).join(''); return [d, d]; });
for (const [k, rows] of Object.entries(PET_SPRITES)) ICONS[`pet-${k}`] = double(rows);

Object.assign(ICONS, {
  'head-beanie': ['', '.......WW', '......WWWW', '.....CCCCCC', '....CCWCCCCC', '...CCWCCCCCCC', '...CCCCCCCCCC', '...cccccccccc'],
  'head-phones': ['', '.....KKKKKK', '....K......K', '...K........K', '...K........K', '..CCC......CCC', '..CWC......CWC', '..CCC......CCC', '..ccc......ccc'],
  'head-horns': ['', '.P............P', '.PP..........PP', '..PP.CCCCCC.PP', '...PCCCWCCCCP', '....CCWCCCCC', '...CCCCCCCCCC', '...cccccccccc'],
  'head-halo': ['', '', '....CCCCCCCC', '...CW.......C', '...C........C', '....cccccccc'],
  'face-patch': ['', '', '', 'KKKKKKKKKKKKKKKK', '.........KKKK', '........KKKKKK', '........KKKKKK', '.........KKKK'],
  'face-stache': ['', '', '', '', '....CCCCCCCC', '...CCCCCCCCCC', '..CCC......CCC', '..CC........CC'],
  'face-visor': ['', '', '', '', '.CCCCCCCCCCCCCC', '.CWWWCCCCCCCCCC', '.CCCCCCCCCCCCCC', '..cccccccccccc'],
  'neck-towel': ['', '...CCCCCCCCCC', '..CCCCCCCCCCCC', '..CCC......CCC', '..CCC......CCC', '..CCC......CCC', '..CWC......CWC', '..CCC......CCC', '..ccc......ccc'],
  'neck-chain': ['', '...C........C', '....C......C', '.....C....C', '......C..C', '.......CC', '......CCCC', '......CWCC', '.......cc'],
  'back-wings': ['', '.CC..........CC', '.CCC........CCC', '.CCCC......CCCC', '..CCCC....CCCC', '..CcCCC..CCCcC', '...CcCC..CCcC', '...CcC....CcC', '....C......C'],
  // Logros secretos y misiones
  question: ['', '.....WWWWW', '....WWWWWWW', '...WWW...WWW', '.........WWW', '........WWW', '.......WWW', '......WWW', '......WWW', '', '......WWW', '......WWW'],
  scroll: ['', '..pppppppppp', '.pPPPPPPPPPPp', '..pPPPPPPPPp', '..pPhhhhhhPp', '..pPPPPPPPPp', '..pPhhhhhPPp', '..pPPPPPPPPp', '..pPhhhhhhPp', '.pPPPPPPPPPPp', '..pppppppppp'],
});

const ICON_CACHE = new Map();

export function pixelIcon(name, color = '#ffffff', size = 32, { silhouette = false } = {}) {
  const key = `${name}|${color}|${size}|${silhouette}`;
  if (ICON_CACHE.has(key)) return ICON_CACHE.get(key);
  const rows = ICONS[name] || ICONS.star;
  const pad = name.startsWith('pet-') ? 1 : 0;
  const g = new Grid(16 + pad * 2, 16 + pad * 2);
  const pal = { ...FIXED, C: color, c: shade(color) };
  if (silhouette) Object.keys(pal).forEach((k) => { pal[k] = '#5d5885'; });
  g.sprite(rows, pad, pad, pal);
  g.outline(silhouette ? '#000000' : OUTLINE);
  const svg = g.toSVG({ size, className: 'pixel-icon' });
  ICON_CACHE.set(key, svg);
  return svg;
}
