"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { type Id } from "../../../../convex/_generated/dataModel";
import { DocumentEditor } from "../../../components_new/DocumentEditor";
import { ErrorBoundary } from "../../../components_new/ErrorBoundary";
import { Button } from "../../../components_new/ui/button";
import { Loader, FileText, FilePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useConvexUser } from "../../../hooks/use-convex-user";
import { useMutation } from "convex/react";
import { toast } from "sonner";

// Helper function to validate if a string is a valid Convex ID format
function isValidConvexId(id: string | string[] | undefined): id is string {
  if (typeof id !== 'string') return false;
  // Convex IDs use base64url encoding: A-Z, a-z, 0-9, hyphens (-), and underscores (_)
  // Must be at least 20 characters long
  const convexIdPattern = /^[A-Za-z0-9_-]{20,}$/;
  return convexIdPattern.test(id);
}

export default function DocumentPage() {
  const { documentId } = useParams();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Get authenticated user
  const { convexUserId, isLoading: isUserLoading } = useConvexUser();
  const userIdString = convexUserId ? String(convexUserId) : null;
  
  // Validate documentId before using it
  const validatedDocumentId = isValidConvexId(documentId) ? documentId as Id<"documents"> : null;
  
  // Mutations for creating new document
  const createDocument = useMutation(api.documents.create);
  
  // Set mounted state to handle router mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Handle invalid documentId
  useEffect(() => {
    if (!validatedDocumentId) {
      console.error('Invalid document ID:', documentId);
      // Could redirect to home or show error immediately
      // For now, we'll let the component render the error state
    }
  }, [validatedDocumentId, documentId]);
  
  // Only fetch the initial document to pass to DocumentEditor
  const initialDocument = useQuery(
    api.documents.getById, 
    !isUserLoading && validatedDocumentId && userIdString ? { id: validatedDocumentId, userId: userIdString } : "skip"
  );
  
  // Show loading screen immediately if we're waiting for user auth or document
  const shouldShowLoading = isUserLoading || (validatedDocumentId && userIdString && initialDocument === undefined);
  
  // Show loading immediately to prevent blank screen
  if (shouldShowLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            {isUserLoading ? "Authenticating..." : "Loading document..."}
          </p>
        </div>
      </div>
    );
  }

  // Safe router navigation function
  const safeNavigateHome = () => {
    if (isMounted && router) {
      try {
        router.push('/');
      } catch (error) {
        console.error('Router navigation failed:', error);
        // Fallback to window.location if router fails
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
    } else {
      // Fallback for unmounted router
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  // Handle invalid document ID
  if (!validatedDocumentId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Invalid Document ID</h1>
          <p className="text-muted-foreground">The document ID format is invalid.</p>
          <Button 
            onClick={safeNavigateHome} 
            className="mt-4"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Handle creating new document
  const handleCreateDocument = async () => {
    if (!userIdString) {
      toast.error("Please sign in to create documents");
      return;
    }
    
    setIsCreating(true);
    try {
      const documentId = await createDocument({
        title: "Untitled Document",
        userId: userIdString,
      });
      
      if (documentId) {
        router.push(`/documents/${documentId}`);
        toast.success("Document created successfully!");
      }
    } catch (error) {
      console.error("Failed to create document:", error);
      toast.error("Failed to create document");
    } finally {
      setIsCreating(false);
    }
  };

  // Show authentication error if user is not authenticated
  if (!userIdString) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Authentication Required</h1>
          <p className="text-muted-foreground">You must be signed in to view this document.</p>
          <Button 
            onClick={safeNavigateHome} 
            className="mt-4"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // This loading state is now handled above with shouldShowLoading

  // Show create document section if document doesn't exist
  if (initialDocument === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Document Not Found</h1>
            <p className="text-gray-600 mb-6">The document you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
            
            <div className="space-y-3">
              <Button 
                onClick={handleCreateDocument}
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? (
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <FilePlus className="h-4 w-4 mr-2" />
                )}
                {isCreating ? 'Creating...' : 'Create New Document'}
              </Button>
              
              <Button 
                onClick={safeNavigateHome} 
                variant="outline"
                className="w-full"
              >
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pass the initial document to DocumentEditor - it will handle all document switching internally
  return (
    <ErrorBoundary>
      <DocumentEditor document={initialDocument!} />
    </ErrorBoundary>
  );
} 