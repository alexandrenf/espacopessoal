import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import {
  messaging as messagingInstance,
  onMessageListener,
  type Unsubscribe
} from "./firebase";

/** 
 * Notification permission can be 'default' (not yet decided), 'granted', or 'denied'. 
 */
type NotificationPermission = "granted" | "denied" | "default";

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
    let unsubscribe: Unsubscribe | undefined;

    // Setup FCM onMessage listener
    const setupNotifications = async () => {
      try {
        unsubscribe = await onMessageListener();
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error setting up message listener:', err);
        }
      }
    };

    void setupNotifications();

    // Cleanup on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      console.log('Starting notification initialization...');
      
      if (!messagingInstance) {
        console.error('Firebase messaging not initialized.');
        return false;
      }

      if (!('Notification' in window)) {
        console.error('Browser does not support notifications.');
        return false;
      }

      console.log('Requesting notification permission...');
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.error('Notification permission not granted:', permission);
        return false;
      }

      // Optionally, get FCM token if you need it:
      // const token = await getToken(messagingInstance, { vapidKey: '...' });
      // if (token) {
      //   await saveToken.mutateAsync({ token });
      // }

      console.log('Notifications initialized successfully');
      return true;
    } catch (error) {
      console.error('Detailed initialization error:', error);
      return false;
    }
  };

  const notify = async (title: string, body: string): Promise<NotificationResponse> => {
    try {
      if (!session?.user?.id) {
        return { success: false, error: "User must be logged in to send notifications" };
      }

      const result = await sendNotification.mutateAsync({
        userId: session.user.id,
        title,
        body
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('Notification sent:', result);
      }

      return { success: true, result };
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

/**
 * Helper function to check the user’s current notification permission.
 */
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




































