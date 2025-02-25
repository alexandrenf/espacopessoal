"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export default function Header() {
  const { data: session, status } = useSession();
  const [authError, setAuthError] = useState<boolean>(false);
  
  // Handle authentication errors
  useEffect(() => {
    if (status === "unauthenticated" && session === undefined) {
      console.error("Authentication error occurred");
      setAuthError(true);
    }
  }, [status, session]);
  
  return (
    <header className="bg-white shadow-sm">
      {authError && (
        <div className="bg-red-500 text-white p-2 text-center text-sm">
          Ocorreu um erro na autenticação. Por favor, tente novamente mais tarde.
        </div>
      )}
      
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-primary">
          Espaço Pessoal
        </Link>
        <nav className="hidden md:flex space-x-6">
          <Link href="#features" className="text-gray-600 hover:text-primary">
            Recursos
          </Link>
          <Link href="#testimonials" className="text-gray-600 hover:text-primary">
            Testimonials
          </Link>
          <Link href="#pricing" className="text-gray-600 hover:text-primary">
            Pricing
          </Link>
        </nav>
        <Button disabled={status === "loading"}>
          <Link href={session ? "/api/auth/signout" : "/api/auth/signin"}>
            {status === "loading" ? "Carregando..." : session ? "Sair" : "Entrar"}
          </Link>
        </Button>
      </div>
    </header>
  );
}
