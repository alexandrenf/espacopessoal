import { api } from "~/trpc/react";
import { requestNotificationPermission, onMessageListener } from "./firebase";
import { useEffect, useState } from "react";

export function useNotifications() {
  const saveToken = api.notifications.updateUserFcmToken.useMutation();
  const createScheduledNotification =
    api.notifications.createScheduledNotification.useMutation();
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const unsubscribePromise = onMessageListener()
      .then((payload) => {
        if (payload.notification?.title) {
          try {
            new Notification(payload.notification.title, {
              body: payload.notification?.body ?? "",
              icon: "/favicon.ico",
              tag: "notification-" + Date.now(),
            });
          } catch (error) {
            console.error("Failed to show notification:", error);
          }
        }
      })
      .catch((err) =>
        console.error("Failed to setup foreground notification handler:", err),
      );

    return () => {
      void unsubscribePromise;
    };
  }, []);

  const initializeNotifications = async () => {
    setIsInitializing(true);
    try {
      if (!("Notification" in window)) {
        throw new Error("This browser does not support notifications");
      }

      const token = await requestNotificationPermission();
      if (!token) {
        throw new Error("Failed to obtain notification token");
      }

      await saveToken.mutateAsync({ fcmToken: token });
      return true;
    } catch (error) {
      console.error("Error initializing notifications:", error);
      return false;
    } finally {
      setIsInitializing(false);
    }
  };

  const notify = async (
    title: string,
    body: string,
    fcmToken: string,
    scheduledFor: Date = new Date(Date.now() + 1000), // Default to 1 second from now for immediate notifications
    url?: string,
  ): Promise<boolean> => {
    setIsSending(true);
    try {
      const result = await createScheduledNotification.mutateAsync({
        title,
        body,
        fcmToken,
        scheduledFor,
        url,
      });
      return !!result;
    } catch (error) {
      console.error("Failed to send notification:", error);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  return {
    initializeNotifications,
    notify,
    isInitializing,
    isSending,
  };
}

export const checkPermissionStatus =
  async (): Promise<NotificationPermission> => {
    if (!("Notification" in window)) {
      return "denied";
    }
    return Notification.permission;
  };
