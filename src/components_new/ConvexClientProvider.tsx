"use client";

import { type ReactNode, useMemo } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!convexUrl) {
      throw new Error(
        "NEXT_PUBLIC_CONVEX_URL environment variable is not set. " +
          "Please add NEXT_PUBLIC_CONVEX_URL to your .env.local file. " +
          "Check your Convex dashboard for the correct URL.",
      );
    }

    return new ConvexReactClient(convexUrl);
  }, []);

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
