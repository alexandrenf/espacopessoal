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
import { Menu, X, User, ChevronDown } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
} from "~/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import Image from "next/image";
import debounce from "lodash/debounce"; // Using lodash's debounce since it's already in dependencies

// Helper function to get user initials
function getUserInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const names = name.trim().split(" ");
    if (names.length >= 2) {
      return `${names[0]?.[0] ?? ""}${names[names.length - 1]?.[0] ?? ""}`.toUpperCase();
    }
    return name[0]?.toUpperCase() ?? "";
  }
  if (email) {
    return email[0]?.toUpperCase() ?? "U";
  }
  return "U";
}

// UserAvatar component
function UserAvatar({
  user,
  size = "md",
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  const initials = getUserInitials(user.name, user.email);

  if (user.image) {
    return (
      <div className="relative">
        <Image
          src={user.image}
          alt={user.name ?? "User avatar"}
          width={size === "sm" ? 32 : size === "md" ? 40 : 48}
          height={size === "sm" ? 32 : size === "md" ? 40 : 48}
          className={`${sizeClasses[size]} rounded-full object-cover shadow-sm ring-2 ring-white transition-all duration-300 hover:shadow-md`}
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm ring-2 ring-white transition-all duration-300 hover:scale-105 hover:shadow-md`}
    >
      <span className="font-semibold text-white">{initials}</span>
    </div>
  );
}

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
    () => (isAuthenticated ? "/notas" : null),
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
                      <div className="flex items-center gap-3">
                        {session && (
                          <UserAvatar user={session.user} size="sm" />
                        )}
                        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-lg font-semibold text-transparent">
                          {session
                            ? `Olá, ${session.user.name?.split(" ")[0] ?? "Usuário"}!`
                            : "Menu"}
                        </span>
                      </div>
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

                  {/* Authentication section for mobile */}
                  <div className="border-t border-slate-200 p-6">
                    {session ? (
                      <div className="space-y-4">
                        {/* User info */}
                        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                          <UserAvatar user={session.user} size="md" />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">
                              {session.user.name ?? "Usuário"}
                            </span>
                            <span className="text-xs text-slate-500">
                              {session.user.email}
                            </span>
                          </div>
                        </div>
                        {/* Sign out button */}
                        <Link href="/auth/signout" className="block">
                          <Button
                            variant="outline"
                            className="w-full border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Sair
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <Link href="/auth/signin" className="block">
                        <Button className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl">
                          Entrar
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Authentication Section */}
            {status === "loading" ? (
              <div className="flex items-center gap-2 px-4 py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-r-transparent" />
                <span className="text-sm text-slate-600">Carregando...</span>
              </div>
            ) : session ? (
              /* User Dropdown Menu */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="group relative flex h-auto items-center gap-2 rounded-full p-2 transition-all duration-300 hover:bg-slate-100 focus:bg-slate-100"
                  >
                    <UserAvatar user={session.user} size="sm" />
                    <div className="hidden flex-col items-start sm:flex">
                      <span className="text-sm font-medium leading-none text-slate-900">
                        {session.user.name?.split(" ")[0] ?? "Usuário"}
                      </span>
                      <span className="mt-0.5 text-xs leading-none text-slate-500">
                        {session.user.email}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1">
                  <div className="flex items-center gap-3 border-b border-slate-100 p-3">
                    <UserAvatar user={session.user} size="md" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900">
                        {session.user.name ?? "Usuário"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {session.user.email}
                      </span>
                    </div>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/profile"
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      <span>Meu Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  {notebooksUrl && (
                    <DropdownMenuItem asChild>
                      <Link
                        href={notebooksUrl}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Menu className="h-4 w-4" />
                        <span>Meus Notebooks</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/auth/signout"
                      className="flex cursor-pointer items-center gap-2 text-red-600 focus:text-red-700"
                    >
                      <X className="h-4 w-4" />
                      <span>Sair</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              /* Sign In Button for Non-authenticated Users */
              <Link href="/auth/signin">
                <Button className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl">
                  Entrar
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
