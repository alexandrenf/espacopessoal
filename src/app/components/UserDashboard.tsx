"use client";

import { useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Notebook, 
  CheckSquare, 
  Calculator, 
  ArrowRight, 
  Clock,
  Lock,
  Sparkles,
  Heart,
  Settings
} from "lucide-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        scale: isActive ? 1.02 : 1,
      }}
      whileTap={{ 
        scale: isActive ? 0.98 : 1,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 10
        }
      }}
      onHoverEnd={() => {
        if (isActive && cardRef.current) {
          cardRef.current.style.setProperty('transform', 'scale(1)');
        }
      }}
      exit={{ scale: 1 }}
      transition={{
        opacity: { duration: 0.3, delay: index * 0.1 },
        y: { duration: 0.3, delay: index * 0.1 },
        scale: {
          type: "spring",
          damping: 15,
          stiffness: 300
        }
      }}
      className={cn(
        "relative p-6 rounded-xl shadow-lg bg-white dark:bg-gray-800",
        isActive ? 'cursor-pointer hover:shadow-xl transition-shadow' : 'cursor-default opacity-80'
      )}
    >
      {!isActive && (
        <div className="absolute inset-0 rounded-xl bg-background/50 backdrop-blur-[1px] flex items-center justify-center">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="bg-background/90 px-4 py-2 rounded-full flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">{comingSoon}</span>
          </motion.div>
        </div>
      )}
      
      <div className="flex items-start gap-4">
        <motion.div 
          whileHover={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.5 }}
          className={cn(
            "p-3 rounded-lg",
            status === 'unconfigured' 
              ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
              : "bg-primary/10 text-primary"
          )}
        >
          {icon}
        </motion.div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            {title}
            {status === 'unconfigured' && (
              <motion.span
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-1 rounded-full flex items-center gap-1"
              >
                <Settings className="w-3 h-3" />
                Configurar
              </motion.span>
            )}
          </h3>
          <p className={cn(
            "mb-4",
            status === 'unconfigured' ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground"
          )}>
            {status === 'unconfigured' 
              ? "Configure seu bloco de notas para começar a usar!"
              : description}
          </p>
          {isActive && (
            <motion.div 
              className={cn(
                "flex items-center font-medium",
                status === 'unconfigured' ? "text-yellow-600 dark:text-yellow-400" : "text-primary"
              )}
              whileHover={{ x: 5 }}
              transition={{ duration: 0.2 }}
            >
              {status === 'unconfigured' ? 'Configurar agora' : 'Acessar'}
              <ArrowRight className="w-4 h-4 ml-2" />
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
    <Link href={href}>
      {cardContent}
    </Link>
  ) : (
    <button onClick={onClick} className="w-full text-left">
      {cardContent}
    </button>
  );
};

export function UserDashboard() {
  const { data: session } = useSession();
  const utils = api.useUtils();
  
  // Prefetch note settings
  useEffect(() => {
    void utils.userSettings.getNoteSettings.prefetch();
  }, [utils]);

  const { data: noteSettings, isLoading: isLoadingNoteSettings, error: noteSettingsError } = api.userSettings.getNoteSettings.useQuery(
    undefined,
    {
      staleTime: 30000, // Consider data fresh for 30 seconds
      gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
      retry: 1
    }
  );

  const firstName = session?.user?.name?.split(' ')[0] ?? 'Usuário';
  const isNotepadConfigured = noteSettings?.notePadUrl && noteSettings.notePadUrl.length > 0;

  if (noteSettingsError) {
    return (
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="text-center text-red-600 dark:text-red-400">
          <p>Ocorreu um erro ao carregar suas configurações. Por favor, tente novamente mais tarde.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow container mx-auto px-4 py-8">
      {/* Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="text-4xl font-bold mb-4 flex items-center gap-2">
          Olá, {firstName}! 
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 10, 0],
              scale: [1, 1.1, 1, 1.1, 1]
            }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Sparkles className="w-8 h-8 text-primary" />
          </motion.div>
        </h1>
        <p className="text-xl text-muted-foreground">
          Que bom ter você por aqui! O que vamos fazer hoje?
        </p>
      </motion.div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {!isLoadingNoteSettings && (
            <FeatureCard
              index={0}
              title="Bloco de Notas"
              description="Organize suas anotações, pensamentos e ideias em um único lugar seguro e acessível."
              icon={<Notebook className="w-6 h-6" />}
              href={isNotepadConfigured ? `/notas/${noteSettings.notePadUrl}` : "/notas"}
              isActive={true}
              status={isNotepadConfigured ? 'configured' : 'unconfigured'}
            />
          )}
        </AnimatePresence>

        <FeatureCard
          index={1}
          title="Lista de Afazeres"
          description="Gerencie suas tarefas e compromissos de forma eficiente com nossa lista de tarefas inteligente."
          icon={<CheckSquare className="w-6 h-6" />}
          isActive={true}
          href="/lista"
        />

        <FeatureCard
          index={2}
          title="Calculadoras Médicas"
          description="Acesse calculadoras específicas para a área médica, facilitando seu dia a dia clínico."
          icon={<Calculator className="w-6 h-6" />}
          isActive={false}
          comingSoon="Chegando em Março"
        />
      </div>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-12"
      >
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          Ações Rápidas
          <Heart className="w-5 h-5 text-black-500" />
        </h2>
        <div className="flex flex-wrap gap-4">
          <Button asChild>
            <Link href="/profile" className="group">
              Configurar Perfil
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/notas" className="group">
              Configurar Bloco de Notas
            </Link>
          </Button>
        </div>
      </motion.div>
    </main>
  );
}
