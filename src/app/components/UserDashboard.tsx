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
  AlertCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { api } from "~/trpc/react";
// import { useQuery } from "convex/react";
// import { api as convexApi } from "../../../convex/_generated/api";
import { Button } from "~/components/ui/button";
// import { type Id } from "../../../convex/_generated/dataModel";
import { cn } from "~/lib/utils";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
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
      whileHover={{ y: isActive ? -8 : 0, scale: isActive ? 1.02 : 1 }}
      transition={{
        opacity: { duration: 0.4, delay: index * 0.15 },
        y: { duration: 0.4, delay: index * 0.15 },
        scale: { type: "spring", stiffness: 300, damping: 20 },
      }}
      className={cn(
        "group relative h-full overflow-hidden rounded-3xl border p-8 transition-all duration-500",
        isActive
          ? "cursor-pointer border-white/60 bg-white/95 shadow-lg backdrop-blur-sm hover:shadow-2xl"
          : "cursor-default border-white/40 bg-white/80 opacity-70 shadow-sm backdrop-blur-sm",
      )}
    >
      {/* Gradient glow effect */}
      <div
        className={cn(
          "absolute inset-0 -z-10 rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100",
          status === "unconfigured"
            ? "bg-gradient-to-br from-yellow-400/20 via-orange-400/10 to-red-400/20"
            : "bg-gradient-to-br from-blue-400/20 via-indigo-400/10 to-purple-400/20",
        )}
        style={{ filter: "blur(20px)" }}
      />

      {!isActive && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-slate-100/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-3 rounded-2xl border border-white/50 bg-white/95 px-6 py-3 shadow-lg backdrop-blur-sm"
          >
            <Clock className="h-5 w-5 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">
              {comingSoon}
            </span>
          </motion.div>
        </div>
      )}

      <div className="flex items-start gap-6">
        <motion.div
          className={cn(
            "relative flex-shrink-0 overflow-hidden rounded-2xl p-4 transition-all duration-500",
            status === "unconfigured"
              ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white group-hover:from-yellow-500 group-hover:to-orange-600"
              : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white group-hover:from-blue-600 group-hover:to-indigo-700",
          )}
          whileHover={{
            rotate: [0, -5, 5, 0],
            scale: 1.1,
          }}
          transition={{ duration: 0.4 }}
        >
          {/* Icon shine effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: "easeInOut",
            }}
          />
          <div className="relative z-10">{icon}</div>
        </motion.div>

        <div className="flex-1">
          <h3 className="mb-3 flex items-center gap-3 text-2xl font-bold text-slate-800">
            {title}
            {status === "unconfigured" && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg"
              >
                <Settings className="h-3 w-3" />
                Configurar
              </motion.span>
            )}
          </h3>
          <p
            className={cn(
              "mb-6 text-base leading-relaxed",
              status === "unconfigured"
                ? "font-medium text-yellow-700"
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
                "flex items-center text-base font-semibold",
                status === "unconfigured" ? "text-yellow-600" : "text-blue-600",
              )}
              whileHover={{ x: 5 }}
              transition={{ duration: 0.2 }}
            >
              {status === "unconfigured"
                ? "Criar primeiro notebook"
                : "Gerenciar notebooks"}
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Floating decorative elements */}
      <motion.div
        className="absolute right-6 top-6 h-3 w-3 rounded-full bg-blue-400/30"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.3, 0.8, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          delay: index * 0.5,
        }}
      />
      <motion.div
        className="absolute bottom-8 left-8 h-2 w-2 rounded-full bg-purple-400/40"
        animate={{
          scale: [1, 2, 1],
          opacity: [0.2, 0.6, 0.2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          delay: index * 0.7,
        }}
      />
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
      <div className="mb-4 h-12 w-64 animate-pulse rounded-lg bg-gray-200" />
      <div className="h-6 w-96 animate-pulse rounded-lg bg-gray-200" />
    </div>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl bg-white p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 animate-pulse rounded-lg bg-gray-200" />
            <div className="flex-1">
              <div className="mb-2 h-6 w-32 animate-pulse rounded-lg bg-gray-200" />
              <div className="h-4 w-full animate-pulse rounded-lg bg-gray-200" />
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

  // Use Convex query instead of tRPC (temporarily disabled until API is generated)
  // const userSettings = useQuery(
  //   convexApi.userSettings.getUserSettingsAndHealth,
  //   status === "authenticated" && session?.user?.id ? { userId: session.user.id as Id<"users"> } : "skip"
  // );

  // Temporary fallback data until Convex API is properly generated
  const userSettings = status === "authenticated" ? null : undefined;
  const isLoading = userSettings === undefined && status === "authenticated";
  const data = userSettings ?? {
    settings: {
      notePadUrl: "",
      privateOrPublicUrl: true,
      password: null,
    },
    health: {
      isHealthy: false,
    },
  };

  // Get user's notebooks
  const { data: notebooks, isLoading: notebooksLoading } =
    api.notebooks.getByOwner.useQuery(undefined, {
      enabled: status === "authenticated",
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      gcTime: 10 * 60 * 1000,
    });

  // Check if migration is needed
  const migrationQuery = api.notebooks.checkMigrationNeeded.useQuery(
    undefined,
    {
      enabled: status === "authenticated",
      staleTime: 5 * 60 * 1000,
    },
  );

  // Safely extract migration status, handling potential errors
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const migrationStatus = migrationQuery.error ? null : migrationQuery.data;

  // Get the tRPC utils for invalidation
  const utils = api.useUtils();

  // Migration mutation
  const migrateDocs = api.notebooks.migrateDocuments.useMutation({
    onSuccess: () => {
      // Refetch migration status to update UI
      void utils.notebooks.checkMigrationNeeded.invalidate();
      // Also refetch notebooks in case any were created during migration
      void utils.notebooks.getByOwner.invalidate();
    },
  });

  // Show loading state while authentication is being checked
  if (status === "loading" || isLoading || notebooksLoading) {
    return <LoadingState />;
  }

  const firstName = session?.user?.name?.split(" ")[0] ?? "Usuário";
  const hasNotebooks = Boolean(notebooks && notebooks.length > 0);
  const notebookCount = notebooks?.length ?? 0;

  // Type guard for migration status
  const isValidMigrationStatus = (
    status: unknown,
  ): status is {
    migrationNeeded: boolean;
    defaultUserDocumentsCount: number;
  } => {
    return (
      status !== null &&
      typeof status === "object" &&
      "migrationNeeded" in status &&
      "defaultUserDocumentsCount" in status
    );
  };

  const shouldShowMigration =
    isValidMigrationStatus(migrationStatus) && migrationStatus.migrationNeeded;

  return (
    <main
      className="relative min-h-screen flex-grow overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 30%, #f1f5f9 70%, #e0e7ff 100%)",
      }}
    >
      {/* Enhanced animated background elements */}
      <div className="pointer-events-none absolute inset-0">
        {!reduceMotion && (
          <>
            <motion.div
              className="absolute right-20 top-20 h-96 w-96 rounded-full opacity-10"
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                filter: "blur(60px)",
                willChange: "transform, opacity",
              }}
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 25,
                repeat: Infinity,
                ease: "linear",
              }}
            />
            <motion.div
              className="opacity-8 absolute bottom-20 left-20 h-80 w-80 rounded-full"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
                filter: "blur(50px)",
                willChange: "transform, opacity",
              }}
              animate={{
                scale: [1.2, 1, 1.2],
                rotate: [360, 180, 0],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              }}
            />
            <motion.div
              className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5"
              style={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
                filter: "blur(80px)",
                willChange: "transform, opacity",
              }}
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 360],
              }}
              transition={{
                duration: 30,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </>
        )}
      </div>

      {/* Floating particles */}
      {!reduceMotion &&
        Array.from({ length: 12 }, (_, i) => (
          <motion.div
            key={i}
            className="pointer-events-none absolute h-2 w-2 rounded-full bg-blue-400/20"
            animate={{
              translateX: [0, 50, 0],
              translateY: [0, -50, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 6 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
            initial={false}
            style={{
              willChange: "transform, opacity",
              transform: `translateX(${10 + i * 8}vw) translateY(${20 + (i % 3) * 30}vh)`,
            }}
          />
        ))}

      <div className="container relative z-10 mx-auto px-4 py-12">
        {/* Enhanced Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <div
            className="relative overflow-hidden rounded-3xl border border-white/50 p-12 shadow-xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Welcome card glow */}
            <div
              className="absolute inset-0 rounded-3xl opacity-50"
              style={{
                background:
                  "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
                filter: "blur(30px)",
              }}
            />

            <div className="relative z-10">
              <motion.h1
                className="mb-6 flex items-center gap-4 text-5xl font-bold md:text-6xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Olá, {firstName}!
                </span>
                <motion.div
                  animate={{
                    rotate: [0, 15, -15, 0],
                    scale: [1, 1.2, 1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                >
                  <Sparkles className="h-12 w-12 text-yellow-500" />
                </motion.div>
              </motion.h1>

              <motion.p
                className="max-w-3xl text-2xl leading-relaxed text-slate-600"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              >
                {status === "authenticated"
                  ? "Que bom ter você por aqui! Vamos organizar suas ideias e aumentar sua produtividade hoje?"
                  : "Bem-vindo ao Espaço Pessoal! Faça login para começar sua jornada."}
              </motion.p>
            </div>

            {/* Floating decorative elements */}
            <motion.div
              className="absolute right-8 top-8 h-4 w-4 rounded-full bg-blue-400/30"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
            />
            <motion.div
              className="absolute bottom-8 left-8 h-3 w-3 rounded-full bg-purple-400/40"
              animate={{
                scale: [1, 2, 1],
                opacity: [0.2, 0.6, 0.2],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: 1,
              }}
            />
          </div>
        </motion.div>

        {/* Migration Alert */}
        {shouldShowMigration && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">
                Documentos Encontrados
              </AlertTitle>
              <AlertDescription className="text-blue-700">
                Encontramos{" "}
                {isValidMigrationStatus(migrationStatus)
                  ? migrationStatus.defaultUserDocumentsCount
                  : 0}{" "}
                documento(s) que precisam ser organizados.
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2"
                  onClick={() => migrateDocs.mutate()}
                  disabled={migrateDocs.isPending}
                >
                  {migrateDocs.isPending ? "Organizando..." : "Organizar Agora"}
                </Button>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Enhanced Features Grid */}
        <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {status === "authenticated" && !isLoading && !notebooksLoading && (
              <FeatureCard
                key="notebooks"
                index={0}
                title="Meus Notebooks"
                description={
                  hasNotebooks
                    ? `Gerencie seus ${notebookCount} notebook${notebookCount > 1 ? "s" : ""} com editor colaborativo avançado. Organize suas ideias em coleções temáticas.`
                    : "Crie e organize suas ideias em notebooks temáticos com editor colaborativo avançado. Edição em tempo real, formatação rica e muito mais."
                }
                icon={<Notebook className="h-8 w-8" />}
                href={hasNotebooks ? "/notebooks" : "/notebooks"}
                isActive={true}
                status={hasNotebooks ? "configured" : "unconfigured"}
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

        {/* Enhanced Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          <div
            className="relative overflow-hidden rounded-3xl border border-white/50 p-12 shadow-xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Actions card glow */}
            <div
              className="absolute inset-0 rounded-3xl opacity-30"
              style={{
                background:
                  "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)",
                filter: "blur(30px)",
              }}
            />

            <div className="relative z-10">
              <motion.h2
                className="mb-8 flex items-center gap-3 text-4xl font-bold"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.6 }}
              >
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {status === "authenticated" ? "Ações Rápidas" : "Começar"}
                </span>
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                >
                  <Heart className="h-8 w-8 text-red-500" />
                </motion.div>
              </motion.h2>

              <motion.div
                className="flex flex-wrap gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.6 }}
              >
                {status === "authenticated" ? (
                  <>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        asChild
                        size="lg"
                        className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 text-lg text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-indigo-800 hover:shadow-xl"
                      >
                        <Link
                          href="/profile"
                          className="group flex items-center gap-3"
                        >
                          <Settings className="h-6 w-6" />
                          Configurar Perfil
                          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outline"
                        asChild
                        size="lg"
                        className="rounded-2xl border-2 border-blue-200 px-8 py-6 text-lg text-blue-700 shadow-lg transition-all duration-300 hover:border-blue-300 hover:bg-blue-50 hover:shadow-xl"
                      >
                        <Link
                          href="/notebooks"
                          className="group flex items-center gap-3"
                        >
                          <Notebook className="h-6 w-6" />
                          {hasNotebooks
                            ? "Gerenciar Notebooks"
                            : "Criar Primeiro Notebook"}
                          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </Button>
                    </motion.div>
                  </>
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      asChild
                      size="lg"
                      className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-lg text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl"
                    >
                      <Link
                        href="/api/auth/signin"
                        className="group flex items-center gap-3"
                      >
                        <Zap className="h-6 w-6" />
                        Entrar para Começar
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
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
