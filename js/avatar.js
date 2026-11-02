// Héroe en pixel art (estilo RPG retro de 16 bits), generado por capas en una
// rejilla de 40×48. El físico crece con los atributos reales: hombros y pecho con
// el empuje, bíceps y brazos con el tirón, piernas con la ruta de piernas y
// abdominales marcados con el core. Lleva los artículos equipados.

import { ITEM_BY_ID } from './game.js';
import { Grid, shade } from './pixel.js';

export const SKINS = ['#f7d3b5', '#e9b48c', '#c98a5e', '#8d5a3b', '#5c3a26'];
export const HAIRS = ['#26222e', '#6b4226', '#e8b84a', '#ff4f9a', '#3fd7ff'];
export const HAIR_STYLES = { puntas: 'Puntas', corto: 'Corto', rapado: 'Rapado', cresta: 'Cresta', mono: 'Moño' };

const W = 40;
const H = 48;
const INK = '#050507';
const WHITE = '#ffffff';
const MOUTH = '#8a1c32';

export function avatarSVG({ attrs, equip = {}, look = {}, size = 200, className = '' }) {
  const pull = (attrs.tiron || 0) / 100;
  const push = (attrs.empuje || 0) / 100;
  const legsA = (attrs.piernas || 0) / 100;
  const coreA = (attrs.core || 0) / 100;
  const item = (slot) => (equip[slot] ? ITEM_BY_ID[equip[slot]] : null);

  const skin = SKINS[look.skin ?? 1] || SKINS[1];
  const skinD = shade(skin, -0.18);
  const hair = HAIRS[look.hair ?? 0] || HAIRS[0];
  const hairD = shade(hair, -0.35);
  const shirt = item('top')?.color || '#ffffff';
  const pants = item('bottom')?.color || '#2a2638';
  const shoes = item('feet')?.color || '#ffffff';

  const hs = 6 + Math.round(push * 3 + pull);   // media anchura de hombros (6–10)
  const bic = 1 + Math.round(pull * 3);         // bulto del bíceps (1–4)
  const armW = 3 + Math.round(pull * 2);        // grosor del brazo (3–5)
  const foreW = 3 + Math.round(pull);           // grosor del antebrazo (3–4)
  const legW = 3 + Math.round(legsA * 2);       // grosor de pierna (3–5)
  const waist = 5 + Math.round(coreA);          // media cintura (5–6)

  const g = new Grid(W, H);
  // Dibuja un rectángulo y su reflejo horizontal.
  const sym = (x, y, w, h, c, tag) => { g.rect(x, y, w, h, c, tag); g.rect(W - x - w, y, w, h, c, tag); };
  const symPx = (x, y, c) => { g.set(x, y, c); g.set(W - 1 - x, y, c); };

  // Capa
  const back = item('back');
  if (back) {
    for (let y = 18; y <= 44; y++) {
      const hw = hs + 1 + Math.floor((y - 18) / 3);
      g.rect(20 - hw, y, hw * 2, 1, y > 41 ? shade(back.color) : back.color, 'cape');
    }
  }

  // Piernas, zapatillas y pantalón
  sym(19 - legW, 36, legW, 7, skin);
  sym(19 - legW - 2, 43, legW + 2, 2, shoes);
  sym(19 - legW - 2, 45, legW + 2, 1, shade(shoes, 0.5));
  g.rect(20 - waist - 1, 31, (waist + 1) * 2, 3, pants);
  sym(20 - waist - 1, 34, waist + 1, 2, pants);
  g.rect(20 - waist - 1, 31, (waist + 1) * 2, 1, shade(pants, -0.3));

  // Torso
  const hwAt = (y) => Math.round(hs + ((waist - hs) * (y - 18)) / 12);
  for (let y = 18; y <= 30; y++) g.rect(20 - hwAt(y), y, hwAt(y) * 2, 1, skin);
  if (coreA >= 0.2) {
    g.rect(17, 27, 6, 1, skinD);
    g.rect(17, 29, 6, 1, skinD);
    g.rect(19, 27, 2, 4, skinD);
  }
  // Camiseta de tirantes con cuello en V
  for (let y = 18; y <= 26; y++) {
    const hw = hwAt(y) - (y <= 20 ? 2 : 0);
    g.rect(20 - hw, y, hw * 2, 1, y === 26 ? shade(shirt, -0.15) : shirt);
  }
  g.rect(17, 18, 6, 1, skin);
  g.rect(18, 19, 4, 1, skin);
  g.rect(19, 20, 2, 1, skin);
  if (push >= 0.25) { sym(15, 22, 4, 1, shade(shirt, -0.15)); }
  g.rect(18, 16, 4, 2, skin); // cuello

  // Brazos en doble bíceps
  const ax = 20 - hs - 6;
  sym(ax, 18, 8, armW, skin);                    // brazo
  g.ellipse(20 - hs - 2.5, 18.5, 3, bic + 0.5, skin);
  g.ellipse(W - (20 - hs - 2.5), 18.5, 3, bic + 0.5, skin);
  sym(ax, 8, foreW, 11, skin);                   // antebrazo
  sym(ax - 1, 5, foreW + 2, 4, skin);            // puño
  sym(ax, 7, foreW, 1, skinD);                   // nudillos
  const wr = item('wrists');
  if (wr) sym(ax, 11, foreW, 2, wr.color);

  // Cabeza
  g.rect(14, 4, 12, 11, skin);
  g.rect(15, 15, 10, 1, skin);
  [[14, 4], [25, 4]].forEach(([x, y]) => g.set(x, y, null));
  symPx(13, 9, skin);
  symPx(13, 10, skin);

  // Pelo
  const style = look.hairStyle || 'puntas';
  if (style === 'rapado' || style === 'cresta') {
    g.rect(14, 3, 12, 2, hair);
    if (style === 'cresta') { g.rect(19, 0, 2, 4, hair); g.rect(19, 0, 2, 1, hairD); }
  } else {
    g.rect(13, 3, 14, 3, hair);
    g.rect(15, 2, 10, 1, hair);
    sym(13, 6, 1, style === 'puntas' ? 2 : 4, hair);
    if (style === 'corto' || style === 'mono') g.rect(15, 6, 4, 1, hair);
    if (style === 'puntas') {
      [[14, 2], [15, 1], [17, 2], [18, 1], [18, 0]].forEach(([x, y]) => symPx(x, y, hair));
      g.rect(15, 6, 2, 1, hair); g.rect(23, 6, 2, 1, hair);
    }
    if (style === 'mono') g.ellipse(20, 1.5, 2.2, 1.6, hair);
    g.rect(15, 3, 10, 1, shade(hair, 0.25));
  }

  // Cara
  sym(16, 8, 2, 2, WHITE);
  g.set(17, 9, INK); g.set(22, 9, INK);
  sym(16, 7, 2, 1, hairD);
  g.rect(18, 12, 4, 1, MOUTH);
  symPx(17, 11, MOUTH);
  symPx(16, 11, shade(skin, 0.25));

  // Artículos de cara y cabeza
  const face = item('face');
  if (face?.id === 'gafas-sol') {
    sym(15, 8, 4, 2, INK); g.rect(19, 8, 2, 1, INK); symPx(16, 8, '#6d6880');
  } else if (face?.id === 'gafas-estrella') {
    sym(15, 8, 4, 2, face.color); symPx(16, 7, face.color); symPx(17, 10, face.color); symPx(16, 9, WHITE); g.rect(19, 8, 2, 1, face.color);
  } else if (face) {
    g.rect(14, 7, 12, 4, face.color);
    sym(16, 8, 2, 2, WHITE); g.set(17, 9, INK); g.set(22, 9, INK);
  }
  const head = item('head');
  if (head?.id === 'gorra') {
    g.rect(14, 1, 12, 5, head.color);
    g.rect(13, 3, 14, 3, head.color);
    g.rect(11, 6, 18, 1, shade(head.color, -0.3));
    g.rect(19, 1, 2, 1, WHITE);
  } else if (head?.id === 'corona') {
    g.rect(14, 2, 12, 2, head.color);
    [[14, 1], [15, 1], [19, 1], [14, 0]].forEach(([x, y]) => symPx(x, y, head.color));
    g.rect(19, 0, 2, 1, head.color);
    symPx(17, 2, '#ff2d87');
    g.rect(14, 3, 12, 1, shade(head.color, -0.25));
  } else if (head) {
    g.rect(13, 6, 14, 1, head.color);
    g.set(27, 6, head.color); g.set(28, 5, head.color); g.set(28, 7, head.color); g.set(29, 8, head.color);
  }

  // Medalla
  const neck = item('neck');
  if (neck) {
    [[17, 18], [18, 19], [19, 20]].forEach(([x, y]) => symPx(x, y, '#ff2d87'));
    g.rect(18, 21, 4, 3, neck.color);
    g.set(18, 21, null); g.set(21, 21, null);
    g.set(19, 22, WHITE);
  }

  g.shadeEdges({ skip: [WHITE, INK, MOUTH] });
  g.outline();
  const aura = item('aura');
  if (aura) g.glow(aura.color, 2);
  // Sombra en el suelo
  for (let x = 9; x <= 30; x++) if (!g.get(x, 46)) g.set(x, 46, 'rgba(0,0,0,0.35)');
  for (let x = 12; x <= 27; x++) if (!g.get(x, 47)) g.set(x, 47, 'rgba(0,0,0,0.2)');

  return g.toSVG({ size, className: `hero-svg ${className}`, label: 'Tu héroe', tagClass: { aura: 'hero-aura' } });
}
