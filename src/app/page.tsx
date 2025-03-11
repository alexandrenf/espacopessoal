import { Suspense } from "react";
import Footer from "~/app/components/Footer";
import Header from "~/app/components/Header";
import DynamicHomeContent from "~/app/components/DynamicHomeContent";
import { HealthCheckModal } from "~/app/components/HealthCheckModal";

// Optimize loading behavior
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Suspense 
        fallback={
          <div className="flex-grow flex items-center justify-center">
            <div className="animate-pulse text-lg text-muted-foreground">
              Carregando...
            </div>
          </div>
        }
      >
        <DynamicHomeContent />
      </Suspense>
      <Suspense fallback={<div aria-hidden="true" />}>
        <HealthCheckModal />
      </Suspense>
      <Footer />
    </div>
  );
}
