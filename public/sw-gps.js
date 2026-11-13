// Service Worker para Supervisor de Ruta - Global Rec
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Mantener activo el Service Worker en segundo plano
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PING') {
    // Mantener hilo vivo
  }
});

