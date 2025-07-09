"use client";

import Image from "next/image";
import Link from "next/link";
import { SearchInput } from "./SearchInput";

interface NavbarProps {
  search: string;
  setSearch: (search: string) => void;
}

export function Navbar({ search, setSearch }: NavbarProps) {
  return (
    <nav className="flex h-full w-full items-center justify-between gap-6">
      <div className="flex shrink-0 items-center gap-3">
        <Link href="/">
          <div className="relative size-8">
            <Image src="/icons/icon-96x96.png" alt="Espaco Pessoal Logo" fill />
          </div>
        </Link>
        <h3 className="text-xl">Docs</h3>
      </div>
      <SearchInput search={search} setSearch={setSearch} />
      <div className="flex items-center gap-3">
        {/* User actions will go here when we add auth later */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm text-white">
          D
        </div>
      </div>
    </nav>
  );
}
