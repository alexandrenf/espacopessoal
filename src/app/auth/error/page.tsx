"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Alert } from "~/components/ui/alert";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Header from "~/app/components/Header";
import Footer from "~/app/components/Footer";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorDetails = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return {
          title: "Erro de Configuração",
          description:
            "Há um problema na configuração do servidor de autenticação.",
          suggestion:
            "Tente novamente mais tarde ou entre em contato com o suporte.",
        };
      case "AccessDenied":
        return {
          title: "Acesso Negado",
          description: "Você não tem permissão para acessar este recurso.",
          suggestion: "Verifique se você está usando a conta correta.",
        };
      case "Verification":
        return {
          title: "Erro de Verificação",
          description: "O link de verificação é inválido ou expirou.",
          suggestion: "Solicite um novo link de verificação.",
        };
      case "OAuthSignin":
        return {
          title: "Erro no Provedor OAuth",
          description:
            "Não foi possível iniciar a autenticação com o provedor selecionado.",
          suggestion: "Tente novamente ou use outro método de login.",
        };
      case "OAuthCallback":
        return {
          title: "Erro de Callback OAuth",
          description:
            "Houve um problema na resposta do provedor de autenticação.",
          suggestion: "Tente fazer login novamente.",
        };
      case "OAuthCreateAccount":
        return {
          title: "Erro ao Criar Conta",
          description: "Não foi possível criar uma conta com este provedor.",
          suggestion:
            "Tente usar outro método de login ou entre em contato com o suporte.",
        };
      case "EmailCreateAccount":
        return {
          title: "Erro ao Criar Conta por Email",
          description:
            "Não foi possível criar uma conta com este endereço de email.",
          suggestion:
            "Verifique se o email está correto ou tente outro método.",
        };
      case "Callback":
        return {
          title: "Erro de Callback",
          description: "Houve um problema durante o processo de autenticação.",
          suggestion: "Tente fazer login novamente.",
        };
      case "OAuthAccountNotLinked":
        return {
          title: "Conta Não Vinculada",
          description:
            "Este email já está associado a uma conta criada com outro método.",
          suggestion:
            "Tente fazer login com o método original ou vincule as contas.",
        };
      case "EmailSignin":
        return {
          title: "Erro no Envio de Email",
          description: "Não foi possível enviar o email de verificação.",
          suggestion:
            "Verifique se o endereço de email está correto e tente novamente.",
        };
      case "CredentialsSignin":
        return {
          title: "Credenciais Inválidas",
          description: "As credenciais fornecidas são inválidas.",
          suggestion: "Verifique suas informações e tente novamente.",
        };
      case "SessionRequired":
        return {
          title: "Sessão Necessária",
          description: "Você precisa estar logado para acessar esta página.",
          suggestion: "Faça login para continuar.",
        };
      default:
        return {
          title: "Erro de Autenticação",
          description: "Ocorreu um erro inesperado durante a autenticação.",
          suggestion:
            "Tente novamente ou entre em contato com o suporte se o problema persistir.",
        };
    }
  };

  const errorDetails = getErrorDetails(error);

  return (
    <div className="w-full max-w-md">
      {/* Subtle top accent line */}
      <div className="mb-8 h-[1px] w-full bg-gradient-to-r from-red-500 to-rose-500" />

      <Card className="border-red-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
            {errorDetails.title}
          </CardTitle>
          <CardDescription>{errorDetails.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <div className="text-amber-800">
              <strong>Sugestão:</strong> {errorDetails.suggestion}
            </div>
          </Alert>

          {/* Error code for debugging */}
          {error && (
            <div className="rounded-lg bg-slate-100 p-3">
              <p className="text-xs text-slate-600">
                <strong>Código do erro:</strong> {error}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Button
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
              asChild
            >
              <Link href="/auth/signin">
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar novamente
              </Link>
            </Button>

            <Button variant="outline" className="w-full" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao início
              </Link>
            </Button>
          </div>

          {/* Help section */}
          <div className="border-t border-slate-200 pt-4 text-center">
            <p className="text-xs text-slate-500">
              Precisa de ajuda?{" "}
              <Link
                href="mailto:contato@espacopessoal.com"
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                Entre em contato
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 h-[1px] w-full bg-gradient-to-r from-red-500 to-rose-500" />
      <Card className="border-red-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
            Carregando...
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-r-transparent" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthError() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-grow items-center justify-center px-4 py-12">
        <Suspense fallback={<LoadingFallback />}>
          <AuthErrorContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
