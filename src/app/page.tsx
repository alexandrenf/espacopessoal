import Footer from "~/app/components/Footer";
import Header from "~/app/components/Header";
import DynamicHomeContent from "~/app/components/DynamicHomeContent";
import { Suspense } from "react";

// Make this a static page
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate at most once per hour

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Suspense fallback={<div className="flex-grow flex items-center justify-center">Loading...</div>}>
        <DynamicHomeContent />
      </Suspense>
      <Footer />
    </div>
  );
}
