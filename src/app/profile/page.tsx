import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import Link from "next/link";
import Header from "~/app/components/Header";
import { HydrateClient } from "~/trpc/server";
import { Suspense } from "react";
import { ProfileTour } from "~/app/components/profile/ProfileTour";
import {
  ProfilePageClient,
  ProfileErrorClient,
  ProfilePageSkeleton,
  ProfileUnauthenticatedClient,
  ProfilePageTitle,
} from "~/app/components/profile/ProfilePageClient";

async function ProfileContent() {
  try {
    const [userData] = await Promise.all([api.users.getUserProfile()]);
    return <ProfilePageClient userData={userData} />;
  } catch (error) {
    console.error("Error loading profile data:", error);
    return <ProfileErrorClient />;
  }
}

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="relative flex flex-grow items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          {/* Background grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

          {/* Background gradient orbs */}
          <div className="absolute right-1/4 top-1/4 h-64 w-64 animate-pulse rounded-full bg-gradient-to-br from-blue-400/10 to-indigo-500/10 blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 h-80 w-80 animate-pulse rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-500/10 blur-3xl" />

          <ProfileUnauthenticatedClient />
          <Link
            href="/auth/signin"
            className="absolute bottom-8 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-medium text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25"
          >
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <HydrateClient>
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="relative flex-grow overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          {/* Background grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

          {/* Background gradient orbs */}
          <div className="absolute right-1/4 top-1/3 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-blue-400/10 to-indigo-500/10 blur-3xl" />
          <div className="absolute bottom-1/3 left-1/4 h-80 w-80 animate-pulse rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-500/10 blur-3xl" />

          <div className="container relative mx-auto max-w-3xl flex-grow p-6">
            <ProfilePageTitle />

            <Suspense fallback={<ProfilePageSkeleton />}>
              <ProfileContent />
            </Suspense>
          </div>
        </div>
      </div>
      <ProfileTour />
    </HydrateClient>
  );
}
