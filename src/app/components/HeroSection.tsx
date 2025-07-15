"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Edit3 } from "lucide-react";

export default function HeroSection() {
  const { data: session, status } = useSession();
  const [authError, setAuthError] = useState<boolean>(false);

  useEffect(() => {
    if (status === "unauthenticated" && session === undefined) {
      console.error("Authentication error occurred");
      setAuthError(true);
    }
  }, [status, session]);

  return (
    <section className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      {/* Subtle background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* Error notification */}
      {authError && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-4 right-4 top-4 z-50 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800"
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span>
              Ocorreu um erro na autenticação. Por favor, tente novamente mais
              tarde.
            </span>
          </div>
        </motion.div>
      )}

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm text-blue-700 ring-1 ring-blue-200">
              <Edit3 className="h-4 w-4" />
              Seu espaço digital pessoal
            </div>
          </motion.div>

          <motion.h1
            className="mb-6 text-5xl font-bold leading-tight text-slate-900 md:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            Organize suas ideias em um{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              espaço único
            </span>
          </motion.h1>

          <motion.p
            className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-slate-600"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Crie, organize e acesse suas notas de qualquer lugar. Simples,
            seguro e sempre disponível.
          </motion.p>

          <motion.div
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <Link
              href={session ? "/profile" : "/auth/signin"}
              className="group"
            >
              <Button
                size="lg"
                className="rounded-lg bg-blue-600 px-8 py-6 text-lg text-white shadow-lg transition-all duration-300 hover:bg-blue-700 hover:shadow-xl group-hover:scale-105"
              >
                {status === "loading" ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Carregando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {session ? "Acessar Meu Espaço" : "Começar Gratuitamente"}
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </Button>
            </Link>

            <Link
              href="#recursos"
              className="px-6 py-3 text-lg font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Conhecer recursos
            </Link>
          </motion.div>

          {/* Simplified trust indicators */}
          <motion.div
            className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span>100% Gratuito</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span>Sem cartão necessário</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              <span>Pronto em 1 minuto</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
