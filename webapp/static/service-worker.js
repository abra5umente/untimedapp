/* Basic app-shell service worker for untimed.app */
const CACHE_VERSION = 'v1.0.0';
const APP_CACHE = `untimed-cache-${CACHE_VERSION}`;

// Core assets to precache (app shell)
const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/static/index.html', // in case it’s navigated directly
  '/static/app.css',
  '/static/app.js',
  '/static/widgets/ClockWidget.js',
  '/static/icons/favicon-32x32.png',
  '/static/icons/android-chrome-192x192.png',
  '/static/icons/android-chrome-512x512.png'
  ,'/static/icons/untimed_maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('untimed-cache-') && k !== APP_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Runtime cache strategies
// - HTML navigations: network-first, fallback to cache (offline)
// - Static assets (same-origin CSS/JS/ICO): cache-first
// - CDN (cross-origin) assets: stale-while-revalidate when possible
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== 'GET') return;

  // HTML navigations
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(APP_CACHE).then((cache) => cache.put('/', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('/'))
    );
    return;
  }

  // Same-origin static assets
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/static/') || url.pathname.endsWith('.ico')) {
      event.respondWith(
        caches.match(req).then((hit) => hit || fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(APP_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        }))
      );
      return;
    }
  }

  // Cross-origin (e.g., CDN) — stale-while-revalidate
  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(APP_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
