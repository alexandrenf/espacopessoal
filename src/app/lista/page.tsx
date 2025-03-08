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
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const handleTestNotification = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    
    if (!session?.user?.id) {
      toast({
        title: "Login Required",
        description: "Please log in to test notifications",
        variant: "destructive",
      });
      return;
    }

    if (permissionStatus === "denied") {
      toast({
        title: "Notifications Blocked",
        description: "Please enable notifications in your browser settings to continue",
        variant: "destructive",
      });
      return;
    }

    try {
      const initialized = await initializeNotifications();
      if (!initialized) {
        toast({
          title: "Initialization Failed",
          description: "Could not initialize notifications. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const notificationResult = await notify(
        "Test Notification",
        "If you see this, notifications are working! 🎉"
      );

      if (notificationResult.success) {
        toast({
          title: "Success",
          description: "Test notification sent successfully!",
        });
      } else {
        toast({
          title: "Error",
          description: notificationResult.error ?? "Failed to send test notification",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Notification error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while sending the notification",
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
              onTouchEnd={handleTestNotification}
              className="w-full cursor-pointer touch-manipulation"
              role="button"
              style={{
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
              }}
            >
              Send Test Notification
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

