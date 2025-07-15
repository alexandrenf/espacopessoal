"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "~/components/ui/button";
import { SearchInput } from "./SearchInput";
import { ArrowLeft, Home, Notebook, Settings } from "lucide-react";

interface NavbarProps {
  search: string;
  setSearch: (search: string) => void;
  notebookUrl?: string;
  notebookTitle?: string;
  documentTitle?: string;
}

export function Navbar({
  search,
  setSearch,
  notebookUrl,
  notebookTitle,
  documentTitle,
}: NavbarProps) {
  const { data: session } = useSession();

  return (
    <nav className="flex h-full w-full items-center justify-between gap-6 border-b border-gray-200 bg-white px-4 py-2">
      <div className="flex shrink-0 items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative size-8">
            <Image src="/icons/icon-96x96.png" alt="Espaco Pessoal Logo" fill />
          </div>
        </Link>

        {/* Breadcrumb navigation */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/notebooks" className="hover:text-gray-700">
            Notebooks
          </Link>

          {notebookTitle && (
            <>
              <span>/</span>
              <Link
                href={notebookUrl ? `/notas/${notebookUrl}` : "/notebooks"}
                className="hover:text-gray-700"
              >
                {notebookTitle}
              </Link>
            </>
          )}

          {documentTitle && (
            <>
              <span>/</span>
              <span className="text-gray-700">{documentTitle}</span>
            </>
          )}
        </div>
      </div>

      <SearchInput search={search} setSearch={setSearch} />

      <div className="flex items-center gap-3">
        {/* Quick actions */}
        <Link href="/notebooks">
          <Button variant="ghost" size="sm" className="gap-2">
            <Notebook className="h-4 w-4" />
            Notebooks
          </Button>
        </Link>

        {notebookUrl && (
          <Link href={`/notas/${notebookUrl}`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        )}

        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <Home className="h-4 w-4" />
            Home
          </Button>
        </Link>

        {session && (
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Perfil
            </Button>
          </Link>
        )}

        {/* User avatar or login */}
        {session ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm text-white">
            {session.user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
        ) : (
          <Link href="/auth/signin">
            <Button size="sm">Entrar</Button>
          </Link>
        )}
      </div>
    </nav>
  );
}
