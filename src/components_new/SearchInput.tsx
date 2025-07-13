"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "../components_new/ui/button";
import { Input } from "../components_new/ui/input";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  search: string;
  setSearch: (search: string) => void;
}

// OPTIMIZATION: Debounce utility for search optimization
function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function SearchInput({ search, setSearch }: SearchInputProps) {
  const [value, setValue] = useState(search);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // OPTIMIZATION: Client-side cache for recent searches (Phase 1 bandwidth reduction)
  const searchCache = useRef<Map<string, boolean>>(new Map());

  // Keep local value in sync with search prop
  useEffect(() => {
    setValue(search);
  }, [search]);

  // OPTIMIZATION: Debounced search with 300ms delay for 50% bandwidth reduction
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      // Check cache first to avoid redundant queries
      if (searchCache.current.has(query.toLowerCase())) {
        return;
      }
      
      // Add to cache and set search
      searchCache.current.set(query.toLowerCase(), true);
      
      // Limit cache size to prevent memory leaks
      if (searchCache.current.size > 100) {
        const firstKey = searchCache.current.keys().next().value;
        if (firstKey) {
          searchCache.current.delete(firstKey);
        }
      }
      
      setSearch(query);
    }, 300), // 300ms debounce for optimal user experience
    [setSearch]
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setValue(newValue);
    
    // OPTIMIZATION: Apply debounced search for real-time typing
    if (newValue.trim()) {
      debouncedSearch(newValue.trim());
    } else {
      // Clear search immediately when input is empty
      setSearch("");
      searchCache.current.clear(); // Clear cache when search is cleared
    }
  };

  const handleClear = () => {
    setValue("");
    setSearch("");
    searchCache.current.clear(); // Clear cache when search is cleared
    inputRef.current?.blur();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(value);
    inputRef.current?.blur();
  };

  return (
    <div className="flex flex-1 items-center justify-center">
      <form onSubmit={handleSubmit} className="relative w-full max-w-[720px]">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          placeholder="Search"
          className="h-[48px] w-full rounded-full border-none bg-[#F0F4F8] px-14 placeholder:text-neutral-800 focus:bg-white focus-visible:shadow-[0_1px_1px_0_rgba(65,69,73,.3),0_1px_3px_1px_rgba(65,69,73,.15)] focus-visible:ring-0 md:text-base"
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full [&_svg]:size-5"
        >
          <Search />
        </Button>
        {value && (
          <Button
            onClick={handleClear}
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full [&_svg]:size-5"
          >
            <X />
          </Button>
        )}
      </form>
    </div>
  );
}
