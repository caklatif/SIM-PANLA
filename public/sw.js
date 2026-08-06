// SIM-PANLA Progressive Web App Service Worker
const CACHE_NAME = 'sim-panla-cache-v2'; // Naikkan versi cache
const STATIC_ASSETS = [
  '/',
  // '/index.html', -> HAPUS baris ini jika Anda menggunakan Next.js. Biarkan jika menggunakan React murni/Vite.
  '/manifest.json',
  '/favicon.ico',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon-180x180.png',
  '/icon.png'
];

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Menggunakan pendekatan yang lebih aman: cache file satu per satu agar jika ada 1 yang gagal (404), yang lain tetap masuk cache.
      return Promise.allSettled(
        STATIC_ASSETS.map(asset => cache.add(asset).catch(err => console.warn(`[PWA SW] Failed to cache ${asset}:`, err)))
      );
    })
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[PWA SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (!url.protocol.startsWith('http')) return;

  // Navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Sesuaikan dengan framework. Jatuh kembali ke '/' alih-alih '/index.html' untuk kompabilitas Vercel.
          return caches.match('/') || caches.match('/index.html') || caches.match(event.request);
        })
    );
    return;
  }

  // Static Assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && url.origin === self.location.origin) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {}); 
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && url.origin === self.location.origin) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      }).catch((err) => {
        console.warn('[PWA SW] Fetch failed for:', event.request.url);
        return new Response('Anda sedang offline dan aset ini belum tersimpan.', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});