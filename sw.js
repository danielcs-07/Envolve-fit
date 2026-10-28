const VERSION = "evolve-fit-v2-20261028-persistencia";
const STATIC = ["./offline.html", "./app-icon.svg", "./evolve-ui.css", "./style.css"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key =>
      key.startsWith("evolve-fit-") && key !== VERSION
    ).map(key => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        return await caches.match("./offline.html") || Response.error();
      })
    );
    return;
  }

  if (!/\.(?:css|js|mjs|svg|webmanifest)$/.test(url.pathname)) return;

  event.respondWith(
    fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(VERSION).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match(request))
  );
});