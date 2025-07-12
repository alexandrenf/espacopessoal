import Footer from "~/app/components/Footer";
import Header from "~/app/components/Header";
import DynamicHomeContent from "~/app/components/DynamicHomeContent";
//import { HealthCheckModal } from "~/app/components/HealthCheckModal";
import { Suspense } from "react";

// Make this a static page
export const dynamic = "force-static";
export const revalidate = 3600; // Revalidate at most once per hour

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Suspense
        fallback={
          <div className="flex flex-grow items-center justify-center">
            Loading...
          </div>
        }
      >
        <DynamicHomeContent />
      </Suspense>
      <Suspense fallback={<div aria-hidden="true"></div>}>
        {/*<HealthCheckModal /> */}
      </Suspense>
      <Footer />
    </div>
  );
}
