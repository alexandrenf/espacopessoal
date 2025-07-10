/**
 * Encrypted Session Storage for Notebook Password Protection
 *
 * This module provides secure client-side storage for notebook session tokens
 * using the Web Crypto API for encryption and device fingerprinting for additional security.
 */

interface SessionData {
  sessionToken: string;
  notebookId: string;
  expiresAt: number;
  deviceFingerprint: string;
}

type StoredSessions = Record<string, SessionData>;

// Generate stable device fingerprint
export const generateDeviceFingerprint = (): string => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("Device fingerprint", 2, 2);
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || "unknown",
    canvas.toDataURL(),
  ].join("|");

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
};

// Generate encryption key from device fingerprint
const generateEncryptionKey = async (
  deviceFingerprint: string,
): Promise<CryptoKey> => {
  // Use device fingerprint as key material
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(deviceFingerprint.padEnd(32, "0").slice(0, 32)),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  // Derive actual encryption key
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("notebook-sessions"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

// Encrypt data
const encryptData = async (data: string, key: CryptoKey): Promise<string> => {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(data),
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);

  // Convert to base64
  return btoa(String.fromCharCode(...combined));
};

// Decrypt data
const decryptData = async (
  encryptedData: string,
  key: CryptoKey,
): Promise<string> => {
  try {
    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedData), (c) =>
      c.charCodeAt(0),
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encrypted,
    );

    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt session data");
  }
};

class SecureSessionStorage {
  private static readonly STORAGE_KEY = "encrypted_notebook_sessions";
  private static encryptionKey: CryptoKey | null = null;
  private static deviceFingerprint: string | null = null;

  // Initialize encryption key
  private static async getEncryptionKey(): Promise<CryptoKey> {
    if (!this.encryptionKey) {
      this.deviceFingerprint ??= generateDeviceFingerprint();
      this.encryptionKey = await generateEncryptionKey(this.deviceFingerprint);
    }
    return this.encryptionKey;
  }

  // Get device fingerprint
  static getDeviceFingerprint(): string {
    this.deviceFingerprint ??= generateDeviceFingerprint();
    return this.deviceFingerprint;
  }

  // Store session token for a notebook
  static async storeSession(
    notebookId: string,
    sessionToken: string,
    expiresAt: number,
  ): Promise<void> {
    try {
      const key = await this.getEncryptionKey();
      const deviceFingerprint = this.getDeviceFingerprint();

      // Get existing sessions
      const existingSessions = await this.getAllSessions();

      // Add new session
      const sessionData: SessionData = {
        sessionToken,
        notebookId,
        expiresAt,
        deviceFingerprint,
      };

      existingSessions[notebookId] = sessionData;

      // Encrypt and store
      const encrypted = await encryptData(
        JSON.stringify(existingSessions),
        key,
      );
      localStorage.setItem(this.STORAGE_KEY, encrypted);

      console.debug("Session stored for notebook:", notebookId);
    } catch (error) {
      console.error("Failed to store session:", error);
      // Fallback to unencrypted storage for backward compatibility
      const fallbackData = {
        [notebookId]: {
          sessionToken,
          expiresAt,
          deviceFingerprint: this.getDeviceFingerprint(),
        },
      };
      localStorage.setItem(
        `fallback_${notebookId}`,
        JSON.stringify(fallbackData),
      );
    }
  }

  // Get session token for a notebook
  static async getSession(notebookId: string): Promise<SessionData | null> {
    try {
      const key = await this.getEncryptionKey();
      const encrypted = localStorage.getItem(this.STORAGE_KEY);

      if (!encrypted) {
        // Check fallback storage
        const fallback = localStorage.getItem(`fallback_${notebookId}`);
        if (fallback) {
          const data = JSON.parse(fallback) as StoredSessions;
          return data[notebookId] ?? null;
        }
        return null;
      }

      const decrypted = await decryptData(encrypted, key);
      const sessions: StoredSessions = JSON.parse(decrypted) as StoredSessions;
      const session = sessions[notebookId];

      if (!session) {
        return null;
      }

      // Check if session is expired
      if (session.expiresAt < Date.now()) {
        await this.removeSession(notebookId);
        return null;
      }

      // Verify device fingerprint
      const currentFingerprint = this.getDeviceFingerprint();
      if (session.deviceFingerprint !== currentFingerprint) {
        console.warn("Device fingerprint mismatch, removing session");
        await this.removeSession(notebookId);
        return null;
      }

      return session;
    } catch (error) {
      console.error("Failed to get session:", error);
      return null;
    }
  }

  // Get all stored sessions
  static async getAllSessions(): Promise<StoredSessions> {
    try {
      const key = await this.getEncryptionKey();
      const encrypted = localStorage.getItem(this.STORAGE_KEY);

      if (!encrypted) {
        return {};
      }

      const decrypted = await decryptData(encrypted, key);
      const sessions: StoredSessions = JSON.parse(decrypted) as StoredSessions;

      // Filter out expired sessions
      const now = Date.now();
      const validSessions: StoredSessions = {};

      for (const [notebookId, session] of Object.entries(sessions)) {
        if (session.expiresAt > now) {
          validSessions[notebookId] = session;
        }
      }

      // Update storage if we removed expired sessions
      if (Object.keys(validSessions).length !== Object.keys(sessions).length) {
        const encrypted = await encryptData(JSON.stringify(validSessions), key);
        localStorage.setItem(this.STORAGE_KEY, encrypted);
      }

      return validSessions;
    } catch (error) {
      console.error("Failed to get all sessions:", error);
      return {};
    }
  }

  // Remove session for a notebook
  static async removeSession(notebookId: string): Promise<void> {
    try {
      const key = await this.getEncryptionKey();
      const sessions = await this.getAllSessions();

      delete sessions[notebookId];

      const encrypted = await encryptData(JSON.stringify(sessions), key);
      localStorage.setItem(this.STORAGE_KEY, encrypted);

      // Also remove fallback
      localStorage.removeItem(`fallback_${notebookId}`);

      console.debug("Session removed for notebook:", notebookId);
    } catch (error) {
      console.error("Failed to remove session:", error);
    }
  }

  // Clear all sessions
  static async clearAllSessions(): Promise<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEY);

      // Remove all fallback sessions
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith("fallback_")) {
          localStorage.removeItem(key);
        }
      }

      console.debug("All sessions cleared");
    } catch (error) {
      console.error("Failed to clear sessions:", error);
    }
  }

  // Check if a session exists and is valid
  static async hasValidSession(notebookId: string): Promise<boolean> {
    const session = await this.getSession(notebookId);
    return session !== null;
  }

  // Get session count
  static async getSessionCount(): Promise<number> {
    const sessions = await this.getAllSessions();
    return Object.keys(sessions).length;
  }

  // Clean up expired sessions
  static async cleanupExpiredSessions(): Promise<number> {
    const sessions = await this.getAllSessions();
    const initialCount = Object.keys(sessions).length;

    // getAllSessions already filters expired sessions
    const finalCount = Object.keys(sessions).length;

    return initialCount - finalCount;
  }
}

export default SecureSessionStorage;
