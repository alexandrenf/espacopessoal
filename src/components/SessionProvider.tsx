"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { useState, useEffect } from "react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<Error | null>(null);

  // Handle any errors that might occur during session initialization
  if (error) {
    console.error("Session provider error:", error);
    // Continue rendering children, but session will be null
  }

  return (
    <NextAuthSessionProvider>
      {children}
    </NextAuthSessionProvider>
  );
}
