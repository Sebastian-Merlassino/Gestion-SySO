// public/sw.js
// Service Worker minimalista con fetch handler para cumplir con la instalabilidad PWA en Android/iOS

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// El fetch event handler es requerido por Chrome para habilitar la instalación nativa
self.addEventListener('fetch', (event) => {
  // Pass-through: delega la petición directamente a la red sin caché
  event.respondWith(fetch(event.request));
});
