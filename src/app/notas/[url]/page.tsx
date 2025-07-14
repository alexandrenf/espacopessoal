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
import Header from "~/app/components/Header";
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
  Settings,
} from "lucide-react";
import { toast } from "~/hooks/use-toast";
import { useConvexUser } from "~/hooks/use-convex-user";
import { DocumentNotFound } from "~/components_new/DocumentNotFound";
import { NotebookDialog } from "~/components_new/NotebookEditDialog";
import Link from "next/link";
import { FileExplorer } from "~/app/components/FileExplorer";

// Type guards for Convex query results
type NotebookData = {
  _id: string;
  title: string;
  description?: string;
  url: string;
  isPrivate: boolean;
  createdAt: number;
  updatedAt: number;
  ownerId: string;
  isOwner?: boolean;
  password?: string;
};

type NotebookMetadata = {
  _id: string;
  title: string;
  description?: string;
  url: string;
  isPrivate: boolean;
  hasPassword: boolean;
  createdAt: number;
  updatedAt: number;
  ownerId: string;
};

type PasswordVerificationResult = {
  valid: boolean;
  sessionToken?: string;
  expiresAt?: number;
  notebook?: NotebookData;
};

const isNotebookData = (data: unknown): data is NotebookData => {
  return (
    typeof data === "object" &&
    data !== null &&
    "_id" in data &&
    "title" in data &&
    "url" in data &&
    "isPrivate" in data &&
    "createdAt" in data &&
    "ownerId" in data
  );
};

type NotebookError = {
  error: "unauthorized";
  reason: string;
  requiresPassword: boolean;
};

const isNotebookError = (data: unknown): data is NotebookError => {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    "reason" in data &&
    "requiresPassword" in data &&
    (data as NotebookError).error === "unauthorized"
  );
};

const isNotebookMetadata = (data: unknown): data is NotebookMetadata => {
  return (
    typeof data === "object" &&
    data !== null &&
    "_id" in data &&
    "title" in data &&
    "url" in data &&
    "isPrivate" in data &&
    "hasPassword" in data &&
    "createdAt" in data &&
    "ownerId" in data
  );
};

const isPasswordVerificationResult = (
  data: unknown,
): data is PasswordVerificationResult => {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    "valid" in obj &&
    typeof obj.valid === "boolean" &&
    (!obj.sessionToken || typeof obj.sessionToken === "string") &&
    (!obj.expiresAt || typeof obj.expiresAt === "number")
  );
};

// Import secure session management
import {
  getStoredSession,
  storeSession,
  removeSession,
} from "~/lib/secure-session";

// Device fingerprinting for enhanced security
const generateDeviceFingerprint = (): string => {
  const fingerprintComponents: string[] = [];

  // Safely get user agent
  try {
    fingerprintComponents.push(navigator.userAgent ?? "unknown");
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Failed to get user agent:", error);
    }
    fingerprintComponents.push("unknown");
  }

  // Safely get language
  try {
    fingerprintComponents.push(navigator.language ?? "unknown");
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Failed to get language:", error);
    }
    fingerprintComponents.push("unknown");
  }

  // Safely get screen dimensions
  try {
    const width = screen.width ?? 0;
    const height = screen.height ?? 0;
    fingerprintComponents.push(`${width}x${height}`);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Failed to get screen dimensions:", error);
    }
    fingerprintComponents.push("0x0");
  }

  // Safely get timezone offset
  try {
    const timezoneOffset = new Date().getTimezoneOffset();
    fingerprintComponents.push(timezoneOffset.toString());
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Failed to get timezone offset:", error);
    }
    fingerprintComponents.push("0");
  }

  // Safely generate canvas fingerprint with comprehensive error handling
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      try {
        // Set canvas properties with error handling
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("Device fingerprint 🔒", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("Security check", 4, 35);

        // Try to get canvas data
        const canvasData = canvas.toDataURL();
        fingerprintComponents.push(canvasData);
      } catch (canvasError) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Canvas operations failed:", canvasError);
        }
        fingerprintComponents.push("canvas_blocked");
      }
    } else {
      if (process.env.NODE_ENV === "development") {
        console.warn("Canvas context not available");
      }
      fingerprintComponents.push("no_canvas_context");
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Canvas creation failed:", error);
    }
    fingerprintComponents.push("canvas_unavailable");
  }

  // Additional fingerprinting components with error handling
  try {
    // Use userAgentData if available (modern browsers), fallback to deprecated platform
    const navigatorWithUserAgentData = navigator as Navigator & {
      userAgentData?: {
        platform?: string;
      };
    };

    if (navigatorWithUserAgentData.userAgentData?.platform) {
      fingerprintComponents.push(
        navigatorWithUserAgentData.userAgentData.platform,
      );
    } else {
      // Fallback to deprecated platform property with proper typing
      const navigatorWithPlatform = navigator as Navigator & {
        platform?: string;
      };
      fingerprintComponents.push(navigatorWithPlatform.platform ?? "unknown");
    }
  } catch {
    fingerprintComponents.push("unknown");
  }

  try {
    fingerprintComponents.push(
      navigator.cookieEnabled ? "cookies_enabled" : "cookies_disabled",
    );
  } catch {
    fingerprintComponents.push("cookies_unknown");
  }

  const fingerprint = fingerprintComponents.join("|");

  // Robust hash function using FNV-1a algorithm for better distribution
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < fingerprint.length; i++) {
    hash ^= fingerprint.charCodeAt(i);
    hash = Math.imul(hash, 16777619); // FNV prime
  }

  // Convert to unsigned 32-bit integer and then to base36
  return (hash >>> 0).toString(36);
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
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-grow items-center justify-center">
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingNotebook, setEditingNotebook] = useState<NotebookData | null>(
    null,
  );

  const rawUrl = typeof url === "string" ? url : "";
  const normalizedUrl = rawUrl.toLowerCase();
  const isAuthenticated = status === "authenticated" && session;

  // Redirect to lowercase URL if the original URL contains uppercase letters
  useEffect(() => {
    if (rawUrl && rawUrl !== normalizedUrl) {
      router.replace(`/notas/${normalizedUrl}`);
      return;
    }
  }, [rawUrl, normalizedUrl, router]);

  // Redirect to main notas page if URL is empty or just a slash
  useEffect(() => {
    if (normalizedUrl === "" || normalizedUrl === "/" || !normalizedUrl) {
      router.replace("/notas");
    }
  }, [normalizedUrl, router]);

  // Note: Legacy password loading code removed in favor of secure session management
  // Sessions are now handled in the secure session management useEffect below

  // Try to get notebook information using Convex with secure session management
  const [hasValidSession, setHasValidSession] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isSessionValidationComplete, setIsSessionValidationComplete] =
    useState(false);

  // Verify password mutation using Convex (now returns session token)
  const verifyPassword = useMutation(convexApi.notebooks.validatePassword);

  // Validate stored session token using secure HTTP-only cookies
  useEffect(() => {
    if (normalizedUrl && normalizedUrl !== "" && normalizedUrl !== "/") {
      const validateSession = async () => {
        if (!hasValidSession && !isSessionValidationComplete) {
          console.log("Checking for stored session...");

          try {
            const storedSession = await getStoredSession(normalizedUrl);

            if (storedSession) {
              console.log("Found stored session, checking expiration...");

              // Check if session is expired
              if (storedSession.expiresAt <= Date.now()) {
                console.log("Stored session is expired, removing from storage");
                await removeSession(normalizedUrl);
                setIsSessionValidationComplete(true);
                return;
              }

              console.log("Session is valid, setting up for notebook access");
              setSessionToken(storedSession.token);
              setHasValidSession(true);
              setIsSessionValidationComplete(true);
            } else {
              // No stored session, mark validation as complete immediately
              console.log(
                "No stored session found, marking validation complete",
              );
              setIsSessionValidationComplete(true);
            }
          } catch (error) {
            console.error("Error validating session:", error);
            setIsSessionValidationComplete(true);
          }
        }
      };

      void validateSession();
    }
  }, [normalizedUrl, hasValidSession, isSessionValidationComplete]);

  // Debug effect to track hasValidSession changes
  useEffect(() => {
    console.log(
      "hasValidSession changed to:",
      hasValidSession,
      "validation complete:",
      isSessionValidationComplete,
      "sessionToken:",
      sessionToken ? "***EXISTS***" : "none",
    );
  }, [hasValidSession, isSessionValidationComplete, sessionToken]);

  // Get notebook metadata first (this works for all notebooks)
  const notebookMetadata = useQuery(
    convexApi.notebooks.getMetadataByUrl,
    normalizedUrl.length > 0 ? { url: normalizedUrl } : "skip",
  );

  // Get full notebook information using Convex with secure session validation
  const isOwner = notebookMetadata?.ownerId === convexUserId;
  const isPublicNotebook = !notebookMetadata?.isPrivate;
  const hasPassword = notebookMetadata?.hasPassword;

  // Auto-show password prompt if needed
  const needsPassword = hasPassword && !isOwner && !hasValidSession;

  // Use different queries based on notebook type
  const publicNotebook = useQuery(
    convexApi.notebooks.getPublicNotebook,
    isPublicNotebook && normalizedUrl.length > 0
      ? { url: normalizedUrl }
      : "skip",
  );

  // Enhanced safety checks to prevent premature query execution for private notebooks
  const privateNotebookQueryEnabled =
    normalizedUrl.length > 0 &&
    notebookMetadata && // Ensure metadata is loaded first
    !isPublicNotebook && // Only for private notebooks
    isSessionValidationComplete && // Wait for stored session validation to complete
    (isOwner || // Owner can always access
      (!hasPassword && notebookMetadata?.isPrivate) || // Private notebooks without passwords (owner-only access handled above)
      (hasPassword && hasValidSession && sessionToken && !needsPassword)); // Private notebooks with passwords need valid session token AND no password prompt needed

  // Use secure session-based query arguments with enhanced validation
  const privateNotebookQueryArgs = privateNotebookQueryEnabled
    ? {
        url: normalizedUrl,
        userId: convexUserId ?? undefined,
        sessionToken:
          hasPassword && !isOwner ? (sessionToken ?? undefined) : undefined,
      }
    : "skip";

  const privateNotebook = useQuery(
    convexApi.notebooks.getByUrlWithSession,
    privateNotebookQueryArgs,
  );

  // Use the appropriate notebook data
  const notebookQueryResult = isPublicNotebook
    ? publicNotebook
    : privateNotebook;

  console.log("Notebook query state:", {
    normalizedUrl,
    hasValidSession,
    sessionToken: sessionToken ? "***EXISTS***" : "none",
    isSessionValidationComplete,
    hasPassword,
    ownerId: notebookMetadata?.ownerId,
    convexUserId,
    isOwner,
    isPublicNotebook,
    queryEnabled: isPublicNotebook
      ? publicNotebook !== undefined
      : privateNotebookQueryEnabled,
  });

  // Refetch function for after editing
  const refetchNotebook = () => {
    // Convex queries automatically refetch when mutations complete
    // This will be called when the edit dialog closes successfully
  };

  // Type guard the notebook result - handle loading, error, and success states
  const notebook =
    notebookQueryResult !== undefined && isNotebookData(notebookQueryResult)
      ? notebookQueryResult
      : null;

  // Check for error responses
  const notebookError =
    notebookQueryResult !== undefined && isNotebookError(notebookQueryResult)
      ? notebookQueryResult
      : null;

  // Get documents in notebook (if we have access)
  const documentsQueryArgs = notebook
    ? {
        userId: convexUserId ?? undefined,
        notebookId: notebook._id as Id<"notebooks">,
        sessionToken: sessionToken ?? undefined, // Pass session token for validation
      }
    : "skip";

  console.log(
    "About to run documents query with args:",
    documentsQueryArgs === "skip"
      ? "SKIP"
      : {
          userId:
            typeof documentsQueryArgs === "object" &&
            documentsQueryArgs !== null
              ? documentsQueryArgs.userId
              : undefined,
          notebookId:
            typeof documentsQueryArgs === "object" &&
            documentsQueryArgs !== null
              ? documentsQueryArgs.notebookId
              : undefined,
          sessionToken: sessionToken ? "***EXISTS***" : "none",
        },
  );

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

  // Handle password submission with secure session creation
  const handlePasswordSubmit = async (enteredPassword: string) => {
    try {
      console.log("Verifying password for:", normalizedUrl);

      // Generate device fingerprint for enhanced security
      const deviceFingerprint = generateDeviceFingerprint();

      const result = await verifyPassword({
        url: normalizedUrl,
        password: enteredPassword,
        deviceFingerprint,
        userAgent: navigator.userAgent,
        ipAddress: undefined, // Will be handled server-side
      });

      if (!isPasswordVerificationResult(result)) {
        throw new Error("Invalid password verification result");
      }

      console.log("Password verification result:", {
        valid: result.valid,
        hasSessionToken: !!result.sessionToken,
        expiresAt: result.expiresAt ? new Date(result.expiresAt) : undefined,
      });

      if (result.valid && result.sessionToken && result.expiresAt) {
        const sessionToken = result.sessionToken;
        const expiresAt = result.expiresAt;

        console.log("Password is valid, storing secure session");

        // Store secure session token instead of password
        const sessionStored = await storeSession(
          normalizedUrl,
          sessionToken,
          expiresAt,
        );

        if (sessionStored) {
          // Update state
          setSessionToken(sessionToken);
          setShowPasswordPrompt(false);
          setHasValidSession(true);
          setIsSessionValidationComplete(true);

          toast({
            title: "Acesso liberado",
            description: "Senha correta! Você pode agora acessar o notebook.",
          });
        } else {
          console.error("Failed to store session");
          toast({
            title: "Erro",
            description: "Falha ao salvar sessão. Tente novamente.",
            variant: "destructive",
          });
        }
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

  console.log("Password prompt logic:", {
    hasPassword,
    ownerId: notebookMetadata?.ownerId,
    convexUserId,
    isOwner,
    hasValidSession,
    sessionToken: sessionToken ? "***EXISTS***" : "none",
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
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-grow items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
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
      </div>
    );
  }

  // Check if notebook metadata is loading
  if (notebookMetadata === undefined) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-grow items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
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
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-grow items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
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
      </div>
    );
  }

  // Handle structured error responses
  if (notebookError) {
    if (notebookError.requiresPassword) {
      // Handle password-protected notebooks
      return (
        <div className="flex min-h-screen flex-col">
          <Header />
          <div className="flex flex-grow items-center justify-center">
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                <svg
                  className="h-8 w-8 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m0 0v2m0-2h2m-2 0h-2m2-4V9a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h4"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Password Required
              </h2>
              <p className="text-gray-600">{notebookError.reason}</p>
              <button
                onClick={() => setShowPasswordPrompt(true)}
                className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Enter Password
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      // Handle private notebooks without password
      return (
        <div className="flex min-h-screen flex-col">
          <Header />
          <div className="flex flex-grow items-center justify-center">
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m0 0v2m0-2h2m-2 0h-2m2-4V9a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h4"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Access Denied
              </h2>
              <p className="text-gray-600">{notebookError.reason}</p>
              <Link
                href="/notas"
                className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Go to Notebooks
              </Link>
            </div>
          </div>
        </div>
      );
    }
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
  const notebookData =
    notebook ??
    (isNotebookMetadata(notebookMetadata) ? notebookMetadata : null);

  // If authenticated user but no convexUserId, show error
  if (isAuthenticated && !convexUserId && !isUserLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-grow items-center justify-center">
          <div className="text-center">
            <p className="mb-4 text-red-600">Error loading user data</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle create document (only for authenticated users)
  const handleCreateDocument = async () => {
    if (!convexUserId || !notebookData) {
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
    if (!convexUserId || !notebookData) {
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
  const accessLevel =
    notebookData && !notebookData.isPrivate
      ? "public"
      : notebookMetadata &&
          "hasPassword" in notebookMetadata &&
          notebookMetadata.hasPassword
        ? "password"
        : "private";

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
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
                    {notebookData?.title ?? "Loading..."}
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
                    <span>
                      Criado em{" "}
                      {notebookData?.createdAt
                        ? formatDate(notebookData.createdAt)
                        : "N/A"}
                    </span>
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
                    {/* Settings button - only show for notebook owners */}
                    {isOwner && notebookData && (
                      <Button
                        onClick={() => {
                          setEditingNotebook(notebookData);
                          setShowEditDialog(true);
                        }}
                        variant="outline"
                        className="border-blue-200/50 bg-white/80 text-blue-700 backdrop-blur-sm hover:bg-blue-50"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Configurações
                      </Button>
                    )}
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
            {notebookData &&
              "description" in notebookData &&
              notebookData.description && (
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

      {/* Notebook Edit Dialog */}
      <NotebookDialog
        editingNotebook={editingNotebook}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={() => {
          refetchNotebook();
          setEditingNotebook(null);
        }}
      />
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
