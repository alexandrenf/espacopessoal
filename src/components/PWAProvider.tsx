"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "~/app/sw";

export function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      registerServiceWorker();
    }
  }, []);

  return <>{children}</>;
}
