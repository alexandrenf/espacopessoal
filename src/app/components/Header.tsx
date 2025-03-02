"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { useSession } from "next-auth/react";
import { useState, useMemo, useEffect } from "react";
import { api } from "~/trpc/react";
import { Menu, X } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetClose } from "~/components/ui/sheet";

export default function Header() {
  const { data: session, status } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  
  const { data: noteSettings, isLoading: isLoadingNoteSettings } = api.userSettings.getNoteSettings.useQuery(
    undefined, 
    {
      enabled: status === "authenticated",
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
  
  // Memoize authentication state
  const isAuthenticated = useMemo(() => 
    status === "authenticated" && !!session,
    [status, session]
  );
  
  // Memoize the notepad URL
  const notepadUrl = useMemo(() => 
    noteSettings?.notePadUrl ? `/notas/${noteSettings.notePadUrl}` : null,
    [noteSettings?.notePadUrl]
  );

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

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
                {isLoadingNoteSettings ? (
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
