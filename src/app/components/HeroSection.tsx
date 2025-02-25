"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export default function HeroSection() {
  const { data: session, status } = useSession();
  const [authError, setAuthError] = useState<boolean>(false);
  
  // Handle authentication errors
  useEffect(() => {
    if (status === "unauthenticated" && session === undefined) {
      console.error("Authentication error occurred");
      setAuthError(true);
    }
  }, [status]);

  return (
    <section className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/hero-pattern.svg')] opacity-10"></div>
      <div className="absolute -bottom-48 -right-48 w-96 h-96 bg-blue-400 rounded-full filter blur-3xl opacity-20"></div>
      <div className="absolute -top-48 -left-48 w-96 h-96 bg-indigo-400 rounded-full filter blur-3xl opacity-20"></div>
      
      {authError && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-2 text-center">
          Ocorreu um erro na autenticação. Por favor, tente novamente mais tarde.
        </div>
      )}
      
      <div className="container mx-auto px-4 text-center relative z-10">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Seu Espaço Pessoal <span className="text-blue-200">Digital</span>
        </h1>
        <p className="text-xl md:text-2xl mb-10 max-w-2xl mx-auto text-blue-100">
          Organize suas notas, pensamentos e ideias em um único lugar seguro e acessível de qualquer lugar.
        </p>
        <div className="flex flex-col sm:flex-row gap-5 justify-center">
          <Link href={session ? "/profile" : "/api/auth/signin"}>
            <Button size="lg" className="w-full sm:w-auto bg-white text-blue-700 hover:bg-blue-50 font-semibold px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all">
              {status === "loading" ? "Carregando..." : session ? "Acessar Meu Espaço" : "Começar Agora"}
            </Button>
          </Link>
          <Link href="#recursos">
            <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent text-white border-white hover:bg-white/10 font-semibold px-8 py-6 text-lg rounded-full">
              Conhecer Recursos
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
