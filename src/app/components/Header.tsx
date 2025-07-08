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
  
  // Update to use the new home route instead of legacy notepad
  const homeUrl = useMemo(() => 
    isAuthenticated ? '/home' : null,
    [isAuthenticated]
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
      {/* Glass morphism background with gradient */}
      <div 
        className="absolute inset-0 backdrop-blur-md border-b border-white/20"
        style={{
          background: isScrolled 
            ? 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
        }}
      />
      
      {/* Gradient top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
      
      {/* Subtle dot pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.1) 1px, transparent 0)`,
          backgroundSize: '16px 16px'
        }}
      />
      
      {/* Bottom glow effect when scrolled */}
      <div className={`absolute bottom-0 left-0 right-0 h-[1px] transition-opacity duration-700 ${isScrolled ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/30 to-transparent animate-pulse" />
      </div>
      
      {/* Main content container */}
      <div className="container mx-auto px-4 relative">
        <div className="flex h-16 items-center justify-between">
          {/* Logo with gradient */}
          <Link 
            href="/" 
            className="relative group flex items-center gap-2 z-20 py-1"
          >
            <div className="relative">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent inline-block transition-all duration-300 group-hover:scale-[1.02]">
                Espaço Pessoal
              </span>
              
              {/* Animated underline effect */}
              <div className="absolute bottom-0 left-0 w-full h-[2px] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-50 blur-sm" />
              </div>
              
              {/* Hover glow effect */}
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 -z-10" />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/#recursos" 
              className="relative group px-3 py-2"
            >
              <span className="relative z-10 text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors duration-300">
                Recursos
              </span>
              
              {/* Hover background effect */}
              <span className="absolute inset-0 rounded-md bg-white/0 group-hover:bg-white/60 backdrop-blur-sm transition-all duration-300 -z-10" />
              
              {/* Gradient line effect */}
              <div className="absolute bottom-0 left-0 w-full h-[2px] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
              </div>
            </Link>
            
            {isAuthenticated && (
              <div className="flex items-center space-x-8">
                {isLoadingSettings ? (
                  <div className="text-sm font-medium text-slate-500 px-3 py-2 relative">
                    <span className="animate-pulse">Bloco de Notas</span>
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-slate-300 rounded-full" />
                  </div>
                ) : homeUrl ? (
                  <Link 
                    href={homeUrl} 
                    className="relative group px-3 py-2"
                    prefetch={false}
                  >
                    <span className="relative z-10 text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors duration-300">
                      Bloco de Notas
                    </span>
                    
                    {/* Hover background effect */}
                    <span className="absolute inset-0 rounded-md bg-white/0 group-hover:bg-white/60 backdrop-blur-sm transition-all duration-300 -z-10" />
                    
                    {/* Gradient line effect */}
                    <div className="absolute bottom-0 left-0 w-full h-[2px] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                    </div>
                  </Link>
                ) : null}
                <Link 
                  href="/profile" 
                  className="relative group px-3 py-2"
                >
                  <span className="relative z-10 text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors duration-300">
                    Perfil
                  </span>
                  
                  {/* Hover background effect */}
                  <span className="absolute inset-0 rounded-md bg-white/0 group-hover:bg-white/60 backdrop-blur-sm transition-all duration-300 -z-10" />
                  
                  {/* Gradient line effect */}
                  <div className="absolute bottom-0 left-0 w-full h-[2px] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                  </div>
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
                  className="md:hidden relative group overflow-hidden rounded-full hover:bg-white/60 backdrop-blur-sm"
                  aria-label="Menu"
                >
                  <span className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Menu className="h-5 w-5 transition-all duration-300 group-hover:scale-105 text-slate-600 group-hover:text-slate-800" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                className="w-full sm:w-[400px] p-0 border-l border-white/20"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
                  backdropFilter: 'blur(20px)',
                }}
                hideCloseButton
              >
                <div className="flex flex-col h-full">
                  {/* Gradient top accent */}
                  <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                  
                  <div className="p-6 flex-1">
                    <div className="flex items-center justify-between mb-8">
                      <span className="text-lg font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Menu</span>
                      <SheetClose asChild>
                        <Button variant="ghost" size="icon" className="rounded-full relative group overflow-hidden hover:bg-white/60">
                          <span className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <X className="h-5 w-5 transition-all duration-300 group-hover:scale-105 text-slate-600 group-hover:text-slate-800" />
                        </Button>
                      </SheetClose>
                    </div>
                    <nav className="flex flex-col gap-2">
                      <Link
                        href="/#recursos"
                        className="relative flex items-center px-4 py-3 rounded-lg group overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/60 backdrop-blur-sm transition-all duration-300" />
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <span className="relative z-10 text-slate-600 group-hover:text-slate-800 transition-colors duration-300">Recursos</span>
                      </Link>
                      
                      {isAuthenticated && (
                        <>
                          {homeUrl && (
                            <Link
                              href={homeUrl}
                              className="relative flex items-center px-4 py-3 rounded-lg group overflow-hidden"
                            >
                              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/60 backdrop-blur-sm transition-all duration-300" />
                              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <span className="relative z-10 text-slate-600 group-hover:text-slate-800 transition-colors duration-300">Bloco de Notas</span>
                            </Link>
                          )}
                          <Link
                            href="/profile"
                            className="relative flex items-center px-4 py-3 rounded-lg group overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/60 backdrop-blur-sm transition-all duration-300" />
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <span className="relative z-10 text-slate-600 group-hover:text-slate-800 transition-colors duration-300">Perfil</span>
                          </Link>
                        </>
                      )}
                    </nav>
                  </div>
                  
                  {/* Bottom decorative line */}
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
                </div>
              </SheetContent>
            </Sheet>

            <Link 
              href={session ? "/api/auth/signout" : "/api/auth/signin"}
            >
              <Button 
                variant={session ? "outline" : "default"}
                className={`relative overflow-hidden group shadow-sm hover:shadow-md transition-all duration-300 ${
                  session 
                    ? 'border-blue-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700' 
                    : 'text-white'
                }`}
                style={!session ? {
                  background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
                } : {}}
                disabled={status === "loading"}
              >
                {/* Button hover effect for gradient button */}
                {!session && (
                  <span 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%)',
                    }}
                  />
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
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
