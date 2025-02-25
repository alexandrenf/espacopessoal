"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { useState, useEffect } from "react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
export function SessionProvider({ children }: { children: React.ReactNode }) {
  // Error handling has been moved to a useEffect or error boundary in a full implementation
  return (
    <NextAuthSessionProvider>
      {children}
    </NextAuthSessionProvider>
  );
}

  return (
    <NextAuthSessionProvider>
      {children}
    </NextAuthSessionProvider>
  );
}
