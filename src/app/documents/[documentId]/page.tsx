"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { DocumentEditor } from "../../../components_new/DocumentEditor";
import { Button } from "../../../components_new/ui/button";
import { Loader } from "lucide-react";
import { useEffect } from "react";
import { useConvexUser } from "../../../hooks/use-convex-user";

// Helper function to validate if a string is a valid Convex ID format
function isValidConvexId(id: string | string[] | undefined): id is string {
  if (typeof id !== 'string') return false;
  // Convex IDs are typically base64url-encoded strings with specific length constraints
  // Basic validation: non-empty string without spaces
  return id.length > 0 && !id.includes(' ') && !id.includes('\n') && !id.includes('\t');
}

export default function DocumentPage() {
  const { documentId } = useParams();
  const router = useRouter();
  
  // Get authenticated user
  const { convexUserId, isLoading: isUserLoading } = useConvexUser();
  const userIdString = convexUserId ? String(convexUserId) : null;
  
  // Validate documentId before using it
  const validatedDocumentId = isValidConvexId(documentId) ? documentId as Id<"documents"> : null;
  
  const document = useQuery(
    api.documents.getById, 
    !isUserLoading && validatedDocumentId && userIdString ? { id: validatedDocumentId, userId: userIdString } : "skip"
  );
  
  // Handle invalid documentId
  useEffect(() => {
    if (!validatedDocumentId) {
      console.error('Invalid document ID:', documentId);
      // Could redirect to home or show error immediately
      // For now, we'll let the component render the error state
    }
  }, [validatedDocumentId, documentId]);

  // Handle invalid document ID
  if (!validatedDocumentId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Invalid Document ID</h1>
          <p className="text-muted-foreground">The document ID format is invalid.</p>
          <Button 
            onClick={() => router.push('/')} 
            className="mt-4"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Show loading while user authentication is being resolved
  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  // Show authentication error if user is not authenticated
  if (!userIdString) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Authentication Required</h1>
          <p className="text-muted-foreground">You must be signed in to view this document.</p>
          <Button 
            onClick={() => router.push('/')} 
            className="mt-4"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  if (document === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (document === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Document Not Found</h1>
          <p className="text-muted-foreground">The document you&apos;re looking for doesn&apos;t exist.</p>
          <Button 
            onClick={() => router.push('/')} 
            className="mt-4"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return <DocumentEditor document={document} />;
} 