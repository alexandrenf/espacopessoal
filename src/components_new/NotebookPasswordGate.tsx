"use client";

import React, { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { type Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, Shield, AlertTriangle } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import SecureSessionStorage, {
  generateDeviceFingerprint,
} from "~/lib/session-storage";

interface SessionResult {
  sessionToken: string;
  expiresAt: number;
  sessionId: Id<"notebookSessions">;
}

interface NotebookPasswordGateProps {
  notebook: {
    _id: Id<"notebooks">;
    title: string;
    url: string;
    hasPassword: boolean;
    isPrivate: boolean;
  };
  userId?: Id<"users">;
  onAccessGranted: () => void;
  children?: React.ReactNode;
}

const NotebookPasswordGate: React.FC<NotebookPasswordGateProps> = ({
  notebook,
  userId,
  onAccessGranted,
  children,
}) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Mutations
  const createPasswordSession = useMutation(
    api.notebooks.createPasswordSession,
  );

  // Check for existing valid session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      if (!notebook.hasPassword) {
        setHasValidSession(true);
        setIsCheckingSession(false);
        onAccessGranted();
        return;
      }

      try {
        const sessionData = await SecureSessionStorage.getSession(notebook._id);

        if (sessionData) {
          // Check if session is expired locally first
          if (sessionData.expiresAt < Date.now()) {
            await SecureSessionStorage.removeSession(notebook._id);
            setIsCheckingSession(false);
            return;
          }

          // If session exists and is not expired, assume it's valid
          setHasValidSession(true);
          onAccessGranted();
        }
      } catch (error) {
        console.error("Session check failed:", error);
        // Remove potentially corrupted session
        await SecureSessionStorage.removeSession(notebook._id);
      } finally {
        setIsCheckingSession(false);
      }
    };

    void checkExistingSession();
  }, [notebook._id, notebook.hasPassword, onAccessGranted]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      toast.error("Please enter the password");
      return;
    }

    setIsLoading(true);

    try {
      const deviceFingerprint = generateDeviceFingerprint();

      const sessionResult = await createPasswordSession({
        notebookUrl: notebook.url,
        password: password.trim(),
        deviceFingerprint,
        userAgent: navigator.userAgent,
        rememberMe,
        userId,
      }) as SessionResult;

      // Store session securely on client
      await SecureSessionStorage.storeSession(
        notebook._id,
        sessionResult.sessionToken,
        sessionResult.expiresAt,
      );

      setHasValidSession(true);
      toast.success("Access granted");
      onAccessGranted();
    } catch (error: unknown) {
      console.error("Password validation failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Invalid password";
      toast.error(errorMessage);
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await SecureSessionStorage.removeSession(notebook._id);
      setHasValidSession(false);
      setPassword("");
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to logout");
    }
  };

  // Show loading state while checking session
  if (isCheckingSession) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-500">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  // Show children if access is granted
  if (hasValidSession) {
    return (
      <div>
        {children}
        {/* Optional logout button - could be placed in a header or settings menu */}
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="border-gray-200 bg-white shadow-lg"
          >
            <Shield className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    );
  }

  // Show password gate
  return (
    <div className="flex min-h-[500px] items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Lock className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Protected Notebook
          </h1>
          <p className="text-gray-600">
            &quot;{notebook.title}&quot; is password protected. Enter the password to
            access this notebook.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter notebook password"
                disabled={isLoading}
                className="pr-10"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={setRememberMe}
                disabled={isLoading}
              />
              <Label htmlFor="rememberMe" className="text-sm text-gray-600">
                Remember me on this device
              </Label>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !password.trim()}
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                Checking password...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Access Notebook
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 rounded-lg bg-blue-50 p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-blue-600" />
            <div className="text-sm text-blue-800">
              <p className="mb-1 font-medium">Security Notice</p>
              <p>
                Your session will be securely stored on this device.
                {rememberMe
                  ? " You'll stay logged in for 30 days."
                  : " You'll stay logged in for 24 hours."}
              </p>
            </div>
          </div>
        </div>

        {/* Additional help section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Don&apos;t have access? Contact the notebook owner for the password.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotebookPasswordGate;
