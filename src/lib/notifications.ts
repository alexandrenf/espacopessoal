import { api } from "~/trpc/react";
import { requestNotificationPermission, onMessageListener } from "./firebase";
import { useEffect, useState } from "react";

export function useNotifications() {
  const utils = api.useUtils();
  const saveToken = api.notifications.saveToken.useMutation();
  const sendNotification = api.notifications.sendNotification.useMutation();
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSending, setIsSending] = useState(false);

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
    setIsInitializing(true);
    try {
      if (!('Notification' in window)) {
        throw new Error('This browser does not support notifications');
      }

      const token = await requestNotificationPermission();
      if (!token) {
        throw new Error('Failed to obtain notification token');
      }

      await saveToken.mutateAsync({ token });
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    } finally {
      setIsInitializing(false);
    }
  };

  const notify = async (
    userId: string,
    title: string,
    body: string,
    scheduledFor?: Date
  ): Promise<boolean> => {
    setIsSending(true);
    try {
      const result = await sendNotification.mutateAsync({
        userId,
        title,
        body,
        scheduledFor,
      });
      return result.success;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  return {
    initializeNotifications,
    notify,
    isInitializing,
    isSending
  };
}

export const checkPermissionStatus = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
};
