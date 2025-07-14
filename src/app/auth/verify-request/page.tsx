"use client";

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
import { Mail, ArrowLeft, RefreshCw } from "lucide-react";
import Header from "~/app/components/Header";
import Footer from "~/app/components/Footer";

export default function VerifyRequest() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const provider = searchParams.get("provider");

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
                {email ? (
                  <>
                    Enviamos um link de acesso para <strong>{email}</strong>
                  </>
                ) : (
                  "Um link de verificação foi enviado para seu email"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-blue-900">
                    Próximos passos:
                  </h3>
                  <ol className="space-y-1 text-sm text-blue-800">
                    <li>1. Verifique sua caixa de entrada</li>
                    <li>2. Clique no link enviado</li>
                    <li>3. Você será redirecionado automaticamente</li>
                  </ol>
                </div>

                <div className="rounded-lg bg-amber-50 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-amber-900">
                    Não recebeu o email?
                  </h3>
                  <ul className="space-y-1 text-sm text-amber-800">
                    <li>• Verifique sua pasta de spam</li>
                    <li>• O link expira em 24 horas</li>
                    <li>• Você pode solicitar um novo link</li>
                  </ul>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                <Button
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
                  asChild
                >
                  <Link href="/auth/signin">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Solicitar novo link
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
                  Problemas com o email?{" "}
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
      </main>
      <Footer />
    </div>
  );
}
