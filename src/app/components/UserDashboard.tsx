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
  Star
} from "lucide-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
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
  status?: 'unconfigured' | 'configured';
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
  status
}: FeatureCardProps & { status?: 'unconfigured' | 'configured' }) => {
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
        "relative p-8 rounded-3xl h-full transition-all duration-500 group border overflow-hidden",
        isActive 
          ? 'cursor-pointer hover:shadow-2xl bg-white/95 backdrop-blur-sm border-white/60 shadow-lg' 
          : 'cursor-default opacity-70 bg-white/80 backdrop-blur-sm border-white/40 shadow-sm'
      )}
    >
      {/* Gradient glow effect */}
      <div 
        className={cn(
          "absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10",
          status === 'unconfigured' 
            ? "bg-gradient-to-br from-yellow-400/20 via-orange-400/10 to-red-400/20"
            : "bg-gradient-to-br from-blue-400/20 via-indigo-400/10 to-purple-400/20"
        )}
        style={{ filter: 'blur(20px)' }}
      />

      {!isActive && (
        <div className="absolute inset-0 rounded-3xl bg-slate-100/60 backdrop-blur-sm flex items-center justify-center z-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/95 backdrop-blur-sm px-6 py-3 rounded-2xl flex items-center gap-3 shadow-lg border border-white/50"
          >
            <Clock className="w-5 h-5 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">{comingSoon}</span>
          </motion.div>
        </div>
      )}
      
      <div className="flex items-start gap-6">
        <motion.div 
          className={cn(
            "p-4 rounded-2xl flex-shrink-0 transition-all duration-500 relative overflow-hidden",
            status === 'unconfigured' 
              ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white group-hover:from-yellow-500 group-hover:to-orange-600"
              : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white group-hover:from-blue-600 group-hover:to-indigo-700"
          )}
          whileHover={{ 
            rotate: [0, -5, 5, 0],
            scale: 1.1 
          }}
          transition={{ duration: 0.4 }}
        >
          {/* Icon shine effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: "easeInOut",
            }}
          />
          <div className="relative z-10">
            {icon}
          </div>
        </motion.div>

        <div className="flex-1">
          <h3 className="text-2xl font-bold mb-3 flex items-center gap-3 text-slate-800">
            {title}
            {status === 'unconfigured' && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 font-semibold shadow-lg"
              >
                <Settings className="w-3 h-3" />
                Configurar
              </motion.span>
            )}
          </h3>
          <p className={cn(
            "mb-6 text-base leading-relaxed",
            status === 'unconfigured' ? "text-yellow-700 font-medium" : "text-slate-600"
          )}>
            {status === 'unconfigured' 
              ? "Configure seu bloco de notas para começar a usar todas as funcionalidades!"
              : description}
          </p>
          {isActive && (
            <motion.div 
              className={cn(
                "flex items-center font-semibold text-base",
                status === 'unconfigured' ? "text-yellow-600" : "text-blue-600"
              )}
              whileHover={{ x: 5 }}
              transition={{ duration: 0.2 }}
            >
              {status === 'unconfigured' ? 'Configurar agora' : 'Acessar'}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Floating decorative elements */}
      <motion.div
        className="absolute top-6 right-6 w-3 h-3 bg-blue-400/30 rounded-full"
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
        className="absolute bottom-8 left-8 w-2 h-2 bg-purple-400/40 rounded-full"
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
    <Link href={href}>
      {cardContent}
    </Link>
  ) : (
    <button onClick={onClick} className="w-full text-left">
      {cardContent}
    </button>
  );
};

const LoadingState = () => (
  <main className="flex-grow container mx-auto px-4 py-8 animate-in fade-in duration-500">
    <div className="mb-12">
      <div className="h-12 w-64 bg-gray-200 rounded-lg animate-pulse mb-4" />
      <div className="h-6 w-96 bg-gray-200 rounded-lg animate-pulse" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-6 rounded-xl shadow-lg bg-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
            <div className="flex-1">
              <div className="h-6 w-32 bg-gray-200 rounded-lg animate-pulse mb-2" />
              <div className="h-4 w-full bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </main>
);

/**
 * Renders the main user dashboard with animated backgrounds, personalized greeting, feature cards, and quick action buttons.
 *
 * Displays loading and error states as appropriate. The dashboard adapts its UI based on authentication status and user preferences for reduced motion, and presents interactive features and shortcuts tailored to the user's session.
 */
export function UserDashboard() {
  const { data: session, status } = useSession();
  // Detect prefers-reduced-motion
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduceMotion(mq.matches);
      const handler = () => setReduceMotion(mq.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, []);
  
  // Use the combined query
  const { data, isLoading, error } = api.userSettings.getUserSettingsAndHealth.useQuery(
    undefined,
    {
      enabled: status === "authenticated",
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      gcTime: 10 * 60 * 1000, // Replace cacheTime with gcTime
    }
  );

  // Show loading state while authentication is being checked
  if (status === "loading" || isLoading) {
    return <LoadingState />;
  }

  const firstName = session?.user?.name?.split(' ')[0] ?? 'Usuário';
  const isNotepadConfigured = Boolean(data?.settings.notePadUrl);

  // Show error in a more user-friendly way
  if (error) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            Ocorreu um erro ao carregar suas configurações. Por favor, atualize a página ou tente novamente mais tarde.
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main 
      className="flex-grow min-h-screen relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 30%, #f1f5f9 70%, #e0e7ff 100%)',
      }}
    >
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        {!reduceMotion && (
          <>
            <motion.div 
              className="absolute top-20 right-20 w-96 h-96 rounded-full opacity-10"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                filter: 'blur(60px)',
                willChange: 'transform, opacity',
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
              className="absolute bottom-20 left-20 w-80 h-80 rounded-full opacity-8"
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                filter: 'blur(50px)',
                willChange: 'transform, opacity',
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
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                filter: 'blur(80px)',
                willChange: 'transform, opacity',
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
      {!reduceMotion && Array.from({ length: 12 }, (_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-blue-400/20 rounded-full pointer-events-none"
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
            willChange: 'transform, opacity',
            transform: `translateX(${10 + i * 8}vw) translateY(${20 + (i % 3) * 30}vh)`
          }}
        />
      ))}

      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Enhanced Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <div 
            className="p-12 rounded-3xl shadow-xl border border-white/50 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Welcome card glow */}
            <div 
              className="absolute inset-0 rounded-3xl opacity-50"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                filter: 'blur(30px)',
              }}
            />
            
            <div className="relative z-10">
              <motion.h1 
                className="text-5xl md:text-6xl font-bold mb-6 flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-transparent bg-clip-text">
                  Olá, {firstName}!
                </span>
                <motion.div
                  animate={{ 
                    rotate: [0, 15, -15, 0],
                    scale: [1, 1.2, 1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                >
                  <Sparkles className="w-12 h-12 text-yellow-500" />
                </motion.div>
              </motion.h1>
              
              <motion.p 
                className="text-2xl text-slate-600 leading-relaxed max-w-3xl"
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
              className="absolute top-8 right-8 w-4 h-4 bg-blue-400/30 rounded-full"
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
              className="absolute bottom-8 left-8 w-3 h-3 bg-purple-400/40 rounded-full"
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

        {/* Enhanced Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <AnimatePresence>
            {status === "authenticated" && !isLoading && (
              <FeatureCard
                key="notebook"
                index={0}
                title="Meu Notebook"
                description="Organize suas anotações, pensamentos e ideias com nosso editor colaborativo avançado. Edição em tempo real, formatação rica e muito mais."
                icon={<Notebook className="w-8 h-8" />}
                href="/home"
                isActive={true}
                status="configured"
              />
            )}

            <FeatureCard
              key="todos"
              index={1}
              title="Lista de Afazeres"
              description="Gerencie suas tarefas e compromissos de forma eficiente com nossa lista de tarefas inteligente e intuitiva."
              icon={<CheckSquare className="w-8 h-8" />}
              isActive={status === "authenticated"}
              href={status === "authenticated" ? "/lista" : "/api/auth/signin"}
            />

            <FeatureCard
              key="calculators"
              index={2}
              title="Calculadoras Médicas"
              description="Acesse calculadoras específicas para a área médica, facilitando seu dia a dia clínico com precisão."
              icon={<Calculator className="w-8 h-8" />}
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
            className="p-12 rounded-3xl shadow-xl border border-white/50 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Actions card glow */}
            <div 
              className="absolute inset-0 rounded-3xl opacity-30"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)',
                filter: 'blur(30px)',
              }}
            />
            
            <div className="relative z-10">
              <motion.h2 
                className="text-4xl font-bold mb-8 flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.6 }}
              >
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
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
                  <Heart className="w-8 h-8 text-red-500" />
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
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        asChild 
                        size="lg"
                        className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-8 py-6 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Link href="/profile" className="group flex items-center gap-3">
                          <Settings className="w-6 h-6" />
                          Configurar Perfil
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        variant="outline" 
                        asChild 
                        size="lg"
                        className="border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700 px-8 py-6 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Link href="/notas" className="group flex items-center gap-3">
                          <Notebook className="w-6 h-6" />
                          Configurar Bloco de Notas
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </motion.div>
                  </>
                ) : (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      asChild 
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Link href="/api/auth/signin" className="group flex items-center gap-3">
                        <Zap className="w-6 h-6" />
                        Entrar para Começar
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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

