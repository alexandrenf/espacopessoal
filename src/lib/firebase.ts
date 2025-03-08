import { getMessaging, getToken, onMessage } from "firebase/messaging";
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

interface WindowWithMSStream extends Window {
  MSStream?: boolean;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

const isIOSPWA = () => {
  if (typeof window === 'undefined') return false;
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                !(window as WindowWithMSStream).MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as NavigatorWithStandalone).standalone === true;
  
  return isIOS && isStandalone;
};

try {
  console.log('Initializing Firebase app...');
  const app: FirebaseApp = initializeApp(firebaseConfig);
  
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    const ios = isIOSPWA();
    console.log('Environment check:', {
      isIOSPWA: ios,
      userAgent: navigator.userAgent,
      hasServiceWorker: 'serviceWorker' in navigator
    });

    // Initialize messaging for all platforms
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
    
    // First, request basic notification permission
    const permission = await Notification.requestPermission();
    console.log('Permission request result:', permission);

    if (permission !== 'granted') {
      console.log('Permission not granted:', permission);
      return null;
    }

    // If we're on iOS PWA, return a special token
    if (isIOSPWA()) {
      console.log('iOS PWA detected, using alternative notification method');
      return 'ios-pwa-' + Date.now();
    }

    // For all other platforms, use Firebase messaging
    if (!messagingInstance) {
      console.error('Messaging not initialized');
      return null;
    }

    console.log('Getting FCM token...');
    const token = await getToken(messagingInstance, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    });
    console.log('FCM token received:', !!token);
    return token;
  } catch (error) {
    console.error('Permission request error:', error);
    return null;
  }
};

interface CustomNotificationPayload extends MessagePayload {
  notification?: {
    title: string;
    body: string;
  };
}

export const onMessageListener = () => {
  if (!messagingInstance) {
    // For iOS PWA, return a simple notification handler
    if (isIOSPWA()) {
      return Promise.resolve((payload: CustomNotificationPayload) => {
        if (payload.notification) {
          new Notification(payload.notification.title, {
            body: payload.notification.body,
            icon: '/favicon.ico'
          });
        }
      });
    }
    
    console.error('Messaging not initialized for listener');
    return Promise.reject(new Error('Messaging not initialized'));
  }

  return onMessage(messagingInstance, (payload) => {
    console.log('Message received:', payload);
  });
};
