import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import type { Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

let messagingInstance: Messaging | null = null;

try {
  console.log('Initializing Firebase app...');
  const app: FirebaseApp = initializeApp(firebaseConfig);
  
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    console.log('Setting up messaging...');
    messagingInstance = getMessaging(app);
    console.log('Messaging setup complete');
  } else {
    console.log('Messaging not supported:', {
      isWindow: typeof window !== 'undefined',
      hasServiceWorker: 'serviceWorker' in navigator
    });
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export const messaging = messagingInstance;

export const requestNotificationPermission = async () => {
  try {
    console.log('Starting permission request...');
    if (!messagingInstance) {
      console.error('Messaging not initialized');
      return null;
    }

    console.log('Current permission status:', Notification.permission);
    const permission = await Notification.requestPermission();
    console.log('Permission request result:', permission);

    if (permission === 'granted') {
      console.log('Getting FCM token...');
      const token = await getToken(messagingInstance, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      });
      console.log('FCM token received:', !!token);
      return token;
    }
    
    console.log('Permission not granted:', permission);
    return null;
  } catch (error) {
    console.error('Permission request error:', error);
    return null;
  }
};

export const onMessageListener = () => {
  if (!messagingInstance) {
    console.error('Messaging not initialized for listener');
    return Promise.reject(new Error('Messaging not initialized'));
  }
  return onMessage(messagingInstance, (payload) => {
    console.log('Message received:', payload);
  });
};
