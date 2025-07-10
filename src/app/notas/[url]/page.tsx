"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useMutation } from "convex/react";
import { api as convexApi } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { LoadingSpinner } from "~/app/components/LoadingSpinner";
import { TRPCReactProvider } from "~/trpc/react";
import { ConvexClientProvider } from "~/components_new/ConvexClientProvider";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Plus,
  FileText,
  Folder,
  Calendar,
  Edit,
  Trash2,
  Lock,
  Globe,
} from "lucide-react";
import { toast } from "~/hooks/use-toast";
import { useConvexUser } from "~/hooks/use-convex-user";
import { DocumentNotFound } from "~/components_new/DocumentNotFound";
import { NotepadPasswordAuth } from "~/app/components/NotepadPasswordAuth";

// Password storage helper
const STORAGE_KEY = "notebook_passwords";

const getStoredPasswords = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(STORAGE_KEY);
  try {
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Record<string, string>;
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
};

const storePassword = (url: string, password: string) => {
  const passwords = getStoredPasswords();
  passwords[url] = password;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(passwords));
};

function NotebookPageContent() {
  const { url } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { convexUserId, isLoading: isUserLoading } = useConvexUser();
  const [password, setPassword] = useState<string | null>(null);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);

  const normalizedUrl = typeof url === "string" ? url : "";

  // Load stored password on mount
  useEffect(() => {
    const passwords = getStoredPasswords();
    const storedPassword = passwords[normalizedUrl];
    if (storedPassword) {
      setPassword(storedPassword);
    }
  }, [normalizedUrl]);

  // Get notebook information
  const notebook = useQuery(
    convexApi.notebooks.getByUrl,
    convexUserId
      ? {
          url: normalizedUrl,
          userId: convexUserId,
        }
      : "skip",
  );

  // Get documents in notebook
  const documents = useQuery(
    convexApi.documents.getHierarchical,
    convexUserId && notebook?._id
      ? {
          userId: convexUserId,
          parentId: undefined, // Get root level documents
        }
      : "skip",
  );

  // Create document mutation
  const createDocument = useMutation(convexApi.documents.create);

  // Check if user is authenticated and user data is loading
  if (status === "loading" || isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
        <span className="ml-2 text-sm text-gray-600">
          {status === "loading" ? "Authenticating..." : "Loading user data..."}
        </span>
      </div>
    );
  }

  // Only redirect to signin if user is not authenticated at all
  if (status === "unauthenticated" || !session) {
    router.push("/api/auth/signin");
    return null;
  }

  // If we have a session but no convexUserId and not loading, there might be an error
  if (!convexUserId && !isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading user data</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
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

  // Handle private notebook authentication
  if (
    notebook === null ||
    (!notebook.isOwner && notebook.isPrivate && !password)
  ) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex-grow">
          <NotepadPasswordAuth
            url={normalizedUrl}
            onAuthenticated={(pwd) => {
              setPassword(pwd);
              storePassword(normalizedUrl, pwd);
            }}
          />
        </div>
      </div>
    );
  }

  // Handle notebook not found
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

  // Handle create document
  const handleCreateDocument = async () => {
    if (!convexUserId || !notebook?._id) return;

    setIsCreatingDocument(true);
    try {
      const documentId = await createDocument({
        title: "Untitled Document",
        initialContent: "",
        userId: convexUserId,
        notebookId: notebook._id,
        isFolder: false,
      });

      // Navigate to the new document
      router.push(`/notas/${normalizedUrl}/${documentId}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingDocument(false);
    }
  };

  // Handle document click
  const handleDocumentClick = (documentId: string) => {
    router.push(`/notas/${normalizedUrl}/${documentId}`);
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500 text-white">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {notebook.title}
                </h1>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  {notebook.isPrivate ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  <span>
                    {notebook.isPrivate ? "Private" : "Public"} notebook
                  </span>
                  <span>•</span>
                  <span>Created {formatDate(notebook.createdAt)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleCreateDocument}
                disabled={isCreatingDocument}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isCreatingDocument ? (
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                New Document
              </Button>
            </div>
          </div>
          {notebook.description && (
            <p className="mt-4 text-gray-600">{notebook.description}</p>
          )}
        </div>

        {/* Documents List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
            <div className="text-sm text-gray-500">
              {documents?.length ?? 0}{" "}
              {documents?.length === 1 ? "document" : "documents"}
            </div>
          </div>

          {documents === undefined ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner className="h-8 w-8" />
              <span className="ml-2 text-sm text-gray-600">
                Loading documents...
              </span>
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((document) => (
                <Card
                  key={document._id}
                  className="cursor-pointer transition-all hover:shadow-md"
                  onClick={() => handleDocumentClick(document._id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {document.isFolder ? (
                          <Folder className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <FileText className="h-5 w-5 text-blue-500" />
                        )}
                        <CardTitle className="text-lg">
                          {document.title}
                        </CardTitle>
                      </div>
                      {document.isHome && (
                        <div className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                          Home
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(document.updatedAt)}</span>
                        </div>
                      </div>
                      {document.initialContent && (
                        <p className="line-clamp-2 text-sm text-gray-600">
                          {document.initialContent
                            .replace(/<[^>]*>/g, "")
                            .slice(0, 120)}
                          ...
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="py-16">
              <CardContent className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-gray-100 p-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  No documents yet
                </h3>
                <p className="mb-4 text-sm text-gray-600">
                  Start by creating your first document in this notebook.
                </p>
                <Button
                  onClick={handleCreateDocument}
                  disabled={isCreatingDocument}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  {isCreatingDocument ? (
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Create First Document
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotebookPage() {
  return (
    <TRPCReactProvider>
      <ConvexClientProvider>
        <NotebookPageContent />
      </ConvexClientProvider>
    </TRPCReactProvider>
  );
}
