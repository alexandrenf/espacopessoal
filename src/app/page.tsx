import Link from "next/link";
import { Button } from "~/components/ui/button";
import Header from "~/app/components/Header";
import Footer from "~/app/components/Footer";
import HeroSection from "~/app/components/HeroSection";
import FeaturesSection from "~/app/components/FeaturesSection";
import HowItWorksSection from "~/app/components/HowItWorksSection";
import CTASection from "~/app/components/CTASection";

// Client component wrapper
const HydrateClient = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default function Home() {
  return (
    <HydrateClient>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main>
          <HeroSection />
          <FeaturesSection />
          <HowItWorksSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    </HydrateClient>
  );
}
