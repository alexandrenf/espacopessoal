"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { useSession } from "next-auth/react";
import { useMemo, useEffect, useCallback } from "react";
import { api } from "~/trpc/react";
import { Menu, X } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetClose } from "~/components/ui/sheet";
import debounce from "lodash/debounce"; // Using lodash's debounce since it's already in dependencies
import { useState } from "react";

export default function Header() {
  const { data: session, status } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Optimize settings query
  const { data: userSettings, isLoading: isLoadingSettings } = api.userSettings.getUserSettingsAndHealth.useQuery(
    undefined,
    {
      enabled: status === "authenticated",
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,
      // Add suspense to prevent waterfall
      suspense: true,
    }
  );


  // Memoize authentication state
  const isAuthenticated = useMemo(() => 
    status === "authenticated" && !!session,
    [status, session]
  );
  
  // Update the notepadUrl memo to use the new data structure
  const notepadUrl = useMemo(() => 
    userSettings?.settings?.notePadUrl ? `/notas/${userSettings.settings.notePadUrl}` : null,
    [userSettings?.settings?.notePadUrl]
  );

  // Create a memoized debounced scroll handler
  const handleScroll = useCallback(() => {
    const debouncedScroll = debounce(() => {
      setIsScrolled(window.scrollY > 20);
    }, 50, { maxWait: 150 });
    
    return debouncedScroll;
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const scrollHandler = handleScroll();
      window.addEventListener('scroll', scrollHandler);
      
      return () => {
        if (typeof window !== 'undefined') {
          scrollHandler.cancel(); // Cancel any pending debounced calls
          window.removeEventListener('scroll', scrollHandler);
        }
      };
    }
  }, [handleScroll]);


  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-background/80 backdrop-blur-lg shadow-sm' : 'bg-background'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            className="relative group flex items-center gap-2 z-20"
          >
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Espaço Pessoal
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/#recursos" 
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Recursos
            </Link>
            
            {isAuthenticated && (
              <div className="flex items-center space-x-6">
                {isLoadingSettings ? (
                  <span className="text-sm font-medium text-muted-foreground/50 animate-pulse">
                    Bloco de Notas
                  </span>
                ) : notepadUrl ? (
                  <Link 
                    href={notepadUrl} 
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    prefetch={false}
                  >
                    Bloco de Notas
                  </Link>
                ) : null}
                <Link 
                  href="/profile" 
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Perfil
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu & Auth Button */}
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="right" 
                className="w-full sm:w-[400px] p-0"
              >
                <div className="flex flex-col h-full p-6">
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-lg font-semibold">Menu</span>
                    <SheetClose asChild>
                      <Button variant="ghost" size="icon">
                        <X className="h-5 w-5" />
                      </Button>
                    </SheetClose>
                  </div>
                  <nav className="flex flex-col gap-4">
                    <Link
                      href="/#recursos"
                      className="text-lg text-muted-foreground hover:text-primary transition-colors py-2"
                    >
                      Recursos
                    </Link>
                    
                    {isAuthenticated && (
                      <>
                        {notepadUrl && (
                          <Link
                            href={notepadUrl}
                            className="text-lg text-muted-foreground hover:text-primary transition-colors py-2"
                          >
                            Bloco de Notas
                          </Link>
                        )}
                        <Link
                          href="/profile"
                          className="text-lg text-muted-foreground hover:text-primary transition-colors py-2"
                        >
                          Perfil
                        </Link>
                      </>
                    )}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>

            <Link 
              href={session ? "/api/auth/signout" : "/api/auth/signin"}
            >
              <Button 
                variant={session ? "outline" : "default"}
                className="relative overflow-hidden group"
                disabled={status === "loading"}
              >
                <span className="relative z-10">
                  {status === "loading" ? "Carregando..." : session ? "Sair" : "Entrar"}
                </span>
                {!session && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
