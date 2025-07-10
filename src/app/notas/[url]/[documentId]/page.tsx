"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { api as convexApi } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { LoadingSpinner } from "~/app/components/LoadingSpinner";
import { DocumentEditor } from "~/components_new/DocumentEditor";
import { TRPCReactProvider } from "~/trpc/react";
import { ConvexClientProvider } from "~/components_new/ConvexClientProvider";
import { DocumentNotFound } from "~/components_new/DocumentNotFound";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface DocumentPageProps {
  params: {
    url: string;
    documentId: string;
  };
}

function DocumentPageContent() {
  const { url, documentId } = useParams();
  const { data: session, status } = useSession();
  const router = useRouter();

  const normalizedUrl = typeof url === "string" ? url : "";
  const normalizedDocumentId = typeof documentId === "string" ? documentId : "";

  // Get notebook information
  const notebook = useQuery(
    convexApi.notebooks.getByUrl,
    session?.user?.id
      ? {
          url: normalizedUrl,
          userId: session.user.id,
        }
      : "skip",
  );

  // Get document information
  const document = useQuery(
    convexApi.documents.getById,
    session?.user?.id && normalizedDocumentId
      ? {
          id: normalizedDocumentId as Id<"documents">,
          userId: session.user.id,
        }
      : "skip",
  );

  // Check if user is authenticated
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
        <span className="ml-2 text-sm text-gray-600">Authenticating...</span>
      </div>
    );
  }

  if (!session?.user?.id) {
    router.push("/api/auth/signin");
    return null;
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

  // Check if notebook was not found
  if (notebook === null) {
    return (
      <DocumentNotFound
        title="Notebook Not Found"
        message="The notebook you're looking for doesn't exist or you don't have permission to access it."
        actionText="Go to Home"
        actionHref="/"
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
          notebookId={notebook._id}
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
