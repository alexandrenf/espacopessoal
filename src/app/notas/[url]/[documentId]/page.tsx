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
import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import { PanelLeft } from "lucide-react";

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

  // Get notebook metadata first (for access checking)
  const notebookMetadata = useQuery(
    convexApi.notebooks.getMetadataByUrl,
    normalizedUrl.length > 0 ? { url: normalizedUrl } : "skip",
  );

  // Get full notebook information using Convex
  const isOwner = convexUserId && notebookMetadata?.ownerId === convexUserId;
  const isPublicNotebook = !notebookMetadata?.isPrivate;

  const notebook = useQuery(
    convexApi.notebooks.getByUrlWithSession,
    normalizedUrl.length > 0 && (isPublicNotebook || isOwner)
      ? {
          url: normalizedUrl,
          userId: convexUserId ?? undefined,
          sessionToken: undefined, // No session token needed for owner/public access
        }
      : "skip",
  );

  const hasValidPassword = !isPublicNotebook && !isOwner && !!notebook; // If it's private, user is not owner, but notebook loaded successfully

  // Get document information using Convex
  const document = useQuery(
    convexApi.documents.getById,
    notebook && normalizedDocumentId
      ? {
          id: normalizedDocumentId as Id<"documents">,
          userId: convexUserId ?? undefined,
        }
      : "skip",
  );

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
    setShowSidebar(!showSidebar);
  };

  // Render the document editor with sidebar for public notebooks
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-grow">
        {/* Show sidebar for public notebooks or when user is owner */}
        {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
        {(isPublicNotebook || isOwner || hasValidPassword) && showSidebar && (
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
            />
          </div>
        )}

        <div className="relative flex-grow">
          {/* Sidebar toggle button when sidebar is hidden */}
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
          {(isPublicNotebook || isOwner || hasValidPassword) &&
            !showSidebar && (
              <div className="absolute left-4 top-4 z-10">
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
