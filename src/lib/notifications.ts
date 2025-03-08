import { api } from "~/trpc/react";
import { messaging as messagingInstance, requestNotificationPermission, onMessageListener } from "./firebase";
import { useEffect } from "react";

export function useNotifications() {
  const saveToken = api.notifications.saveToken.useMutation();
  const sendNotification = api.notifications.sendNotification.useMutation();

  useEffect(() => {
    const unsubscribePromise = onMessageListener()
      .then((payload) => {
        if (payload.notification?.title) {
          try {
            new Notification(payload.notification.title, {
              body: payload.notification?.body ?? '',
              icon: '/favicon.ico',
              tag: 'notification-' + Date.now(),
            });
          } catch (error) {
            console.error('Failed to show notification:', error);
          }
        }
      })
      .catch(err => console.error('Failed to setup foreground notification handler:', err));

    return () => {
      void unsubscribePromise;
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        throw new Error('This browser does not support notifications');
      }

      // Request permission and get token
      const token = await requestNotificationPermission();
      if (!token) {
        throw new Error('Failed to obtain notification token');
      }

      // Save token to backend
      await saveToken.mutateAsync({ token });
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  };

  const notify = async (userId: string, title: string, body: string) => {
    try {
      const result = await sendNotification.mutateAsync({ userId, title, body });
      return result.success;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error; // Let the caller handle the error
    }
  };

  return {
    initializeNotifications,
    notify,
    isInitializing: saveToken.isPending,
    isSending: sendNotification.isPending,
  };
}

export const checkPermissionStatus = async (): Promise<NotificationPermission | "unknown"> => {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      return "unknown";
    }
    return Notification.permission;
  } catch (error) {
    console.error("Error checking notification permission:", error);
    return "unknown";
  }
};
