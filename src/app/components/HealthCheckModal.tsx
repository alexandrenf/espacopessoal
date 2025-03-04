'use client';

import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { UserCog } from "lucide-react";
import { useEffect } from "react";

export function HealthCheckModal() {
  const { data: session } = useSession();
  
  const { data: healthCheck } = api.userUpdate.checkUserHealth.useQuery(
    undefined,
    {
      enabled: !!session?.user,
      refetchOnWindowFocus: false,
    }
  );
  
  // Handle scroll lock
  useEffect(() => {
    if (session?.user && healthCheck && !healthCheck.isHealthy) {
      // Save current scroll position and add styles
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      // Cleanup function to restore scroll
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [session?.user, healthCheck]);
  
  if (!session?.user || !healthCheck || healthCheck.isHealthy) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-background/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" 
      />
      <div 
        className="relative bg-card text-card-foreground rounded-lg shadow-lg max-w-md w-full m-4 p-8 border animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-primary/10 p-3">
            <UserCog className="h-6 w-6 text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Perfil Incompleto
          </h2>
          
          <p className="text-muted-foreground">
            Para aproveitar todos os recursos do Espaço Pessoal, precisamos de algumas informações adicionais do seu perfil.
          </p>

          <div className="w-full pt-4">
            <Link
              href="/profile"
              className="inline-flex items-center justify-center w-full gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Completar Perfil
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            Isso levará apenas alguns minutos
          </p>
        </div>
      </div>
    </div>
  );
}
