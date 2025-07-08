"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { DocumentEditor } from "../../../components_new/DocumentEditor";
import { Loader } from "lucide-react";
import { useEffect } from "react";

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
  
  // Validate documentId before using it
  const validatedDocumentId = isValidConvexId(documentId) ? documentId as Id<"documents"> : null;
  
  const document = useQuery(
    api.documents.getById, 
    validatedDocumentId ? { id: validatedDocumentId } : "skip"
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
          <button 
            onClick={() => router.push('/')} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Home
          </button>
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
          <button 
            onClick={() => router.push('/')} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return <DocumentEditor document={document} />;
} 