self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('Service Worker: Failed to parse push data as JSON', e);
    // Fallback to text if JSON parsing fails
    try {
      const text = event.data ? event.data.text() : '';
      data = { body: text };
    } catch (e2) {
      console.error('Service Worker: Failed to get push data as text', e2);
    }
  }
  
  const title = data.title || 'Task Reminder';
  const options = {
    body: data.body || 'You have a task due soon!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
