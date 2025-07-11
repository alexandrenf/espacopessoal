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
    <header className="sticky top-0 z-50 transition-all duration-300">
      {/* Clean background with subtle border */}
      <div
        className={`absolute inset-0 border-b transition-all duration-300 ${
          isScrolled
            ? "border-slate-200 bg-white/95 backdrop-blur-md"
            : "border-transparent bg-white/80"
        }`}
      />

      {/* Subtle top accent line */}
      <div className="absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-blue-500 to-indigo-500" />

      {/* Main content container */}
      <div className="container relative mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo with gradient */}
          <Link
            href="/"
            className="group relative z-20 flex items-center gap-2 py-1"
          >
            <div className="relative">
              <span className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-xl font-bold text-transparent transition-all duration-300 group-hover:scale-[1.02]">
                Espaço Pessoal
              </span>

              {/* Simple underline effect */}
              <div className="absolute bottom-0 left-0 h-[1px] w-full scale-x-0 transform bg-blue-600 transition-transform duration-300 group-hover:scale-x-100" />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center space-x-8 md:flex">
            <Link href="/#recursos" className="group relative px-3 py-2">
              <span className="text-sm font-medium text-slate-600 transition-colors duration-300 group-hover:text-slate-900">
                Recursos
              </span>

              {/* Simple underline effect */}
              <div className="absolute bottom-0 left-0 h-[1px] w-full scale-x-0 transform bg-blue-600 transition-transform duration-300 group-hover:scale-x-100" />
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
                    <span className="text-sm font-medium text-slate-600 transition-colors duration-300 group-hover:text-slate-900">
                      Meus Notebooks
                    </span>

                    {/* Simple underline effect */}
                    <div className="absolute bottom-0 left-0 h-[1px] w-full scale-x-0 transform bg-blue-600 transition-transform duration-300 group-hover:scale-x-100" />
                  </Link>
                ) : null}
                <Link href="/profile" className="group relative px-3 py-2">
                  <span className="text-sm font-medium text-slate-600 transition-colors duration-300 group-hover:text-slate-900">
                    Perfil
                  </span>

                  {/* Simple underline effect */}
                  <div className="absolute bottom-0 left-0 h-[1px] w-full scale-x-0 transform bg-blue-600 transition-transform duration-300 group-hover:scale-x-100" />
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
                  className="group relative rounded-full hover:bg-slate-100 md:hidden"
                  aria-label="Menu"
                >
                  <Menu className="h-5 w-5 text-slate-600 transition-all duration-300 group-hover:text-slate-900" />
                </Button>
              </SheetTrigger>
              <SheetContent
                className="w-full border-l border-slate-200 bg-white p-0 sm:w-[400px]"
                hideCloseButton
              >
                <div className="flex h-full flex-col">
                  {/* Simple top accent */}
                  <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />

                  <div className="flex-1 p-6">
                    <div className="mb-8 flex items-center justify-between">
                      <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-lg font-semibold text-transparent">
                        Menu
                      </span>
                      <SheetClose asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="group relative rounded-full hover:bg-slate-100"
                        >
                          <X className="h-5 w-5 text-slate-600 transition-all duration-300 group-hover:text-slate-900" />
                        </Button>
                      </SheetClose>
                    </div>
                    <nav className="flex flex-col gap-2">
                      <Link
                        href="/#recursos"
                        className="group relative flex items-center rounded-lg px-4 py-3 hover:bg-slate-50"
                      >
                        <div className="absolute bottom-0 left-0 top-0 w-[2px] bg-blue-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        <span className="text-slate-600 transition-colors duration-300 group-hover:text-slate-900">
                          Recursos
                        </span>
                      </Link>

                      {isAuthenticated && (
                        <>
                          {notebooksUrl && (
                            <Link
                              href={notebooksUrl}
                              className="group relative flex items-center rounded-lg px-4 py-3 hover:bg-slate-50"
                            >
                              <div className="absolute bottom-0 left-0 top-0 w-[2px] bg-blue-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                              <span className="text-slate-600 transition-colors duration-300 group-hover:text-slate-900">
                                Meus Notebooks
                              </span>
                            </Link>
                          )}
                          <Link
                            href="/profile"
                            className="group relative flex items-center rounded-lg px-4 py-3 hover:bg-slate-50"
                          >
                            <div className="absolute bottom-0 left-0 top-0 w-[2px] bg-blue-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            <span className="text-slate-600 transition-colors duration-300 group-hover:text-slate-900">
                              Perfil
                            </span>
                          </Link>
                        </>
                      )}
                    </nav>
                  </div>

                  {/* Bottom border */}
                  <div className="h-px w-full bg-slate-200" />
                </div>
              </SheetContent>
            </Sheet>

            <Link href={session ? "/api/auth/signout" : "/api/auth/signin"}>
              <Button
                variant={session ? "outline" : "default"}
                className={`group relative shadow-sm transition-all duration-300 hover:shadow-md ${
                  session
                    ? "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                disabled={status === "loading"}
              >
                {/* Button text with loading state */}
                <span className="font-medium">
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
