import { useEffect, useState } from "react";
import {
  getProviders,
  signIn,
  getSession,
  getCsrfToken,
} from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

interface Provider {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
}

interface UseSignInHandlersReturn {
  // State
  providers: Record<string, Provider> | null;
  email: string;
  setEmail: (email: string) => void;
  isLoading: boolean;
  emailSent: boolean;
  code: string;
  setCode: (code: string) => void;
  codeSent: boolean;
  mounted: boolean;
  csrfToken: string | undefined;
  error: string | null;
  callbackUrl: string;

  // Handlers
  handleEmailSignIn: (e: React.FormEvent) => Promise<void>;
  handleProviderSignIn: (providerId: string) => Promise<void>;
  handleSendCode: (e: React.FormEvent) => Promise<void>;
  handleVerifyCode: (e: React.FormEvent) => Promise<void>;
  setEmailSent: (sent: boolean) => void;
  setCodeSent: (sent: boolean) => void;
  getErrorMessage: (error: string) => string;
}

export function useSignInHandlers(): UseSignInHandlersReturn {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(
    null,
  );
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | undefined>(undefined);

  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchProviders = async () => {
      try {
        const [res, csrf] = await Promise.all([getProviders(), getCsrfToken()]);
        setProviders(res);
        setCsrfToken(csrf);
      } catch (error) {
        console.error("Error fetching providers or CSRF token:", error);
        toast.error(
          "Erro ao carregar configurações de autenticação. Tente recarregar a página.",
        );
      }
    };
    void fetchProviders();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push(callbackUrl);
      }
    };
    void checkSession();
  }, [router, callbackUrl, mounted]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email?.trim()) {
      toast.error("Por favor, insira um endereço de email válido.");
      return;
    }

    setIsLoading(true);

    try {
      const emailProvider =
        providers && Object.values(providers).find((p) => p.type === "email");
      const providerId = emailProvider?.id ?? "nodemailer";

      await signIn(providerId, {
        email: email.trim().toLowerCase(),
        callbackUrl,
        redirect: true,
      });
    } catch (error) {
      console.error("Email sign in error:", error);
      toast.error("Erro ao enviar link de verificação. Tente novamente.");
      setIsLoading(false);
    }
  };

  const handleProviderSignIn = async (providerId: string) => {
    setIsLoading(true);
    try {
      await signIn(providerId, { callbackUrl });
    } catch (error) {
      console.error("Provider sign in error:", error);
      toast.error(
        "Erro ao conectar com o provedor de autenticação. Tente novamente.",
      );
      setIsLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email?.trim()) {
      toast.error("Por favor, insira um endereço de email válido.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (response.ok && result.success) {
        toast.success("Código enviado com sucesso! Verifique seu email.");
        setCodeSent(true);
      } else {
        console.error("Error sending code:", result.error);
        toast.error("Erro ao enviar código de verificação. Tente novamente.");
      }
    } catch (error) {
      console.error("Magic code send error:", error);
      toast.error("Erro ao enviar código de verificação. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email?.trim() || !code?.trim()) {
      toast.error("Por favor, insira o email e o código de verificação.");
      return;
    }

    if (!csrfToken) {
      toast.error("Erro de segurança. Recarregue a página e tente novamente.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("magic-numbers", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        csrfToken,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        console.error("Error verifying code:", result.error);
        toast.error(
          "Código de verificação inválido ou expirado. Tente novamente.",
        );
        setIsLoading(false);
      } else if (result?.ok) {
        toast.success("Login realizado com sucesso! Redirecionando...");
        router.push(result.url ?? callbackUrl);
      } else {
        console.error("Unexpected result:", result);
        toast.error("Erro inesperado durante a verificação. Tente novamente.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Magic code verify error:", error);
      toast.error("Erro ao verificar código. Tente novamente.");
      setIsLoading(false);
    }
  };

  const getErrorMessage = (error: string) => {
    switch (error) {
      case "OAuthSignin":
        return "Erro ao iniciar autenticação com o provedor.";
      case "OAuthCallback":
        return "Erro na resposta do provedor de autenticação.";
      case "OAuthCreateAccount":
        return "Não foi possível criar uma conta com este provedor.";
      case "EmailCreateAccount":
        return "Não foi possível criar uma conta com este email.";
      case "Callback":
        return "Erro no processo de autenticação.";
      case "OAuthAccountNotLinked":
        return "Este email já está associado a outra conta. Tente fazer login com o método original.";
      case "EmailSignin":
        return "Não foi possível enviar o email de verificação.";
      case "CredentialsSignin":
        return "Código de verificação inválido ou expirado. Tente novamente ou solicite um novo código.";
      case "SessionRequired":
        return "Você precisa estar logado para acessar esta página.";
      case "Configuration":
        return "Erro de configuração do servidor. Tente novamente mais tarde.";
      default:
        return "Ocorreu um erro durante a autenticação.";
    }
  };

  return {
    // State
    providers,
    email,
    setEmail,
    isLoading,
    emailSent,
    code,
    setCode,
    codeSent,
    mounted,
    csrfToken,
    error,
    callbackUrl,

    // Handlers
    handleEmailSignIn,
    handleProviderSignIn,
    handleSendCode,
    handleVerifyCode,
    setEmailSent,
    setCodeSent,
    getErrorMessage,
  };
}
