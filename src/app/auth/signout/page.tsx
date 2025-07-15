"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { LogOut, ArrowLeft, CheckCircle } from "lucide-react";
import Header from "~/app/components/Header";
import Footer from "~/app/components/Footer";

export default function SignOut() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignedOut, setIsSignedOut] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  useEffect(() => {
    // If user is not authenticated, redirect to home
    if (status === "unauthenticated") {
      setIsSignedOut(true);
    }
  }, [status]);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut({
        callbackUrl,
        redirect: false,
      });
      setIsSignedOut(true);
      toast.success("Logout realizado com sucesso!");
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Erro ao fazer logout. Tente novamente.");
      setIsSignedOut(false);
      setIsLoading(false);
    }
  };

  const handleNavigateToCallback = () => {
    router.push(callbackUrl);
  };

  const handleCancel = () => {
    router.back();
  };

  if (isSignedOut) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-grow items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            {/* Subtle top accent line */}
            <div className="mb-8 h-[1px] w-full bg-gradient-to-r from-blue-500 to-indigo-500" />

            <Card className="border-slate-200 shadow-lg">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Logout realizado
                </CardTitle>
                <CardDescription>
                  Você foi desconectado com sucesso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-sm text-slate-600">
                  Obrigado por usar o Espaço Pessoal. Escolha para onde deseja ir:
                </p>
                <div className="flex flex-col gap-3">
                  <Button
                    className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
                    onClick={handleNavigateToCallback}
                  >
                    {callbackUrl === "/" ? "Ir para Início" : "Continuar onde parei"}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push("/")}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Início
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push("/auth/signin")}
                    >
                      Entrar novamente
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-grow items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <Card className="border-slate-200 shadow-lg">
              <CardContent className="flex items-center justify-center p-8">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-r-transparent" />
                  <span className="text-slate-600">Carregando...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-grow items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            {/* Subtle top accent line */}
            <div className="mb-8 h-[1px] w-full bg-gradient-to-r from-blue-500 to-indigo-500" />

            <Card className="border-slate-200 shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Não autenticado
                </CardTitle>
                <CardDescription>
                  Você não está logado no momento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-sm text-slate-600">
                  Você precisa estar logado para fazer logout.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push("/")}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Início
                  </Button>
                  <Button
                    className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
                    onClick={() => router.push("/auth/signin")}
                  >
                    Fazer login
                  </Button>
                </div>
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
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600">
                <LogOut className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
                Confirmar logout
              </CardTitle>
              <CardDescription>
                Tem certeza que deseja sair da sua conta?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User info */}
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  {session.user.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name ?? "User"}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                      <span className="text-sm font-semibold text-white">
                        {session.user.name?.[0]?.toUpperCase() ??
                          session.user.email?.[0]?.toUpperCase() ??
                          "U"}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">
                      {session.user.name ?? "Usuário"}
                    </span>
                    <span className="text-xs text-slate-500">
                      {session.user.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-red-600 text-white hover:bg-red-700"
                  onClick={handleSignOut}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                      Saindo...
                    </div>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
