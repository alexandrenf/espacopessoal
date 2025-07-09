"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

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
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Gentle floating orbs */}
      <div className="absolute right-1/4 top-1/4 h-72 w-72 animate-pulse rounded-full bg-white/10 blur-3xl" />
      <div
        className="absolute bottom-1/4 left-1/4 h-96 w-96 animate-pulse rounded-full bg-white/5 blur-3xl"
        style={{ animationDelay: "2s" }}
      />

      {/* Error notification */}
      {authError && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-4 right-4 top-4 z-50 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 backdrop-blur-sm"
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
            className="mb-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-4 py-2 text-sm text-white backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-yellow-300" />
              Seu espaço digital pessoal
            </div>
          </motion.div>

          <motion.h1
            className="mb-6 text-5xl font-bold leading-tight text-white md:text-7xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            Organize suas ideias em um{" "}
            <span className="bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
              espaço único
            </span>
          </motion.h1>

          <motion.p
            className="mx-auto mb-10 max-w-3xl text-xl leading-relaxed text-blue-100 md:text-2xl"
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
              href={session ? "/profile" : "/api/auth/signin"}
              className="group"
            >
              <Button
                size="lg"
                className="rounded-xl bg-white/95 px-8 py-6 text-lg text-blue-700 shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-white hover:shadow-xl group-hover:scale-105"
              >
                {status === "loading" ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-700/30 border-t-blue-700" />
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
              className="px-6 py-3 text-lg font-medium text-white/80 transition-colors hover:text-white"
            >
              Conhecer recursos
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-blue-100"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400" />
              <span>100% Gratuito</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-400" />
              <span>Sem cartão necessário</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-pink-400" />
              <span>Pronto em 1 minuto</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
