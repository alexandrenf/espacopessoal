declare interface ServiceWorkerGlobalScope {
  define: (dependencies: string[], callback: (...args: unknown[]) => void) => void;
}

declare interface Window {
  define: (dependencies: string[], callback: (...args: unknown[]) => void) => void;
}