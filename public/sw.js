// public/sw.js
// Service Worker minimalista con fetch handler para cumplir con la instalabilidad PWA en Android/iOS

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// El fetch event handler es requerido por Chrome para habilitar la instalación nativa.
// IMPORTANTE: No interceptamos peticiones de navegación (type === 'navigate') para evitar
// errores de red en rutas dinámicas de Next.js (SSR). Solo se delegan recursos estáticos.
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones de navegación (páginas): Next.js SSR las maneja directamente
  if (event.request.mode === 'navigate') {
    return;
  }
  // Para recursos estáticos: pass-through sin caché
  event.respondWith(
    fetch(event.request).catch(() => {
      // Si el recurso no está disponible online, simplemente falla silenciosamente
      return new Response('', { status: 503, statusText: 'Offline' });
    })
  );
});
