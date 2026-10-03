// ====================================================================
// CUSTOM SERVICE WORKER: Push Notification Handler
// Absensi Digital SMA Informatika Nurul Bayan
// ====================================================================
// This file is injected into the vite-plugin-pwa generated SW via
// the `importScripts` config. It handles background push events
// and notification click routing — even when the app is closed.
// ====================================================================

// Listen for push events from the server (VAPID Web Push)
self.addEventListener('push', (event) => {
  /** @type {any} */
  const data = event.data ? event.data.json() : {};

  const title = data.title || 'SMASTIKA ABSENSI';
  const options = {
    body: data.body || 'Ada pemberitahuan baru dari sekolah.',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/favicon.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'nb-push-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    silent: false,
    timestamp: Date.now(),
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
    },
    actions: [
      {
        action: 'open',
        title: 'Buka Aplikasi',
      },
      {
        action: 'dismiss',
        title: 'Tutup',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click — open the app or focus existing window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    // Try to focus an existing app window first
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (targetUrl !== '/') {
              client.navigate(targetUrl);
            }
            return;
          }
        }
        // If app is not open, open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// Handle push subscription change (browser may rotate keys)
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((newSubscription) => {
        // Re-register the new subscription with our server
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: newSubscription.toJSON(),
          }),
        });
      })
      .catch((err) => {
        console.error('[SW-Push] Failed to re-subscribe after change:', err);
      })
  );
});
