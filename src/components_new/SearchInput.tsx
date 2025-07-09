"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "../components_new/ui/button";
import { Input } from "../components_new/ui/input";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  search: string;
  setSearch: (search: string) => void;
}

export function SearchInput({ search, setSearch }: SearchInputProps) {
  const [value, setValue] = useState(search);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep local value in sync with search prop
  useEffect(() => {
    setValue(search);
  }, [search]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  };

  const handleClear = () => {
    setValue("");
    setSearch("");
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
