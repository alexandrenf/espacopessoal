import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyBec6lEqs4sv6h7JcyeL1LuELZLzknz5u4",
  authDomain: "espacopessoal-6f167.firebaseapp.com",
  projectId: "espacopessoal-6f167",
  storageBucket: "espacopessoal-6f167.firebasestorage.app",
  messagingSenderId: "428339453220",
  appId: "1:428339453220:web:a301151e39b56e77e6a7b1",
  measurementId: "G-YE68R8GDE8"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Cloud Messaging
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

export const requestNotificationPermission = async () => {
  try {
    if (!messaging) return null;
    
    // Check if it's iOS
    interface WindowWithMSStream extends Window {
      MSStream?: unknown;
    }
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as WindowWithMSStream).MSStream;
    if (isIOS) {
      throw new Error("iOS_UNSUPPORTED");
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      });
      return token;
    }
    return null;
  } catch (error) {
    if ((error as Error).message === "iOS_UNSUPPORTED") {
      throw error;
    }
    console.error('Notification permission error:', error);
    return null;
  }
};

export const onMessageListener = () => {
  if (!messaging) return Promise.reject(new Error('Messaging not initialized'));

  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
};

export { app, messaging };
