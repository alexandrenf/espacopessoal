"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "../../hooks/use-convex-user";
import { Loader } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { convexUserId, isLoading: isUserLoading } = useConvexUser();
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const getOrCreateHomeDocument = useMutation(api.documents.getOrCreateHomeDocument);
  
  const userIdString = convexUserId ? String(convexUserId) : "demo-user";

  useEffect(() => {
    // If not authenticated, redirect to sign in
    if (status === "loading") return; // Wait for session to load
    
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
      return;
    }

    // If authenticated but user data still loading, wait
    if (isUserLoading || !convexUserId) return;

    // Create or get home document and redirect
    const createAndRedirect = async () => {
      if (isRedirecting) return; // Prevent multiple calls
      
      setIsRedirecting(true);
      try {
        const documentId = await getOrCreateHomeDocument({ userId: userIdString });
        router.push(`/documents/${documentId}`);
      } catch (error) {
        console.error("Failed to create home document:", error);
        toast.error("Failed to load your notebook. Please try again.");
        setIsRedirecting(false);
      }
    };

    void createAndRedirect();
  }, [status, isUserLoading, convexUserId, userIdString, getOrCreateHomeDocument, router, isRedirecting]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FBFD]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">
          {status === "loading" ? "Loading session..." : 
           isUserLoading ? "Loading user data..." : 
           isRedirecting ? "Opening your notebook..." : 
           "Preparing your workspace..."}
        </p>
      </div>
    </div>
  );
} 