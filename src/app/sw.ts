declare global {
  interface Window {
    workbox: {
      addEventListener: (event: string, callback: (event: Event) => void) => void;
      messageSkipWaiting: () => void;
      register: () => void;
    };
  }
}

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;

  // Register Firebase messaging service worker first
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Firebase SW registered:', registration);
      })
      .catch((err) => {
        console.error('Firebase SW registration failed:', err);
      });
  }

  // Then register the PWA service worker
  if ('serviceWorker' in navigator && window.workbox !== undefined) {
    const wb = window.workbox;
    
    // Add event listeners to handle PWA lifecycle
    wb.addEventListener('installed', event => {
      console.log(`Event ${event.type} is triggered.`);
      console.log(event);
    });

    wb.addEventListener('controlling', event => {
      console.log(`Event ${event.type} is triggered.`);
      console.log(event);
    });

    wb.addEventListener('activated', event => {
      console.log(`Event ${event.type} is triggered.`);
      console.log(event);
    });

    // Send skip waiting event to ServiceWorker
    wb.addEventListener('waiting', event => {
      wb.messageSkipWaiting();
    });

    // Register the PWA ServiceWorker
    wb.register();
  }
}
