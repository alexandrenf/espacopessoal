importScripts('https://www.gstatic.com/firebasejs/11.4.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.4.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBec6lEqs4sv6h7JcyeL1LuELZLzknz5u4",
  authDomain: "espacopessoal-6f167.firebaseapp.com",
  projectId: "espacopessoal-6f167",
  storageBucket: "espacopessoal-6f167.firebasestorage.app",
  messagingSenderId: "428339453220",
  appId: "1:428339453220:web:a301151e39b56e77e6a7b1",
  measurementId: "G-YE68R8GDE8"
});
 
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[Firebase SW] Received background message:', payload);
  
  const notificationOptions = {
    title: payload.notification?.title || 'New Notification',
    body: payload.notification?.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'notification-' + Date.now(),
    requireInteraction: true,
    data: payload.data,
    actions: [
      {
        action: 'open_app',
        title: 'Open App'
      }
    ]
  };

  return self.registration.showNotification(notificationOptions.title, notificationOptions)
    .catch(error => console.error('[Firebase SW] Error showing notification:', error));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Firebase SW] Notification clicked:', event);
  event.notification.close();
  
  const targetPath = event.notification.data?.url || '/';
  const urlToOpen = new URL(targetPath, self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  })
  .then((windowClients) => {
    // Check if there is already a window/tab open with the target URL
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      if (client.url === urlToOpen && 'focus' in client) {
        return client.focus();
      }
    }
    // If no window/tab is open, open a new one
    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});
