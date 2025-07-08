"use client";

import { useSession } from "next-auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";
import { Id } from "../../convex/_generated/dataModel";

interface ConvexUserData {
  convexUserId: Id<"users"> | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook that bridges NextAuth sessions with Convex users
 * Automatically syncs user data and returns Convex user ID
 */
export function useConvexUser(): ConvexUserData {
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const syncUser = useMutation(api.users.syncNextAuthUser);
  const convexUser = useQuery(
    api.users.getByNextAuthId, 
    session?.user?.id ? { nextAuthId: session.user.id } : "skip"
  );
  
  // Sync user when session becomes available
  useEffect(() => {
    const performSync = async () => {
      if (session?.user?.id && session.user.email && !convexUser && !isSyncing) {
        setIsSyncing(true);
        try {
          await syncUser({
            email: session.user.email,
            name: session.user.name ?? undefined,
            image: session.user.image ?? undefined,
            externalId: session.user.id,
            provider: "nextauth",
          });
          setError(null);
        } catch (err) {
          console.error("Failed to sync user with Convex:", err);
          setError("Failed to sync user data");
        } finally {
          setIsSyncing(false);
        }
      }
    };

    if (status === "authenticated" && session?.user) {
      void performSync();
    }
  }, [session?.user?.id, session?.user?.email, syncUser, status, isSyncing, convexUser]);

  return {
    convexUserId: convexUser?._id ?? null,
    isLoading: status === "loading" || (status === "authenticated" && !convexUser && !error) || isSyncing,
    error,
  };
} 