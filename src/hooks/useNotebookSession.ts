"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { type Id } from "../../convex/_generated/dataModel";
import SecureSessionStorage from "~/lib/session-storage";

interface SessionState {
  isValidating: boolean;
  hasAccess: boolean;
  sessionExpiry: number | null;
  error: string | null;
}

interface UseNotebookSessionOptions {
  notebookId: Id<"notebooks">;
  userId?: Id<"users">;
  autoRefresh?: boolean;
}

export const useNotebookSession = ({
  notebookId,
  userId: _userId,
  autoRefresh = true,
}: UseNotebookSessionOptions) => {
  const [sessionState, setSessionState] = useState<SessionState>({
    isValidating: true,
    hasAccess: false,
    sessionExpiry: null,
    error: null,
  });

  // Mutations
  const updateSessionAccess = useMutation(api.notebooks.updateSessionAccess);
  const extendSession = useMutation(api.notebooks.extendSession);

  // Check and validate session
  const checkSession = useCallback(async () => {
    try {
      setSessionState((prev) => ({ ...prev, isValidating: true, error: null }));

      const sessionData = await SecureSessionStorage.getSession(notebookId);

      if (!sessionData) {
        setSessionState({
          isValidating: false,
          hasAccess: false,
          sessionExpiry: null,
          error: null,
        });
        return false;
      }

      // Check if session is expired locally first
      if (sessionData.expiresAt < Date.now()) {
        await SecureSessionStorage.removeSession(notebookId);
        setSessionState({
          isValidating: false,
          hasAccess: false,
          sessionExpiry: null,
          error: "Session expired",
        });
        return false;
      }

      // For now, trust local sessions that aren't expired
      // In a production system, you might want to validate with server periodically
      await updateSessionAccess({
        sessionToken: sessionData.sessionToken,
      });

      setSessionState({
        isValidating: false,
        hasAccess: true,
        sessionExpiry: sessionData.expiresAt,
        error: null,
      });
      return true;
    } catch (error) {
      console.error("Session validation failed:", error);
      await SecureSessionStorage.removeSession(notebookId);
      setSessionState({
        isValidating: false,
        hasAccess: false,
        sessionExpiry: null,
        error: "Session validation failed",
      });
      return false;
    }
  }, [notebookId, updateSessionAccess]);

  // Extend session expiry
  const extendSessionExpiry = useCallback(
    async (additionalTime?: number) => {
      try {
        const sessionData = await SecureSessionStorage.getSession(notebookId);

        if (!sessionData) {
          return false;
        }

        const result = (await extendSession({
          sessionToken: sessionData.sessionToken,
          additionalTime,
        })) as { newExpiresAt: number };

        // Update local storage
        await SecureSessionStorage.storeSession(
          notebookId,
          sessionData.sessionToken,
          result.newExpiresAt,
        );

        setSessionState((prev) => ({
          ...prev,
          sessionExpiry: result.newExpiresAt,
        }));

        return true;
      } catch (error) {
        console.error("Failed to extend session:", error);
        return false;
      }
    },
    [notebookId, extendSession],
  );

  // Logout and clear session
  const logout = useCallback(async () => {
    try {
      await SecureSessionStorage.removeSession(notebookId);
      setSessionState({
        isValidating: false,
        hasAccess: false,
        sessionExpiry: null,
        error: null,
      });
      return true;
    } catch (error) {
      console.error("Logout failed:", error);
      return false;
    }
  }, [notebookId]);

  // Get session info
  const getSessionInfo = useCallback(async () => {
    return await SecureSessionStorage.getSession(notebookId);
  }, [notebookId]);

  // Get time until expiry
  const getTimeUntilExpiry = useCallback(() => {
    if (!sessionState.sessionExpiry) return null;
    return Math.max(0, sessionState.sessionExpiry - Date.now());
  }, [sessionState.sessionExpiry]);

  // Check if session expires soon (within 1 hour)
  const isExpiringSoon = useCallback(() => {
    const timeUntilExpiry = getTimeUntilExpiry();
    return timeUntilExpiry !== null && timeUntilExpiry < 60 * 60 * 1000; // 1 hour
  }, [getTimeUntilExpiry]);

  // Initial session check
  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  // Auto-refresh session periodically
  useEffect(() => {
    if (!autoRefresh || !sessionState.hasAccess) return;

    const interval = setInterval(
      () => {
        void checkSession();
      },
      5 * 60 * 1000,
    ); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [autoRefresh, sessionState.hasAccess, checkSession]);

  // Auto-extend session when it's about to expire
  useEffect(() => {
    if (!sessionState.hasAccess || !isExpiringSoon()) return;

    const extendTimer = setTimeout(() => {
      void extendSessionExpiry();
    }, 30 * 1000); // Extend 30 seconds before showing warning

    return () => clearTimeout(extendTimer);
  }, [sessionState.hasAccess, isExpiringSoon, extendSessionExpiry]);

  return {
    // State
    isValidating: sessionState.isValidating,
    hasAccess: sessionState.hasAccess,
    sessionExpiry: sessionState.sessionExpiry,
    error: sessionState.error,

    // Computed values
    timeUntilExpiry: getTimeUntilExpiry(),
    isExpiringSoon: isExpiringSoon(),

    // Actions
    checkSession,
    extendSession: extendSessionExpiry,
    logout,
    getSessionInfo,

    // Utils
    refreshSession: checkSession,
  };
};

export default useNotebookSession;
