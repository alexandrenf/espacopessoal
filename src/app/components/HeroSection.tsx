"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export default function HeroSection() {
  const { data: session, status } = useSession();
  const [authError, setAuthError] = useState<boolean>(false);
  
  useEffect(() => {
    if (status === "unauthenticated" && session === undefined) {
      console.error("Authentication error occurred");
      setAuthError(true);
    }
  }, [status, session]);

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
      {/* Enhanced background pattern */}
      <div 
        className="absolute inset-0" 
        style={{
          backgroundImage: `
            radial-gradient(circle at center, rgba(255,255,255,0.1) 2px, transparent 2px),
            radial-gradient(circle at center, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px, 16px 16px',
          backgroundPosition: '0 0, 8px 8px'
        }}
      ></div>

      {/* Animated gradient orbs */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-400/30 rounded-full filter blur-[100px] animate-pulse"></div>
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-400/30 rounded-full filter blur-[100px] animate-pulse delay-700"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-400/20 rounded-full filter blur-[120px] animate-pulse delay-1000"></div>
      
      {/* Error notification */}
      {authError && (
        <div className="absolute top-0 left-0 right-0 bg-red-500/90 backdrop-blur-sm text-white p-3 text-center transform animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Ocorreu um erro na autenticação. Por favor, tente novamente mais tarde.</span>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-white leading-tight">
            Seu Espaço Pessoal{" "}
            <span className="relative">
              <span className="relative z-10 bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 text-transparent bg-clip-text animate-gradient">
                Digital
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 blur-xl opacity-30 animate-pulse"></span>
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl mb-12 text-blue-100 max-w-3xl mx-auto leading-relaxed opacity-90">
            Organize suas notas, pensamentos e ideias em um único lugar
            <span className="block mt-2">seguro e acessível de qualquer lugar.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link 
              href={session ? "/profile" : "/api/auth/signin"}
              className="group relative inline-flex items-center justify-center"
            >
              <span className="absolute inset-0 w-full h-full bg-white rounded-full blur-md opacity-20 group-hover:opacity-30 transition-opacity duration-300"></span>
              <Button 
                size="lg" 
                className="relative bg-white text-blue-700 hover:bg-blue-50 font-semibold px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                {status === "loading" ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Carregando...
                  </span>
                ) : session ? "Acessar Meu Espaço" : "Começar Agora"}
              </Button>
            </Link>

            <Link 
              href="#recursos"
              className="group relative px-8 py-4 text-lg font-semibold text-white transition-all duration-300"
            >
              <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-white transition-all duration-300 ease-out group-hover:w-full"></span>
              Conhecer Recursos
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
