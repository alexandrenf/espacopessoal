"use client";

import { useParams } from "next/navigation";
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
import { useState, useEffect } from "react";

function DocumentPageContent() {
  const params = useParams<{ url: string; documentId: string }>();
  const { data: session, status } = useSession();
  const { convexUserId, isLoading: isUserLoading } = useConvexUser();
  const [password, setPassword] = useState<string | null>(null);

  const normalizedUrl = typeof params.url === "string" ? params.url : "";
  const normalizedDocumentId = typeof params.documentId === "string" ? params.documentId : "";
  const isAuthenticated = status === "authenticated" && session;

  // Get stored password for notebook access
  useEffect(() => {
    if (typeof window !== "undefined" && normalizedUrl) {
      const stored = localStorage.getItem("notebook_passwords");
      if (stored) {
        try {
          const parsed: unknown = JSON.parse(stored);
          if (parsed && typeof parsed === "object" && parsed !== null) {
            const passwords = parsed as Record<string, string>;
            const storedPassword = passwords[normalizedUrl];
            if (typeof storedPassword === "string") {
              setPassword(storedPassword);
            }
          }
        } catch {
          // Ignore parsing errors
        }
      }
    }
  }, [normalizedUrl]);

  // Get notebook information using Convex
  const notebook = useQuery(
    convexApi.notebooks.getByUrl,
    normalizedUrl.length > 0 && convexUserId
      ? {
          url: normalizedUrl,
          userId: convexUserId,
        }
      : "skip",
  );

  // Get document information using Convex
  const document = useQuery(
    convexApi.documents.getById,
    notebook && normalizedDocumentId && convexUserId
      ? {
          id: normalizedDocumentId as Id<"documents">,
          userId: convexUserId,
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

  // Render the document editor
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-grow">
        <DocumentEditor
          document={document}
          notebookId={notebook._id as Id<"notebooks">}
          notebookUrl={normalizedUrl}
          notebookTitle={notebook.title}
        />
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
