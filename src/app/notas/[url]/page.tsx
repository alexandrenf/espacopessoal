"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useMutation } from "convex/react";
import { api as convexApi } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { LoadingSpinner } from "~/app/components/LoadingSpinner";
import { ConvexClientProvider } from "~/components_new/ConvexClientProvider";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
  Lock,
  Globe,
  KeyRound,
  LogIn,
  User,
} from "lucide-react";
import { toast } from "~/hooks/use-toast";
import { useConvexUser } from "~/hooks/use-convex-user";
import { DocumentNotFound } from "~/components_new/DocumentNotFound";
import Link from "next/link";

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

// Password input component
const PasswordPrompt = ({
  onSubmit,
  isLoading,
}: {
  onSubmit: (password: string) => void;
  isLoading: boolean;
}) => {
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password.trim());
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <KeyRound className="h-6 w-6 text-yellow-600" />
          </div>
          <CardTitle>Notebook Protegido</CardTitle>
          <CardDescription>
            Este notebook é protegido por senha. Digite a senha para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha do notebook"
                required
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !password.trim()}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Verificando...
                </>
              ) : (
                "Acessar Notebook"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

function NotebookPageContent() {
  const { url } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { convexUserId, isLoading: isUserLoading } = useConvexUser();
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  const normalizedUrl = typeof url === "string" ? url : "";
  const isAuthenticated = status === "authenticated" && session;

  // Redirect to main notas page if URL is empty or just a slash
  useEffect(() => {
    if (normalizedUrl === "" || normalizedUrl === "/" || !normalizedUrl) {
      router.replace("/notas");
    }
  }, [normalizedUrl, router]);

  // Load stored password on mount
  useEffect(() => {
    if (normalizedUrl && normalizedUrl !== "" && normalizedUrl !== "/") {
      const passwords = getStoredPasswords();
      const storedPassword = passwords[normalizedUrl];
      if (storedPassword) {
        setHasValidPassword(true);
      }
    }
  }, [normalizedUrl]);

  // Try to get notebook information using Convex
  const [hasValidPassword, setHasValidPassword] = useState(false);
  
  // Get notebook metadata first (this works for all notebooks)
  const notebookMetadata = useQuery(
    convexApi.notebooks.getMetadataByUrl,
    normalizedUrl.length > 0
      ? { url: normalizedUrl }
      : "skip",
  );

  // Get full notebook information using Convex (only after password validation or for public/owned notebooks)
  const notebook = useQuery(
    convexApi.notebooks.getByUrlWithPassword,
    normalizedUrl.length > 0 && (hasValidPassword || !notebookMetadata?.hasPassword || notebookMetadata?.ownerId === convexUserId)
      ? {
          url: normalizedUrl,
          userId: convexUserId ?? undefined,
          hasValidPassword,
        }
      : "skip",
  );

  // Get documents in notebook (if we have access)
  const documents = useQuery(
    convexApi.documents.getHierarchical,
    notebook
      ? {
          userId: convexUserId ?? undefined,
          parentId: undefined, // Get root level documents
          notebookId: notebook._id as Id<"notebooks">,
        }
      : "skip",
  );

  // Create document mutation
  const createDocument = useMutation(convexApi.documents.create);

  // Verify password mutation using Convex
  const verifyPassword = useMutation(convexApi.notebooks.validatePassword);

  // Handle password submission
  const handlePasswordSubmit = async (enteredPassword: string) => {
    try {
      const result = await verifyPassword({
        url: normalizedUrl,
        password: enteredPassword,
      });
      
      if (result.valid) {
        storePassword(normalizedUrl, enteredPassword);
        setShowPasswordPrompt(false);
        setHasValidPassword(true);
        toast({
          title: "Acesso liberado",
          description: "Senha correta! Você pode agora acessar o notebook.",
        });
      }
    } catch {
      toast({
        title: "Erro",
        description: "A senha digitada está incorreta. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Auto-show password prompt if needed
  const needsPassword = notebookMetadata?.hasPassword && 
    notebookMetadata.ownerId !== convexUserId && 
    !hasValidPassword;

  useEffect(() => {
    if (needsPassword && !showPasswordPrompt) {
      setShowPasswordPrompt(true);
    }
  }, [needsPassword, showPasswordPrompt]);

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

  // Handle password prompt
  if (needsPassword && showPasswordPrompt) {
    return (
      <PasswordPrompt
        onSubmit={handlePasswordSubmit}
        isLoading={false}
      />
    );
  }

  // Check if notebook is loading
  if (notebook === undefined && !needsPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
        <span className="ml-2 text-sm text-gray-600">Loading notebook...</span>
      </div>
    );
  }

  // Handle notebook not found or no access
  if (!notebook && !needsPassword) {
    return (
      <DocumentNotFound
        title="Notebook Not Found"
        message="The notebook you're looking for doesn't exist or you don't have permission to access it."
        actionText="Go to Notebooks"
        actionHref="/notas"
      />
    );
  }

  // Use notebook data or fallback to metadata for display
  const notebookData = notebook ?? notebookMetadata;

  // If authenticated user but no convexUserId, show error
  if (isAuthenticated && !convexUserId && !isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-600">Error loading user data</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  // Handle create document (only for authenticated users)
  const handleCreateDocument = async () => {
    if (!convexUserId || !notebookData?._id) {
      toast({
        title: "Authentication required",
        description: "You need to be logged in to create documents.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingDocument(true);
    try {
      const documentId = await createDocument({
        title: "Untitled Document",
        initialContent: "",
        userId: convexUserId,
        notebookId: notebookData._id as Id<"notebooks">,
        isFolder: false,
      });

      // Navigate to the new document
      router.push(`/notas/${normalizedUrl}/${documentId}`);
    } catch {
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

  // Determine access level for display
  const accessLevel = !notebookData.isPrivate
    ? "public"
    : notebookMetadata.hasPassword
      ? "password"
      : "private";

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
                  {notebookData.title}
                </h1>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  {accessLevel === "private" ? (
                    <Lock className="h-4 w-4" />
                  ) : accessLevel === "password" ? (
                    <KeyRound className="h-4 w-4" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  <span>
                    {accessLevel === "private"
                      ? "Private"
                      : accessLevel === "password"
                        ? "Password Protected"
                        : "Public"}{" "}
                    notebook
                  </span>
                  <span>•</span>
                  <span>
                    Created {formatDate(notebookData.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!isAuthenticated && (
                <Button asChild variant="outline">
                  <Link href="/api/auth/signin">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login to Create Documents
                  </Link>
                </Button>
              )}
              {isAuthenticated && (
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
              )}
            </div>
          </div>
          {notebookData.description && (
            <p className="mt-4 text-gray-600">
              {notebookData.description}
            </p>
          )}
        </div>

        {/* Access info for non-authenticated users */}
        {!isAuthenticated && (
          <div className="mb-6">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">
                      Você está visualizando este notebook como visitante
                    </p>
                    <p className="text-sm text-blue-700">
                      Você pode visualizar e editar os documentos existentes.
                      Faça login para criar novos documentos.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
                  {isAuthenticated
                    ? "Start by creating your first document in this notebook."
                    : "This notebook doesn't have any documents yet. Login to create the first document."}
                </p>
                {isAuthenticated ? (
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
                ) : (
                  <Button asChild>
                    <Link href="/api/auth/signin">
                      <LogIn className="mr-2 h-4 w-4" />
                      Login to Create Documents
                    </Link>
                  </Button>
                )}
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
    <ConvexClientProvider>
      <NotebookPageContent />
    </ConvexClientProvider>
  );
}
