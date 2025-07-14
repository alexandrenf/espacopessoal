"use client";

import React, { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { type Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

// Import our new password protection components
import NotebookPasswordGate from "./NotebookPasswordGate";
import { initializeSessionManagement } from "~/lib/session-cleanup";

interface IntegratedPasswordProtectionProps {
  notebookUrl: string;
  children: React.ReactNode;
}

/**
 * Integrated Password Protection Component
 *
 * This component provides comprehensive password protection for notebook access,
 * integrating with the existing authentication system and providing session management.
 *
 * Features:
 * - Automatic session validation
 * - Password gate for protected notebooks
 * - Session expiry warnings
 * - Background session cleanup
 * - Integration with existing NextAuth session
 */
const IntegratedPasswordProtection: React.FC<
  IntegratedPasswordProtectionProps
> = ({ notebookUrl, children }) => {
  const { data: session } = useSession();

  // Get notebook metadata to check if password protection is needed
  const notebookMetadata = useQuery(api.notebooks.getMetadataByUrl, {
    url: notebookUrl,
  });

  // For now, skip complex session management in this component
  // The NotebookPasswordGate component will handle session management directly

  // Initialize session management background tasks
  useEffect(() => {
    void initializeSessionManagement({
      cleanupIntervalMinutes: 30,
      monitorIntervalMinutes: 10,
      autoStart: true,
    });
  }, []);

  // Handle access granted
  const handleAccessGranted = () => {
    toast.success("Access granted to notebook");
  };

  // Loading state while fetching notebook metadata
  if (notebookMetadata === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-500">Loading notebook...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (notebookMetadata === null) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 19c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Notebook Not Found
          </h2>
          <p className="text-gray-600">
            The notebook you&apos;re looking for doesn&apos;t exist or may have
            been deleted.
          </p>
        </div>
      </div>
    );
  }

  // Check if user is the owner (owners bypass password protection)
  const isOwner = session?.user?.id === notebookMetadata.ownerId;

  // If notebook is not private or user is owner, grant access immediately
  if (!notebookMetadata.isPrivate || isOwner) {
    return <>{children}</>;
  }

  // If notebook is private but doesn't have password, deny access
  if (notebookMetadata.isPrivate && !notebookMetadata.hasPassword) {
    return (
      <div className="flex min-h-[500px] items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 19c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Access Denied
          </h1>
          <p className="text-gray-600">
            This notebook is private and you don&apos;t have permission to
            access it.
          </p>
        </div>
      </div>
    );
  }

  // Show password gate with session management
  return (
    <NotebookPasswordGate
      notebook={notebookMetadata}
      userId={session?.user?.id ? (session.user.id as Id<"users">) : undefined}
      onAccessGranted={handleAccessGranted}
    >
      {children}
    </NotebookPasswordGate>
  );
};

export default IntegratedPasswordProtection;
