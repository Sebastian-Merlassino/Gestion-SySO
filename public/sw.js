// public/sw.js
// Service Worker minimalista con fetch handler para cumplir con la instalabilidad PWA en Android/iOS

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// El Service Worker se limita a inicializar y activar para cumplir con la instalabilidad PWA,
// delegando toda la resolución de red de forma 100% nativa al navegador.
