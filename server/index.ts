// index.ts
import { Server } from "@hocuspocus/server";
import type {
  onConnectPayload,
  onDisconnectPayload,
  onListenPayload,
  onRequestPayload,
  onLoadDocumentPayload,
  onStoreDocumentPayload,
  onDestroyPayload,
  onChangePayload,
} from "@hocuspocus/server";
import * as Y from "yjs";

// Helper function to safely parse integers with defaults
const safeParseInt = (
  value: string | undefined,
  defaultValue: number,
): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Load environment variables
const PORT = safeParseInt(process.env.PORT, 6002);
const HOST = process.env.HOST ?? "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV ?? "development";
const SERVER_NAME = process.env.SERVER_NAME ?? "EspacoPessoal Docs Server";
const MAX_CONNECTIONS = safeParseInt(process.env.MAX_CONNECTIONS, 100);
const TIMEOUT = safeParseInt(process.env.TIMEOUT, 30000);

// OPTIMIZATION: Centralized logging configuration
const LOG_LEVEL =
  process.env.LOG_LEVEL ?? (NODE_ENV === "production" ? "error" : "debug");
const ENABLE_PERFORMANCE_LOGS =
  process.env.ENABLE_PERFORMANCE_LOGS === "true" || NODE_ENV === "development";
// OPTIMIZATION: Removed unused ENABLE_FORMATTING_ANALYSIS

// Convex configuration
const CONVEX_URL =
  process.env.CONVEX_URL ?? "https://ardent-dolphin-114.convex.cloud";
const CONVEX_SITE_URL =
  process.env.CONVEX_SITE_URL ?? "https://ardent-dolphin-114.convex.site";

// Server user ID configuration
const SERVER_USER_ID = process.env.SERVER_USER_ID ?? "hocus-pocus-server";

// Retry configuration for network requests
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const RETRY_BACKOFF_MULTIPLIER = 2;
const MAX_RETRY_DELAY = 10000; // 10 seconds

// OPTIMIZATION: Performance and cost optimization settings - Phase 1 bandwidth reduction
const SAVE_DELAY = safeParseInt(process.env.SAVE_DELAY, 45000); // 45 seconds (increased from 15s for 66% bandwidth reduction)
// OPTIMIZATION: Removed unused BATCH_SAVE_DELAY and MAX_BATCH_SIZE (reserved for future batch processing)

// OPTIMIZATION: Centralized logging utility with performance optimizations
class Logger {
  private static timestampCache = "";
  private static lastTimestampUpdate = 0;
  private static readonly TIMESTAMP_CACHE_MS = 1000; // Cache timestamp for 1 second

  private static getTimestamp(): string {
    const now = Date.now();
    if (now - this.lastTimestampUpdate > this.TIMESTAMP_CACHE_MS) {
      this.timestampCache = new Date(now).toISOString();
      this.lastTimestampUpdate = now;
    }
    return this.timestampCache;
  }

  static debug(message: string, ...args: unknown[]): void {
    if (LOG_LEVEL === "debug") {
      console.log(`[${this.getTimestamp()}] ${message}`, ...args);
    }
  }

  static info(message: string, ...args: unknown[]): void {
    if (LOG_LEVEL === "debug" || LOG_LEVEL === "info") {
      console.log(`[${this.getTimestamp()}] ${message}`, ...args);
    }
  }

  static warn(message: string, ...args: unknown[]): void {
    if (LOG_LEVEL !== "error") {
      console.warn(`[${this.getTimestamp()}] ${message}`, ...args);
    }
  }

  static error(message: string, ...args: unknown[]): void {
    console.error(`[${this.getTimestamp()}] ${message}`, ...args);
  }

  static performance(message: string, ...args: unknown[]): void {
    if (ENABLE_PERFORMANCE_LOGS) {
      console.log(`[${this.getTimestamp()}] 📊 ${message}`, ...args);
    }
  }

  static security(message: string, ...args: unknown[]): void {
    console.log(`[${this.getTimestamp()}] 🔐 ${message}`, ...args);
  }
}

// Enhanced document state tracking with last saved content
interface DocumentState {
  documentName: string;
  connectedUsers: Set<string>;
  saveTimeout?: NodeJS.Timeout;
  lastActivity: number;
  pendingSave: boolean;
  lastSavedContent?: string; // Track last saved content to avoid unnecessary saves
}

// Save result types
interface SaveResult {
  success: boolean;
  error?: string;
  type: "success" | "not_found" | "error";
}

// OPTIMIZATION: Removed unused ProseMirror interfaces

// OPTIMIZATION: Removed unused ProseMirrorDocument interface and DocumentNotFoundError class

const documentStates = new Map<string, DocumentState>();

// Global document instances tracking for proper shutdown handling
const documentInstances = new Map<string, Y.Doc>();

// Track when we're populating documents from database to prevent onChange from triggering
const isPopulatingFromDatabase = new Map<string, boolean>();

// Helper function for delay with jitter to prevent thundering herd
const delay = (ms: number): Promise<void> => {
  // Add jitter to prevent thundering herd (10% random variation)
  const jitter = Math.random() * 0.1;
  const delayWithJitter = ms * (1 + jitter);
  return new Promise((resolve) => setTimeout(resolve, delayWithJitter));
};

// Helper function to determine if an error is retryable
const isRetryableError = (error: unknown, response?: Response): boolean => {
  // Network errors (no response) are retryable
  if (!response) return true;

  // Server errors (5xx) are retryable
  if (response.status >= 500) return true;

  // Rate limiting (429) is retryable
  if (response.status === 429) return true;

  // Client errors (4xx) are generally not retryable
  // 404 (Not Found) and other client errors should not be retried
  return false;
};

// OPTIMIZATION: Removed unused saveDocumentToConvex function (~140 lines) - we only use Y.js state now

// OPTIMIZATION: Removed unused loadDocumentFromConvex function - we only use Y.js state now

// New functions for Y.js binary state management (perfect formatting preservation)
const saveYjsStateToConvex = async (
  documentName: string,
  yjsState: Uint8Array,
): Promise<SaveResult> => {
  const url = `${CONVEX_SITE_URL}/updateYjsState`;

  // Convert Y.js binary state to base64 for JSON transport
  const yjsStateBase64 = btoa(String.fromCharCode(...yjsState));

  const payload = {
    documentId: documentName,
    yjsState: yjsStateBase64,
    userId: SERVER_USER_ID,
  };

  console.log(
    `[${new Date().toISOString()}] 🔗 Attempting to save Y.js state to: ${url}`,
  );
  console.log(`[${new Date().toISOString()}] 📄 Document ID: ${documentName}`);
  console.log(
    `[${new Date().toISOString()}] 📝 Y.js state length: ${yjsState.length} bytes`,
  );

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      if (attempt > 1) {
        console.log(
          `[${new Date().toISOString()}] 🔄 Retry attempt ${attempt}/${MAX_RETRY_ATTEMPTS} for document ${documentName}`,
        );
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log(
        `[${new Date().toISOString()}] 📡 Response status: ${response.status} ${response.statusText}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[${new Date().toISOString()}] ❌ HTTP Error: ${response.status} - ${errorText}`,
        );

        // Handle non-retryable errors immediately
        if (response.status === 404) {
          console.log(
            `[${new Date().toISOString()}] Document ${documentName} not found, returning not_found`,
          );
          return {
            success: false,
            error: "Document not found",
            type: "not_found",
          };
        }

        // Handle client errors (4xx) as non-retryable
        if (response.status >= 400 && response.status < 500) {
          console.log(
            `[${new Date().toISOString()}] Client error ${response.status} - not retrying`,
          );
          return {
            success: false,
            error: `HTTP ${response.status}: ${errorText}`,
            type: "error",
          };
        }

        // Server errors (5xx) and other issues are retryable
        if (attempt === MAX_RETRY_ATTEMPTS) {
          console.error(
            `[${new Date().toISOString()}] ❌ Max retries reached for document ${documentName}, giving up`,
          );
          return {
            success: false,
            error: `HTTP ${response.status}: ${errorText}`,
            type: "error",
          };
        }

        // Calculate delay for next attempt with exponential backoff
        const delayMs = Math.min(
          INITIAL_RETRY_DELAY * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt - 1),
          MAX_RETRY_DELAY,
        );

        console.log(
          `[${new Date().toISOString()}] ⏳ Retrying in ${delayMs}ms due to ${response.status} error`,
        );
        await delay(delayMs);
        continue;
      }

      // Success case - OPTIMIZATION: Remove unused result variable
      await response.json(); // Consume response but don't store unused result

      if (attempt > 1) {
        Logger.info(
          `✅ Successfully saved Y.js state for document ${documentName} to Convex after ${attempt} attempts`,
        );
      } else {
        Logger.debug(
          `✅ Successfully saved Y.js state for document ${documentName} to Convex`,
        );
      }

      return {
        success: true,
        type: "success",
      };
    } catch (error) {
      lastError = error;
      console.error(
        `[${new Date().toISOString()}] Network error saving Y.js state for document ${documentName} to Convex:`,
        error,
      );

      // Network errors are always retryable
      if (attempt === MAX_RETRY_ATTEMPTS) {
        console.error(
          `[${new Date().toISOString()}] ❌ Max retries reached for document ${documentName} after network error, giving up`,
        );
        break;
      }

      // Calculate delay for next attempt with exponential backoff
      const delayMs = Math.min(
        INITIAL_RETRY_DELAY * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt - 1),
        MAX_RETRY_DELAY,
      );

      console.log(
        `[${new Date().toISOString()}] ⏳ Retrying in ${delayMs}ms due to network error`,
      );
      await delay(delayMs);
    }
  }

  // If we get here, all retries failed
  return {
    success: false,
    error:
      lastError instanceof Error
        ? lastError.message
        : "Unknown error after retries",
    type: "error",
  };
};

const loadYjsStateFromConvex = async (
  documentName: string,
): Promise<Uint8Array | null> => {
  const url = `${CONVEX_SITE_URL}/getYjsState?documentId=${encodeURIComponent(documentName)}`;

  console.log(
    `[${new Date().toISOString()}] 🔍 Attempting to load Y.js state from: ${url}`,
  );
  console.log(`[${new Date().toISOString()}] 📄 Document ID: ${documentName}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(
      `[${new Date().toISOString()}] 📡 Load Y.js state response status: ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log(
          `[${new Date().toISOString()}] Document ${documentName} not found in Convex - will start with empty document`,
        );
        return null;
      }

      console.error(
        `[${new Date().toISOString()}] Failed to load Y.js state: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    // Check content type to determine response format
    const contentType = response.headers.get("content-type");

    if (contentType === "application/octet-stream") {
      // Binary Y.js state response
      const yjsStateBytes = new Uint8Array(await response.arrayBuffer());

      console.log(
        `[${new Date().toISOString()}] ✅ Successfully loaded Y.js binary state for document ${documentName} (${yjsStateBytes.length} bytes)`,
      );
      return yjsStateBytes;
    } else if (contentType?.includes("application/json")) {
      // JSON response (no Y.js state or error)
      const data = (await response.json()) as {
        success: boolean;
        document: {
          id: string;
          title: string;
          yjsState: string | null;
          updatedAt: number;
        };
      };

      if (data.success && data.document.yjsState) {
        // Convert base64 back to Uint8Array (legacy format)
        const yjsStateBytes = Uint8Array.from(
          atob(data.document.yjsState),
          (c) => c.charCodeAt(0),
        );

        console.log(
          `[${new Date().toISOString()}] ✅ Successfully loaded Y.js state for document ${documentName} (${yjsStateBytes.length} bytes)`,
        );
        return yjsStateBytes;
      } else {
        console.log(
          `[${new Date().toISOString()}] Both Y.js and DB are empty - no action needed`,
        );
        return null;
      }
    } else {
      console.error(
        `[${new Date().toISOString()}] Unexpected content type: ${contentType}`,
      );
      return null;
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error loading Y.js state for document ${documentName} from Convex:`,
      error,
    );
    return null;
  }
};

// Document saving logic with enhanced scheduling
const scheduleDocumentSave = (documentName: string, document: Y.Doc) => {
  const state = documentStates.get(documentName);
  if (!state) return;

  // Clear any existing save timeout
  if (state.saveTimeout) {
    clearTimeout(state.saveTimeout);
  }

  // Update last activity
  state.lastActivity = Date.now();
  state.pendingSave = true;

  // OPTIMIZATION: Use configurable save delay for cost optimization
  state.saveTimeout = setTimeout(() => {
    void performDocumentSave(documentName, document);
  }, SAVE_DELAY);
};

const performDocumentSave = async (documentName: string, document: Y.Doc) => {
  const state = documentStates.get(documentName);
  if (!state?.pendingSave) {
    // OPTIMIZATION: Use optional chaining
    Logger.debug(`Skipping save for ${documentName} - no pending changes`);
    return;
  }

  try {
    // Extract Y.js binary state for perfect formatting preservation
    const yjsState = Y.encodeStateAsUpdate(document);

    // OPTIMIZATION: Content diffing - only save if content actually changed
    const yjsStateString = Buffer.from(yjsState).toString("base64");
    if (state.lastSavedContent === yjsStateString) {
      Logger.performance(
        `⚡ Skipping save for ${documentName} - content unchanged (${yjsState.length} bytes)`,
      );
      state.pendingSave = false;
      return;
    }

    Logger.debug(
      `Saving document ${documentName} (${yjsState.length} bytes Y.js state)`,
    );

    // Save Y.js binary state instead of HTML
    const result = await saveYjsStateToConvex(documentName, yjsState);

    if (result.success) {
      // OPTIMIZATION: Store the successfully saved content for future comparisons
      state.lastSavedContent = yjsStateString;
      Logger.debug(
        `✅ Successfully saved Y.js state for document ${documentName} to Convex`,
      );
    } else {
      Logger.error(
        `❌ Failed to save Y.js state for document ${documentName}:`,
        result.error,
      );
    }
  } catch (error) {
    Logger.error(
      `Error saving Y.js state for document ${documentName}:`,
      error,
    );
  } finally {
    // Reset state
    state.pendingSave = false;
    if (state.saveTimeout) {
      clearTimeout(state.saveTimeout);
      state.saveTimeout = undefined;
    }
  }
};

// OPTIMIZATION: Removed unused extractDocumentContent function - we only use Y.js binary state now

// OPTIMIZATION: Removed unused logFormattingAnalysis function - only used for debugging

// OPTIMIZATION: Removed unused convertXmlFragmentToHtml function

// OPTIMIZATION: Removed unused HTML conversion functions - we only use Y.js binary state now

// OPTIMIZATION: Removed unused elementHasContent function

// OPTIMIZATION: Removed large unused parseHtmlBlock function (~90 lines)

// OPTIMIZATION: Removed large unused parseTextWithFormatting function (~148 lines)

// OPTIMIZATION: Removed unused getYjsElementName function

// OPTIMIZATION: Removed large unused convertXmlElementToHtml function (~159 lines)

// OPTIMIZATION: Removed large unused convertNodeToHtml function (~172 lines)

// Centralized function to atomically initialize document state
// Prevents race conditions between onConnect and onChange
const initializeDocumentStateIfNeeded = (documentName: string): void => {
  if (!documentStates.has(documentName)) {
    documentStates.set(documentName, {
      documentName,
      connectedUsers: new Set(),
      lastActivity: Date.now(),
      pendingSave: false,
      lastSavedContent: undefined, // Initialize last saved content
    });
    Logger.debug(`Initialized tracking for new document: ${documentName}`);
  }
};

// CORS Configuration - Support multiple origins
const getAllowedOrigins = () => {
  const corsOrigin = process.env.CORS_ORIGIN;

  if (corsOrigin) {
    // If CORS_ORIGIN is set, use it (can be comma-separated list)
    return corsOrigin.split(",").map((origin) => origin.trim());
  }

  // Default allowed origins based on environment
  const defaultOrigins = [
    "https://docs.espacopessoal.com",
    "https://espacopessoal-v2.vercel.app",
    "https://www.espacopessoal.com",
    "https://dev.espacopessoal.com",
  ];

  if (NODE_ENV === "development") {
    defaultOrigins.push(
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "https://localhost:3000",
      "https://localhost:3001",
    );
  }

  return defaultOrigins;
};

const allowedOrigins = getAllowedOrigins();

// Helper function to check if origin is allowed
const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
};

// Session validation function for WebSocket connections
const validateDocumentSession = async (
  documentId: string,
  sessionToken: string,
  userId?: string | null,
): Promise<boolean> => {
  try {
    const url = `${CONVEX_SITE_URL}/validateDocumentSession`;
    const payload = {
      documentId,
      sessionToken,
      userId: userId ?? undefined,
    };

    Logger.debug(`🔐 Validating session for document: ${documentId}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(
        `[${new Date().toISOString()}] 🚫 Session validation failed: ${response.status} ${response.statusText}`,
      );
      return false;
    }

    const result = (await response.json()) as {
      valid: boolean;
      reason?: string;
    };

    if (!result.valid) {
      console.warn(
        `[${new Date().toISOString()}] 🚫 Session validation rejected: ${result.reason ?? "Unknown reason"}`,
      );
      return false;
    }

    console.log(
      `[${new Date().toISOString()}] ✅ Session validation successful for document: ${documentId}`,
    );
    return true;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error validating session for document ${documentId}:`,
      error,
    );
    return false;
  }
};

// Enhanced document access logging for security audit
const logDocumentAccess = (
  documentId: string,
  socketId: string,
  sessionToken?: string,
) => {
  const timestamp = new Date().toISOString();
  const accessType = sessionToken ? "AUTHENTICATED" : "PUBLIC";

  console.log(
    `[${timestamp}] 🔍 SECURITY LOG: Document access - ${accessType} | Document: ${documentId} | Socket: ${socketId} | HasSession: ${!!sessionToken}`,
  );
};

const server = new Server({
  port: PORT,
  timeout: TIMEOUT,
  name: SERVER_NAME,

  // Enhanced CORS configuration
  async onRequest(data: onRequestPayload) {
    const { request, response } = data;
    const origin = request.headers.origin!;

    // Set CORS headers
    if (isOriginAllowed(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
    }

    response.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    );
    response.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept, Origin",
    );
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader("Access-Control-Max-Age", "86400"); // 24 hours

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      response.writeHead(200);
      response.end();
      return;
    }

    // Continue with other handlers
    return Promise.resolve();
  },

  // Enhanced connection handling with origin validation, session authentication, and connection limits
  async onConnect(data: onConnectPayload) {
    const { request, socketId, documentName } = data;
    const origin = request.headers.origin!;
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const sessionToken = url.searchParams.get("sessionToken");
    const userId = url.searchParams.get("userId");

    // Validate origin for WebSocket connections
    if (!isOriginAllowed(origin)) {
      console.warn(
        `[${new Date().toISOString()}] Connection rejected from unauthorized origin: ${origin}`,
      );
      throw new Error("Unauthorized origin");
    }

    // Validate session token for private document access
    if (sessionToken) {
      console.log(
        `[${new Date().toISOString()}] Validating session token for document: ${documentName}`,
      );

      try {
        const isSessionValid = await validateDocumentSession(
          documentName,
          sessionToken,
          userId,
        );
        if (!isSessionValid) {
          console.warn(
            `[${new Date().toISOString()}] Connection rejected: Invalid session token for document ${documentName}`,
          );
          throw new Error("Invalid session token for document access");
        }

        console.log(
          `[${new Date().toISOString()}] Session validated successfully for document: ${documentName}`,
        );
      } catch (error) {
        console.error(
          `[${new Date().toISOString()}] Session validation error for document ${documentName}:`,
          error,
        );
        throw new Error("Session validation failed");
      }
    }

    console.log(
      `[${new Date().toISOString()}] WebSocket connection accepted from ${origin} (${socketId}) for document: ${documentName}`,
    );

    // Log document access for security audit
    logDocumentAccess(documentName, socketId, sessionToken ?? undefined);

    // Initialize document state atomically to prevent race conditions
    initializeDocumentStateIfNeeded(documentName);

    const state = documentStates.get(documentName)!;
    state.connectedUsers.add(socketId);

    const connectionCount = state.connectedUsers.size;
    console.log(
      `[${new Date().toISOString()}] Document ${documentName} now has ${connectionCount} connected users`,
    );

    // Enhanced connection monitoring and limits
    if (connectionCount > 10) {
      console.error(
        `[${new Date().toISOString()}] 🚨 CRITICAL: Too many connections for document ${documentName}: ${connectionCount} users. Rejecting connection to prevent server overload.`,
      );
      throw new Error("Too many connections for this document");
    } else if (connectionCount > 5) {
      console.warn(
        `[${new Date().toISOString()}] ⚠️  High connection count for document ${documentName}: ${connectionCount} users. This may indicate connection leaks.`,
      );
    }
  },

  async onDisconnect(data: onDisconnectPayload) {
    const { socketId, documentName, document } = data;
    console.log(
      `[${new Date().toISOString()}] WebSocket connection disconnected: ${socketId} from document: ${documentName}`,
    );

    const state = documentStates.get(documentName);
    if (state) {
      state.connectedUsers.delete(socketId);

      console.log(
        `[${new Date().toISOString()}] Document ${documentName} now has ${state.connectedUsers.size} connected users`,
      );

      // If no users left, save immediately and clean up
      if (state.connectedUsers.size === 0) {
        console.log(
          `[${new Date().toISOString()}] No users left for document ${documentName}, saving immediately`,
        );

        // Clear any pending save timeout
        if (state.saveTimeout) {
          clearTimeout(state.saveTimeout);
        }

        // Perform immediate save
        await performDocumentSave(documentName, document);

        // Clean up document state
        documentStates.delete(documentName);
        console.log(
          `[${new Date().toISOString()}] Cleaned up state for document ${documentName}`,
        );
      }
    }
  },

  async onListen(_data: onListenPayload) {
    Logger.info(`${SERVER_NAME} listening on ${HOST}:${PORT}`);
    Logger.info(`Environment: ${NODE_ENV}`);
    Logger.info(`Max connections: ${MAX_CONNECTIONS}`);
    Logger.info(`🔗 Convex URL: ${CONVEX_URL}`);
    Logger.info(`🌐 Convex Site URL: ${CONVEX_SITE_URL}`);
    Logger.debug(
      `📡 HTTP Save endpoint: ${CONVEX_SITE_URL}/updateDocumentContent`,
    );
    Logger.debug(
      `📡 HTTP Load endpoint: ${CONVEX_SITE_URL}/getDocumentContent`,
    );
    Logger.debug(`Allowed origins: ${allowedOrigins.join(", ")}`);
  },

  async onDestroy(_data: onDestroyPayload) {
    console.log(`[${new Date().toISOString()}] ${SERVER_NAME} destroyed`);

    // Save all pending documents before shutdown
    const savePromises: Promise<void>[] = [];

    for (const [documentName, state] of documentStates.entries()) {
      if (state.saveTimeout) {
        clearTimeout(state.saveTimeout);
      }

      // Access document instance from global tracking
      const document = documentInstances.get(documentName);
      if (document) {
        console.log(
          `[${new Date().toISOString()}] Saving document ${documentName} before shutdown`,
        );
        savePromises.push(performDocumentSave(documentName, document));
      } else {
        console.log(
          `[${new Date().toISOString()}] No document instance found for ${documentName}, skipping save`,
        );
      }
    }

    // Wait for all saves to complete
    try {
      await Promise.all(savePromises);
      console.log(
        `[${new Date().toISOString()}] All document saves completed before shutdown`,
      );
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error saving documents during shutdown:`,
        error,
      );
    }

    documentStates.clear();
    documentInstances.clear();
    isPopulatingFromDatabase.clear();
  },

  async onLoadDocument(data: onLoadDocumentPayload) {
    const { documentName, document } = data;
    console.log(
      `[${new Date().toISOString()}] Loading document: ${documentName}`,
    );

    try {
      // Wait for IndexedDB/client hydration to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      const hasExistingContent = document.share.size > 0;

      // OPTIMIZATION: Removed unused currentState variable

      // Load Y.js binary state from database
      const existingYjsState = await loadYjsStateFromConvex(documentName);

      // Skip loading if Y.js has content but DB has no state
      if (hasExistingContent && !existingYjsState) {
        console.log(
          `[${new Date().toISOString()}] Y.js has content, DB has no state - keeping Y.js content`,
        );
        return document;
      }

      // Skip if both are empty
      if (!hasExistingContent && !existingYjsState) {
        console.log(
          `[${new Date().toISOString()}] Both Y.js and DB are empty - no action needed`,
        );
        return document;
      }

      // Load from DB if we have saved state
      if (existingYjsState && existingYjsState.length > 0) {
        console.log(
          `[${new Date().toISOString()}] Loading Y.js state from DB (${existingYjsState.length} bytes)`,
        );

        // Prevent onChange during population
        isPopulatingFromDatabase.set(documentName, true);

        try {
          // Apply the Y.js state directly - this preserves ALL formatting perfectly
          Y.applyUpdate(document, existingYjsState);

          console.log(
            `[${new Date().toISOString()}] Successfully loaded Y.js state for document ${documentName}`,
          );
        } finally {
          setTimeout(() => {
            isPopulatingFromDatabase.set(documentName, false);
          }, 100);
        }
        return document;
      } else {
        console.log(
          `[${new Date().toISOString()}] No Y.js state to load - using current Y.js state`,
        );
        return document;
      }
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error loading document ${documentName}:`,
        error,
      );
      return document;
    }
  },

  async onChange(data: onChangePayload) {
    const { documentName, document } = data;

    // Skip onChange if we're currently populating from database to prevent duplication
    if (isPopulatingFromDatabase.get(documentName)) {
      console.log(
        `[${new Date().toISOString()}] 🚫 Skipping onChange for ${documentName} - currently populating from database`,
      );
      return;
    }

    // Track document instance globally for shutdown handling
    documentInstances.set(documentName, document);

    // Initialize document state atomically to prevent race conditions
    initializeDocumentStateIfNeeded(documentName);

    // Enhanced debugging - log actual Y.js document state
    console.log(
      `[${new Date().toISOString()}] 📝 Document ${documentName} changed`,
    );

    // Debug Y.js document structure
    try {
      const sharedTypes = Array.from(document.share.keys());
      console.log(
        `[${new Date().toISOString()}] 🔍 Shared types in onChange:`,
        sharedTypes,
      );

      // Check default fragment specifically
      const defaultFragment = document.getXmlFragment("default");
      console.log(
        `[${new Date().toISOString()}] 🔍 Default fragment children:`,
        defaultFragment.length,
      );

      if (defaultFragment.length > 0) {
        console.log(
          `[${new Date().toISOString()}] ✅ Found content in default fragment!`,
        );
        defaultFragment.forEach((child, index) => {
          if (child instanceof Y.XmlElement) {
            console.log(
              `[${new Date().toISOString()}] 📄 Child ${index}: ${child.nodeName}`,
            );
          } else if (child instanceof Y.XmlText) {
            console.log(
              `[${new Date().toISOString()}] 📄 Text ${index}: "${child.toString()}"`,
            );
          }
        });
      } else {
        console.log(
          `[${new Date().toISOString()}] ⚠️ Default fragment is empty in onChange`,
        );
      }
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error debugging Y.js document:`,
        error,
      );
    }

    // Schedule save after 2 seconds of inactivity (consistent with frontend expectations)
    scheduleDocumentSave(documentName, document);
  },

  async onStoreDocument(data: onStoreDocumentPayload) {
    // This is called by Hocuspocus but we're handling saving in onChange
    console.log(
      `[${new Date().toISOString()}] onStoreDocument called for: ${data.documentName} (handled by onChange)`,
    );
  },
});

void server.listen();
