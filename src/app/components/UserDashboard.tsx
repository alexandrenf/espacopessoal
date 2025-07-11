"use client";

import { useRef, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Notebook,
  CheckSquare,
  Calculator,
  ArrowRight,
  Clock,
  Sparkles,
  Heart,
  Settings,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import React from "react";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  isActive?: boolean;
  comingSoon?: string;
  onClick?: () => void;
  index: number;
  status?: "unconfigured" | "configured";
}

const FeatureCard = ({
  title,
  description,
  icon,
  href,
  isActive = true,
  comingSoon,
  onClick,
  index,
  status,
}: FeatureCardProps & { status?: "unconfigured" | "configured" }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const cardContent = (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: isActive ? -4 : 0, scale: isActive ? 1.02 : 1 }}
      transition={{
        opacity: { duration: 0.4, delay: index * 0.1 },
        y: { duration: 0.4, delay: index * 0.1 },
        scale: { type: "spring", stiffness: 300, damping: 20 },
      }}
      className={cn(
        "group relative h-full overflow-hidden rounded-xl border p-6 transition-all duration-300",
        isActive
          ? "cursor-pointer border-slate-200 bg-white shadow-sm hover:shadow-md"
          : "cursor-default border-slate-200 bg-slate-50 opacity-70",
      )}
    >
      {!isActive && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-slate-100/80">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 shadow-sm"
          >
            <Clock className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">
              {comingSoon}
            </span>
          </motion.div>
        </div>
      )}

      <div className="flex items-start gap-4">
        <motion.div
          className={cn(
            "flex-shrink-0 rounded-lg p-3 transition-all duration-300",
            status === "unconfigured"
              ? "bg-orange-100 text-orange-600 group-hover:bg-orange-200"
              : "bg-blue-100 text-blue-600 group-hover:bg-blue-200",
          )}
          whileHover={{
            scale: 1.05,
          }}
          transition={{ duration: 0.2 }}
        >
          <div className="relative z-10">{icon}</div>
        </motion.div>

        <div className="flex-1">
          <h3 className="mb-2 flex items-center gap-2 text-xl font-semibold text-slate-900">
            {title}
            {status === "unconfigured" && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700"
              >
                <Settings className="h-3 w-3" />
                Configurar
              </motion.span>
            )}
          </h3>
          <p
            className={cn(
              "mb-4 text-sm leading-relaxed",
              status === "unconfigured"
                ? "font-medium text-orange-700"
                : "text-slate-600",
            )}
          >
            {status === "unconfigured"
              ? "Crie seu primeiro notebook para começar a organizar suas ideias em coleções temáticas!"
              : description}
          </p>
          {isActive && (
            <motion.div
              className={cn(
                "flex items-center text-sm font-medium",
                status === "unconfigured" ? "text-orange-600" : "text-blue-600",
              )}
              whileHover={{ x: 2 }}
              transition={{ duration: 0.2 }}
            >
              {status === "unconfigured"
                ? "Criar primeiro notebook"
                : "Gerenciar notebooks"}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (!isActive) {
    return cardContent;
  }

  return href ? (
    <Link href={href}>{cardContent}</Link>
  ) : (
    <button onClick={onClick} className="w-full text-left">
      {cardContent}
    </button>
  );
};

const LoadingState = () => (
  <main className="container mx-auto flex-grow px-4 py-8 duration-500 animate-in fade-in">
    <div className="mb-12">
      <div className="mb-4 h-12 w-64 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-6 w-96 animate-pulse rounded-lg bg-slate-200" />
    </div>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 animate-pulse rounded-lg bg-slate-200" />
            <div className="flex-1">
              <div className="mb-2 h-6 w-32 animate-pulse rounded-lg bg-slate-200" />
              <div className="h-4 w-full animate-pulse rounded-lg bg-slate-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </main>
);

export function UserDashboard() {
  const { data: session, status } = useSession();
  // Detect prefers-reduced-motion
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReduceMotion(mq.matches);
      const handler = () => setReduceMotion(mq.matches);
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, []);

  // Show loading state while authentication is being checked
  if (status === "loading") {
    return <LoadingState />;
  }

  const firstName = session?.user?.name?.split(" ")[0] ?? "Usuário";

  return (
    <main className="relative min-h-screen flex-grow bg-gradient-to-b from-slate-50 to-white">
      {/* Subtle background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="container relative z-10 mx-auto px-4 py-12">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="relative z-10">
              <motion.h1
                className="mb-4 flex items-center gap-3 text-4xl font-bold md:text-5xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
              >
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Olá, {firstName}!
                </span>
                <motion.div
                  animate={{
                    rotate: [0, 15, -15, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 4,
                  }}
                >
                  <Sparkles className="h-8 w-8 text-amber-500" />
                </motion.div>
              </motion.h1>

              <motion.p
                className="max-w-2xl text-xl leading-relaxed text-slate-600"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                {status === "authenticated"
                  ? "Que bom ter você por aqui! Vamos organizar suas ideias e aumentar sua produtividade hoje?"
                  : "Bem-vindo ao Espaço Pessoal! Faça login para começar sua jornada."}
              </motion.p>
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {status === "authenticated" && (
              <FeatureCard
                key="notebooks"
                index={0}
                title="Notebooks"
                description="Crie e organize suas ideias em notebooks temáticos com editor colaborativo avançado. Edição em tempo real, formatação rica e muito mais."
                icon={<Notebook className="h-8 w-8" />}
                href="/notas"
                isActive={true}
              />
            )}

            <FeatureCard
              key="todos"
              index={1}
              title="Lista de Afazeres"
              description="Gerencie suas tarefas e compromissos de forma eficiente com nossa lista de tarefas inteligente e intuitiva."
              icon={<CheckSquare className="h-8 w-8" />}
              isActive={status === "authenticated"}
              href={status === "authenticated" ? "/lista" : "/api/auth/signin"}
            />

            <FeatureCard
              key="calculators"
              index={2}
              title="Calculadoras Médicas"
              description="Acesse calculadoras específicas para a área médica, facilitando seu dia a dia clínico com precisão."
              icon={<Calculator className="h-8 w-8" />}
              isActive={false}
              comingSoon="Chegando em Março"
            />
          </AnimatePresence>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="relative z-10">
              <motion.h2
                className="mb-6 flex items-center gap-3 text-3xl font-bold"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {status === "authenticated" ? "Ações Rápidas" : "Começar"}
                </span>
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                >
                  <Heart className="h-6 w-6 text-rose-500" />
                </motion.div>
              </motion.h2>

              <motion.div
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                {status === "authenticated" ? (
                  <>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        asChild
                        size="lg"
                        className="rounded-lg bg-blue-600 px-6 py-6 text-white shadow-sm transition-all duration-300 hover:bg-blue-700 hover:shadow-md"
                      >
                        <Link
                          href="/profile"
                          className="group flex items-center gap-3"
                        >
                          <Settings className="h-5 w-5" />
                          Configurar Perfil
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant="outline"
                        asChild
                        size="lg"
                        className="rounded-lg border-slate-200 px-6 py-6 text-slate-700 shadow-sm transition-all duration-300 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
                      >
                        <Link
                          href="/notas"
                          className="group flex items-center gap-3"
                        >
                          <Notebook className="h-5 w-5" />
                          Notebooks
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </Button>
                    </motion.div>
                  </>
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      asChild
                      size="lg"
                      className="rounded-lg bg-blue-600 px-6 py-6 text-white shadow-sm transition-all duration-300 hover:bg-blue-700 hover:shadow-md"
                    >
                      <Link
                        href="/api/auth/signin"
                        className="group flex items-center gap-3"
                      >
                        <Zap className="h-5 w-5" />
                        Entrar para Começar
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
