import { type Metadata, type Viewport } from "next";

export const metadata: Metadata = {
  title: "Página não encontrada",
  description: "A página que você está procurando não existe.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-gray-600">A página que você está procurando não existe.</p>
      </div>
    </div>
  );
}
