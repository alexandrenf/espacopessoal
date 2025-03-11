import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata, type Viewport } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from 'sonner';
import { SessionProvider } from "~/components/SessionProvider";
import { PWAProvider } from "~/components/PWAProvider";
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
    { rel: "apple-touch-icon", url: "/icons/icon-192x192.png" },
  ],
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

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
            <PWAProvider>
              <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center">
                  <LoadingSpinner className="h-8 w-8" />
                </div>
              }>
                {children}
              </Suspense>
            </PWAProvider>
          </SessionProvider>
        </TRPCReactProvider>
        <Toaster />
      </body>
    </html>
  );
}
