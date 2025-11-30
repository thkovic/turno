// service-worker.js mínimo
self.addEventListener('install', event => {
  console.log('Service Worker instalado');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker ativado');
});

self.addEventListener('fetch', event => {
  // Apenas deixa as requisições seguirem normalmente
  event.respondWith(fetch(event.request));
});
