// public/sw.js
// Service Worker minimalista con fetch handler para cumplir con la instalabilidad PWA en Android/iOS

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// El fetch event handler es requerido por Chrome para habilitar la instalación nativa.
// IMPORTANTE: No llamamos a event.respondWith(). Esto delega todo el tráfico de red de forma 100%
// nativa al navegador, evitando violar directivas de CSP para conexiones directas (connect-src)
// en fuentes externas y asegurando el correcto funcionamiento del routing de Next.js.
self.addEventListener('fetch', (event) => {
  // Pass-through nativo por defecto
});
