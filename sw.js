const CACHE_NAME = "splitmate-cache-v2";

const urlsToCache = [
  "./index.html",
  "./landing.css",
  "./landing.js",
  "./manifest.json",
  "./app/app.html",
  "./app/app.css",
  "./app/app.js",
  "./app/router.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});