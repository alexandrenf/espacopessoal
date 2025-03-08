import { api } from "~/trpc/react";
import { messaging as messagingInstance, requestNotificationPermission, onMessageListener } from "./firebase";
import { useEffect } from "react";

export function useNotifications() {
  const saveToken = api.notifications.saveToken.useMutation();
  const sendNotification = api.notifications.sendNotification.useMutation();

  // Add foreground message handler
  useEffect(() => {
    const unsubscribePromise = onMessageListener()
      .then((payload) => {
        // Show notification even when app is in foreground
        if (payload.notification?.title) {
          new Notification(payload.notification.title, {
            body: payload.notification?.body ?? '',
            icon: '/favicon.ico',
            tag: 'notification-' + Date.now(),
          });
        }
      })
      .catch(err => console.error('Failed to setup foreground notification handler:', err));

    return () => {
      // Handle cleanup without trying to call the promise
      void unsubscribePromise;
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      const messaging = messagingInstance;
      if (!messaging) {
        console.error('Firebase messaging not initialized');
        return false;
      }

      // Check if it's iOS
      interface WindowWithMSStream extends Window {
        MSStream?: unknown;
      }
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as WindowWithMSStream).MSStream;
      if (isIOS) {
        throw new Error("iOS_UNSUPPORTED");
      }

      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.error('This browser does not support notifications');
        return false;
      }

      // Request permission and get token
      const token = await requestNotificationPermission();
      console.log('FCM Token:', token); // Debug log

      if (!token) {
        console.error('Failed to get FCM token');
        return false;
      }

      // Save token to database
      await saveToken.mutateAsync({ token });
      console.log('Token saved successfully');
      return true;
    } catch (error) {
      if ((error as Error).message === "iOS_UNSUPPORTED") {
        throw error;
      }
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  };

  const notify = async (userId: string, title: string, body: string) => {
    try {
      const result = await sendNotification.mutateAsync({ userId, title, body });
      console.log('Notification sent:', result);
      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  };

  return {
    initializeNotifications,
    notify,
    isInitializing: saveToken.isPending,
    isSending: sendNotification.isPending,
  };
}
