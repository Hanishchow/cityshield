/**
 * Service worker.
 *
 * Strategy is chosen per request type, because the wrong one here is dangerous:
 *
 *  - The APP SHELL is cache-first. It must open on a dead connection; that is
 *    the entire reason this is a PWA rather than a website.
 *  - API calls are NETWORK-ONLY. Never serve a cached incident: showing someone
 *    a stale "ambulance en route" for an incident that was cancelled is worse
 *    than showing nothing at all.
 *  - Map tiles are cache-first with a cap, since they are immutable per URL.
 */

const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const TILES = `tiles-${VERSION}`;
const TILE_LIMIT = 260;

self.addEventListener('install', (e) => {
  /* Only the entry document is precached. Vite fingerprints its assets, so
     listing them here would go stale on the next build. */
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['./', './index.html'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /* Anything that reports live state is never served from cache. */
  if (url.pathname.includes('/v1/') || url.pathname === '/health') return;

  if (url.hostname.endsWith('maptiler.com') || url.hostname.endsWith('mappls.com')) {
    event.respondWith(
      caches.open(TILES).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) {
          cache.put(request, res.clone());
          trimCache(TILES, TILE_LIMIT);
        }
        return res;
      }),
    );
    return;
  }

  /* Navigations: network first so a deployed update is picked up, falling back
     to the cached shell when offline. */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html', { ignoreSearch: true })),
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((res) => {
            if (res.ok) caches.open(SHELL).then((c) => c.put(request, res.clone()));
            return res;
          }),
      ),
    );
  }
});
