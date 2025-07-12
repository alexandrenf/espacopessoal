"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
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
  Lock,
  Globe,
  KeyRound,
  LogIn,
  User,
  FolderPlus,
} from "lucide-react";
import { toast } from "~/hooks/use-toast";
import { useConvexUser } from "~/hooks/use-convex-user";
import { DocumentNotFound } from "~/components_new/DocumentNotFound";
import Link from "next/link";
import { FileExplorer } from "~/app/components/FileExplorer";

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Background gradient orbs */}
      <div className="absolute right-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-blue-400/10 to-indigo-500/10 blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 h-80 w-80 animate-pulse rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-500/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        <Card className="border-slate-200/50 bg-white/80 shadow-xl backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
              <KeyRound className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Notebook Protegido
            </CardTitle>
            <CardDescription className="text-slate-600">
              Este notebook é protegido por senha. Digite a senha para
              continuar.
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
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
      </motion.div>
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
      console.log("Checking stored password for:", normalizedUrl, {
        storedPassword: storedPassword ? "***EXISTS***" : "none",
        allStoredPasswords: Object.keys(passwords),
      });

      // For now, we'll just note if there's a stored password
      // The validation will happen in a separate effect after verifyPassword is available
    }
  }, [normalizedUrl]);

  // Try to get notebook information using Convex
  const [hasValidPassword, setHasValidPassword] = useState(false);
  const [isPasswordValidationComplete, setIsPasswordValidationComplete] =
    useState(false);

  // Verify password mutation using Convex (moved up to be available in useEffect)
  const verifyPassword = useMutation(convexApi.notebooks.validatePassword);

  // Validate stored password with server after verifyPassword is available
  useEffect(() => {
    if (normalizedUrl && normalizedUrl !== "" && normalizedUrl !== "/") {
      const passwords = getStoredPasswords();
      const storedPassword = passwords[normalizedUrl];

      if (
        storedPassword &&
        !hasValidPassword &&
        !isPasswordValidationComplete
      ) {
        console.log("Found stored password, validating with server...");
        // Validate stored password with server instead of trusting it blindly
        verifyPassword({
          url: normalizedUrl,
          password: storedPassword,
        })
          .then((result) => {
            console.log("Stored password validation result:", result);
            if (result.valid) {
              console.log(
                "Stored password is valid, setting hasValidPassword to true",
              );
              setHasValidPassword(true);
            } else {
              console.log("Stored password is invalid, removing from storage");
              // Remove invalid stored password
              const passwords = getStoredPasswords();
              delete passwords[normalizedUrl];
              localStorage.setItem(STORAGE_KEY, JSON.stringify(passwords));
            }
            // Mark validation as complete regardless of result
            setIsPasswordValidationComplete(true);
          })
          .catch((error) => {
            console.error("Error validating stored password:", error);
            // Remove invalid stored password
            const passwords = getStoredPasswords();
            delete passwords[normalizedUrl];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(passwords));
            // Mark validation as complete even on error
            setIsPasswordValidationComplete(true);
          });
      } else if (!storedPassword) {
        // No stored password, mark validation as complete immediately
        console.log("No stored password found, marking validation complete");
        setIsPasswordValidationComplete(true);
      }
    }
  }, [
    normalizedUrl,
    verifyPassword,
    hasValidPassword,
    isPasswordValidationComplete,
  ]);

  // Debug effect to track hasValidPassword changes
  useEffect(() => {
    console.log(
      "hasValidPassword changed to:",
      hasValidPassword,
      "validation complete:",
      isPasswordValidationComplete,
    );
  }, [hasValidPassword, isPasswordValidationComplete]);

  // Get notebook metadata first (this works for all notebooks)
  const notebookMetadata = useQuery(
    convexApi.notebooks.getMetadataByUrl,
    normalizedUrl.length > 0 ? { url: normalizedUrl } : "skip",
  );

  // Get full notebook information using Convex (only after password validation or for public/owned notebooks)
  const notebookQueryEnabled =
    normalizedUrl.length > 0 &&
    isPasswordValidationComplete && // Wait for stored password validation to complete
    (hasValidPassword ||
      !notebookMetadata?.hasPassword ||
      notebookMetadata?.ownerId === convexUserId);

  console.log("Notebook query state:", {
    normalizedUrl,
    hasValidPassword,
    isPasswordValidationComplete,
    hasPassword: notebookMetadata?.hasPassword,
    ownerId: notebookMetadata?.ownerId,
    convexUserId,
    isOwner: notebookMetadata?.ownerId === convexUserId,
    queryEnabled: notebookQueryEnabled,
  });

  // Track when query conditions change
  useEffect(() => {
    console.log(
      "Query conditions changed - notebookQueryEnabled:",
      notebookQueryEnabled,
      {
        hasValidPassword,
        isPasswordValidationComplete,
        hasPassword: notebookMetadata?.hasPassword,
        isOwner: notebookMetadata?.ownerId === convexUserId,
      },
    );
  }, [
    notebookQueryEnabled,
    hasValidPassword,
    isPasswordValidationComplete,
    notebookMetadata?.hasPassword,
    notebookMetadata?.ownerId,
    convexUserId,
  ]);

  // Force query to re-run when hasValidPassword changes by including it in the condition
  const notebookQueryArgs = notebookQueryEnabled
    ? {
        url: normalizedUrl,
        userId: convexUserId ?? undefined,
        hasValidPassword,
      }
    : "skip";

  console.log("About to run notebook query with args:", notebookQueryArgs, {
    enabled: notebookQueryEnabled,
    hasValidPassword,
    isPasswordValidationComplete,
  });

  const notebook = useQuery(
    convexApi.notebooks.getByUrlWithPassword,
    notebookQueryArgs,
  );

  // Get documents in notebook (if we have access)
  const documentsQueryArgs = notebook
    ? {
        userId: convexUserId ?? undefined,
        notebookId: notebook._id as Id<"notebooks">,
        hasValidPassword, // Pass password validation status
      }
    : "skip";

  console.log("About to run documents query with args:", documentsQueryArgs);

  const documents = useQuery(
    convexApi.documents.getAllForTreeLegacy,
    documentsQueryArgs,
  );

  // Create document mutation
  const createDocument = useMutation(convexApi.documents.create);

  // Delete document mutation
  const deleteDocument = useMutation(convexApi.documents.removeById);

  // Update document mutation
  const updateDocument = useMutation(convexApi.documents.updateById);

  // Handle password submission
  const handlePasswordSubmit = async (enteredPassword: string) => {
    try {
      console.log("Verifying password for:", normalizedUrl);
      const result = await verifyPassword({
        url: normalizedUrl,
        password: enteredPassword,
      });

      console.log("Password verification result:", result);

      if (result.valid) {
        console.log("Password is valid, setting hasValidPassword to true");
        storePassword(normalizedUrl, enteredPassword);
        setShowPasswordPrompt(false);
        setHasValidPassword(true);
        setIsPasswordValidationComplete(true); // Mark validation as complete
        toast({
          title: "Acesso liberado",
          description: "Senha correta! Você pode agora acessar o notebook.",
        });
      } else {
        console.log("Password is invalid");
        toast({
          title: "Erro",
          description: "A senha digitada está incorreta. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Password verification failed:", error);
      toast({
        title: "Erro",
        description: "A senha digitada está incorreta. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Auto-show password prompt if needed
  const needsPassword =
    notebookMetadata?.hasPassword &&
    notebookMetadata.ownerId !== convexUserId &&
    !hasValidPassword;

  console.log("Password prompt logic:", {
    hasPassword: notebookMetadata?.hasPassword,
    ownerId: notebookMetadata?.ownerId,
    convexUserId,
    isOwner: notebookMetadata?.ownerId === convexUserId,
    hasValidPassword,
    needsPassword,
    showPasswordPrompt,
  });

  useEffect(() => {
    console.log("Password prompt useEffect triggered:", {
      needsPassword,
      showPasswordPrompt,
      shouldShow: needsPassword && !showPasswordPrompt,
    });
    if (needsPassword && !showPasswordPrompt) {
      console.log("Setting showPasswordPrompt to true");
      setShowPasswordPrompt(true);
    }
  }, [needsPassword, showPasswordPrompt]);

  // Check if user is authenticated and user data is loading
  if (status === "loading" || (isAuthenticated && isUserLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Background grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Background gradient orbs */}
        <div className="absolute right-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-blue-400/10 to-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 h-80 w-80 animate-pulse rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-500/10 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
            <LoadingSpinner className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-900">
            {status === "loading"
              ? "Autenticando..."
              : "Carregando dados do usuário..."}
          </h3>
          <p className="text-slate-600">Preparando seu notebook</p>
        </motion.div>
      </div>
    );
  }

  // Check if notebook metadata is loading
  if (notebookMetadata === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Background grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Background gradient orbs */}
        <div className="absolute right-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-blue-400/10 to-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 h-80 w-80 animate-pulse rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-500/10 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
            <LoadingSpinner className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-900">
            Carregando notebook...
          </h3>
          <p className="text-slate-600">Acessando seu espaço digital</p>
        </motion.div>
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
  console.log("Render decision:", {
    needsPassword,
    showPasswordPrompt,
    shouldShowPasswordPrompt: needsPassword && showPasswordPrompt,
    notebookLoading: notebook === undefined,
    notebookExists: !!notebook,
  });

  if (needsPassword && showPasswordPrompt) {
    console.log("Rendering PasswordPrompt");
    return <PasswordPrompt onSubmit={handlePasswordSubmit} isLoading={false} />;
  }

  // Check if notebook is loading
  if (notebook === undefined && !needsPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Background grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Background gradient orbs */}
        <div className="absolute right-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-blue-400/10 to-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 h-80 w-80 animate-pulse rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-500/10 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
            <LoadingSpinner className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-900">
            Carregando notebook...
          </h3>
          <p className="text-slate-600">Preparando documentos</p>
        </motion.div>
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
        title: "Novo Documento",
        initialContent: "",
        userId: convexUserId,
        notebookId: notebookData._id as Id<"notebooks">,
        isFolder: false,
      });

      // Navigate to the new document
      router.push(`/notas/${normalizedUrl}/${documentId}`);
    } catch (error) {
      console.error("Error creating document:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar documento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingDocument(false);
    }
  };

  // Handle create folder
  const handleCreateFolder = async () => {
    if (!convexUserId || !notebookData?._id) {
      toast({
        title: "Autenticação necessária",
        description: "Você precisa estar logado para criar pastas.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createDocument({
        title: "Nova Pasta",
        initialContent: "",
        userId: convexUserId,
        notebookId: notebookData._id as Id<"notebooks">,
        isFolder: true,
      });

      toast({
        title: "Pasta criada",
        description: "Nova pasta foi criada com sucesso.",
      });
    } catch (error) {
      console.error("Error creating folder:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar pasta. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Handle document/folder click
  const handleDocumentClick = (documentId: string, isFolder: boolean) => {
    if (isFolder) {
      // Folders are now handled by the FileExplorer modal
      // This shouldn't be called for folders anymore, but keeping as fallback
      toast({
        title: "Pasta aberta",
        description:
          "A pasta foi aberta em uma janela modal. Clique nos documentos dentro dela para acessá-los.",
        variant: "default",
      });
    } else {
      // Navigate to document
      router.push(`/notas/${normalizedUrl}/${documentId}`);
    }
  };

  // Handle delete document/folder
  const handleDeleteDocument = async (documentId: string) => {
    if (!convexUserId) {
      toast({
        title: "Autenticação necessária",
        description: "Você precisa estar logado para excluir arquivos.",
        variant: "destructive",
      });
      return;
    }

    try {
      await deleteDocument({
        id: documentId as Id<"documents">,
        userId: convexUserId,
      });

      toast({
        title: "Arquivo excluído",
        description: "O arquivo foi excluído com sucesso.",
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Erro",
        description: "Falha ao excluir arquivo. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Handle rename document/folder
  const handleRenameDocument = async (documentId: string, newTitle: string) => {
    if (!convexUserId) {
      toast({
        title: "Autenticação necessária",
        description: "Você precisa estar logado para renomear arquivos.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateDocument({
        id: documentId as Id<"documents">,
        userId: convexUserId,
        title: newTitle,
      });

      toast({
        title: "Arquivo renomeado",
        description: "O arquivo foi renomeado com sucesso.",
      });
    } catch (error) {
      console.error("Error renaming document:", error);
      toast({
        title: "Erro",
        description: "Falha ao renomear arquivo. Tente novamente.",
        variant: "destructive",
      });
    }
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
    <div className="flex min-h-screen flex-col">
      <div className="relative flex-grow overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Background grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Background gradient orbs */}
        <div className="absolute right-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-blue-400/10 to-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 h-80 w-80 animate-pulse rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-500/10 blur-3xl" />

        <div className="container relative mx-auto max-w-6xl px-4 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="mb-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-4xl font-bold text-transparent">
                    {notebookData.title}
                  </h1>
                  <div className="flex items-center space-x-3 text-sm text-slate-600">
                    <div className="flex items-center space-x-1">
                      {accessLevel === "private" ? (
                        <Lock className="h-4 w-4 text-slate-500" />
                      ) : accessLevel === "password" ? (
                        <KeyRound className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <Globe className="h-4 w-4 text-green-500" />
                      )}
                      <span className="font-medium">
                        {accessLevel === "private"
                          ? "Privado"
                          : accessLevel === "password"
                            ? "Protegido por Senha"
                            : "Público"}
                      </span>
                    </div>
                    <span>•</span>
                    <span>Criado em {formatDate(notebookData.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {!isAuthenticated && (
                  <Button
                    asChild
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <Link href="/api/auth/signin">
                      <LogIn className="mr-2 h-4 w-4" />
                      Login para Criar Documentos
                    </Link>
                  </Button>
                )}
                {isAuthenticated && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreateFolder}
                      variant="outline"
                      className="border-blue-200/50 bg-white/80 text-blue-700 backdrop-blur-sm hover:bg-blue-50"
                    >
                      <FolderPlus className="mr-2 h-4 w-4" />
                      Nova Pasta
                    </Button>
                    <Button
                      onClick={handleCreateDocument}
                      disabled={isCreatingDocument}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                    >
                      {isCreatingDocument ? (
                        <LoadingSpinner className="mr-2 h-4 w-4" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      Novo Documento
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {notebookData.description && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-6 rounded-lg bg-white/60 p-4 text-slate-700 backdrop-blur-sm"
              >
                {notebookData.description}
              </motion.p>
            )}
          </motion.div>

          {/* Access info for non-authenticated users */}
          {!isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-8"
            >
              <Card className="border-blue-200/50 bg-white/80 shadow-lg backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-2">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        Você está visualizando este notebook como visitante
                      </p>
                      <p className="text-sm text-slate-600">
                        Você pode visualizar e editar os documentos existentes.
                        Faça login para criar novos documentos.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* File Explorer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-2xl font-semibold text-transparent">
                Arquivos e Pastas
              </h2>
            </div>

            <div className="rounded-2xl border border-slate-200/50 bg-white/60 p-6 shadow-lg backdrop-blur-sm">
              <FileExplorer
                documents={documents ?? []}
                onDocumentClick={handleDocumentClick}
                onCreateDocument={handleCreateDocument}
                onCreateFolder={handleCreateFolder}
                onDeleteDocument={handleDeleteDocument}
                onRenameDocument={handleRenameDocument}
                isAuthenticated={!!isAuthenticated}
                currentUserId={convexUserId ?? undefined}
                isLoading={documents === undefined}
              />
            </div>
          </motion.div>
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
