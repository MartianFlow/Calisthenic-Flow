// Service worker: guarda la app en caché para que funcione sin conexión.
// Estrategia: primero la red (siempre la última versión publicada) y, si no hay
// conexión o tarda más de 3 s, la copia guardada. Cada respuesta de la red
// actualiza la copia. VERSION debe coincidir con APP_VERSION de js/version.js.

const VERSION = 'cf-v16';
const NETWORK_TIMEOUT = 3000;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/version.js',
  './js/router.js',
  './js/store.js',
  './js/logic.js',
  './js/ui.js',
  './js/charts.js',
  './js/device.js',
  './js/fx.js',
  './js/video.js',
  './js/game.js',
  './js/avatar.js',
  './js/pixel.js',
  './js/schedule.js',
  './js/theme.js',
  './js/data/roadmaps.js',
  './js/data/videos.js',
  './js/data/legacy.js',
  './js/data/gym.js',
  './js/views/home.js',
  './js/views/session.js',
  './js/views/roadmaps.js',
  './js/views/progress.js',
  './js/views/settings.js',
  './js/views/onboarding.js',
  './js/views/skills.js',
  './js/views/calendar.js',
  './js/views/hero.js',
  './js/views/plan.js',
  './js/views/exercise.js',
  './fonts/bangers-latin.woff2',
  './fonts/press-start-2p-latin.woff2',
  './fonts/vt323-latin.woff2',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// cache: 'reload' evita la caché HTTP del navegador (GitHub Pages la deja 10 min):
// así una versión nueva nunca se instala con archivos de la anterior.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // 'no-cache': pregunta siempre al servidor (si no cambió, responde 304 y es rápido).
  const network = fetch(request, { cache: 'no-cache' })
    .then(async (response) => {
      if (response && response.ok) {
        const cache = await caches.open(VERSION);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  event.waitUntil(network);

  const fromCache = async () => (await caches.match(request, { ignoreSearch: true }))
    || (request.mode === 'navigate' ? caches.match('./index.html') : undefined);

  event.respondWith((async () => {
    const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), NETWORK_TIMEOUT));
    const response = await Promise.race([network, timeout]);
    if (response && response !== 'timeout' && response.ok) return response;
    const cached = await fromCache();
    if (cached) return cached;
    const late = response === 'timeout' ? await network : response;
    return late || Response.error();
  })());
});
