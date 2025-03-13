"use client";

import { useSession } from "next-auth/react";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import HowItWorksSection from "./HowItWorksSection";
import CTASection from "./CTASection";
import { UserDashboard } from "~/app/components/UserDashboard";
import { api } from "~/trpc/react";

export default function DynamicHomeContent() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <UserDashboard />;
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
