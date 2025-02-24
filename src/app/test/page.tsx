import Header from "../components/Header"
import Hero from "../components/Hero"
import Features from "../components/Features"
import Testimonials from "../components/Testimonials"
import Pricing from "../components/Pricing"
import CallToAction from "../components/CallToAction"
import Footer from "../components/Footer"
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    const userHealth = (await api.userUpdate.checkUserHealth()).isHealthy;
    
    if (!userHealth) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Profile Update Required</h2>
            <p className="text-gray-600 mb-6">
              Please complete your profile information to access all features.
            </p>
            <a
              href="/profile"
              className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Update Profile
            </a>
          </div>
        </div>
      );
    }
  }
  return (
    <HydrateClient>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main>
          <Hero />
          <Features />
          <Testimonials />
          <Pricing />
          <CallToAction />
        </main>
        <Footer />
      </div>
    </HydrateClient>
  )
}

