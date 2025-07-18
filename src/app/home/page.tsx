"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "../../hooks/use-convex-user";
import { Loader } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function HomePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const { data: session, status } = useSession();
  const { convexUserId, isLoading: isUserLoading } = useConvexUser();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [hasError, setHasError] = useState(false);

  const getOrCreateHomeDocument = useMutation(
    api.documents.getOrCreateHomeDocument,
  );

  // Set mounted state to handle router mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Safe router navigation function - memoized to prevent unnecessary re-renders
  const safeNavigate = useCallback(
    (path: string) => {
      if (isMounted && router) {
        try {
          router.push(path);
        } catch (error) {
          console.error("Router navigation failed:", error);
          // Fallback to window.location if router fails
          if (typeof window !== "undefined") {
            window.location.href = path;
          }
        }
      } else {
        // Fallback for unmounted router
        if (typeof window !== "undefined") {
          window.location.href = path;
        }
      }
    },
    [isMounted, router],
  );

  // Memoize the createAndRedirect function to prevent unnecessary re-renders
  const createAndRedirect = useCallback(async () => {
    if (isRedirecting || !convexUserId) return; // Prevent multiple calls and ensure user ID exists

    setIsRedirecting(true);
    setHasError(false);

    try {
      const documentId = await getOrCreateHomeDocument({
        userId: convexUserId,
      });
      safeNavigate(`/documents/${documentId}`);
    } catch (error) {
      console.error("Failed to create home document:", error);
      toast.error("Failed to load your notebook. Please try again.");
      setIsRedirecting(false);
      setHasError(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convexUserId, getOrCreateHomeDocument, safeNavigate]);

  useEffect(() => {
    // If not authenticated, redirect to sign in
    if (status === "loading") return; // Wait for session to load

    if (status === "unauthenticated") {
      safeNavigate("/auth/signin");
      return;
    }

    // If authenticated but user data still loading, wait
    if (isUserLoading) return;

    // Check if convexUserId is null/undefined and handle error state
    if (!convexUserId) {
      setHasError(true);
      toast.error("Unable to load user data. Please try refreshing the page.");
      return;
    }

    // Create or get home document and redirect
    void createAndRedirect();
  }, [status, isUserLoading, convexUserId, createAndRedirect, safeNavigate]);

  // Show error state if user data couldn't be loaded
  if (hasError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FBFD]">
        <div className="text-center">
          <div className="mb-4 text-red-500">
            <svg
              className="mx-auto h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-gray-900">
            Unable to Load Workspace
          </h2>
          <p className="mb-4 text-muted-foreground">
            We couldn&apos;t load your user data. Please try refreshing the
            page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-primary px-4 py-2 text-white hover:bg-primary/90"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FBFD]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        <p className="text-muted-foreground">
          {status === "loading"
            ? "Loading session..."
            : isUserLoading
              ? "Loading user data..."
              : isRedirecting
                ? "Opening your notebook..."
                : "Preparing your workspace..."}
        </p>
      </div>
    </div>
  );
}
