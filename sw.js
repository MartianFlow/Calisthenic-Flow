// Service worker: guarda la app en caché para que funcione sin conexión.
// Estrategia: responde desde caché y actualiza en segundo plano
// (los cambios publicados se ven la siguiente vez que abras la app).

const VERSION = 'cf-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/router.js',
  './js/store.js',
  './js/logic.js',
  './js/ui.js',
  './js/charts.js',
  './js/device.js',
  './js/data/roadmaps.js',
  './js/views/home.js',
  './js/views/session.js',
  './js/views/roadmaps.js',
  './js/views/progress.js',
  './js/views/settings.js',
  './js/views/calendar.js',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
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

  const network = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        const cache = await caches.open(VERSION);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  event.waitUntil(network);

  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const response = await network;
    if (response) return response;
    if (request.mode === 'navigate') return (await caches.match('./index.html')) || Response.error();
    return Response.error();
  })());
});
