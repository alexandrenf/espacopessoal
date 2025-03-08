import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { initializeApp, getApps, getApp } from "firebase/app";
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

export type Unsubscribe = () => void;

// Initialize Firebase app
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize messaging with support check
const initializeMessaging = async () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    const isMessagingSupported = await isSupported();
    if (isMessagingSupported) {
      messagingInstance = getMessaging(app);
      return messagingInstance;
    }
  }
  console.log('Messaging not supported in this environment.');
  return null;
};

// Export a function to get messaging instance
export const getMessagingInstance = async (): Promise<Messaging | null> => {
  if (!messagingInstance) {
    await initializeMessaging();
  }
  return messagingInstance;
};

export const messaging = messagingInstance;

// Request notification permission and get FCM token
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted" && messagingInstance) {
      const token = await getToken(messagingInstance, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_FCM_VAPID_KEY,
      });
      return token;
    }
    return null;
  } catch (err) {
    console.error("Error requesting permission:", err);
    return null;
  }
};

export const onMessageListener = async (): Promise<Unsubscribe> => {
  const messaging = await getMessagingInstance();
  
  if (!messaging) {
    console.error('Messaging not initialized; cannot set up listener.');
    return () => {
      console.warn('Attempted to unsubscribe from messaging that was never initialized');
    };
  }

  return new Promise<Unsubscribe>((resolve) => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      
      // Create and show notification immediately without checking title
      const showNotification = async () => {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(
            payload.notification?.title ?? 'New Notification',
            {
              body: payload.notification?.body ?? '',
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: 'notification-' + Date.now(),
              requireInteraction: true,
              data: {
                url: payload.data?.url ?? '/',
                clickAction: payload.data?.clickAction,
                timestamp: Date.now()
              },
              vibrate: [100, 50, 100],
              renotify: true,
              silent: false
            }
          );
        } catch (error) {
          console.error('Error showing notification:', error);
        }
      };

      // Always try to show notification if permission is granted
      if (Notification.permission === 'granted') {
        void showNotification();
      }
    });

    resolve(unsubscribe);
  });
};
