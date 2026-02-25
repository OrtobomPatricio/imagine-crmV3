/// <reference lib="webworker" />

const CACHE_NAME = 'crmpro-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.ico',
];

// Caching strategies
const networkFirst = async (request) => {
    const cache = await caches.open(CACHE_NAME);
    try {
        const response = await fetch(request);
        if (response.ok && request.method === 'GET') {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cachedResponse = await cache.match(request);
        return cachedResponse || Response.error();
    }
};

const cacheFirst = async (request) => {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;

    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        return Response.error();
    }
};

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // TRPC API: Network First
    if (url.pathname.startsWith('/api/trpc')) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Static Assets & Images: Cache First
    if (
        url.pathname.startsWith('/assets') ||
        url.pathname.startsWith('/api/uploads') ||
        STATIC_ASSETS.includes(url.pathname)
    ) {
        event.respondWith(cacheFirst(event.request));
        return;
    }

    // Default: Network First
    event.respondWith(networkFirst(event.request));
});
