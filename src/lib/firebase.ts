import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import type { Messaging } from "firebase/messaging";

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
