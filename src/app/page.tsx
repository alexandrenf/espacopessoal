import Footer from "~/app/components/Footer";
import Header from "~/app/components/Header";
import DynamicHomeContent from "~/app/components/DynamicHomeContent";
import { HealthCheckModal } from "~/app/components/HealthCheckModal";
import { Suspense } from "react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Suspense fallback={<div className="flex-grow flex items-center justify-center">Loading...</div>}>
        <DynamicHomeContent />
      </Suspense>
      <Suspense fallback={<div aria-hidden="true"></div>}>
        <HealthCheckModal />
      </Suspense>
      <Footer />
    </div>
  );
}
