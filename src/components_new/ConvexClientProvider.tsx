"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Provides the Convex client context to descendant React components.
 *
 * Wraps its children with a ConvexProvider, enabling access to the Convex client for data operations within the component tree.
 *
 * @param children - The React nodes to receive Convex client context
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
} 