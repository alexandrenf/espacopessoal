/**
 * Session Cleanup Utilities
 *
 * This module provides utilities for automatic session cleanup, background tasks,
 * and maintenance of the session storage system.
 */

import SecureSessionStorage from "./session-storage";

interface CleanupStats {
  sessionsChecked: number;
  expiredSessionsRemoved: number;
  corruptedSessionsRemoved: number;
  storageOptimized: boolean;
}

export class SessionCleanupManager {
  private static instance: SessionCleanupManager | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): SessionCleanupManager {
    SessionCleanupManager.instance ??= new SessionCleanupManager();
    return SessionCleanupManager.instance;
  }

  /**
   * Start automatic cleanup process
   * @param intervalMinutes How often to run cleanup (default: 30 minutes)
   */
  startAutoCleanup(intervalMinutes = 30): void {
    if (this.isRunning) {
      console.warn("Session cleanup is already running");
      return;
    }

    this.isRunning = true;

    // Run initial cleanup
    this.performCleanup().catch((error) => {
      console.error("Initial session cleanup failed:", error);
    });

    // Set up periodic cleanup
    this.cleanupInterval = setInterval(
      () => {
        this.performCleanup().catch((error) => {
          console.error("Periodic session cleanup failed:", error);
        });
      },
      intervalMinutes * 60 * 1000,
    );

    console.log(
      `Session auto-cleanup started (every ${intervalMinutes} minutes)`,
    );
  }

  /**
   * Stop automatic cleanup process
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    console.log("Session auto-cleanup stopped");
  }

  /**
   * Perform a manual cleanup of expired and corrupted sessions
   */
  async performCleanup(): Promise<CleanupStats> {
    const stats: CleanupStats = {
      sessionsChecked: 0,
      expiredSessionsRemoved: 0,
      corruptedSessionsRemoved: 0,
      storageOptimized: false,
    };

    try {
      // Get all sessions and clean expired ones
      const cleanedCount = await SecureSessionStorage.cleanupExpiredSessions();
      stats.expiredSessionsRemoved = cleanedCount;

      // Check for corrupted sessions
      await this.cleanupCorruptedSessions(stats);

      // Optimize storage if needed
      await this.optimizeStorage(stats);

      console.log("Session cleanup completed:", stats);
    } catch (error) {
      console.error("Session cleanup failed:", error);
    }

    return stats;
  }

  /**
   * Clean up corrupted sessions that can't be decrypted
   */
  private async cleanupCorruptedSessions(stats: CleanupStats): Promise<void> {
    try {
      // This is handled internally by SecureSessionStorage.getAllSessions()
      // which filters out corrupted sessions automatically
      const validSessions = await SecureSessionStorage.getAllSessions();
      stats.sessionsChecked = Object.keys(validSessions).length;
    } catch (error) {
      console.error("Failed to clean corrupted sessions:", error);
      // Clear all sessions if storage is completely corrupted
      await SecureSessionStorage.clearAllSessions();
      stats.corruptedSessionsRemoved++;
    }
  }

  /**
   * Optimize localStorage usage
   */
  private async optimizeStorage(stats: CleanupStats): Promise<void> {
    try {
      const sessionCount = await SecureSessionStorage.getSessionCount();

      // If we have too many sessions, clean up the oldest ones
      if (sessionCount > 50) {
        // Arbitrary limit
        await SecureSessionStorage.clearAllSessions();
        stats.storageOptimized = true;
        console.warn("Too many sessions stored, cleared all sessions");
      }
    } catch (error) {
      console.error("Storage optimization failed:", error);
    }
  }

  /**
   * Get cleanup status
   */
  getStatus(): { isRunning: boolean; hasInterval: boolean } {
    return {
      isRunning: this.isRunning,
      hasInterval: this.cleanupInterval !== null,
    };
  }
}

/**
 * Background session monitor for detecting storage issues
 */
export class SessionMonitor {
  private static instance: SessionMonitor | null = null;
  private monitorInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private lastStorageSize = 0;

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): SessionMonitor {
    SessionMonitor.instance ??= new SessionMonitor();
    return SessionMonitor.instance;
  }

  /**
   * Start monitoring session storage health
   */
  startMonitoring(intervalMinutes = 10): void {
    if (this.isMonitoring) {
      console.warn("Session monitor is already running");
      return;
    }

    this.isMonitoring = true;

    this.monitorInterval = setInterval(
      () => {
        this.checkStorageHealth().catch((error) => {
          console.error("Session storage health check failed:", error);
        });
      },
      intervalMinutes * 60 * 1000,
    );

    console.log(
      `Session monitoring started (every ${intervalMinutes} minutes)`,
    );
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
    console.log("Session monitoring stopped");
  }

  /**
   * Check the health of session storage
   */
  private async checkStorageHealth(): Promise<void> {
    try {
      // Check if localStorage is available
      if (typeof localStorage === "undefined") {
        console.warn("localStorage not available");
        return;
      }

      // Check storage usage
      const currentSize = this.getStorageSize();
      if (currentSize > this.lastStorageSize * 1.5) {
        // 50% increase
        console.warn("Session storage size increased significantly:", {
          previous: this.lastStorageSize,
          current: currentSize,
        });
      }
      this.lastStorageSize = currentSize;

      // Check session count
      const sessionCount = await SecureSessionStorage.getSessionCount();
      if (sessionCount > 20) {
        console.warn("Large number of sessions stored:", sessionCount);
      }

      // Verify basic encryption/decryption works
      const testNotebookId = "health-check-test";
      const testToken = "test-token";
      const testExpiry = Date.now() + 60000; // 1 minute from now

      await SecureSessionStorage.storeSession(
        testNotebookId,
        testToken,
        testExpiry,
      );
      const retrieved = await SecureSessionStorage.getSession(testNotebookId);
      await SecureSessionStorage.removeSession(testNotebookId);

      if (!retrieved || retrieved.sessionToken !== testToken) {
        console.error(
          "Session storage health check failed - encryption/decryption not working",
        );
      }
    } catch (error) {
      console.error("Storage health check failed:", error);
    }
  }

  /**
   * Get approximate storage size
   */
  private getStorageSize(): number {
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage.getItem(key);
        total += (value?.length ?? 0) + key.length;
      }
    }
    return total;
  }

  /**
   * Get monitoring status
   */
  getStatus(): { isMonitoring: boolean; storageSize: number } {
    return {
      isMonitoring: this.isMonitoring,
      storageSize: this.lastStorageSize,
    };
  }
}

/**
 * Initialize session management background tasks
 */
export const initializeSessionManagement = (options?: {
  cleanupIntervalMinutes?: number;
  monitorIntervalMinutes?: number;
  autoStart?: boolean;
}): void => {
  const {
    cleanupIntervalMinutes = 30,
    monitorIntervalMinutes = 10,
    autoStart = true,
  } = options ?? {};

  if (!autoStart) return;

  // Only run in browser environment
  if (typeof window === "undefined") return;

  try {
    const cleanupManager = SessionCleanupManager.getInstance();
    const monitor = SessionMonitor.getInstance();

    // Start cleanup and monitoring
    cleanupManager.startAutoCleanup(cleanupIntervalMinutes);
    monitor.startMonitoring(monitorIntervalMinutes);

    // Cleanup on page unload
    window.addEventListener("beforeunload", () => {
      cleanupManager.stopAutoCleanup();
      monitor.stopMonitoring();
    });

    console.log("Session management background tasks initialized");
  } catch (error) {
    console.error("Failed to initialize session management:", error);
  }
};

/**
 * Manual session cleanup function for external use
 */
export const cleanupSessions = async (): Promise<CleanupStats> => {
  const cleanupManager = SessionCleanupManager.getInstance();
  return await cleanupManager.performCleanup();
};

/**
 * Get session management status
 */
export const getSessionManagementStatus = (): {
  cleanup: { isRunning: boolean; hasInterval: boolean };
  monitor: { isMonitoring: boolean; storageSize: number };
} => {
  return {
    cleanup: SessionCleanupManager.getInstance().getStatus(),
    monitor: SessionMonitor.getInstance().getStatus(),
  };
};

const sessionManagement = {
  SessionCleanupManager,
  SessionMonitor,
  initializeSessionManagement,
  cleanupSessions,
  getSessionManagementStatus,
};

export default sessionManagement;
