"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { api as convexApi } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { LoadingSpinner } from "~/app/components/LoadingSpinner";
import { DocumentEditor } from "~/components_new/DocumentEditor";
import { TRPCReactProvider } from "~/trpc/react";
import { ConvexClientProvider } from "~/components_new/ConvexClientProvider";
import { DocumentNotFound } from "~/components_new/DocumentNotFound";
import { useConvexUser } from "~/hooks/use-convex-user";
import DocumentSidebar from "~/components_new/DocumentSidebar";
import React, { useState, useEffect } from "react";
import { getStoredSession } from "~/lib/secure-session";
import { Button } from "~/components/ui/button";
import { PanelLeft, Menu } from "lucide-react";

function DocumentPageContent() {
  const params = useParams<{ url: string; documentId: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { convexUserId, isLoading: isUserLoading } = useConvexUser();
  const normalizedUrl = typeof params.url === "string" ? params.url : "";
  const normalizedDocumentId =
    typeof params.documentId === "string" ? params.documentId : "";
  const isAuthenticated = status === "authenticated" && session;
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Session management for private notebooks (similar to notebook page)
  const [hasValidSession, setHasValidSession] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isSessionValidationComplete, setIsSessionValidationComplete] =
    useState(false);

  // Mobile breakpoint detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);
      // Hide mobile sidebar when switching to desktop
      if (!mobile) {
        setShowMobileSidebar(false);
      }
    };

    // Check on mount
    checkMobile();
    
    // Check on resize
    window.addEventListener("resize", checkMobile);
    
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Validate stored session token for private notebooks
  useEffect(() => {
    if (normalizedUrl && normalizedUrl !== "" && normalizedUrl !== "/") {
      const validateSession = async () => {
        if (!hasValidSession && !isSessionValidationComplete) {
          try {
            console.log("Document page: Checking for stored session...");
            const sessionData = await getStoredSession(normalizedUrl);

            if (sessionData?.token) {
              console.log("Document page: Found stored session, validating...");

              // Check if session is not expired
              const now = Date.now();
              if (sessionData.expiresAt > now) {
                console.log(
                  "Document page: Session is valid, setting up access",
                );
                setSessionToken(sessionData.token);
                setHasValidSession(true);
              } else {
                console.log("Document page: Session expired");
              }
            } else {
              console.log("Document page: No stored session found");
            }
          } catch (error) {
            console.error("Document page: Session validation failed:", error);
          } finally {
            setIsSessionValidationComplete(true);
          }
        }
      };

      void validateSession();
    }
  }, [normalizedUrl, hasValidSession, isSessionValidationComplete]);

  // Get notebook metadata first (for access checking)
  const notebookMetadata = useQuery(
    convexApi.notebooks.getMetadataByUrl,
    normalizedUrl.length > 0 ? { url: normalizedUrl } : "skip",
  );

  // Get full notebook information using Convex
  // Wait for metadata to load before making access decisions
  const isOwner = Boolean(
    convexUserId && notebookMetadata?.ownerId === convexUserId,
  );
  const isPublicNotebook = Boolean(
    notebookMetadata && !notebookMetadata.isPrivate,
  );
  const hasPassword = Boolean(notebookMetadata?.hasPassword);

  // For document pages, allow access to:
  // 1. Public notebooks
  // 2. Owner accessing their own notebooks
  // 3. Private notebooks with valid session tokens (authenticated via password)
  // Only redirect if it's a private notebook with password AND user is not owner AND no valid session
  const needsRedirectToNotebook =
    hasPassword &&
    !isOwner &&
    !isPublicNotebook &&
    !hasValidSession &&
    isSessionValidationComplete;
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const canAccessNotebook =
    isPublicNotebook || isOwner || (hasPassword && hasValidSession);

  // Debug logging for document page access
  console.log("Document page access check:", {
    normalizedUrl,
    normalizedDocumentId,
    hasPassword,
    isOwner,
    isPublicNotebook,
    hasValidSession,
    isSessionValidationComplete,
    needsRedirectToNotebook,
    canAccessNotebook,
  });

  // Use useEffect for navigation to avoid setState during render
  // Only redirect after session validation is complete and we're sure there's no valid session
  useEffect(() => {
    if (
      needsRedirectToNotebook &&
      notebookMetadata &&
      isSessionValidationComplete
    ) {
      console.log("REDIRECTING to notebook page - no valid session found");
      router.replace(`/notas/${normalizedUrl}`);
    }
  }, [
    needsRedirectToNotebook,
    notebookMetadata,
    router,
    normalizedUrl,
    isSessionValidationComplete,
  ]);

  // Additional safety: Don't run any queries if we need to redirect
  // For private notebooks, also ensure we have a session token when needed
  const shouldRunQuery =
    normalizedUrl.length > 0 &&
    canAccessNotebook &&
    !needsRedirectToNotebook &&
    notebookMetadata && // Ensure metadata is loaded
    isSessionValidationComplete && // Wait for session validation
    // If it's a private notebook requiring session, ensure we have the token
    (isPublicNotebook ||
      isOwner ||
      (hasPassword && hasValidSession && sessionToken));

  // Update debug logging with shouldRunQuery
  console.log("Query execution decision:", {
    shouldRunQuery,
    sessionToken: sessionToken ? "***EXISTS***" : "none",
  });

  const notebook = useQuery(
    convexApi.notebooks.getByUrlWithSession,
    shouldRunQuery
      ? {
          url: normalizedUrl,
          userId: convexUserId ?? undefined,
          sessionToken:
            hasPassword && !isOwner && hasValidSession
              ? (sessionToken ?? undefined)
              : undefined,
        }
      : "skip",
  );

  const hasValidPassword = !isPublicNotebook && !isOwner && !!notebook; // If it's private, user is not owner, but notebook loaded successfully

  // Get all documents from the notebook and filter for the specific document
  // This way we leverage the notebook access validation that already worked
  const allDocuments = useQuery(
    convexApi.documents.getAllForTreeLegacy,
    notebook
      ? {
          notebookId: notebook._id,
          userId: convexUserId ?? undefined,
          sessionToken:
            hasPassword && !isOwner && hasValidSession
              ? (sessionToken ?? undefined)
              : undefined,
        }
      : "skip",
  );

  // Find the specific document from the list
  const document =
    allDocuments?.find((doc) => doc._id === normalizedDocumentId) ?? null;

  // Check if user is authenticated and user data is loading
  if (status === "loading" || (isAuthenticated && isUserLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
        <span className="ml-2 text-sm text-gray-600">
          {status === "loading" ? "Authenticating..." : "Loading user data..."}
        </span>
      </div>
    );
  }

  // Check if notebook metadata is loading
  if (notebookMetadata === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
        <span className="ml-2 text-sm text-gray-600">Loading notebook...</span>
      </div>
    );
  }

  // Handle notebook not found
  if (!notebookMetadata) {
    return (
      <DocumentNotFound
        title="Notebook Not Found"
        message="The notebook you're looking for doesn't exist."
        actionText="Go to Notebooks"
        actionHref="/notas"
      />
    );
  }

  // Show loading screen while metadata or session validation is in progress
  if (!notebookMetadata || !isSessionValidationComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
        <span className="ml-2 text-sm text-gray-600">
          {!notebookMetadata ? "Loading notebook..." : "Validating access..."}
        </span>
      </div>
    );
  }

  // Show loading screen while redirecting to notebook page for password authentication
  if (needsRedirectToNotebook) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
        <span className="ml-2 text-sm text-gray-600">
          Redirecting to notebook...
        </span>
      </div>
    );
  }

  // Check if notebook is loading
  if (notebook === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
        <span className="ml-2 text-sm text-gray-600">Loading notebook...</span>
      </div>
    );
  }

  // Check if notebook access is denied or not found
  if (!notebook) {
    return (
      <DocumentNotFound
        title="Notebook Not Found"
        message="The notebook you're looking for doesn't exist or you don't have permission to access it."
        actionText="Go to Notebooks"
        actionHref="/notas"
      />
    );
  }

  // Check if document is loading
  if (document === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
        <span className="ml-2 text-sm text-gray-600">Loading document...</span>
      </div>
    );
  }

  // Check if document was not found
  if (document === null) {
    return (
      <DocumentNotFound
        title="Document Not Found"
        message="The document you're looking for doesn't exist or you don't have permission to access it."
        actionText="Go to Notebook"
        actionHref={`/notas/${normalizedUrl}`}
      />
    );
  }

  // Verify document belongs to the notebook
  if (document.notebookId !== notebook._id) {
    return (
      <DocumentNotFound
        title="Document Not Found"
        message="This document doesn't belong to the specified notebook."
        actionText="Go to Notebook"
        actionHref={`/notas/${normalizedUrl}`}
      />
    );
  }

  // isOwner and isPublicNotebook are now defined above

  // Handler for document selection from sidebar
  const handleDocumentSelect = (documentId: Id<"documents">) => {
    router.push(`/notas/${normalizedUrl}/${documentId}`);
  };

  // Handler for sidebar toggle
  const handleToggleSidebar = () => {
    if (isMobile) {
      setShowMobileSidebar(!showMobileSidebar);
    } else {
      setShowSidebar(!showSidebar);
    }
  };

  // Handler for mobile sidebar close
  const handleCloseMobileSidebar = () => {
    setShowMobileSidebar(false);
  };

  // Render the document editor with sidebar for public notebooks
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-grow">
        {/* Desktop sidebar */}
        {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
        {(isPublicNotebook || isOwner || hasValidPassword) && showSidebar && !isMobile && (
          <div className="hidden md:block md:w-80 lg:w-96">
            <DocumentSidebar
              currentDocument={document}
              setCurrentDocumentId={handleDocumentSelect}
              onToggleSidebar={handleToggleSidebar}
              showSidebar={showSidebar}
              isMobile={false}
              notebookId={notebook._id as Id<"notebooks">}
              notebookTitle={notebook.title}
              isPublicNotebook={isPublicNotebook}
              hasValidPassword={hasValidPassword}
              sessionToken={sessionToken}
            />
          </div>
        )}

        {/* Mobile sidebar */}
        {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
        {(isPublicNotebook || isOwner || hasValidPassword) && showMobileSidebar && isMobile && (
          <DocumentSidebar
            currentDocument={document}
            setCurrentDocumentId={handleDocumentSelect}
            onToggleSidebar={handleCloseMobileSidebar}
            showSidebar={showMobileSidebar}
            isMobile={true}
            notebookId={notebook._id as Id<"notebooks">}
            notebookTitle={notebook.title}
            isPublicNotebook={isPublicNotebook}
            hasValidPassword={hasValidPassword}
            sessionToken={sessionToken}
          />
        )}

        <div className="relative flex-grow">
          {/* Mobile hamburger menu button */}
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
          {(isPublicNotebook || isOwner || hasValidPassword) && isMobile && (
            <div className="no-export absolute left-4 top-4 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleSidebar}
                className="bg-white shadow-md hover:bg-gray-50"
                title="Open sidebar"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Desktop sidebar toggle button when sidebar is hidden */}
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
          {(isPublicNotebook || isOwner || hasValidPassword) &&
            !showSidebar && !isMobile && (
              <div className="no-export absolute left-4 top-4 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleSidebar}
                  className="bg-white shadow-md hover:bg-gray-50"
                  title="Open sidebar"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </div>
            )}

          <DocumentEditor
            document={document}
            notebookId={notebook._id as Id<"notebooks">}
            isReadOnly={false} // Public notebooks are now fully manageable
            showSidebar={showSidebar}
          />
        </div>
      </div>
    </div>
  );
}

export default function DocumentPage() {
  return (
    <TRPCReactProvider>
      <ConvexClientProvider>
        <DocumentPageContent />
      </ConvexClientProvider>
    </TRPCReactProvider>
  );
}
