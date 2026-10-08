const CACHE_NAME = "smartcampus-shell-v1";
const APP_SHELL = "/";

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.add(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key.startsWith("smartcampus-shell-") && key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("message", (event) => {
    if (event.data?.type !== "CACHE_APP_ASSETS" || !Array.isArray(event.data.assets)) return;
    const assets = event.data.assets.filter((asset) => {
        try {
            const url = new URL(asset);
            return url.origin === self.location.origin && url.pathname !== "/sw.js";
        } catch {
            return false;
        }
    });
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => Promise.all(
            assets.map((asset) => cache.add(asset).catch((error) => {
                console.warn("Could not cache SmartCampus app asset:", asset, error);
            }))
        ))
    );
});

self.addEventListener("fetch", (event) => {
    const { request } = event;
    const requestUrl = new URL(request.url);
    if (request.method !== "GET" || requestUrl.origin !== self.location.origin ||
        requestUrl.pathname.startsWith("/api/")) return;

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request).then((response) => {
                if (response.ok) {
                    event.waitUntil(
                        caches.open(CACHE_NAME)
                            .then((cache) => cache.put(APP_SHELL, response.clone()))
                    );
                }
                return response;
            }).catch(async () => (await caches.match(APP_SHELL)) || Response.error())
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
                if (response.ok) {
                    const copy = response.clone();
                    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
                }
                return response;
            });
        })
    );
});
