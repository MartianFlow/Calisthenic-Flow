// Gráficas SVG ligeras (una sola serie): barras semanales y línea de progreso.
// Tocar una barra o punto muestra su valor en la línea de detalle de la gráfica.

import { esc } from './ui.js';

const shortDate = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });

// Rectángulo con las esquinas superiores redondeadas, anclado a la línea base.
function barPath(x, y, w, h, r = 4) {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export function weeklyBars(series, { valueKey = 'minutes', unit = 'min', caption } = {}) {
  const W = 320;
  const H = 150;
  const top = 18;
  const bottom = 24;
  const plotH = H - top - bottom;
  const n = series.length;
  const slot = W / n;
  const barW = Math.min(26, slot - 8);
  const max = Math.max(1, ...series.map((d) => d[valueKey]));
  const lastIdx = n - 1;
  const maxIdx = series.findIndex((d) => d[valueKey] === max);

  const bars = series.map((d, i) => {
    const v = d[valueKey];
    const h = v ? Math.max(3, (v / max) * plotH) : 0;
    const x = i * slot + (slot - barW) / 2;
    const y = top + plotH - h;
    const label = `Semana del ${shortDate.format(new Date(d.weekStart))}: ${d.count} ${d.count === 1 ? 'entreno' : 'entrenos'} · ${d.minutes} min`;
    const showValue = v > 0 && (i === lastIdx || i === maxIdx);
    return `
      <g class="bar-g">
        ${h ? `<path class="mark ${i === lastIdx ? 'current' : ''}" d="${barPath(x, y, barW, h)}"/>` : ''}
        ${showValue ? `<text class="val" x="${x + barW / 2}" y="${y - 5}" text-anchor="middle">${v}</text>` : ''}
        <text class="axis" x="${x + barW / 2}" y="${H - 6}" text-anchor="middle">${shortDate.format(new Date(d.weekStart)).replace('.', '')}</text>
        <rect class="hit" x="${i * slot}" y="0" width="${slot}" height="${H}" data-action="chart-tip" data-tip="${esc(label)}"><title>${esc(label)}</title></rect>
      </g>`;
  }).join('');

  return `
    <figure class="chart">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(caption || 'Gráfica semanal')}">
        <line class="baseline" x1="0" x2="${W}" y1="${top + plotH}" y2="${top + plotH}"/>
        ${bars}
      </svg>
      <figcaption class="chart-tip muted small" data-chart-tip>${esc(caption || '')} · toca una barra para ver el detalle</figcaption>
    </figure>`;
}

// points: [{ date, value }]; target: valor objetivo (línea discontinua).
export function progressLine(points, { target, unit = 'reps' } = {}) {
  const W = 320;
  const H = 150;
  const left = 8;
  const right = 40;
  const top = 16;
  const bottom = 22;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const max = Math.max(1, target || 0, ...points.map((p) => p.value)) * 1.1;
  const xFor = (i) => left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const yFor = (v) => top + plotH - (v / max) * plotH;

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${xFor(i).toFixed(1)},${yFor(p.value).toFixed(1)}`).join('');
  const last = points[points.length - 1];
  const targetY = target ? yFor(target) : null;

  const dots = points.map((p, i) => {
    const label = `${shortDate.format(new Date(p.date))}: mejor serie ${p.value} ${unit}`;
    return `
      <circle class="dot ${p.value >= target ? 'met' : ''}" cx="${xFor(i)}" cy="${yFor(p.value)}" r="4.5"/>
      <rect class="hit" x="${xFor(i) - 14}" y="0" width="28" height="${H}" data-action="chart-tip" data-tip="${esc(label)}"><title>${esc(label)}</title></rect>`;
  }).join('');

  return `
    <figure class="chart">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mejor serie por sesión">
        <line class="baseline" x1="${left}" x2="${W - right}" y1="${top + plotH}" y2="${top + plotH}"/>
        ${targetY !== null ? `
          <line class="target" x1="${left}" x2="${W - right}" y1="${targetY}" y2="${targetY}"/>
          <text class="axis" x="${W - right + 4}" y="${targetY + 4}">obj. ${target}</text>` : ''}
        <path class="line" d="${line}"/>
        ${dots}
        ${last ? `<text class="val" x="${xFor(points.length - 1)}" y="${yFor(last.value) - 9}" text-anchor="middle">${last.value}</text>` : ''}
        ${points.length ? `
          <text class="axis" x="${left}" y="${H - 5}">${shortDate.format(new Date(points[0].date)).replace('.', '')}</text>
          <text class="axis" x="${W - right}" y="${H - 5}" text-anchor="end">${shortDate.format(new Date(last.date)).replace('.', '')}</text>` : ''}
      </svg>
      <figcaption class="chart-tip muted small" data-chart-tip>Mejor serie de cada sesión en este paso · toca un punto</figcaption>
    </figure>`;
}
