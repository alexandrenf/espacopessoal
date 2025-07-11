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

// TypeScript interfaces for ProseMirror content
interface ProseMirrorMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface ProseMirrorNode {
  type: string;
  content?: ProseMirrorNode[];
  text?: string;
  marks?: ProseMirrorMark[];
  attrs?: Record<string, unknown>;
}

interface ProseMirrorDocument {
  type: "doc";
  content: ProseMirrorNode[];
}

class DocumentNotFoundError extends Error {
  constructor(documentName: string) {
    super(`Document ${documentName} not found`);
    this.name = "DocumentNotFoundError";
  }
}

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

// Utility functions for Convex API calls
const saveDocumentToConvex = async (
  documentName: string,
  content: string,
): Promise<SaveResult> => {
  const url = `${CONVEX_SITE_URL}/updateDocumentContent`;
  const payload = {
    documentId: documentName,
    content: content,
    userId: SERVER_USER_ID,
  };

  console.log(`[${new Date().toISOString()}] 🔗 Attempting to save to: ${url}`);
  console.log(`[${new Date().toISOString()}] 📄 Document ID: ${documentName}`);
  console.log(
    `[${new Date().toISOString()}] 📝 Content length: ${content.length} chars`,
  );

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      // Log retry attempt if not the first attempt
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
      // Response processed inline

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[${new Date().toISOString()}] ❌ HTTP Error: ${response.status} - ${errorText}`,
        );

        // Handle non-retryable errors immediately
        if (response.status === 404) {
          console.log(
            `[${new Date().toISOString()}] 🚫 Document ${documentName} not found in Convex - document may not have been created through UI`,
          );
          return {
            success: false,
            error: `Document ${documentName} not found`,
            type: "not_found",
          };
        }

        // Check if this error is retryable
        if (!isRetryableError(null, response)) {
          console.log(
            `[${new Date().toISOString()}] ❌ Non-retryable error for document ${documentName}, giving up`,
          );
          return {
            success: false,
            error: `HTTP ${response.status}: ${errorText}`,
            type: "error",
          };
        }

        // Store error for potential retry
        lastError = new Error(`HTTP ${response.status}: ${errorText}`);

        // If this is the last attempt, don't retry
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

      // Success case
      const result = (await response.json()) as {
        success: boolean;
        message: string;
      };

      if (attempt > 1) {
        console.log(
          `[${new Date().toISOString()}] ✅ Successfully saved document ${documentName} to Convex after ${attempt} attempts`,
        );
      } else {
        console.log(
          `[${new Date().toISOString()}] ✅ Successfully saved document ${documentName} to Convex`,
        );
      }

      return {
        success: true,
        type: "success",
      };
    } catch (error) {
      lastError = error;
      console.error(
        `[${new Date().toISOString()}] Network error saving document ${documentName} to Convex:`,
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

const loadDocumentFromConvex = async (
  documentName: string,
): Promise<string | null> => {
  const url = `${CONVEX_SITE_URL}/getDocumentContent?documentId=${encodeURIComponent(documentName)}`;

  console.log(
    `[${new Date().toISOString()}] 🔍 Attempting to load from: ${url}`,
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
      `[${new Date().toISOString()}] 📡 Load response status: ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log(
          `[${new Date().toISOString()}] Document ${documentName} not found in Convex - will start with empty document`,
        );
        return null;
      }
      const errorText = await response.text();
      console.error(
        `[${new Date().toISOString()}] Failed to load document ${documentName}: ${response.status} ${errorText}`,
      );
      return null;
    }

    const result = (await response.json()) as {
      success: boolean;
      document: { content: string };
    };
    const content = result.document?.content ?? null;

    console.log(
      `[${new Date().toISOString()}] Successfully loaded document ${documentName} from Convex (${content?.length ?? 0} chars)`,
    );

    return content;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error loading document ${documentName} from Convex:`,
      error,
    );
    return null;
  }
};

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

  console.log(`[${new Date().toISOString()}] 🔗 Attempting to save Y.js state to: ${url}`);
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

      // Success case
      const result = (await response.json()) as {
        success: boolean;
        message: string;
      };

      if (attempt > 1) {
        console.log(
          `[${new Date().toISOString()}] ✅ Successfully saved Y.js state for document ${documentName} to Convex after ${attempt} attempts`,
        );
      } else {
        console.log(
          `[${new Date().toISOString()}] ✅ Successfully saved Y.js state for document ${documentName} to Convex`,
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
        const yjsStateBytes = Uint8Array.from(atob(data.document.yjsState), c => c.charCodeAt(0));

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

  // Schedule save after 10 seconds of inactivity (reduced from 5 seconds for cost optimization)
  state.saveTimeout = setTimeout(() => {
    void performDocumentSave(documentName, document);
  }, 10000);
};

const performDocumentSave = async (documentName: string, document: Y.Doc) => {
  const state = documentStates.get(documentName);
  if (!state || !state.pendingSave) {
    console.log(
      `[${new Date().toISOString()}] Skipping save for ${documentName} - no pending changes`,
    );
    return;
  }

  try {
    // Extract Y.js binary state for perfect formatting preservation
    const yjsState = Y.encodeStateAsUpdate(document);
    
    console.log(
      `[${new Date().toISOString()}] Saving document ${documentName} (${yjsState.length} bytes Y.js state)`,
    );

    // Save Y.js binary state instead of HTML
    const result = await saveYjsStateToConvex(documentName, yjsState);

    if (result.success) {
      console.log(
        `[${new Date().toISOString()}] ✅ Successfully saved Y.js state for document ${documentName} to Convex`,
      );
    } else {
      console.error(
        `[${new Date().toISOString()}] ❌ Failed to save Y.js state for document ${documentName}:`,
        result.error,
      );
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error saving Y.js state for document ${documentName}:`,
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

// Enhanced function to extract document content from Y.js document
const extractDocumentContent = (ydoc: Y.Doc): string => {
  try {
    console.log("🔍 Starting enhanced content extraction...");

    // Get all shared types in the document
    const sharedTypes = Array.from(ydoc.share.keys());
    console.log("🔍 Y.js shared types:", sharedTypes);

    // Try multiple fragment names that TipTap might use
    const fragmentNames = [
      "default",
      "prosemirror",
      "document",
      "content",
      "editor",
    ];

    for (const fragmentName of fragmentNames) {
      try {
        const fragment = ydoc.getXmlFragment(fragmentName);
        if (fragment) {
          console.log(
            `🔍 Found fragment '${fragmentName}' with ${fragment.length} children`,
          );

          if (fragment.length > 0) {
            const content = convertXmlFragmentToHtml(fragment);
            if (content && content !== "<p></p>") {
              // Enhanced logging for formatting analysis
              logFormattingAnalysis(fragment, content);
              console.log(
                `✅ Successfully extracted content from fragment '${fragmentName}':`,
                content,
              );
              return content;
            }
          }

          // Also try to get the fragment's internal content
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fragmentChildren = (fragment as any)._start;
            if (fragmentChildren) {
              console.log(
                `🔍 Fragment '${fragmentName}' has internal children`,
              );
            }
          } catch (error) {
            console.log(
              `🔍 Could not access internal children of fragment '${fragmentName}':`,
              error,
            );
          }
        }
      } catch (error) {
        console.warn(`🔍 Could not access fragment '${fragmentName}':`, error);
      }
    }

    // Try to access Y.js shared types directly
    for (const typeName of sharedTypes) {
      try {
        const sharedType = ydoc.get(typeName);
        console.log(
          `🔍 Examining shared type '${typeName}':`,
          typeof sharedType,
        );

        if (sharedType instanceof Y.XmlFragment) {
          console.log(
            `🔍 Shared type '${typeName}' is XmlFragment with ${sharedType.length} children`,
          );
          if (sharedType.length > 0) {
            const content = convertXmlFragmentToHtml(sharedType);
            if (content && content !== "<p></p>") {
              // Enhanced logging for formatting analysis
              logFormattingAnalysis(sharedType, content);
              console.log(
                `✅ Successfully extracted content from shared type '${typeName}':`,
                content,
              );
              return content;
            }
          }
        } else if (sharedType instanceof Y.XmlElement) {
          console.log(`🔍 Shared type '${typeName}' is XmlElement`);
          const content = convertXmlElementToHtml(sharedType);
          if (content && content !== "<p></p>") {
            console.log(
              `✅ Successfully extracted content from XmlElement '${typeName}':`,
              content,
            );
            return content;
          }
        } else if (sharedType instanceof Y.Map) {
          console.log(
            `🔍 Shared type '${typeName}' is Map with keys:`,
            Array.from(sharedType.keys()),
          );
        } else if (sharedType instanceof Y.Array) {
          console.log(
            `🔍 Shared type '${typeName}' is Array with ${sharedType.length} items`,
          );
        } else if (sharedType instanceof Y.Text) {
          console.log(
            `🔍 Shared type '${typeName}' is Text:`,
            sharedType.toString(),
          );
          const textContent = sharedType.toString();
          if (textContent) {
            return `<p>${textContent}</p>`;
          }
        }
      } catch (error) {
        console.warn(`🔍 Error examining shared type '${typeName}':`, error);
      }
    }

    console.log("📄 No collaborative content found, returning empty document");
    return "<p></p>";
  } catch (error) {
    console.error("💥 Error extracting document content:", error);
    return "<p>Error extracting content</p>";
  }
};

// Helper function to log formatting analysis for debugging (development only)
const logFormattingAnalysis = (fragment: Y.XmlFragment, htmlContent: string): void => {
  // Only run formatting analysis in development environment
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  try {
    console.log("🎨 === FORMATTING ANALYSIS ===");

    // Count formatting elements in Y.js fragment
    let textStyleCount = 0;
    let highlightCount = 0;
    let strongCount = 0;
    let emCount = 0;
    let underlineCount = 0;
    let codeCount = 0;

    const analyzeElement = (element: Y.XmlElement | Y.XmlFragment): void => {
      if (element instanceof Y.XmlElement) {
        switch (element.nodeName) {
          case 'textStyle': {
            textStyleCount++;
            const attrs = element.getAttributes();
            console.log(`🎨 TextStyle attributes:`, attrs);
            break;
          }
          case 'highlight':
            highlightCount++;
            break;
          case 'strong':
            strongCount++;
            break;
          case 'em':
            emCount++;
            break;
          case 'underline':
            underlineCount++;
            break;
          case 'code':
            codeCount++;
            break;
        }
      }

      // Recursively analyze children
      element.forEach((child) => {
        if (child instanceof Y.XmlElement) {
          analyzeElement(child);
        }
      });
    };

    analyzeElement(fragment);

    console.log(`🎨 Y.js Formatting Counts:`);
    console.log(`  - TextStyle elements: ${textStyleCount}`);
    console.log(`  - Highlight elements: ${highlightCount}`);
    console.log(`  - Strong elements: ${strongCount}`);
    console.log(`  - Em elements: ${emCount}`);
    console.log(`  - Underline elements: ${underlineCount}`);
    console.log(`  - Code elements: ${codeCount}`);

    // Count formatting elements in HTML output
    const htmlSpanCount = (htmlContent.match(/<span[^>]*>/g) || []).length;
    const htmlMarkCount = (htmlContent.match(/<mark[^>]*>/g) || []).length;
    const htmlStrongCount = (htmlContent.match(/<strong>/g) || []).length;
    const htmlEmCount = (htmlContent.match(/<em>/g) || []).length;
    const htmlUCount = (htmlContent.match(/<u>/g) || []).length;
    const htmlCodeCount = (htmlContent.match(/<code>/g) || []).length;

    console.log(`🎨 HTML Formatting Counts:`);
    console.log(`  - Span elements: ${htmlSpanCount}`);
    console.log(`  - Mark elements: ${htmlMarkCount}`);
    console.log(`  - Strong elements: ${htmlStrongCount}`);
    console.log(`  - Em elements: ${htmlEmCount}`);
    console.log(`  - U elements: ${htmlUCount}`);
    console.log(`  - Code elements: ${htmlCodeCount}`);

    // Check for potential formatting loss
    if (textStyleCount > htmlSpanCount) {
      console.warn(`⚠️ Potential formatting loss: ${textStyleCount} textStyle elements -> ${htmlSpanCount} span elements`);
    }
    if (highlightCount > htmlMarkCount) {
      console.warn(`⚠️ Potential formatting loss: ${highlightCount} highlight elements -> ${htmlMarkCount} mark elements`);
    }

    console.log("🎨 === END FORMATTING ANALYSIS ===");
  } catch (error) {
    console.error("Error in formatting analysis:", error);
  }
};

// Helper function to convert Y.js XMLFragment to HTML
const convertXmlFragmentToHtml = (fragment: Y.XmlFragment): string => {
  let html = "";

  try {
    fragment.forEach((child, index) => {
      if (!child) return;

      console.log(`🔍 Processing child ${index}:`, child.constructor.name);

      if (child instanceof Y.XmlElement) {
        html += convertXmlElementToHtml(child);
      } else if (child instanceof Y.XmlText) {
        console.log(
          `🔍 Processing direct text node at index ${index}:`,
          child.toString(),
        );
        const textContent = child.toString();
        if (textContent.trim()) {
          html += `<p>${textContent}</p>`;
        }
      }
    });
  } catch (error) {
    console.error("Error processing XML fragment:", error);
  }

  if (!html.trim()) {
    html = "<p></p>";
  }

  console.log("📄 Fragment HTML result:", html);
  return html;
};

// Helper function to convert HTML back to Y.js fragment (reverse of conversion)
const convertHtmlToYjsFragment = (
  htmlContent: string,
  fragment: Y.XmlFragment,
): void => {
  try {
    console.log(
      `[${new Date().toISOString()}] Converting HTML to Y.js fragment:`,
      htmlContent.substring(0, 200),
    );

    // CRITICAL: Clear the fragment first to prevent content insertion at cursor position
    // This ensures we replace the entire document content, not append to it
    fragment.delete(0, fragment.length);
    console.log(
      `[${new Date().toISOString()}] Cleared existing fragment content`,
    );

    // Enhanced HTML to Y.js conversion - handles headings, formatting, and structure
    let content = htmlContent.trim();

    // CRITICAL: Remove leading empty paragraphs from HTML before processing
    // This handles cases like "<p></p><h1>Title</h1>" or "<p></p><p>Content</p>"
    content = content.replace(/^(<p[^>]*><\/p>\s*)+/, "");

    // Split content into blocks while preserving HTML structure
    const blockRegex =
      /<(h[1-6]|p|ul|ol|li|blockquote)[^>]*>.*?<\/\1>|<(h[1-6]|p)[^>]*>.*?(?=<(?:h[1-6]|p|ul|ol|blockquote)|$)/gs;
    const blocks = content.match(blockRegex) ?? [];

    if (blocks.length === 0) {
      // Fallback: treat entire content as single block
      const element = parseHtmlBlock(content);
      if (element) {
        fragment.insert(0, [element]);
      }
      return;
    }

    let hasNonEmptyContent = false;

    for (const block of blocks) {
      const element = parseHtmlBlock(block.trim(), !hasNonEmptyContent);
      if (element) {
        fragment.insert(fragment.length, [element]);
        // Mark that we've found non-empty content
        if (!hasNonEmptyContent && elementHasContent(element)) {
          hasNonEmptyContent = true;
        }
      }
    }

    // Final cleanup: remove any leading empty paragraphs that might have slipped through
    while (fragment.length > 0) {
      const firstElement = fragment.get(0);
      if (
        firstElement instanceof Y.XmlElement &&
        firstElement.nodeName === "paragraph" &&
        !elementHasContent(firstElement)
      ) {
        console.log(
          `[${new Date().toISOString()}] Removing leading empty paragraph to prevent blank line at start`,
        );
        fragment.delete(0, 1);
      } else {
        break; // Stop once we find non-empty content
      }
    }

    console.log(
      `[${new Date().toISOString()}] Successfully converted HTML to Y.js fragment with ${fragment.length} elements`,
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error converting HTML to Y.js fragment:`,
      error,
    );

    // Fallback: create a simple paragraph with the content as text
    const paragraph = new Y.XmlElement("paragraph");
    const cleanText = htmlContent.replace(/<[^>]*>/g, "").trim();
    if (cleanText) {
      paragraph.insert(0, [new Y.XmlText(cleanText)]);
      fragment.insert(0, [paragraph]);
    }
  }
};

// Helper function to check if an element has actual content
const elementHasContent = (element: Y.XmlElement): boolean => {
  if (element.length === 0) return false;

  // Check if any child has content
  let hasContent = false;
  element.forEach((child) => {
    if (child instanceof Y.XmlText && child.toString().trim()) {
      hasContent = true;
    } else if (child instanceof Y.XmlElement && elementHasContent(child)) {
      hasContent = true;
    }
  });

  return hasContent;
};

// Helper function to parse individual HTML blocks into Y.js elements
const parseHtmlBlock = (
  blockHtml: string,
  skipEmptyParagraphs = false,
): Y.XmlElement | null => {
  try {
    const trimmed = blockHtml.trim();
    if (!trimmed) return null;

    // Handle headings
    const headingMatch = trimmed.match(/^<h([1-6])[^>]*>(.*?)<\/h[1-6]>$/s);
    if (headingMatch && headingMatch[1] && headingMatch[2] !== undefined) {
      const level = headingMatch[1];
      const content = headingMatch[2];

      // Skip empty headings
      if (!content.trim()) {
        return null;
      }

      const heading = new Y.XmlElement("heading");
      heading.setAttribute("level", level);

      const textContent = parseTextWithFormatting(content);
      if (textContent.length > 0) {
        heading.insert(0, textContent);
        return heading;
      }

      return null; // Don't create empty headings
    }

    // Handle paragraphs
    const paragraphMatch =
      trimmed.match(/^<p[^>]*>(.*?)<\/p>$/s) ??
      trimmed.match(/^<p[^>]*>(.*?)$/s);
    if (paragraphMatch?.[1] !== undefined) {
      const content = paragraphMatch[1];

      // Only skip empty paragraphs at the beginning of the document
      if (!content.trim() && skipEmptyParagraphs) {
        return null;
      }

      const paragraph = new Y.XmlElement("paragraph");
      const textContent = parseTextWithFormatting(content);

      // For empty paragraphs after content has started, create an empty paragraph
      if (textContent.length === 0 && !skipEmptyParagraphs) {
        // Create an empty paragraph (intentional spacing)
        return paragraph;
      } else if (textContent.length > 0) {
        paragraph.insert(0, textContent);
        return paragraph;
      }

      return null; // Don't create empty paragraphs at the beginning
    }

    // Handle blockquotes
    const blockquoteMatch = trimmed.match(
      /^<blockquote[^>]*>(.*?)<\/blockquote>$/s,
    );
    if (blockquoteMatch && blockquoteMatch[1] !== undefined) {
      const content = blockquoteMatch[1];

      // Skip empty blockquotes
      if (!content.trim()) {
        return null;
      }

      const blockquote = new Y.XmlElement("blockquote");
      const textContent = parseTextWithFormatting(content);

      if (textContent.length > 0) {
        blockquote.insert(0, textContent);
        return blockquote;
      }

      return null; // Don't create empty blockquotes
    }

    // Default: treat as paragraph, but only if it has content
    const cleanedContent = trimmed.replace(/^<[^>]*>|<\/[^>]*>$/g, "").trim();
    if (!cleanedContent) {
      return null; // Don't create paragraphs for empty content
    }

    const paragraph = new Y.XmlElement("paragraph");
    const textContent = parseTextWithFormatting(cleanedContent);

    if (textContent.length > 0) {
      paragraph.insert(0, textContent);
      return paragraph;
    }

    return null; // Don't create empty paragraphs
  } catch (error) {
    console.error("Error parsing HTML block:", error);
    return null;
  }
};

// Helper function to parse text with inline formatting (bold, italic, etc.)
const parseTextWithFormatting = (
  html: string,
): (Y.XmlText | Y.XmlElement)[] => {
  try {
    const result: (Y.XmlText | Y.XmlElement)[] = [];

    // Enhanced approach: handle both basic formatting tags and span elements with style attributes
    let remaining = html;

    while (remaining) {
      // Find the next formatting tag - including span elements with style attributes
      const formatMatch = remaining.match(
        /^(.*?)<(strong|b|em|i|u|code|mark|span)[^>]*>(.*?)<\/\2>(.*)$/s,
      );

      if (
        formatMatch &&
        formatMatch[1] !== undefined &&
        formatMatch[2] &&
        formatMatch[3] !== undefined &&
        formatMatch[4] !== undefined
      ) {
        const [, before, tag, content, after] = formatMatch;

        // Add text before the formatting
        if (before) {
          result.push(new Y.XmlText(before));
        }

        // Handle span elements with style attributes (TipTap textStyle)
        if (tag === "span") {
          const spanMatch = remaining.match(
            /^(.*?)<span([^>]*)>(.*?)<\/span>(.*)$/s,
          );
          if (spanMatch && spanMatch[2] && spanMatch[3] !== undefined) {
            const attributes = spanMatch[2];
            const spanContent = spanMatch[3];
            
            // Parse style attributes from span
            const styleMatch = attributes.match(/style="([^"]*)"/i);
            if (styleMatch && styleMatch[1]) {
              const styleString = styleMatch[1];
              const textStyleElement = new Y.XmlElement("textStyle");
              
              // Parse individual CSS properties
              const cssProperties = styleString.split(';').map(prop => prop.trim()).filter(prop => prop.length > 0);
              
              for (const property of cssProperties) {
                const [key, value] = property.split(':').map(part => part.trim());
                if (key && value) {
                  switch (key.toLowerCase()) {
                    case 'font-size':
                      textStyleElement.setAttribute('fontSize', value);
                      console.log(`🎨 Parsed fontSize: ${value}`);
                      break;
                    case 'font-family':
                      textStyleElement.setAttribute('fontFamily', value);
                      console.log(`🎨 Parsed fontFamily: ${value}`);
                      break;
                    case 'color':
                      textStyleElement.setAttribute('color', value);
                      console.log(`🎨 Parsed color: ${value}`);
                      break;
                    case 'line-height':
                      textStyleElement.setAttribute('lineHeight', value);
                      console.log(`🎨 Parsed lineHeight: ${value}`);
                      break;
                    case 'background-color':
                      textStyleElement.setAttribute('backgroundColor', value);
                      console.log(`🎨 Parsed backgroundColor: ${value}`);
                      break;
                    case 'font-weight':
                      textStyleElement.setAttribute('fontWeight', value);
                      console.log(`🎨 Parsed fontWeight: ${value}`);
                      break;
                    case 'font-style':
                      textStyleElement.setAttribute('fontStyle', value);
                      console.log(`🎨 Parsed fontStyle: ${value}`);
                      break;
                    case 'text-decoration':
                      textStyleElement.setAttribute('textDecoration', value);
                      console.log(`🎨 Parsed textDecoration: ${value}`);
                      break;
                    default:
                      console.log(`🎨 Unknown CSS property: ${key}`);
                  }
                }
              }
              
              // Add content to textStyle element
              if (spanContent) {
                const nestedContent = parseTextWithFormatting(spanContent);
                textStyleElement.insert(0, nestedContent);
              }
              
              result.push(textStyleElement);
              remaining = after;
              continue;
            }
          }
        }
        
        // Handle mark elements with style attributes (highlight colors)
        if (tag === "mark") {
          const markMatch = remaining.match(
            /^(.*?)<mark([^>]*)>(.*?)<\/mark>(.*)$/s,
          );
          if (markMatch && markMatch[2] && markMatch[3] !== undefined) {
            const attributes = markMatch[2];
            const markContent = markMatch[3];
            
            // Parse style attributes from mark
            const styleMatch = attributes.match(/style="([^"]*)"/i);
            if (styleMatch && styleMatch[1]) {
              const styleString = styleMatch[1];
              const highlightElement = new Y.XmlElement("highlight");
              
              // Parse background-color for highlights
              const backgroundColorMatch = styleString.match(/background-color:\s*([^;]+)/i);
              if (backgroundColorMatch && backgroundColorMatch[1]) {
                highlightElement.setAttribute('backgroundColor', backgroundColorMatch[1].trim());
                console.log(`🎨 Parsed highlight backgroundColor: ${backgroundColorMatch[1].trim()}`);
              }
              
              // Add content to highlight element
              if (markContent) {
                const nestedContent = parseTextWithFormatting(markContent);
                highlightElement.insert(0, nestedContent);
              }
              
              result.push(highlightElement);
              remaining = after;
              continue;
            }
          }
        }

        // Create formatted element for basic tags
        const formattedElement = new Y.XmlElement(getYjsElementName(tag));
        if (content) {
          // Recursively handle nested formatting
          const nestedContent = parseTextWithFormatting(content);
          formattedElement.insert(0, nestedContent);
        }
        result.push(formattedElement);

        remaining = after;
      } else {
        // No more formatting tags, add remaining text
        if (remaining.trim()) {
          const cleanText = remaining.replace(/<[^>]*>/g, ""); // Strip any remaining HTML
          if (cleanText) {
            result.push(new Y.XmlText(cleanText));
          }
        }
        break;
      }
    }

    return result;
  } catch (error) {
    console.error("Error parsing text with formatting:", error);
    // Fallback: return plain text
    const cleanText = html.replace(/<[^>]*>/g, "").trim();
    return cleanText ? [new Y.XmlText(cleanText)] : [];
  }
};

// Helper function to map HTML tags to Y.js element names
const getYjsElementName = (htmlTag: string): string => {
  switch (htmlTag.toLowerCase()) {
    case "strong":
    case "b":
      return "strong";
    case "em":
    case "i":
      return "em";
    case "u":
      return "underline";
    case "code":
      return "code";
    case "mark":
      return "highlight";
    case "span":
      return "textStyle";
    default:
      return htmlTag;
  }
};

// Helper function to convert Y.js XMLElement to HTML
const convertXmlElementToHtml = (element: Y.XmlElement): string => {
  const nodeName = element.nodeName;
  console.log(`🔍 Processing YXmlElement: ${nodeName}`);

  let innerContent = "";

  try {
    element.forEach((child) => {
      if (child instanceof Y.XmlText) {
        innerContent += child.toString();
      } else if (child instanceof Y.XmlElement) {
        innerContent += convertXmlElementToHtml(child);
      }
    });
  } catch (error) {
    console.error(`Error processing XML element ${nodeName}:`, error);
  }

  // Map common TipTap/ProseMirror node types to HTML
  switch (nodeName) {
    case "paragraph":
    case "p": {
      return `<p>${innerContent}</p>`;
    }
    case "heading":
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const level = element.getAttribute("level") ?? nodeName.charAt(1) ?? "1";
      return `<h${level}>${innerContent}</h${level}>`;
    }
    case "bulletList":
    case "ul": {
      return `<ul>${innerContent}</ul>`;
    }
    case "orderedList":
    case "ol": {
      return `<ol>${innerContent}</ol>`;
    }
    case "listItem":
    case "li": {
      return `<li>${innerContent}</li>`;
    }
    case "blockquote": {
      return `<blockquote>${innerContent}</blockquote>`;
    }
    case "codeBlock":
    case "pre": {
      return `<pre><code>${innerContent}</code></pre>`;
    }
    case "hardBreak":
    case "br": {
      return "<br>";
    }
    case "horizontalRule":
    case "hr": {
      return "<hr>";
    }
    case "strong":
    case "b": {
      return `<strong>${innerContent}</strong>`;
    }
    case "em":
    case "i": {
      return `<em>${innerContent}</em>`;
    }
    case "u":
    case "underline": {
      return `<u>${innerContent}</u>`;
    }
    case "code": {
      return `<code>${innerContent}</code>`;
    }
    case "highlight":
    case "mark": {
      // Handle highlight with color attributes
      const backgroundColor = element.getAttribute("backgroundColor") || element.getAttribute("color");
      if (backgroundColor) {
        return `<mark style="background-color: ${backgroundColor}">${innerContent}</mark>`;
      }
      return `<mark>${innerContent}</mark>`;
    }
    case "textStyle":
    case "span": {
      // Handle TipTap textStyle elements with comprehensive formatting attributes
      const styleAttributes: string[] = [];
      
      // Font size
      const fontSize = element.getAttribute("fontSize");
      if (fontSize) {
        styleAttributes.push(`font-size: ${fontSize}`);
      }
      
      // Font family
      const fontFamily = element.getAttribute("fontFamily");
      if (fontFamily) {
        styleAttributes.push(`font-family: ${fontFamily}`);
      }
      
      // Text color
      const color = element.getAttribute("color");
      if (color) {
        styleAttributes.push(`color: ${color}`);
      }
      
      // Line height
      const lineHeight = element.getAttribute("lineHeight");
      if (lineHeight) {
        styleAttributes.push(`line-height: ${lineHeight}`);
      }
      
      // Background color for highlights
      const backgroundColor = element.getAttribute("backgroundColor");
      if (backgroundColor) {
        styleAttributes.push(`background-color: ${backgroundColor}`);
      }
      
      // Additional text decorations
      const textDecoration = element.getAttribute("textDecoration");
      if (textDecoration) {
        styleAttributes.push(`text-decoration: ${textDecoration}`);
      }
      
      // Font weight
      const fontWeight = element.getAttribute("fontWeight");
      if (fontWeight) {
        styleAttributes.push(`font-weight: ${fontWeight}`);
      }
      
      // Font style
      const fontStyle = element.getAttribute("fontStyle");
      if (fontStyle) {
        styleAttributes.push(`font-style: ${fontStyle}`);
      }
      
      if (styleAttributes.length > 0) {
        const styleString = styleAttributes.join('; ');
        console.log(`🎨 Converting textStyle with attributes: ${styleString}`);
        return `<span style="${styleString}">${innerContent}</span>`;
      }
      
      // If no style attributes, return content without wrapper
      return innerContent;
    }
    case "text": {
      return innerContent;
    }
    default: {
      console.log(`🔍 Unknown element type: ${nodeName}, treating as div`);
      return innerContent ? `<div>${innerContent}</div>` : "";
    }
  }
};


// Helper function to convert a ProseMirror node to HTML
const convertNodeToHtml = (node: ProseMirrorNode): string => {
  if (!node || typeof node !== "object") return "";
  switch (node.type) {
    case "paragraph": {
      const content = node.content
        ? node.content
            .map((child: ProseMirrorNode) => convertNodeToHtml(child))
            .join("")
        : "";
      return `<p>${content}</p>`;
    }
    case "text": {
      let text = node.text ?? "";
      // Apply marks (bold, italic, textStyle, etc.)
      if (node.marks && Array.isArray(node.marks)) {
        // Collect style attributes from textStyle marks
        const styleAttributes: string[] = [];
        let hasTextStyle = false;
        
        for (const mark of node.marks) {
          switch (mark.type) {
            case "bold":
              text = `<strong>${text}</strong>`;
              break;
            case "italic":
              text = `<em>${text}</em>`;
              break;
            case "underline":
              text = `<u>${text}</u>`;
              break;
            case "code":
              text = `<code>${text}</code>`;
              break;
            case "textStyle": {
              // Handle TipTap textStyle marks with comprehensive formatting
              hasTextStyle = true;
              const attrs = mark.attrs || {};
              
              // Font size
              if (attrs.fontSize) {
                styleAttributes.push(`font-size: ${attrs.fontSize}`);
              }
              
              // Font family
              if (attrs.fontFamily) {
                styleAttributes.push(`font-family: ${attrs.fontFamily}`);
              }
              
              // Text color
              if (attrs.color) {
                styleAttributes.push(`color: ${attrs.color}`);
              }
              
              // Line height
              if (attrs.lineHeight) {
                styleAttributes.push(`line-height: ${attrs.lineHeight}`);
              }
              
              // Font weight
              if (attrs.fontWeight) {
                styleAttributes.push(`font-weight: ${attrs.fontWeight}`);
              }
              
              // Font style
              if (attrs.fontStyle) {
                styleAttributes.push(`font-style: ${attrs.fontStyle}`);
              }
              
              // Text decoration
              if (attrs.textDecoration) {
                styleAttributes.push(`text-decoration: ${attrs.textDecoration}`);
              }
              
              console.log(`🎨 Processing textStyle mark with attributes:`, attrs);
              break;
            }
            case "highlight": {
              // Handle highlight marks with color attributes
              const attrs = mark.attrs || {};
              if (attrs.color) {
                text = `<mark style="background-color: ${attrs.color}">${text}</mark>`;
              } else {
                text = `<mark>${text}</mark>`;
              }
              break;
            }
            // Add more marks as needed
          }
        }
        
        // Apply textStyle span wrapper if we have style attributes
        if (hasTextStyle && styleAttributes.length > 0) {
          const styleString = styleAttributes.join('; ');
          console.log(`🎨 Applying textStyle with: ${styleString}`);
          text = `<span style="${styleString}">${text}</span>`;
        }
      }
      return text;
    }
    case "heading": {
      const level = node.attrs?.level ?? 1;
      const headingContent = node.content
        ? node.content
            .map((child: ProseMirrorNode) => convertNodeToHtml(child))
            .join("")
        : "";
      return `<h${level}>${headingContent}</h${level}>`;
    }
    case "bulletList": {
      const listItems = node.content
        ? node.content
            .map((child: ProseMirrorNode) => convertNodeToHtml(child))
            .join("")
        : "";
      return `<ul>${listItems}</ul>`;
    }
    case "orderedList": {
      const orderedItems = node.content
        ? node.content
            .map((child: ProseMirrorNode) => convertNodeToHtml(child))
            .join("")
        : "";
      return `<ol>${orderedItems}</ol>`;
    }
    case "listItem": {
      const itemContent = node.content
        ? node.content
            .map((child: ProseMirrorNode) => convertNodeToHtml(child))
            .join("")
        : "";
      return `<li>${itemContent}</li>`;
    }
    case "blockquote": {
      const quoteContent = node.content
        ? node.content
            .map((child: ProseMirrorNode) => convertNodeToHtml(child))
            .join("")
        : "";
      return `<blockquote>${quoteContent}</blockquote>`;
    }
    case "codeBlock": {
      const codeContent = node.content
        ? node.content
            .map((child: ProseMirrorNode) => convertNodeToHtml(child))
            .join("")
        : "";
      return `<pre><code>${codeContent}</code></pre>`;
    }
    case "hardBreak": {
      return "<br>";
    }
    case "horizontalRule": {
      return "<hr>";
    }
    default: {
      // For unknown node types, try to extract content
      if (node.content && Array.isArray(node.content)) {
        return node.content
          .map((child: ProseMirrorNode) => convertNodeToHtml(child))
          .join("");
      }
      return "";
    }
  }
};
// end convertNodeToHtml

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
    console.log(
      `[${new Date().toISOString()}] Initialized tracking for new document: ${documentName}`,
    );
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

  // Enhanced connection handling with origin validation and connection limits
  async onConnect(data: onConnectPayload) {
    const { request, socketId, documentName } = data;
    const origin = request.headers.origin!;

    // Validate origin for WebSocket connections
    if (!isOriginAllowed(origin)) {
      console.warn(
        `[${new Date().toISOString()}] Connection rejected from unauthorized origin: ${origin}`,
      );
      throw new Error("Unauthorized origin");
    }

    console.log(
      `[${new Date().toISOString()}] WebSocket connection accepted from ${origin} (${socketId}) for document: ${documentName}`,
    );

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
    console.log(
      `[${new Date().toISOString()}] ${SERVER_NAME} listening on ${HOST}:${PORT}`,
    );
    console.log(`[${new Date().toISOString()}] Environment: ${NODE_ENV}`);
    console.log(
      `[${new Date().toISOString()}] Max connections: ${MAX_CONNECTIONS}`,
    );
    console.log(`[${new Date().toISOString()}] 🔗 Convex URL: ${CONVEX_URL}`);
    console.log(
      `[${new Date().toISOString()}] 🌐 Convex Site URL: ${CONVEX_SITE_URL}`,
    );
    console.log(
      `[${new Date().toISOString()}] 📡 HTTP Save endpoint: ${CONVEX_SITE_URL}/updateDocumentContent`,
    );
    console.log(
      `[${new Date().toISOString()}] 📡 HTTP Load endpoint: ${CONVEX_SITE_URL}/getDocumentContent`,
    );
    console.log(
      `[${new Date().toISOString()}] Allowed origins: ${allowedOrigins.join(", ")}`,
    );
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

      // Get current Y.js document state
      const currentState = Y.encodeStateAsUpdate(document);
      
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
