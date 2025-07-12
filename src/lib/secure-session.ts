// Secure session management using HTTP-only cookies via server-side API
// This replaces the previous localStorage-based session storage

interface SessionData {
  token: string;
  expiresAt: number;
}

interface SessionResponse {
  hasSession: boolean;
  token?: string;
  expiresAt?: number;
  expired?: boolean;
  invalid?: boolean;
}

/**
 * Get stored session for a specific notebook URL using secure HTTP-only cookies
 */
export const getStoredSession = async (url: string): Promise<SessionData | null> => {
  try {
    const response = await fetch(`/api/session?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      credentials: 'include', // Include cookies in the request
    });

    if (!response.ok) {
      console.error('Failed to get session:', response.statusText);
      return null;
    }

    const data = await response.json() as SessionResponse;

    if (data.hasSession && data.token && data.expiresAt) {
      return {
        token: data.token,
        expiresAt: data.expiresAt,
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting stored session:', error);
    return null;
  }
};

/**
 * Store session for a specific notebook URL using secure HTTP-only cookies
 */
export const storeSession = async (
  url: string,
  sessionToken: string,
  expiresAt: number
): Promise<boolean> => {
  try {
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies in the request
      body: JSON.stringify({
        url,
        sessionToken,
        expiresAt,
      }),
    });

    if (!response.ok) {
      console.error('Failed to store session:', response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error storing session:', error);
    return false;
  }
};

/**
 * Remove session for a specific notebook URL using secure HTTP-only cookies
 */
export const removeSession = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/session?url=${encodeURIComponent(url)}`, {
      method: 'DELETE',
      credentials: 'include', // Include cookies in the request
    });

    if (!response.ok) {
      console.error('Failed to remove session:', response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error removing session:', error);
    return false;
  }
};

/**
 * Check if a session exists and is valid for a specific notebook URL
 */
export const hasValidSession = async (url: string): Promise<boolean> => {
  const session = await getStoredSession(url);
  
  if (!session) {
    return false;
  }
  
  // Check if session is expired
  if (session.expiresAt <= Date.now()) {
    // Session is expired, remove it
    await removeSession(url);
    return false;
  }
  
  return true;
};
