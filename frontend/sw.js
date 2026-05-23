/**
 * DTL Management System – Service Worker
 * Caches the app shell for offline use.
 */

const CACHE_NAME = 'dtl-v5';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── Install: cache the app shell ────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ───────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API and JS, cache-first for other shell ─────────
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Always go to network for API calls
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Network-first for JS files — ensures code updates are immediate
  if (url.pathname.startsWith('/js/') || url.pathname === '/sw.js') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for other shell assets (HTML, manifest, icons)
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;

      return fetch(e.request)
        .then((res) => {
          if (e.request.method === 'GET' && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => {
          if (e.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});
