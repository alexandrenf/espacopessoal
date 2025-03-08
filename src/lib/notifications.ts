import { api } from "~/trpc/react";
import { messaging as messagingInstance, requestNotificationPermission, onMessageListener } from "./firebase";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

interface NotificationResponse {
  success: boolean;
  result?: { success: boolean; messageId: string };
  error?: string;
}

export function useNotifications() {
  const saveToken = api.notifications.saveToken.useMutation();
  const sendNotification = api.notifications.sendNotification.useMutation();
  const { data: session } = useSession();

  useEffect(() => {
    const unsubscribePromise = onMessageListener()
      .then((payload) => {
        if (payload.notification?.title) {
          new Notification(payload.notification.title, {
            body: payload.notification?.body ?? '',
            icon: '/favicon.ico',
            tag: 'notification-' + Date.now(),
          });
        }
      })
      .catch(err => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to setup foreground notification handler:', err);
        }
      });

    return () => {
      void unsubscribePromise.then(() => {
        return () => {
          // Cleanup will be handled by the effect's return function
        };
      });
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      const messaging = messagingInstance;
      if (!messaging) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Firebase messaging not initialized');
        }
        return false;
      }

      if (!('Notification' in window)) {
        if (process.env.NODE_ENV === 'development') {
          console.error('This browser does not support notifications');
        }
        return false;
      }

      const token = await requestNotificationPermission();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('FCM Token:', token);
      }

      if (!token) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to get FCM token');
        }
        return false;
      }

      await saveToken.mutateAsync({ token });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Token saved successfully');
      }
      
      return true;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to initialize notifications:', error);
      }
      return false;
    }
  };

  const notify = async (title: string, body: string): Promise<NotificationResponse> => {
    try {
      if (!session?.user?.id) {
        return {
          success: false,
          error: "User must be logged in to send notifications"
        };
      }

      const result = await sendNotification.mutateAsync({ 
        userId: session.user.id,
        title, 
        body 
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Notification sent:', result);
      }
      
      return {
        success: true,
        result
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send notification:', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      };
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
