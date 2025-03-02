"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo } from "react";
import { api } from "~/trpc/react";
import { Menu, X } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent } from "~/components/ui/sheet";

export default function Header() {
  const { data: session, status } = useSession();
  const [authError, setAuthError] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Fetch user's notepad URL only when authenticated
  const { data: noteSettings, isLoading: isLoadingNoteSettings } = api.userSettings.getNoteSettings.useQuery(
    undefined, 
    {
      enabled: status === "authenticated",
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
    }
  );
  
  // Handle authentication errors - only run when status changes
  useEffect(() => {
    if (status === "unauthenticated" && session === undefined) {
      console.error("Authentication error occurred");
      setAuthError(true);
    }
  }, [status, session]);
  
  // Memoize authentication state to prevent unnecessary re-renders
  const isAuthenticated = useMemo(() => 
    status === "authenticated" && !!session,
    [status, session]
  );
  
  // Memoize the notepad URL to prevent unnecessary re-renders
  const notepadUrl = useMemo(() => 
    noteSettings?.notePadUrl ? `/notas/${noteSettings.notePadUrl}` : null,
    [noteSettings?.notePadUrl]
  );

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const nav = document.getElementById('mobile-menu');
      if (nav && !nav.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMobileMenuOpen]);
  
  return (
    <header className="bg-white shadow-sm relative">
      {authError && (
        <div className="bg-red-500 text-white p-2 text-center text-sm">
          Ocorreu um erro na autenticação. Por favor, tente novamente mais tarde.
        </div>
      )}
      
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-primary z-20">
          Espaço Pessoal
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-6">
          <Link href="/#recursos" className="text-gray-600 hover:text-primary">
            Recursos
          </Link>
          
          {isAuthenticated && (
            <>
              <div className="relative">
                {isLoadingNoteSettings ? (
                  <div className="text-gray-400 flex items-center">
                    Bloco de Notas
                    <div className="ml-2 w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse"></div>
                  </div>
                ) : notepadUrl ? (
                  <Link 
                    href={notepadUrl} 
                    className="text-gray-600 hover:text-primary"
                    prefetch={true}
                  >
                    Bloco de Notas
                  </Link>
                ) : null}
              </div>
              <Link href="/profile" className="text-gray-600 hover:text-primary">
                Perfil
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button 
                variant="ghost"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0">
              <nav className="flex flex-col h-full py-6">
                <div className="px-6 space-y-4">
                  <Link
                    href="/#recursos"
                    className="block text-gray-600 hover:text-primary py-2 text-lg"
                  >
                    Recursos
                  </Link>
                  
                  {isAuthenticated && (
                    <>
                      {notepadUrl && (
                        <Link
                          href={notepadUrl}
                          className="block text-gray-600 hover:text-primary py-2 text-lg"
                        >
                          Bloco de Notas
                        </Link>
                      )}
                      <Link
                        href="/profile"
                        className="block text-gray-600 hover:text-primary py-2 text-lg"
                      >
                        Perfil
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>

          <Button disabled={status === "loading"}>
            <Link href={session ? "/api/auth/signout" : "/api/auth/signin"}>
              {status === "loading" ? "Carregando..." : session ? "Sair" : "Entrar"}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
