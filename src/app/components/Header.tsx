"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { useSession } from "next-auth/react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { api } from "~/trpc/react";
import { Menu, X } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetClose } from "~/components/ui/sheet";
import debounce from "lodash/debounce"; // Using lodash's debounce since it's already in dependencies

export default function Header() {
  const { data: session, status } = useSession({
    required: false,
  });
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Memoize authentication state
  const isAuthenticated = useMemo(() => 
    status === "authenticated" && !!session,
    [status, session]
  );
  
  // Replace getNoteSettings with getUserSettingsAndHealth
  const { data: userSettings, isLoading: isLoadingSettings } = api.userSettings.getUserSettingsAndHealth.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
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
  }, []); // Empty dependencies since we don't use any external values

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
    <header className="sticky top-0 z-50 transition-all duration-500">
      {/* Layered background with enhanced glass effect */}
      <div className="absolute inset-0 backdrop-blur-md bg-background/60 dark:bg-background/80" />
      
      {/* Colorful top accent line with animation */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      
      {/* Subtle animated pattern with better contrast */}
      <div className="absolute inset-0 bg-[radial-gradient(transparent_1px,var(--background)_1px)] bg-[size:4px_4px] opacity-30 dark:opacity-40" />
      
      {/* Bottom border with enhanced glowing effect */}
      <div className={`absolute bottom-0 left-0 right-0 h-[1px] transition-opacity duration-700 ${isScrolled ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/40 to-transparent dark:via-primary/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-pulse dark:via-primary/40" />
      </div>
      
      {/* Main content container */}
      <div className="container mx-auto px-4 relative">
        <div className="flex h-16 items-center justify-between">
          {/* Logo with enhanced hover effect */}
          <Link 
            href="/" 
            className="relative group flex items-center gap-2 z-20 py-1"
          >
            <div className="relative">
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent inline-block transition-all duration-300 group-hover:scale-[1.02]">
                Espaço Pessoal
              </span>
              
              {/* Animated underline effect with better contrast */}
              <div className="absolute bottom-0 left-0 w-full h-[1px] transform transition-transform duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50 dark:opacity-70 blur-[1px]" />
              </div>
              
              {/* Enhanced hover glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-500/20 dark:via-purple-500/20 dark:to-pink-500/20 rounded-lg blur-[1px] opacity-0 group-hover:opacity-100 transition-all duration-300 -z-10" />
            </div>
          </Link>

          {/* Desktop Navigation with enhanced contrast */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/#recursos" 
              className="relative group px-3 py-2"
            >
              <span className="relative z-10 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                Recursos
              </span>
              
              {/* Enhanced hover background effect */}
              <span className="absolute inset-0 rounded-md bg-muted/0 group-hover:bg-muted/60 dark:group-hover:bg-muted/70 transition-all duration-300 -z-10" />
              
              {/* Gradient line effect with better contrast */}
              <div className="absolute bottom-0 left-0 w-full h-[2px] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-70 dark:opacity-90 blur-sm" />
              </div>
            </Link>
            
            {isAuthenticated && (
              <div className="flex items-center space-x-8">
                {isLoadingSettings ? (
                  <div className="text-sm font-medium text-muted-foreground/50 px-3 py-2 relative">
                    <span className="animate-pulse">Bloco de Notas</span>
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-muted/50 dark:bg-muted/60 rounded-full" />
                  </div>
                ) : notepadUrl ? (
                  <Link 
                    href={notepadUrl} 
                    className="relative group px-3 py-2"
                    prefetch={false}
                  >
                    <span className="relative z-10 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                      Bloco de Notas
                    </span>
                    
                    {/* Enhanced hover background effect */}
                    <span className="absolute inset-0 rounded-md bg-muted/0 group-hover:bg-muted/60 dark:group-hover:bg-muted/70 transition-all duration-300 -z-10" />
                    
                    {/* Gradient line effect with better contrast */}
                    <div className="absolute bottom-0 left-0 w-full h-[2px] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-70 dark:opacity-90 blur-sm" />
                    </div>
                  </Link>
                ) : null}
                <Link 
                  href="/profile" 
                  className="relative group px-3 py-2"
                >
                  <span className="relative z-10 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                    Perfil
                  </span>
                  
                  {/* Enhanced hover background effect */}
                  <span className="absolute inset-0 rounded-md bg-muted/0 group-hover:bg-muted/60 dark:group-hover:bg-muted/70 transition-all duration-300 -z-10" />
                  
                  {/* Gradient line effect with better contrast */}
                  <div className="absolute bottom-0 left-0 w-full h-[2px] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-70 dark:opacity-90 blur-sm" />
                  </div>
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu & Auth Button with enhanced contrast */}
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost"
                  size="icon"
                  className="md:hidden relative group overflow-hidden rounded-full"
                  aria-label="Menu"
                >
                  <span className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 dark:from-indigo-500/30 dark:via-purple-500/30 dark:to-pink-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Menu className="h-5 w-5 transition-all duration-300 group-hover:scale-105 group-hover:text-primary" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                className="w-full sm:w-[400px] p-0 border-l border-border/40 bg-background/95 dark:bg-background/98"
                hideCloseButton
              >
                <div className="flex flex-col h-full">
                  {/* Colorful top accent */}
                  <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                  
                  <div className="p-6 flex-1">
                    <div className="flex items-center justify-between mb-8">
                      <span className="text-lg font-semibold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Menu</span>
                      <SheetClose asChild>
                        <Button variant="ghost" size="icon" className="rounded-full relative group overflow-hidden">
                          <span className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 dark:from-indigo-500/30 dark:via-purple-500/30 dark:to-pink-500/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <X className="h-5 w-5 transition-all duration-300 group-hover:scale-105 group-hover:text-primary" />
                        </Button>
                      </SheetClose>
                    </div>
                    <nav className="flex flex-col gap-2">
                      <Link
                        href="/#recursos"
                        className="relative flex items-center px-4 py-3 rounded-lg group overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-muted/0 to-muted/0 group-hover:from-muted/60 group-hover:to-muted/20 dark:group-hover:from-muted/70 dark:group-hover:to-muted/30 transition-all duration-300" />
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <span className="relative z-10 text-muted-foreground group-hover:text-foreground transition-colors duration-300">Recursos</span>
                      </Link>
                      
                      {isAuthenticated && (
                        <>
                          {notepadUrl && (
                            <Link
                              href={notepadUrl}
                              className="relative flex items-center px-4 py-3 rounded-lg group overflow-hidden"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-muted/0 to-muted/0 group-hover:from-muted/60 group-hover:to-muted/20 dark:group-hover:from-muted/70 dark:group-hover:to-muted/30 transition-all duration-300" />
                              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <span className="relative z-10 text-muted-foreground group-hover:text-foreground transition-colors duration-300">Bloco de Notas</span>
                            </Link>
                          )}
                          <Link
                            href="/profile"
                            className="relative flex items-center px-4 py-3 rounded-lg group overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-muted/0 to-muted/0 group-hover:from-muted/60 group-hover:to-muted/20 dark:group-hover:from-muted/70 dark:group-hover:to-muted/30 transition-all duration-300" />
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <span className="relative z-10 text-muted-foreground group-hover:text-foreground transition-colors duration-300">Perfil</span>
                          </Link>
                        </>
                      )}
                    </nav>
                  </div>
                  
                  {/* Bottom decorative pattern with enhanced contrast */}
                  <div className="h-px w-full bg-border/20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent animate-pulse dark:via-indigo-500/40" />
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Link 
              href={session ? "/api/auth/signout" : "/api/auth/signin"}
            >
              <Button 
                variant={session ? "outline" : "default"}
                className="relative overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300"
                disabled={status === "loading"}
              >
                {/* Button background effect with enhanced contrast */}
                {!session && (
                  <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-90 dark:opacity-100 group-hover:opacity-100 transition-opacity duration-500" />
                )}
                
                {/* Button text with loading state */}
                <span className="relative z-10 font-medium">
                  {status === "loading" ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" />
                      <span>Carregando</span>
                    </span>
                  ) : session ? (
                    <span className="group-hover:scale-105 transition-transform duration-300 inline-block">Sair</span>
                  ) : (
                    <span className="group-hover:scale-105 transition-transform duration-300 inline-block">Entrar</span>
                  )}
                </span>
                
                {/* Enhanced hover glow effect for outlined button */}
                {session && (
                  <span className="absolute inset-0 rounded-md border border-input group-hover:border-primary/70 dark:group-hover:border-primary/80 transition-colors duration-300" />
                )}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
