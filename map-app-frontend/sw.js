const OFFLINE_CACHE_NAME = "explorer-core-v1";
const ASSETS_TO_CACHE = [
    "./",
    "./index.html",
    "./app.js",
    "./manifest.json",
    "https://unpkg.com",
    "https://unpkg.com"
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(OFFLINE_CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse; 
            }
            return fetch(event.request).catch(() => {
                console.warn("Asset request mapping unreachable offline:", event.request.url);
            });
        })
    );
});
