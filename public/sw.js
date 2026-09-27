const VERSION = 'gg-v3';
const STATIC = `${VERSION}-static`;
const ASSETS = `${VERSION}-assets`;
const MEDIA = `${VERSION}-media`;
const OFFLINE = '/offline.html';
const PRECACHE = [OFFLINE, '/favicon.svg', '/icon-192.png', '/images/brand/gleangrid-mark.webp'];
const MEDIA_LIMIT = 120;

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(STATIC)
            .then((c) => c.addAll(PRECACHE))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
            if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
            await self.clients.claim();
        })(),
    );
});

async function trim(cacheName, max) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const hit = await cache.match(request);
    if (hit) return hit;
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
}

async function staleWhileRevalidate(event, cacheName) {
    const cache = await caches.open(cacheName);
    const hit = await cache.match(event.request);
    const network = fetch(event.request)
        .then((res) => {
            if (res.ok || res.type === 'opaque') {
                cache.put(event.request, res.clone()).then(() => trim(cacheName, MEDIA_LIMIT));
            }
            return res;
        })
        .catch(() => hit);
    if (hit) {
        event.waitUntil(network);
        return hit;
    }
    return network;
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    if (request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                try {
                    return (await event.preloadResponse) || (await fetch(request));
                } catch {
                    return (await caches.match(OFFLINE)) || Response.error();
                }
            })(),
        );
        return;
    }

    if (request.headers.get('X-Inertia')) return;

    if (url.origin === self.location.origin) {
        if (url.pathname.startsWith('/build/assets/') || url.pathname.startsWith('/fonts/')) {
            event.respondWith(cacheFirst(request, ASSETS));
        } else if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/storage/') || /\.(png|webp|svg|ico)$/.test(url.pathname)) {
            event.respondWith(staleWhileRevalidate(event, MEDIA));
        }
        return;
    }

    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        event.respondWith(staleWhileRevalidate(event, MEDIA));
    }
});

self.addEventListener('message', (event) => {
    if (event.data === 'skip-waiting') self.skipWaiting();
});
