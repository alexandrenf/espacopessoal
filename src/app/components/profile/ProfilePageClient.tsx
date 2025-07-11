"use client";

import { motion } from "framer-motion";
import { User, Settings, Sparkles } from "lucide-react";
import { ProfileDashboard } from "./ProfileDashboard";

interface User {
  id: string;
  name: string | null | undefined;
  email: string | null | undefined;
  image: string | null | undefined;
  emailVerified: Date | null | number | undefined;
}

interface ProfilePageClientProps {
  userData: User;
}

export function ProfilePageClient({ userData }: ProfilePageClientProps) {
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
}

export function ProfileErrorClient() {
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

export function ProfilePageSkeleton() {
  return (
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
  );
}

export function ProfileUnauthenticatedClient() {
  return (
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
    </motion.div>
  );
}

export function ProfilePageTitle() {
  return (
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
  );
}
