"use client";

import { getProviders, signIn, getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert } from "~/components/ui/alert";
import { Mail, MessageSquare, AlertCircle, ArrowLeft } from "lucide-react";
import Header from "~/app/components/Header";
import Footer from "~/app/components/Footer";

interface Provider {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
}

const providerIcons: Record<string, React.ReactNode> = {
  google: (
    <svg
      width="256"
      height="262"
      viewBox="0 0 256 262"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid"
    >
      <path
        d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
        fill="#4285F4"
      />
      <path
        d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
        fill="#34A853"
      />
      <path
        d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
        fill="#FBBC05"
      />
      <path
        d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
        fill="#EB4335"
      />
    </svg>
  ),
  discord: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  ),
  email: <Mail className="h-5 w-5" />,
};

const providerColors: Record<string, string> = {
  google:
    "hover:bg-gray-50 border-gray-300 text-gray-700 hover:border-gray-400",
  discord:
    "hover:bg-indigo-50 border-indigo-200 text-indigo-700 hover:border-indigo-300",
  email: "hover:bg-blue-50 border-blue-200 text-blue-700 hover:border-blue-300",
};

export default function SignIn() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(
    null,
  );
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await getProviders();
        console.log("Available providers:", res);
        setProviders(res);
      } catch (error) {
        console.error("Error fetching providers:", error);
      }
    };
    void fetchProviders();
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push(callbackUrl);
      }
    };
    void checkSession();
  }, [router, callbackUrl]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email before proceeding
    if (!email?.trim()) {
      console.error("Email is required");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Attempting email sign in with:", email);
      console.log("Available providers:", providers);

      // Find the email provider ID (could be "email" or "nodemailer")
      const emailProvider =
        providers && Object.values(providers).find((p) => p.type === "email");
      const providerId = emailProvider?.id ?? "nodemailer";

      console.log("Using provider ID:", providerId);

      // Use signIn with redirect: true for email providers to properly handle the flow
      await signIn(providerId, {
        email: email.trim(),
        callbackUrl,
        redirect: true, // Let NextAuth handle the redirect to verify-request page
      });

      // If we reach here, something went wrong
      console.log("Sign in completed without redirect");
    } catch (error) {
      console.error("Email sign in error:", error);
      setIsLoading(false);
    }
  };

  const handleProviderSignIn = async (providerId: string) => {
    setIsLoading(true);
    try {
      await signIn(providerId, { callbackUrl });
    } catch (error) {
      console.error("Provider sign in error:", error);
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
        return "Credenciais inválidas.";
      case "SessionRequired":
        return "Você precisa estar logado para acessar esta página.";
      default:
        return "Ocorreu um erro durante a autenticação.";
    }
  };

  if (emailSent) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-grow items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            {/* Subtle top accent line */}
            <div className="mb-8 h-[1px] w-full bg-gradient-to-r from-blue-500 to-indigo-500" />

            <Card className="border-slate-200 shadow-lg">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Verifique seu email
                </CardTitle>
                <CardDescription>
                  Enviamos um link de acesso para <strong>{email}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-sm text-slate-600">
                  Clique no link enviado para fazer login. O link expira em 24
                  horas.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setEmailSent(false)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-grow items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Subtle top accent line */}
          <div className="mb-8 h-[1px] w-full bg-gradient-to-r from-blue-500 to-indigo-500" />

          <Card className="border-slate-200 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-2xl text-transparent">
                Entrar
              </CardTitle>
              <CardDescription>Acesse sua conta para continuar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <div className="text-red-800">{getErrorMessage(error)}</div>
                </Alert>
              )}

              {/* OAuth Providers */}
              {providers && (
                <div className="space-y-3">
                  {Object.values(providers)
                    .filter(
                      (provider) =>
                        provider.id !== "email" && provider.id !== "nodemailer",
                    )
                    .map((provider) => (
                      <Button
                        key={provider.id}
                        variant="outline"
                        className={`w-full justify-center gap-3 py-6 text-base font-medium transition-all duration-200 ${
                          providerColors[provider.id] ?? "hover:bg-slate-50"
                        }`}
                        onClick={() => handleProviderSignIn(provider.id)}
                        disabled={isLoading}
                      >
                        <span className="flex-shrink-0">
                          {providerIcons[provider.id] ?? (
                            <MessageSquare className="h-5 w-5" />
                          )}
                        </span>
                        Continuar com {provider.name}
                      </Button>
                    ))}
                </div>
              )}

              {/* Divider */}
              {providers && Object.keys(providers).length > 1 && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500">ou</span>
                  </div>
                </div>
              )}

              {/* Email Sign In */}
              {(providers?.email ?? providers?.nodemailer) && (
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="transition-all duration-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
                    disabled={isLoading || !email}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                        Enviando...
                      </div>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Enviar link de acesso
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* Back to home */}
              <div className="text-center">
                <Link
                  href="/"
                  className="text-sm text-slate-600 transition-colors duration-300 hover:text-slate-900"
                >
                  ← Voltar ao início
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
