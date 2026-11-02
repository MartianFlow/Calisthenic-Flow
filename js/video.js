// Visor de vídeos de técnica (YouTube, modo de privacidad mejorada).
// El reproductor se abre en una capa propia fuera de la vista principal para que
// no se corte cuando la pantalla del entreno se actualiza (descansos, series…).

import { esc, icon, toast } from './ui.js';
import { update } from './store.js';
import { syncAchievements, ACH_BY_ID } from './game.js';
import { burst } from './fx.js';

const thumb = (id) => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/mqdefault.jpg`;
const watchUrl = (v) => `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}${v.start ? `&t=${v.start}s` : ''}`;
const searchUrl = (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

// Tarjeta compacta con miniatura. Si el paso no tiene vídeo, enlace de búsqueda.
export function videoCard(step, roadmapName = '') {
  const v = step.video;
  if (!v) {
    return `<a class="video-search" href="${searchUrl(step.query || `${step.name} ${roadmapName} calistenia técnica`)}" target="_blank" rel="noopener">
      ${icon('play', 16)} Buscar técnica en YouTube</a>`;
  }
  return `
    <button class="video-card" data-action="video-open" data-id="${esc(v.id)}" data-start="${v.start || 0}"
      data-title="${esc(v.title || '')}" data-name="${esc(step.name)}" aria-label="Ver vídeo de técnica: ${esc(step.name)}">
      <span class="video-card-thumb">
        <img src="${thumb(v.id)}" alt="" loading="lazy" onerror="this.remove()">
        <span class="video-card-play">${icon('play', 18)}</span>
      </span>
      <span class="video-card-text">
        <strong>Ver técnica</strong>
        <span class="t">${esc(v.title || 'Vídeo en YouTube')}</span>
        ${v.lang ? `<span class="lang">${v.lang === 'es' ? 'Español' : v.lang === 'en' ? 'Inglés' : esc(v.lang)}</span>` : ''}
      </span>
    </button>`;
}

export function openVideo({ id, start = 0, title = '', name = '' }) {
  closeVideo();
  const params = new URLSearchParams({ autoplay: '1', playsinline: '1', rel: '0', modestbranding: '1' });
  if (Number(start) > 0) params.set('start', String(start));
  const modal = document.createElement('div');
  modal.className = 'video-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', `Vídeo de técnica: ${name}`);
  modal.innerHTML = `
    <div class="video-modal-backdrop" data-action="video-close"></div>
    <div class="video-modal-panel">
      <div class="row between">
        <span class="eyebrow">Técnica</span>
        <button class="icon-btn" data-action="video-close" aria-label="Cerrar vídeo">${icon('close')}</button>
      </div>
      <h3>${esc(name)}</h3>
      <div class="video-frame">
        <iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params}"
          title="${esc(title || name)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>
      </div>
      <div class="video-meta">
        <span class="t">${esc(title)}</span>
        <a href="${watchUrl({ id, start: Number(start) })}" target="_blank" rel="noopener">Abrir en YouTube ↗</a>
      </div>
      <p class="muted tiny">Necesita conexión a internet. Ver vídeos no envía ninguno de tus datos de entreno.</p>
    </div>`;
  document.body.appendChild(modal);
  document.body.classList.add('modal-open');
}

export function closeVideo() {
  document.querySelectorAll('.video-modal').forEach((m) => m.remove());
  document.body.classList.remove('modal-open');
}

export const actions = {
  'video-open'(el) {
    openVideo({ id: el.dataset.id, start: el.dataset.start, title: el.dataset.title, name: el.dataset.name });
    let fresh = [];
    update((s) => {
      s.game.videosWatched = (s.game.videosWatched || 0) + 1;
      fresh = syncAchievements(s);
    }, { silent: true });
    if (fresh.length) {
      toast(`¡Logro desbloqueado: ${ACH_BY_ID[fresh[0]].name}!`);
      burst(null, { text: '¡LOGRO!', big: true });
    }
  },
  'video-close'() { closeVideo(); },
};
