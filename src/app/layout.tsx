import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata, type Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";

import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from 'sonner';
import { SessionProvider } from "~/components/SessionProvider";
import { PWAProvider } from "~/components/PWAProvider";
import { ConvexClientProvider } from "~/components_new/ConvexClientProvider";
import { Suspense } from 'react';
import { LoadingSpinner } from "~/app/components/LoadingSpinner";

export const metadata: Metadata = {
  title: "Espaço Pessoal",
  description: "Organize suas notas, pensamentos e ideias em um único lugar seguro e acessível de qualquer lugar.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Espaço Pessoal",
    startupImage: [
      {
        url: "/splash/apple-splash-2048-2732.png",
        media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)"
      }
    ]
  },
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "apple-touch-icon", url: "/icons/icon-192x192.png", sizes: "192x192" },
    { rel: "apple-touch-icon", url: "/icons/icon-512x512.png", sizes: "512x512" },
    { rel: "apple-touch-icon", url: "/icons/icon-152x152.png", sizes: "152x152" },
    { rel: "apple-touch-icon", url: "/icons/icon-144x144.png", sizes: "144x144" },
    { rel: "apple-touch-icon", url: "/icons/icon-128x128.png", sizes: "128x128" },
    { rel: "icon", url: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
    { rel: "icon", url: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
    { rel: "icon", url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
  ],
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/**
 * Root layout component that wraps the application with global providers, metadata, and UI elements.
 *
 * Renders the application's children within context providers for tRPC, user session, Convex client, and PWA features. Displays a loading spinner while suspenseful content is loading, and includes global toast notifications and analytics tracking.
 *
 * @param children - The content to be rendered within the layout
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <TRPCReactProvider>
          <SessionProvider>
            <ConvexClientProvider>
              <PWAProvider>
                <Suspense fallback={
                  <div className="min-h-screen flex items-center justify-center">
                    <LoadingSpinner className="h-8 w-8" />
                  </div>
                }>
                  {children}
                </Suspense>
              </PWAProvider>
            </ConvexClientProvider>
          </SessionProvider>
        </TRPCReactProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
