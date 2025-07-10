"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { useSession } from "next-auth/react";
import { useState, useMemo, useEffect, useCallback } from "react";
// import { api } from "~/trpc/react";
// TODO: Re-enable once Convex API is properly generated
// import { useQuery } from "convex/react";
// import { api as convexApi } from "../../../convex/_generated/api";
// import type { Id } from "../../../convex/_generated/dataModel";
import { Menu, X } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
} from "~/components/ui/sheet";
import debounce from "lodash/debounce"; // Using lodash's debounce since it's already in dependencies

export default function Header() {
  const { data: session, status } = useSession({
    required: false,
  });
  const [isScrolled, setIsScrolled] = useState(false);

  // Memoize authentication state
  const isAuthenticated = useMemo(
    () => status === "authenticated" && !!session,
    [status, session],
  );
  // TODO: Fix Convex API generation - currently using anyApi instead of typed API
  // Temporarily disable the query until Convex API is properly generated
  const userSettings = undefined; // useQuery(
  //   convexApi.userSettings.getUserSettingsAndHealth,
  //   isAuthenticated && session?.user?.id
  //     ? { userId: session.user.id as Id<"users"> }
  //     : "skip"
  // );

  const isLoadingSettings = false;

  // Update to use the new notebooks route
  const notebooksUrl = useMemo(
    () => (isAuthenticated ? "/notebooks" : null),
    [isAuthenticated],
  );

  // Create a memoized debounced scroll handler
  const handleScroll = useCallback(() => {
    const debouncedScroll = debounce(
      () => {
        setIsScrolled(window.scrollY > 20);
      },
      50,
      { maxWait: 150 },
    );

    return debouncedScroll;
  }, []); // Empty dependencies since we don't use any external values

  useEffect(() => {
    if (typeof window !== "undefined") {
      const scrollHandler = handleScroll();
      window.addEventListener("scroll", scrollHandler);

      return () => {
        if (typeof window !== "undefined") {
          scrollHandler.cancel(); // Cancel any pending debounced calls
          window.removeEventListener("scroll", scrollHandler);
        }
      };
    }
  }, [handleScroll]);

  return (
    <header className="sticky top-0 z-50 transition-all duration-500">
      {/* Glass morphism background with gradient */}
      <div
        className="absolute inset-0 border-b border-white/20 backdrop-blur-md"
        style={{
          background: isScrolled
            ? "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)"
            : "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)",
        }}
      />

      {/* Gradient top accent line */}
      <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.1) 1px, transparent 0)`,
          backgroundSize: "16px 16px",
        }}
      />

      {/* Bottom glow effect when scrolled */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[1px] transition-opacity duration-700 ${isScrolled ? "opacity-100" : "opacity-0"}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />
      </div>

      {/* Main content container */}
      <div className="container relative mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo with gradient */}
          <Link
            href="/"
            className="group relative z-20 flex items-center gap-2 py-1"
          >
            <div className="relative">
              <span className="inline-block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent transition-all duration-300 group-hover:scale-[1.02]">
                Espaço Pessoal
              </span>

              {/* Animated underline effect */}
              <div className="absolute bottom-0 left-0 h-[2px] w-full scale-x-0 transform transition-transform duration-300 group-hover:scale-x-100">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-50 blur-sm" />
              </div>

              {/* Hover glow effect */}
              <div className="absolute -inset-2 -z-10 rounded-lg bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 opacity-0 blur-sm transition-all duration-300 group-hover:opacity-100" />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center space-x-8 md:flex">
            <Link href="/#recursos" className="group relative px-3 py-2">
              <span className="relative z-10 text-sm font-medium text-slate-600 transition-colors duration-300 group-hover:text-slate-800">
                Recursos
              </span>

              {/* Hover background effect */}
              <span className="absolute inset-0 -z-10 rounded-md bg-white/0 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/60" />

              {/* Gradient line effect */}
              <div className="absolute bottom-0 left-0 h-[2px] w-full scale-x-0 transform transition-transform duration-300 group-hover:scale-x-100">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
              </div>
            </Link>

            {isAuthenticated && (
              <div className="flex items-center space-x-8">
                {isLoadingSettings ? (
                  <div className="relative px-3 py-2 text-sm font-medium text-slate-500">
                    <span className="animate-pulse">Meus Notebooks</span>
                    <span className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-slate-300" />
                  </div>
                ) : notebooksUrl ? (
                  <Link
                    href={notebooksUrl}
                    className="group relative px-3 py-2"
                    prefetch={false}
                  >
                    <span className="relative z-10 text-sm font-medium text-slate-600 transition-colors duration-300 group-hover:text-slate-800">
                      Meus Notebooks
                    </span>

                    {/* Hover background effect */}
                    <span className="absolute inset-0 -z-10 rounded-md bg-white/0 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/60" />

                    {/* Gradient line effect */}
                    <div className="absolute bottom-0 left-0 h-[2px] w-full scale-x-0 transform transition-transform duration-300 group-hover:scale-x-100">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                    </div>
                  </Link>
                ) : null}
                <Link href="/profile" className="group relative px-3 py-2">
                  <span className="relative z-10 text-sm font-medium text-slate-600 transition-colors duration-300 group-hover:text-slate-800">
                    Perfil
                  </span>

                  {/* Hover background effect */}
                  <span className="absolute inset-0 -z-10 rounded-md bg-white/0 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/60" />

                  {/* Gradient line effect */}
                  <div className="absolute bottom-0 left-0 h-[2px] w-full scale-x-0 transform transition-transform duration-300 group-hover:scale-x-100">
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
                  className="group relative overflow-hidden rounded-full backdrop-blur-sm hover:bg-white/60 md:hidden"
                  aria-label="Menu"
                >
                  <span className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <Menu className="h-5 w-5 text-slate-600 transition-all duration-300 group-hover:scale-105 group-hover:text-slate-800" />
                </Button>
              </SheetTrigger>
              <SheetContent
                className="w-full border-l border-white/20 p-0 sm:w-[400px]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
                  backdropFilter: "blur(20px)",
                }}
                hideCloseButton
              >
                <div className="flex h-full flex-col">
                  {/* Gradient top accent */}
                  <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

                  <div className="flex-1 p-6">
                    <div className="mb-8 flex items-center justify-between">
                      <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-lg font-semibold text-transparent">
                        Menu
                      </span>
                      <SheetClose asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="group relative overflow-hidden rounded-full hover:bg-white/60"
                        >
                          <span className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          <X className="h-5 w-5 text-slate-600 transition-all duration-300 group-hover:scale-105 group-hover:text-slate-800" />
                        </Button>
                      </SheetClose>
                    </div>
                    <nav className="flex flex-col gap-2">
                      <Link
                        href="/#recursos"
                        className="group relative flex items-center overflow-hidden rounded-lg px-4 py-3"
                      >
                        <div className="absolute inset-0 bg-white/0 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/60" />
                        <div className="absolute bottom-0 left-0 top-0 w-[3px] rounded-full bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        <span className="relative z-10 text-slate-600 transition-colors duration-300 group-hover:text-slate-800">
                          Recursos
                        </span>
                      </Link>

                      {isAuthenticated && (
                        <>
                          {notebooksUrl && (
                            <Link
                              href={notebooksUrl}
                              className="group relative flex items-center overflow-hidden rounded-lg px-4 py-3"
                            >
                              <div className="absolute inset-0 bg-white/0 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/60" />
                              <div className="absolute bottom-0 left-0 top-0 w-[3px] rounded-full bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                              <span className="relative z-10 text-slate-600 transition-colors duration-300 group-hover:text-slate-800">
                                Meus Notebooks
                              </span>
                            </Link>
                          )}
                          <Link
                            href="/profile"
                            className="group relative flex items-center overflow-hidden rounded-lg px-4 py-3"
                          >
                            <div className="absolute inset-0 bg-white/0 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/60" />
                            <div className="absolute bottom-0 left-0 top-0 w-[3px] rounded-full bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            <span className="relative z-10 text-slate-600 transition-colors duration-300 group-hover:text-slate-800">
                              Perfil
                            </span>
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

            <Link href={session ? "/api/auth/signout" : "/api/auth/signin"}>
              <Button
                variant={session ? "outline" : "default"}
                className={`group relative overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md ${
                  session
                    ? "border-blue-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                    : "text-white"
                }`}
                style={
                  !session
                    ? {
                        background:
                          "linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)",
                      }
                    : {}
                }
                disabled={status === "loading"}
              >
                {/* Button hover effect for gradient button */}
                {!session && (
                  <span
                    className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background:
                        "linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%)",
                    }}
                  />
                )}

                {/* Button text with loading state */}
                <span className="relative z-10 font-medium">
                  {status === "loading" ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                      <span>Carregando</span>
                    </span>
                  ) : session ? (
                    <span className="inline-block transition-transform duration-300 group-hover:scale-105">
                      Sair
                    </span>
                  ) : (
                    <span className="inline-block transition-transform duration-300 group-hover:scale-105">
                      Entrar
                    </span>
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
