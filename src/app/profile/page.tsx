import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { ProfileDashboard } from "~/app/components/profile/ProfileDashboard";
import Link from "next/link";
import Header from "~/app/components/Header";
import { HydrateClient } from "~/trpc/server";
import { Suspense } from "react";
import { ProfileTour } from "~/app/components/profile/ProfileTour";
import { motion } from "framer-motion";
import { User, Settings, Sparkles } from "lucide-react";

async function ProfileContent() {
  try {
    const [userData] = await Promise.all([api.users.getUserProfile()]);

    return (
      <>
        {/* Animated Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8"
        >
          {/* Background gradient orbs */}
          <div className="absolute -right-4 -top-4 h-24 w-24 animate-pulse rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-500/20 blur-xl" />
          <div className="absolute -bottom-4 -left-4 h-32 w-32 animate-pulse rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-500/20 blur-xl" />

          <div className="relative">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-3">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-2xl font-bold text-transparent">
                  Olá, {userData.name?.split(" ")[0] ?? "Usuário"}! 👋
                </h2>
                <p className="text-slate-600">
                  Gerencie suas informações e preferências do perfil
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Profile Dashboard Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="profile-dashboard mb-8 rounded-2xl border border-slate-200/50 bg-white/80 p-8 shadow-lg backdrop-blur-sm"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-2">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900">
              Configurações do Perfil
            </h3>
          </div>
          <ProfileDashboard user={userData} />
        </motion.div>
      </>
    );
  } catch (error) {
    console.error("Error loading profile data:", error);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-red-200/50 bg-gradient-to-br from-red-50 to-rose-50 p-8 text-center"
      >
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-red-100 p-3">
            <Sparkles className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <h2 className="mb-3 text-xl font-semibold text-red-800">
          Erro ao carregar dados do perfil
        </h2>
        <p className="mb-4 text-red-600">
          Ocorreu um erro ao carregar seus dados. Tente recarregar a página.
        </p>
      </motion.div>
    );
  }
}

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="relative flex flex-grow items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          {/* Background grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

          {/* Background gradient orbs */}
          <div className="absolute right-1/4 top-1/4 h-64 w-64 animate-pulse rounded-full bg-gradient-to-br from-blue-400/10 to-indigo-500/10 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 h-80 w-80 animate-pulse rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-500/10 blur-3xl" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative w-full max-w-md rounded-2xl border border-slate-200/50 bg-white/80 p-8 text-center shadow-xl backdrop-blur-sm"
          >
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-4">
                <User className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-2xl font-bold text-transparent">
              Acesso Negado
            </h2>
            <p className="mb-8 text-slate-600">
              Por favor, faça login para visualizar seu perfil.
            </p>
            <Link
              href="/api/auth/signin"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-medium text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25"
            >
              Entrar
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <HydrateClient>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="relative flex-grow overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          {/* Background grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

          {/* Background gradient orbs */}
          <div className="absolute right-1/4 top-1/3 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-blue-400/10 to-indigo-500/10 blur-3xl" />
          <div className="absolute bottom-1/3 left-1/4 h-80 w-80 animate-pulse rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-500/10 blur-3xl" />

          <div className="container relative mx-auto max-w-3xl flex-grow p-6">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="profile-header mb-10 text-center"
            >
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent">
                Painel de Perfil
              </span>
            </motion.h1>

            <Suspense
              fallback={
                <div className="animate-pulse space-y-8">
                  {/* Welcome section skeleton */}
                  <div className="rounded-2xl border border-slate-200/50 bg-white/60 p-8 backdrop-blur-sm">
                    <div className="mb-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-slate-200 to-slate-300"></div>
                      <div className="space-y-2">
                        <div className="h-6 w-48 rounded bg-gradient-to-r from-slate-200 to-slate-300"></div>
                        <div className="h-4 w-64 rounded bg-slate-200"></div>
                      </div>
                    </div>
                  </div>

                  {/* Profile dashboard skeleton */}
                  <div className="rounded-2xl border border-slate-200/50 bg-white/60 p-8 backdrop-blur-sm">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300"></div>
                      <div className="h-6 w-48 rounded bg-slate-200"></div>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="h-4 w-32 rounded bg-slate-200"></div>
                        <div className="h-10 w-full rounded-xl bg-slate-200"></div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-4 w-24 rounded bg-slate-200"></div>
                        <div className="h-10 w-full rounded-xl bg-slate-200"></div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-4 w-36 rounded bg-slate-200"></div>
                        <div className="h-10 w-full rounded-xl bg-slate-200"></div>
                      </div>
                    </div>
                  </div>
                </div>
              }
            >
              <ProfileContent />
            </Suspense>
          </div>
        </div>
      </div>
      <ProfileTour />
    </HydrateClient>
  );
}
