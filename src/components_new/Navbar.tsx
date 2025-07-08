"use client";

import Image from "next/image";
import Link from "next/link";
import { SearchInput } from "./SearchInput";

interface NavbarProps {
  search: string;
  setSearch: (search: string) => void;
}

/**
 * Renders a navigation bar with a logo, title, search input, and user action area.
 *
 * The navigation bar includes a clickable logo linking to the homepage, a "Docs" heading, a central search input, and a placeholder user avatar. The search input is controlled via the provided `search` value and `setSearch` function.
 *
 * @param search - The current search query string
 * @param setSearch - Function to update the search query
 * @returns The navigation bar component
 */
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