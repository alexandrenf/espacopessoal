import { api } from "~/trpc/react";
import { messaging as messagingInstance, requestNotificationPermission, onMessageListener } from "./firebase";
import { useEffect } from "react";
import { useSession } from "next-auth/react";

// Add explicit type imports
type NotificationPermission = "granted" | "denied" | "default";

interface NotificationResponse {
  success: boolean;
  result?: { success: boolean; messageId: string };
  error?: string;
}

interface NotificationPayload {
  notification?: {
    title?: string;
    body?: string;
  };
}

type Unsubscribe = () => void;

export function useNotifications() {
  const saveToken = api.notifications.saveToken.useMutation();
  const sendNotification = api.notifications.sendNotification.useMutation();
  const { data: session } = useSession();

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    const setupNotifications = async () => {
      try {
        const handleMessage = (payload: NotificationPayload) => {
          if (payload.notification?.title) {
            new Notification(payload.notification.title, {
              body: payload.notification?.body ?? '',
              icon: '/favicon.ico',
              tag: 'notification-' + Date.now(),
            });
          }
        };

        const messageListener = await onMessageListener();
        if (messageListener) {
          unsubscribe = messageListener;
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error setting up message listener:', err);
        }
      }
    };

    void setupNotifications();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      console.log('Starting notification initialization...');
      
      const messaging = messagingInstance;
      if (!messaging) {
        console.error('Firebase messaging not initialized:', { 
          messagingInstance, 
          'window.firebase': 'firebase' in window 
        });
        return false;
      }

      if (!('Notification' in window)) {
        console.error('Browser does not support notifications:', {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        });
        return false;
      }

      console.log('Requesting notification permission...');
      const token = await requestNotificationPermission();
      console.log('Permission request result:', { 
        token: token ? 'Received' : 'Not received',
        permission: Notification.permission 
      });
      
      if (!token) {
        console.error('Failed to get FCM token:', { 
          permission: Notification.permission,
          messaging: !!messaging
        });
        return false;
      }

      console.log('Saving token to database...');
      await saveToken.mutateAsync({ token });
      console.log('Token saved successfully');
      
      return true;
    } catch (error) {
      console.error('Detailed initialization error:', {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        permission: 'Notification' in window ? Notification.permission : 'not supported'
      });
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
    if (!('Notification' in window)) {
      return "unknown";
    }
    return Notification.permission;
  } catch (error) {
    console.error("Error checking notification permission:", error);
    return "unknown";
  }
};
