"use client";

import { useSession } from "next-auth/react";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import HowItWorksSection from "./HowItWorksSection";
import CTASection from "./CTASection";

export default function DynamicHomeContent() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <main>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      {!isAuthenticated && <CTASection />}
    </main>
  );
}
