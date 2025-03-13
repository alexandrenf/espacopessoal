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

  // Switch to combined query
  const { data: userSettings } = api.userSettings.getUserSettingsAndHealth.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
      suspense: false,
    }
  );

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
