/**
 * DTL Management System – Service Worker
 * Caches the app shell for offline use.
 */

const CACHE_NAME = 'dtl-v3';
const SHELL = [
  '/',
  '/index.html',
  '/js/api.js',
  '/js/app.js',
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

// ── Fetch: network-first for API, cache-first for shell ─────────────────────
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Always go to network for API calls
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Cache-first for shell assets
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;

      return fetch(e.request)
        .then((res) => {
          // Cache new GET responses for shell assets
          if (e.request.method === 'GET' && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => {
          // Offline fallback: serve index.html for navigation requests
          if (e.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});
