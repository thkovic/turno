const CACHE_NAME = "historico-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/sw.js",
  "/style.css",
  "/script.js"
];

// Instala o service worker e adiciona arquivos ao cache
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Ativa e limpa caches antigos
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
});

// Intercepta requisições e serve do cache
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
