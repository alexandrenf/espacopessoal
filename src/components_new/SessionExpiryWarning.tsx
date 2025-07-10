"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Clock, RefreshCw, LogOut } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

interface SessionExpiryWarningProps {
  timeUntilExpiry: number | null;
  onExtendSession: () => Promise<boolean>;
  onLogout: () => Promise<boolean>;
  className?: string;
}

const SessionExpiryWarning: React.FC<SessionExpiryWarningProps> = ({
  timeUntilExpiry,
  onExtendSession,
  onLogout,
  className = "",
}) => {
  const [isExtending, setIsExtending] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [displayTime, setDisplayTime] = useState<string>("");

  // Format time remaining
  const formatTimeRemaining = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Update display time every second
  useEffect(() => {
    if (timeUntilExpiry === null) return;

    const updateDisplay = () => {
      setDisplayTime(formatTimeRemaining(Math.max(0, timeUntilExpiry)));
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);

    return () => clearInterval(interval);
  }, [timeUntilExpiry]);

  const handleExtendSession = async () => {
    setIsExtending(true);
    try {
      await onExtendSession();
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Don't show if no expiry time or more than 10 minutes remaining
  if (!timeUntilExpiry || timeUntilExpiry > 10 * 60 * 1000) {
    return null;
  }

  const isUrgent = timeUntilExpiry < 2 * 60 * 1000; // Less than 2 minutes
  const isCritical = timeUntilExpiry < 30 * 1000; // Less than 30 seconds

  return (
    <div
      className={`fixed right-4 top-4 z-50 max-w-sm rounded-lg border bg-white p-4 shadow-lg ${
        isCritical
          ? "border-red-500 bg-red-50"
          : isUrgent
            ? "border-orange-500 bg-orange-50"
            : "border-yellow-500 bg-yellow-50"
      } ${className}`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {isCritical ? (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          ) : (
            <Clock className="h-5 w-5 text-orange-600" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between">
            <h4
              className={`font-medium ${
                isCritical
                  ? "text-red-800"
                  : isUrgent
                    ? "text-orange-800"
                    : "text-yellow-800"
              }`}
            >
              {isCritical ? "Session Expiring!" : "Session Expiry Warning"}
            </h4>
            <Badge
              variant="outline"
              className={`text-xs ${
                isCritical
                  ? "border-red-300 text-red-700"
                  : isUrgent
                    ? "border-orange-300 text-orange-700"
                    : "border-yellow-300 text-yellow-700"
              }`}
            >
              {displayTime}
            </Badge>
          </div>

          <p
            className={`mb-3 text-sm ${
              isCritical
                ? "text-red-700"
                : isUrgent
                  ? "text-orange-700"
                  : "text-yellow-700"
            }`}
          >
            {isCritical
              ? "Your session is about to expire. You'll be logged out automatically."
              : "Your session will expire soon. Extend it to continue working."}
          </p>

          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={handleExtendSession}
              disabled={isExtending || isLoggingOut}
              className="flex-1"
            >
              {isExtending ? (
                <>
                  <div className="mr-2 h-3 w-3 animate-spin rounded-full border-b-2 border-white" />
                  Extending...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Extend
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleLogout}
              disabled={isExtending || isLoggingOut}
              className="flex-1"
            >
              {isLoggingOut ? (
                <>
                  <div className="mr-2 h-3 w-3 animate-spin rounded-full border-b-2 border-gray-600" />
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-3 w-3" />
                  Logout
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiryWarning;
