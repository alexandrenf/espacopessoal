"use client";

import { useSession } from "next-auth/react";
import { useNotifications, checkPermissionStatus } from "~/lib/notifications";
import { Button } from "~/components/ui/button";
import { Bell, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "~/hooks/use-toast";
import Header from "~/app/components/Header";
import { useState, useEffect } from "react";

export default function TestNotificationsPage() {
  const { data: session } = useSession();
  const { initializeNotifications, notify, isInitializing, isSending } = useNotifications();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | "unknown">("unknown");
  
  useEffect(() => {
    const checkPermission = async () => {
      const status = await checkPermissionStatus();
      setPermissionStatus(status);
    };
    
    void checkPermission();
  }, []);
  
  const getPermissionIcon = () => {
    switch(permissionStatus) {
      case "granted": 
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "denied": 
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "default":
      case "unknown":
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const handleTestNotification = async () => {
    try {
      if (!session?.user?.id) {
        toast({
          title: "Error",
          description: "You must be logged in to test notifications",
          variant: "destructive",
        });
        return;
      }

      const initialized = await initializeNotifications();
      if (!initialized) {
        toast({
          title: "Error",
          description: "Failed to initialize notifications. Please check your browser permissions.",
          variant: "destructive",
        });
        return;
      }

      // Send immediate notification
      await notify(
        session.user.id,
        "Immediate Notification",
        "This notification appears right away! 🚀"
      );

      // Schedule notification for 30 seconds later
      const scheduledTime = new Date(Date.now() + 30 * 1000); // 30 seconds from now
      await notify(
        session.user.id,
        "Scheduled Notification",
        "This notification was scheduled 30 seconds ago! ⏰",
        scheduledTime
      );

      toast({
        title: "Success",
        description: "Immediate notification sent and another scheduled for 30 seconds!",
      });
    } catch (error: unknown) {
      console.error("Notification error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred while sending the notification",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Bell className="w-6 h-6" />
              Test Notifications
            </h1>

            <div className="mb-4 p-3 bg-gray-100 rounded-lg flex items-center gap-2">
              {getPermissionIcon()}
              <div>
                <p className="font-medium">Notification Permission: {permissionStatus === 'unknown' ? 'Not checked' : permissionStatus}</p>
                {permissionStatus === 'denied' && (
                  <p className="text-sm text-red-600">You need to enable notifications in your browser settings.</p>
                )}
                {permissionStatus === 'default' && (
                  <p className="text-sm text-yellow-600">You&apos;ll be prompted to allow notifications when testing.</p>
                )}
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Click the button below to send yourself a test notification. Make sure 
              you have allowed notifications in your browser settings.
            </p>

            <Button
              onClick={handleTestNotification}
              disabled={isInitializing || isSending}
              className="w-full"
            >
              {isInitializing || isSending ? (
                "Sending..."
              ) : (
                "Send Test Notification"
              )}
            </Button>

            {!session?.user && (
              <p className="mt-4 text-sm text-red-600">
                You must be logged in to test notifications.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

