const CACHE_NAME = 'giving-tree-v26';
const STATIC_CACHE = 'giving-tree-static-v26';
const API_CACHE = 'giving-tree-api-v26';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/items.html',
  '/my-items.html',
  '/post-item.html',
  '/profile.html',
  '/requests.html',
  '/login.html',
  '/register.html',
  '/logout.html',
  '/manifest.json',
  '/assets/style/variables.css',
  '/assets/style/base.css',
  '/assets/style/navbar.css',
  '/assets/style/footer.css',
  '/assets/style/buttons.css',
  '/assets/style/cards.css',
  '/assets/style/ui.css',
  '/assets/style/pages.css',
  '/assets/style/animations.css',
  '/assets/vendor/leaflet/leaflet.css',
  '/assets/vendor/leaflet/leaflet.js',
  '/assets/js/utils.js',
  '/assets/js/location-picker.js',
  '/assets/js/navbar-auth.js',
  '/assets/js/notifications.js',
  '/assets/js/animations.js'
];

const API_ROUTES = [
  '/api/user',
  '/api/stats',
  '/api/items/recent',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // Add assets safely, catching individual failures so service worker always succeeds
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn('SW cache add skipped:', asset, e.message);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== API_CACHE && key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

async function fetchWithTimeout(request, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(request, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  const isApiRequest = url.pathname.startsWith('/api/');
  const isStaticAsset = STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.startsWith(asset.replace('*', '')));

  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/' || isApiRequest) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  if (isStaticAsset || url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.ico') || url.pathname.endsWith('.woff2')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  event.respondWith(networkFirstStrategy(request));
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetchWithTimeout(request).then((networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

async function networkFirstStrategy(request) {
  const cache = await caches.open(API_CACHE);

  try {
    const networkResponse = await fetchWithTimeout(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/assets/icon-192.png',
    badge: '/assets/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(event.notification.data.url);
    })
  );
});
