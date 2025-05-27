"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * Renders the animated landing hero section with authentication-aware call-to-action and trust indicators.
 *
 * Displays a visually engaging hero area with animated backgrounds, a personalized badge, headline, description, and two call-to-action buttons. The primary button adapts its label and destination based on authentication status, while an animated error notification appears if authentication fails. Trust indicators are shown below the main actions.
 *
 * @returns The hero section React element for the landing page.
 */
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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
      {/* Subtle background pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Gentle floating orbs */}
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Error notification */}
      {authError && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-4 right-4 bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg backdrop-blur-sm z-50"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span>Ocorreu um erro na autenticação. Por favor, tente novamente mais tarde.</span>
          </div>
        </motion.div>
      )}
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full text-sm text-white">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              Seu espaço digital pessoal
            </div>
          </motion.div>

          <motion.h1 
            className="text-5xl md:text-7xl font-bold mb-6 text-white leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            Organize suas ideias em um{" "}
            <span className="bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 text-transparent bg-clip-text">
              espaço único
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl mb-10 text-blue-100 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Crie, organize e acesse suas notas de qualquer lugar. 
            Simples, seguro e sempre disponível.
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <Link 
              href={session ? "/profile" : "/api/auth/signin"}
              className="group"
            >
              <Button 
                size="lg" 
                className="bg-white/95 hover:bg-white text-blue-700 px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105 backdrop-blur-sm"
              >
                {status === "loading" ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-700/30 border-t-blue-700 rounded-full animate-spin" />
                    Carregando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {session ? "Acessar Meu Espaço" : "Começar Gratuitamente"}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>
            </Link>

            <Link 
              href="#recursos"
              className="px-6 py-3 text-lg font-medium text-white/80 hover:text-white transition-colors"
            >
              Conhecer recursos
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            className="mt-12 flex flex-wrap justify-center items-center gap-6 text-sm text-blue-100"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span>100% Gratuito</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full" />
              <span>Sem cartão necessário</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-pink-400 rounded-full" />
              <span>Pronto em 1 minuto</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
