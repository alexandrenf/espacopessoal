"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { NotepadPasswordAuth } from "~/app/components/NotepadPasswordAuth";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import App from "./notepad";

// Create a simple password storage helper
const STORAGE_KEY = "notepad_passwords";

const getStoredPasswords = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(STORAGE_KEY);
  try {
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Record<string, string>;
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
};

const storePassword = (url: string, password: string) => {
  const passwords = getStoredPasswords();
  passwords[url] = password;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(passwords));
};

export default function NotepadPage() {
  const { url } = useParams();
  const [password, setPassword] = useState<string | null>(null);
  const router = useRouter();
  
  // Load stored password on mount
  useEffect(() => {
    const passwords = getStoredPasswords();
    const storedPassword = passwords[url as string];
    if (storedPassword) {
      setPassword(storedPassword);
    }
  }, [url]);

  // Try to fetch notes
  const { data: notes, isLoading, error } = api.notes.fetchNotesPublic.useQuery(
    { 
      url: url as string,
      password: password ?? undefined
    },
    {
      enabled: !!url,
      retry: false
    }
  );

  // Handle unauthorized error
  useEffect(() => {
    if (error?.data?.code === "UNAUTHORIZED") {
      const passwords = getStoredPasswords();
      delete passwords[url as string];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(passwords));
      setPassword(null);
    }
  }, [error, url]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-grow flex items-center justify-center">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      </div>
    );
  }

  // If unauthorized and no password set, show auth form
  if (error?.data?.code === "UNAUTHORIZED" && !password) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-grow">
          <NotepadPasswordAuth 
            url={url as string} 
            onAuthenticated={(pwd) => {
              setPassword(pwd);
              storePassword(url as string, pwd);
            }} 
          />
        </div>
      </div>
    );
  }

  // Handle other errors
  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600">Error</h2>
            <p className="mt-2 text-gray-600">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render notes
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow">
        <App password={password} />
      </div>
    </div>
  );
}
