import Link from 'next/link'
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { ProfileDashboard } from "~/app/components/profile/ProfileDashboard";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">Please sign in to view your profile.</p>
          <Link
            href="/api/auth/signin"
            className="inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const userData = await api.userUpdate.getUserProfile();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-semibold text-gray-900 mb-8">Profile Dashboard</h1>
          <ProfileDashboard user={userData} />
        </div>
      </div>
    </div>
  );
}