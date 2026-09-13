// Self-destroying Dev Service Worker
self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    self.registration.unregister()
      .then(function() {
        return self.clients.claim();
      })
      .then(function() {
        if ('caches' in self) {
          return self.caches.keys().then(function(keys) {
            return Promise.all(keys.map(function(k) { return self.caches.delete(k); }));
          });
        }
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});
