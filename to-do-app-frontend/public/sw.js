// Minimal Web Push service worker for Orvia's iPhone/PWA task reminders.
// No caching/offline-asset strategy is implemented here — the RN web app
// already has its own offline-first data layer (AsyncStorage cache +
// writeQueue.js); this worker's only job is push delivery + notification
// click handling.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Payload shape sent by the backend scheduler (scheduler.js):
// { type: "task_reminder", taskId, title }
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || 'Task reminder';
  const options = {
    body: 'Tap to open',
    icon: '/apple-touch-icon.png',
    badge: '/apple-touch-icon.png',
    data: { taskId: data.taskId, type: data.type },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// On tap: focus an already-open tab and hand it the taskId via postMessage,
// or open a new tab with the id in the query string so App.js can pick it up
// on load (App.js handles both cases — see its `handleReminderTaskId`).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const taskId = event.notification.data && event.notification.data.taskId;
  const targetUrl = taskId ? `/?reminderTaskId=${taskId}` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.postMessage({ type: 'reminder-notification-click', taskId });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});

// The push service can invalidate/rotate a subscription at any time; when it
// does, the browser fires this event so we can transparently re-subscribe
// and re-register with the backend instead of silently going dark.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        client.postMessage({ type: 'reminder-pushsubscriptionchange' });
      }
    }),
  );
});
