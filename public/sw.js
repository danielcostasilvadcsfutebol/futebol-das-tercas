// ============================================================
// Service Worker - Futebol das Terças
// Handles: Push Notifications + Cache offline básico
// ============================================================

const CACHE_NAME = 'futbol-tercas-v1';

// ---- Instalação: faz cache das páginas principais ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/', '/jogos', '/jogadores', '/titulos']);
    })
  );
  self.skipWaiting();
});

// ---- Activação: limpa caches antigos ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ---- Fetch: serve cache quando offline ----
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ---- PUSH: recebe a notificação e mostra-a ----
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || 'Nova atualização!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Futebol das Terças', options)
  );
});

// ---- Click na notificação: abre a app ----
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
