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
    console.log('Button clicked!', {
      type: e.type,
      timestamp: new Date().toISOString(),
      target: e.target,
    });

    e.preventDefault();
    
    if (!session?.user?.id) {
      console.log('No user session found');
      toast({
        title: "Login Required",
        description: "Please log in to test notifications",
        variant: "destructive",
      });
      return;
    }

    if (permissionStatus === "denied") {
      console.log('Notifications permission denied');
      toast({
        title: "Notifications Blocked",
        description: "Please enable notifications in your browser settings to continue",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Initializing notifications...');
      const initialized = await initializeNotifications();
      if (!initialized) {
        console.log('Failed to initialize notifications');
        toast({
          title: "Initialization Failed",
          description: "Could not initialize notifications. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('Sending test notification...');
      const notificationResult = await notify(
        "Test Notification",
        "If you see this, notifications are working! 🎉"
      );

      if (notificationResult.success) {
        console.log('Notification sent successfully');
        toast({
          title: "Success",
          description: "Test notification sent successfully!",
        });
      } else {
        console.log('Notification failed:', notificationResult.error);
        toast({
          title: "Error",
          description: notificationResult.error ?? "Failed to send test notification",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Notification error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while sending the notification",
        variant: "destructive",
      });
    }
  };

  const getBrowserSpecificInstructions = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Safari') && !ua.includes('Chrome')) {
      return (
        <ol className="list-decimal ml-4 text-sm text-gray-600 mt-2">
          <li>Open Safari Settings (tap the &quot;aA&quot; icon in the address bar)</li>
          <li>Tap &quot;Website Settings&quot;</li>
          <li>Find &quot;Notifications&quot; and select &quot;Allow&quot;</li>
        </ol>
      );
    }
    if (ua.includes('Chrome')) {
      return (
        <ol className="list-decimal ml-4 text-sm text-gray-600 mt-2">
          <li>Click the lock icon in the address bar</li>
          <li>Find &quot;Notifications&quot; in the permissions list</li>
          <li>Change the setting to &quot;Allow&quot;</li>
        </ol>
      );
    }
    return (
      <p className="text-sm text-gray-600 mt-2">
        Please check your browser settings to enable notifications for this site.
      </p>
    );
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

            <div className={`mb-4 p-4 rounded-lg flex items-start gap-3 ${
              permissionStatus === "denied" ? "bg-red-50" : 
              permissionStatus === "granted" ? "bg-green-50" : "bg-yellow-50"
            }`}>
              <div className="mt-1">{getPermissionIcon()}</div>
              <div>
                <p className="font-medium">
                  {permissionStatus === "granted" && "Notifications are enabled"}
                  {permissionStatus === "denied" && "Notifications are blocked"}
                  {permissionStatus === "default" && "Notifications need permission"}
                  {permissionStatus === "unknown" && "Checking notification status..."}
                </p>
                
                {permissionStatus === "denied" && (
                  <>
                    <p className="text-sm text-red-600 mb-2">
                      To receive notifications, you&apos;ll need to enable them in your browser settings.
                    </p>
                    {getBrowserSpecificInstructions()}
                  </>
                )}
                
                {permissionStatus === "default" && (
                  <p className="text-sm text-yellow-600">
                    Click the button below and allow notifications when prompted.
                  </p>
                )}
              </div>
            </div>
            
            <Button
              onClick={handleTestNotification}
              className={`w-full ${
                permissionStatus === "denied" 
                  ? "bg-gray-100 hover:bg-gray-200" 
                  : "active:opacity-80"
              }`}
              type="button"
            >
              {permissionStatus === "denied" 
                ? "Enable Notifications First" 
                : "Send Test Notification"}
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

