import { api } from "~/trpc/react";
import { messaging as messagingInstance, requestNotificationPermission } from "./firebase";

export function useNotifications() {
  const saveToken = api.notifications.saveToken.useMutation();
  const sendNotification = api.notifications.sendNotification.useMutation();

  const initializeNotifications = async () => {
    try {
      const messaging = messagingInstance;
      if (!messaging) return false;

      // Check if it's iOS
      interface WindowWithMSStream extends Window {
        MSStream?: unknown;
      }
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as WindowWithMSStream).MSStream;
      if (isIOS) {
        throw new Error("iOS_UNSUPPORTED");
      }

      const token = await requestNotificationPermission();
      if (!token) return false;

      await saveToken.mutateAsync({ token });
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
      await sendNotification.mutateAsync({ userId, title, body });
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
