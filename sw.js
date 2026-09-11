const CACHE_NAME = 'drill-hole-orientation-calculator-v16';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/main.js',
  '/measurements.js',
  '/ui.js',
  '/storage.js',
  '/settings.js',
  '/utils.js',
  '/constants.js',
  '/csv_import.js',
  '/errorService.js',
  '/logger.js',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// How long to wait for the network before falling back to the cached copy.
// Field use means patchy coverage, so a slow connection must not leave the app
// hanging on a blank screen when a perfectly good cached copy is on the device.
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (new URL(request.url).origin === self.location.origin) {
    event.respondWith(fromNetworkThenCache(request));
  } else {
    // Third party assets (the Font Awesome icon font) are requested from a
    // version pinned URL, so the cached copy is never stale. Serving it from
    // the cache first is what keeps the icon-only buttons legible offline.
    event.respondWith(fromCacheThenNetwork(request));
  }
});

async function fromNetworkThenCache(request) {
  const networkFetch = fetch(request);

  // Cache whatever eventually arrives, even after we have given up waiting on
  // it. Otherwise a connection slower than the timeout would download the whole
  // app on every launch and never manage to refresh the cache with any of it.
  networkFetch.then((response) => {
    if (response && response.ok && response.type === 'basic') {
      const responseToCache = response.clone();
      caches.open(CACHE_NAME)
        .then((cache) => cache.put(request, responseToCache))
        .catch(() => { /* a full cache must not break the response */ });
    }
  }).catch(() => { /* handled below */ });

  try {
    const response = await withTimeout(networkFetch, NETWORK_TIMEOUT_MS);
    if (response && response.ok) return response;

    // fetch() only rejects on a network failure, so a 500 from a half finished
    // deploy arrives here as a perfectly valid response object. Handing that to
    // the page would blank the app while a working copy sits in the cache.
    const cached = await caches.match(request);
    return cached || response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.mode === 'navigate') {
      const shell = await caches.match('/index.html');
      if (shell) return shell;
    }

    return new Response('Offline, and this file is not in the cache', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({ 'Content-Type': 'text/plain' })
    });
  }
}

async function fromCacheThenNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // A cross origin response with no CORS headers is opaque: status reads 0 and
    // the body cannot be inspected, but it can still be cached and replayed.
    if (response && (response.ok || response.type === 'opaque')) {
      const responseToCache = response.clone();
      caches.open(CACHE_NAME)
        .then((cache) => cache.put(request, responseToCache))
        .catch(() => { });
    }
    return response;
  } catch (err) {
    return new Response('', { status: 504, statusText: 'Gateway Timeout' });
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('network timeout')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
