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
    <nav className="flex items-center justify-between h-full w-full gap-6">
      <div className="flex gap-3 items-center shrink-0">
        <Link href="/">
          <div className="relative size-8">
            <Image src="/next.svg" alt="Logo" fill />
          </div>
        </Link>
        <h3 className="text-xl">Docs</h3>
      </div>
      <SearchInput search={search} setSearch={setSearch} />
      <div className="flex gap-3 items-center">
        {/* User actions will go here when we add auth later */}
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
          D
        </div>
      </div>
    </nav>
  );
} 