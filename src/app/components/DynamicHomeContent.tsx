"use client";

import { useSession } from "next-auth/react";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import HowItWorksSection from "./HowItWorksSection";
import CTASection from "./CTASection";
import { UserDashboard } from "~/app/components/UserDashboard";
import { Suspense } from "react";

export default function DynamicHomeContent() {
  const { status } = useSession();
  
  if (status === "loading") {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-pulse text-lg text-muted-foreground">
          Carregando...
        </div>
      </div>
    );
  }

  if (status === "authenticated") {
    return (
      <Suspense fallback={
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-pulse text-lg text-muted-foreground">
            Carregando seu painel...
          </div>
        </div>
      }>
        <UserDashboard />
      </Suspense>
    );
  }

  return (
    <main>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CTASection />
    </main>
  );
}
