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
  if (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    window.workbox !== undefined
  ) {
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

    // Force the waiting service worker to become the active service worker
    wb.messageSkipWaiting();
    wb.register();
  }
}
