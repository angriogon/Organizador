const CACHE_NAME = 'opi-v3.1.3-shell-1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=3.1.3',
  './app.js?v=3.1.3',
  './config.js?v=3.1.3',
  './manifest.webmanifest?v=3.1.3',
  './browserconfig.xml',
  './favicon-v313.ico',
  './favicon.ico',
  './favicon-32.png',
  './apple-touch-icon.png',
  './icons/favicon-32-v313.png',
  './icons/favicon-64-v313.png',
  './icons/icon-192-v313.png',
  './icons/icon-512-v313.png',
  './icons/icon-192-maskable-v313.png',
  './icons/icon-512-maskable-v313.png',
  './icons/apple-touch-icon-v313.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Los recursos versionados se actualizan primero desde red. Si no hay conexión,
  // usamos caché. Así iconos/CSS/JS no quedan anclados a una versión antigua.
  event.respondWith(
    fetch(request, { cache: 'no-store' })
      .then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
