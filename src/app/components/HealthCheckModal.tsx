'use client';

import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { UserCog } from "lucide-react";
import { useEffect, useState } from "react";

export function HealthCheckModal() {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const [isDismissed, setIsDismissed] = useState(false);

  const { data: userSettings, isLoading } = api.userSettings.getUserSettingsAndHealth.useQuery(
    undefined,
    {
      enabled: !!session?.user,
      refetchOnWindowFocus: false,
      select: (data) => {
        // Skip showing modal if dismissed within last 24 hours
        const dismissedUntil = Number(localStorage.getItem('healthCheckDismissed') ?? '0');
        if (dismissedUntil > Date.now()) {
          return { ...data, health: { isHealthy: true } };
        }
        return data;
      }
    }
  );

  // Handle scroll lock with improved accessibility
  useEffect(() => {
    if (session?.user && !isLoading && userSettings && !userSettings.health.isHealthy && !isDismissed) {
      // Save current scroll position and calculate scrollbar width
      const scrollY = window.scrollY;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      // Save original styles
      const originalStyles = {
        overflow: document.body.style.overflow,
        paddingRight: document.body.style.paddingRight,
        height: document.body.style.height
      };

      // Apply scroll lock
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.height = '100vh';
      document.body.setAttribute('aria-hidden', 'true');

      // Cleanup function to restore scroll
      return () => {
        document.body.style.overflow = originalStyles.overflow;
        document.body.style.paddingRight = originalStyles.paddingRight;
        document.body.style.height = originalStyles.height;
        document.body.removeAttribute('aria-hidden');
        window.scrollTo(0, scrollY);
      };
    }
  }, [session?.user, isLoading, userSettings, isDismissed]);

  if (!session?.user || isLoading || !userSettings || userSettings.health.isHealthy || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    // Store in localStorage to prevent showing again for 24 hours
    localStorage.setItem('healthCheckDismissed', String(Date.now() + 86400000));
    setIsDismissed(true);
    // Force refetch to update the UI
    void utils.userSettings.getUserSettingsAndHealth.invalidate();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" 
      />
      <div 
        className="relative bg-card text-card-foreground rounded-lg shadow-lg max-w-md w-full m-4 p-8 border animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-primary/10 p-3">
            <UserCog className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          
          <h2 
            id="modal-title"
            className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent"
          >
            Perfil Incompleto
          </h2>
          
          <p className="text-muted-foreground">
            Para aproveitar todos os recursos do Espaço Pessoal, precisamos de algumas informações adicionais do seu perfil.
          </p>

          <div className="w-full pt-4 space-y-2">
            <Link
              href="/profile"
              className="inline-flex items-center justify-center w-full gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Completar Perfil
            </Link>
            <button
              onClick={handleDismiss}
              className="inline-flex items-center justify-center w-full gap-2 rounded-md bg-transparent text-muted-foreground px-4 py-2.5 text-sm font-medium hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Lembrar Depois
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Isso levará apenas alguns minutos
          </p>
        </div>
      </div>
    </div>
  );
}
