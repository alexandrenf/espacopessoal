"use client";

import { useSession } from "next-auth/react";
import { useNotifications } from "~/lib/notifications";
import { Button } from "~/components/ui/button";
import { Bell } from "lucide-react";
import { toast } from "~/hooks/use-toast";
import Header from "~/app/components/Header";

export default function TestNotificationsPage() {
  const { data: session } = useSession();
  const { initializeNotifications, notify, isInitializing, isSending } = useNotifications();

  const handleTestNotification = async () => {
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

    const sent = await notify(
      session.user.id,
      "Test Notification",
      "If you see this, notifications are working! 🎉"
    );

    if (sent) {
      toast({
        title: "Success",
        description: "Test notification sent successfully!",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to send test notification",
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