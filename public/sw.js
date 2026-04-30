// Service worker for Web Push notifications (agent secret page).
// Registered by the React app (E5). Receives push events from the
// NotificationDispatcher (E6) and shows system notifications.

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    let payload;
    try {
        payload = event.data?.json() || {};
    } catch {
        payload = {};
    }

    const title = payload.title || 'Kemerbet';
    const options = {
        body: payload.body || 'You have a new notification.',
        tag: payload.tag,
        data: { url: payload.url || '/' },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes(targetUrl) && 'focus' in client) {
                        return client.focus();
                    }
                }
                return self.clients.openWindow(targetUrl);
            })
    );
});

// TODO: handle pushsubscriptionchange if re-subscription failures become common (v2).
// Requires caching the agent token in SW storage so we can POST to
// /api/agent/{token}/subscribe with the new subscription keys.
