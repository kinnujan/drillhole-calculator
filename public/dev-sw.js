// This is a development-only service worker that immediately unregisters itself
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.registration.unregister()
    .then(() => {
      // Optionally reload all windows after unregistering
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.navigate(client.url));
      });
    });
});
