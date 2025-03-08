import { getMessaging, onMessage } from "firebase/messaging";
import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import type { Messaging, MessagePayload } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBec6lEqs4sv6h7JcyeL1LuELZLzknz5u4",
  authDomain: "espacopessoal-6f167.firebaseapp.com",
  projectId: "espacopessoal-6f167",
  storageBucket: "espacopessoal-6f167.firebasestorage.app",
  messagingSenderId: "428339453220",
  appId: "1:428339453220:web:a301151e39b56e77e6a7b1",
  measurementId: "G-YE68R8GDE8"
};

let messagingInstance: Messaging | null = null;

export interface CustomNotificationPayload extends MessagePayload {
  notification?: {
    title: string;
    body: string;
  };
}

/** 
 * A function that unsubscribes from onMessage events.
 */
export type Unsubscribe = () => void;

/** 
 * Initialize the Firebase App and messaging. 
 */
try {
  console.log('Initializing Firebase app...');
  const app: FirebaseApp = initializeApp(firebaseConfig);

  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    console.log('Setting up messaging...');
    messagingInstance = getMessaging(app);
    console.log('Messaging setup complete');
  } else {
    console.log('Messaging not supported in this environment.');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export const messaging = messagingInstance;

/**
 * Set up an onMessage listener that shows notifications immediately.
 * Returns a Promise resolving to an unsubscribe function.
 */
export const onMessageListener = (): Promise<Unsubscribe> => {
  if (!messagingInstance) {
    console.error('Messaging not initialized; cannot set up listener.');
    return Promise.resolve(() => {
      // No-op function when messaging is not initialized
      console.warn('Attempted to unsubscribe from messaging that was never initialized');
    });
  }

  return new Promise<Unsubscribe>((resolve) => {
    // Subscribe to FCM messages.
    const unsubscribe = onMessage(messagingInstance, (payload) => {
      console.log('Message received:', payload);
      // Show the notification right here:
      if (payload.notification?.title) {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: '/favicon.ico',
        });
      }
    });

    // Return the unsubscribe function so callers can clean up.
    resolve(unsubscribe);
  });
};















