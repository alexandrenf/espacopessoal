import { getApp, getApps, initializeApp } from "firebase/app";
import { 
  getMessaging, 
  getToken, 
  isSupported, 
  onMessage, 
  type MessagePayload 
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBec6lEqs4sv6h7JcyeL1LuELZLzknz5u4",
  authDomain: "espacopessoal-6f167.firebaseapp.com",
  projectId: "espacopessoal-6f167",
  storageBucket: "espacopessoal-6f167.firebasestorage.app",
  messagingSenderId: "428339453220",
  appId: "1:428339453220:web:a301151e39b56e77e6a7b1",
  measurementId: "G-YE68R8GDE8",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const messaging = async () => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.log('Firebase messaging is not supported');
      return null;
    }
    return getMessaging(app);
  } catch (error) {
    console.error('Error initializing messaging:', error);
    return null;
  }
};

export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const permission = await Notification.requestPermission();
    console.log('Notification permission status:', permission);
    
    if (permission === "granted") {
      const fcmMessaging = await messaging();
      if (fcmMessaging) {
        const token = await getToken(fcmMessaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_FCM_VAPID_KEY,
        });
        console.log('FCM Token obtained:', token);
        return token;
      }
    }
    return null;
  } catch (err) {
    console.error("Error requesting notification permission:", err);
    return null;
  }
};

export const onMessageListener = () => {
  return new Promise<MessagePayload>((resolve, reject) => {
    const handleMessage = async () => {
      try {
        const messagingInstance = await messaging();
        if (messagingInstance) {
          onMessage(messagingInstance, (payload) => {
            console.log('Foreground message received:', payload);
            resolve(payload);
          });
        } else {
          reject(new Error('Firebase Cloud Messaging is not supported'));
        }
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to initialize messaging'));
      }
    };
    void handleMessage().catch((error) => {
      console.error('Error setting up message listener:', error);
      reject(error instanceof Error ? error : new Error('Unknown error occurred'));
    });
  });
};

export { app, messaging };
