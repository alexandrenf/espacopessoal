// index.ts
import { Server } from '@hocuspocus/server';
import type { onConnectPayload, onDisconnectPayload, onListenPayload, onRequestPayload, onLoadDocumentPayload, onStoreDocumentPayload, onDestroyPayload, onChangePayload } from '@hocuspocus/server';
import * as Y from 'yjs';

// Helper function to safely parse integers with defaults
const safeParseInt = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Load environment variables
const PORT = safeParseInt(process.env.PORT, 6002);
const HOST = process.env.HOST ?? '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const SERVER_NAME = process.env.SERVER_NAME ?? 'EspacoPessoal Docs Server';
const MAX_CONNECTIONS = safeParseInt(process.env.MAX_CONNECTIONS, 100);
const TIMEOUT = safeParseInt(process.env.TIMEOUT, 30000);

// Convex configuration
const CONVEX_URL = process.env.CONVEX_URL ?? 'https://ardent-dolphin-114.convex.cloud';
const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL ?? 'https://ardent-dolphin-114.convex.site';

// Server user ID configuration
const SERVER_USER_ID = process.env.SERVER_USER_ID ?? 'hocus-pocus-server';

// Retry configuration for network requests
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const RETRY_BACKOFF_MULTIPLIER = 2;
const MAX_RETRY_DELAY = 10000; // 10 seconds

// Document tracking
interface DocumentState {
  documentName: string;
  connectedUsers: Set<string>;
  saveTimeout?: NodeJS.Timeout;
  lastActivity: number;
  pendingSave: boolean;
}

// Save result types
interface SaveResult {
  success: boolean;
  error?: string;
  type: 'success' | 'not_found' | 'error';
}

class DocumentNotFoundError extends Error {
  constructor(documentName: string) {
    super(`Document ${documentName} not found`);
    this.name = 'DocumentNotFoundError';
  }
}

const documentStates = new Map<string, DocumentState>();

// Global document instances tracking for proper shutdown handling
const documentInstances = new Map<string, Y.Doc>();

// Helper function for delay with jitter to prevent thundering herd
const delay = (ms: number): Promise<void> => {
  // Add jitter to prevent thundering herd (10% random variation)
  const jitter = Math.random() * 0.1;
  const delayWithJitter = ms * (1 + jitter);
  return new Promise(resolve => setTimeout(resolve, delayWithJitter));
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
const saveDocumentToConvex = async (documentName: string, content: string): Promise<SaveResult> => {
  const url = `${CONVEX_SITE_URL}/updateDocumentContent`;
  const payload = {
    documentId: documentName,
    content: content,
    userId: SERVER_USER_ID,
  };
  
  console.log(`[${new Date().toISOString()}] 🔗 Attempting to save to: ${url}`);
  console.log(`[${new Date().toISOString()}] 📄 Document ID: ${documentName}`);
  console.log(`[${new Date().toISOString()}] 📝 Content length: ${content.length} chars`);
  
  let lastError: unknown;
  let lastResponse: Response | undefined;
  
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      // Log retry attempt if not the first attempt
      if (attempt > 1) {
        console.log(`[${new Date().toISOString()}] 🔄 Retry attempt ${attempt}/${MAX_RETRY_ATTEMPTS} for document ${documentName}`);
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log(`[${new Date().toISOString()}] 📡 Response status: ${response.status} ${response.statusText}`);
      lastResponse = response;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${new Date().toISOString()}] ❌ HTTP Error: ${response.status} - ${errorText}`);
        
        // Handle non-retryable errors immediately
        if (response.status === 404) {
          console.log(`[${new Date().toISOString()}] 🚫 Document ${documentName} not found in Convex - document may not have been created through UI`);
          return {
            success: false,
            error: `Document ${documentName} not found`,
            type: 'not_found'
          };
        }
        
        // Check if this error is retryable
        if (!isRetryableError(null, response)) {
          console.log(`[${new Date().toISOString()}] ❌ Non-retryable error for document ${documentName}, giving up`);
          return {
            success: false,
            error: `HTTP ${response.status}: ${errorText}`,
            type: 'error'
          };
        }
        
        // Store error for potential retry
        lastError = new Error(`HTTP ${response.status}: ${errorText}`);
        
        // If this is the last attempt, don't retry
        if (attempt === MAX_RETRY_ATTEMPTS) {
          console.error(`[${new Date().toISOString()}] ❌ Max retries reached for document ${documentName}, giving up`);
          return {
            success: false,
            error: `HTTP ${response.status}: ${errorText}`,
            type: 'error'
          };
        }
        
        // Calculate delay for next attempt with exponential backoff
        const delayMs = Math.min(
          INITIAL_RETRY_DELAY * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt - 1),
          MAX_RETRY_DELAY
        );
        
        console.log(`[${new Date().toISOString()}] ⏳ Retrying in ${delayMs}ms due to ${response.status} error`);
        await delay(delayMs);
        continue;
      }

      // Success case
      const result = await response.json() as { success: boolean; message: string };
      
      if (attempt > 1) {
        console.log(`[${new Date().toISOString()}] ✅ Successfully saved document ${documentName} to Convex after ${attempt} attempts`);
      } else {
        console.log(`[${new Date().toISOString()}] ✅ Successfully saved document ${documentName} to Convex`);
      }
      
      return {
        success: true,
        type: 'success'
      };
      
    } catch (error) {
      lastError = error;
      console.error(`[${new Date().toISOString()}] Network error saving document ${documentName} to Convex:`, error);
      
      // Network errors are always retryable
      if (attempt === MAX_RETRY_ATTEMPTS) {
        console.error(`[${new Date().toISOString()}] ❌ Max retries reached for document ${documentName} after network error, giving up`);
        break;
      }
      
      // Calculate delay for next attempt with exponential backoff
      const delayMs = Math.min(
        INITIAL_RETRY_DELAY * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt - 1),
        MAX_RETRY_DELAY
      );
      
      console.log(`[${new Date().toISOString()}] ⏳ Retrying in ${delayMs}ms due to network error`);
      await delay(delayMs);
    }
  }
  
  // If we get here, all retries failed
  return {
    success: false,
    error: lastError instanceof Error ? lastError.message : 'Unknown error after retries',
    type: 'error'
  };
};

const loadDocumentFromConvex = async (documentName: string): Promise<string | null> => {
  const url = `${CONVEX_SITE_URL}/getDocumentContent?documentId=${encodeURIComponent(documentName)}`;
  
  console.log(`[${new Date().toISOString()}] 🔍 Attempting to load from: ${url}`);
  console.log(`[${new Date().toISOString()}] 📄 Document ID: ${documentName}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`[${new Date().toISOString()}] 📡 Load response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[${new Date().toISOString()}] Document ${documentName} not found in Convex - will start with empty document`);
        return null;
      }
      const errorText = await response.text();
      console.error(`[${new Date().toISOString()}] Failed to load document ${documentName}: ${response.status} ${errorText}`);
      return null;
    }

    const result = await response.json() as { success: boolean; document: { content: string } };
    console.log(`[${new Date().toISOString()}] Successfully loaded document ${documentName} from Convex (${result.document?.content?.length || 0} chars)`);
    return result.document?.content || null;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error loading document ${documentName} from Convex:`, error);
    return null;
  }
};

// Document saving logic
const scheduleDocumentSave = (documentName: string, document: Y.Doc) => {
  const state = documentStates.get(documentName);
  if (!state) return;

  // Clear existing timeout
  if (state.saveTimeout) {
    clearTimeout(state.saveTimeout);
  }

  // Don't schedule if already pending save
  if (state.pendingSave) {
    return;
  }

  // Schedule save after 2 seconds of inactivity (fixed to match comment)
  state.saveTimeout = setTimeout(() => {
    void performDocumentSave(documentName, document);
  }, 2000);

  state.lastActivity = Date.now();
};

const performDocumentSave = async (documentName: string, document: Y.Doc) => {
  const state = documentStates.get(documentName);
  if (!state || state.pendingSave) return;

  state.pendingSave = true;

  try {
    // Extract HTML content from Y.js document
    const content = extractDocumentContent(document);
    console.log(`[${new Date().toISOString()}] Saving document ${documentName} (${content.length} chars)`);
    
    const result = await saveDocumentToConvex(documentName, content);
    
    if (!result.success) {
      if (result.type === 'not_found') {
        console.warn(`[${new Date().toISOString()}] Document ${documentName} not found, skipping save`);
      } else {
        console.error(`[${new Date().toISOString()}] Failed to save document ${documentName}: ${result.error}`);
      }
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during document save for ${documentName}:`, error);
  } finally {
    if (state) {
      state.pendingSave = false;
    }
  }
};

const extractDocumentContent = (ydoc: Y.Doc): string => {
  try {
    // Debug: Check what shared types exist
    const sharedTypes = ydoc.share;
    console.log('🔍 Available shared types:', Object.keys(sharedTypes));
    
    // Look for the prosemirror shared type
    if (sharedTypes.has('prosemirror')) {
      const prosemirrorType = sharedTypes.get('prosemirror');
      if (prosemirrorType) {
        console.log('🔍 Found prosemirror type:', prosemirrorType.constructor.name);
        
        // Cast to any to access methods safely
        const prosemirrorMap = prosemirrorType as any;
        
        // Try to get content as a simple string first
        if (prosemirrorMap?.has && prosemirrorMap.has('content')) {
          const content = prosemirrorMap.get('content');
          if (typeof content === 'string' && content.length > 0) {
            console.log('📄 Found string content in prosemirror map');
            return content;
          }
        }
        
        // If it's a YMap, look for other common keys
        if (prosemirrorType.constructor.name === 'YMap' && prosemirrorMap.keys) {
          console.log('🔍 Prosemirror map keys:', Array.from(prosemirrorMap.keys()));
          
          // Look for common TipTap keys
          const keysToCheck = ['default', 'doc', 'fragment', 'content'];
          for (const key of keysToCheck) {
            if (prosemirrorMap.has(key)) {
              const value = prosemirrorMap.get(key);
              console.log(`🔍 Found key "${key}":`, value ? value.constructor.name : 'null');
              
              // If it's a YXmlFragment, try to extract content
              if (value && value.constructor.name === 'YXmlFragment') {
                try {
                  const xmlContent = value.toString();
                  console.log(`🔍 XML content from ${key}:`, xmlContent);
                  if (xmlContent && xmlContent.length > 0) {
                    console.log(`📄 Extracted content from XML fragment in ${key}`);
                    return xmlContent;
                  }
                } catch (e) {
                  console.log(`🔍 Error extracting XML from ${key}:`, e);
                }
              }
              
              // If it's another Y.js type, try to get JSON
              if (value && typeof value === 'object' && value.toJSON) {
                try {
                  const json = value.toJSON();
                  console.log(`🔍 JSON from ${key}:`, json);
                  if (json) {
                    const html = convertProseMirrorToHtml(json);
                    if (html && html.length > 0) {
                      console.log(`📄 Extracted content from JSON in ${key}`);
                      return html;
                    }
                  }
                } catch (e) {
                  console.log(`🔍 Error extracting JSON from ${key}:`, e);
                }
              }
            }
          }
        }
      }
    }
    
    // If no prosemirror type found, check if there are any other shared types
    if (sharedTypes.size === 0) {
      console.log('🔍 No shared types found in document');
    } else {
      console.log('🔍 Checking all shared types for content:');
      for (const [key, sharedType] of sharedTypes.entries()) {
        console.log(`🔍 Type "${key}":`, sharedType.constructor.name);
      }
    }

    
    // Log if no content found in prosemirror map
    console.log('📄 No content found in prosemirror map, returning empty document');
    
    // Return empty paragraph for empty documents
    return '<p></p>';
    
  } catch (error) {
    console.error('Error extracting document content:', error);
    return '<p>Error extracting content</p>';
  }
};

// Helper function to convert ProseMirror JSON to HTML
const convertProseMirrorToHtml = (json: any): string => {
  try {
    if (!json || typeof json !== 'object') return '';
    
    // If it's a document node, extract content from it
    if (json.type === 'doc' && json.content && Array.isArray(json.content)) {
      return json.content.map((node: any) => convertNodeToHtml(node)).join('');
    }
    
    // If it's a single node, convert it
    return convertNodeToHtml(json);
    
  } catch (error) {
    console.error('Error converting ProseMirror JSON to HTML:', error);
    return '';
  }
};

// Helper function to convert a ProseMirror node to HTML
const convertNodeToHtml = (node: any): string => {
  if (!node || typeof node !== 'object') return '';
  
  switch (node.type) {
    case 'paragraph':
      const content = node.content ? node.content.map((child: any) => convertNodeToHtml(child)).join('') : '';
      return `<p>${content}</p>`;
    
    case 'text':
      let text = node.text || '';
      // Apply marks (bold, italic, etc.)
      if (node.marks && Array.isArray(node.marks)) {
        for (const mark of node.marks) {
          switch (mark.type) {
            case 'bold':
              text = `<strong>${text}</strong>`;
              break;
            case 'italic':
              text = `<em>${text}</em>`;
              break;
            case 'underline':
              text = `<u>${text}</u>`;
              break;
            case 'code':
              text = `<code>${text}</code>`;
              break;
            // Add more marks as needed
          }
        }
      }
      return text;
    
    case 'heading':
      const level = node.attrs?.level || 1;
      const headingContent = node.content ? node.content.map((child: any) => convertNodeToHtml(child)).join('') : '';
      return `<h${level}>${headingContent}</h${level}>`;
    
    case 'bulletList':
      const listItems = node.content ? node.content.map((child: any) => convertNodeToHtml(child)).join('') : '';
      return `<ul>${listItems}</ul>`;
    
    case 'orderedList':
      const orderedItems = node.content ? node.content.map((child: any) => convertNodeToHtml(child)).join('') : '';
      return `<ol>${orderedItems}</ol>`;
    
    case 'listItem':
      const itemContent = node.content ? node.content.map((child: any) => convertNodeToHtml(child)).join('') : '';
      return `<li>${itemContent}</li>`;
    
    case 'blockquote':
      const quoteContent = node.content ? node.content.map((child: any) => convertNodeToHtml(child)).join('') : '';
      return `<blockquote>${quoteContent}</blockquote>`;
    
    case 'codeBlock':
      const codeContent = node.content ? node.content.map((child: any) => convertNodeToHtml(child)).join('') : '';
      return `<pre><code>${codeContent}</code></pre>`;
    
    case 'hardBreak':
      return '<br>';
    
    case 'horizontalRule':
      return '<hr>';
    
    default:
      // For unknown node types, try to extract content
      if (node.content && Array.isArray(node.content)) {
        return node.content.map((child: any) => convertNodeToHtml(child)).join('');
      }
      return '';
  }
};

// Centralized function to atomically initialize document state
// Prevents race conditions between onConnect and onChange
const initializeDocumentStateIfNeeded = (documentName: string): void => {
  if (!documentStates.has(documentName)) {
    documentStates.set(documentName, {
      documentName,
      connectedUsers: new Set(),
      lastActivity: Date.now(),
      pendingSave: false,
    });
    console.log(`[${new Date().toISOString()}] Initialized tracking for new document: ${documentName}`);
  }
};

// CORS Configuration - Support multiple origins
const getAllowedOrigins = () => {
  const corsOrigin = process.env.CORS_ORIGIN;
  
  if (corsOrigin) {
    // If CORS_ORIGIN is set, use it (can be comma-separated list)
    return corsOrigin.split(',').map(origin => origin.trim());
  }
  
  // Default allowed origins based on environment
  const defaultOrigins = [
    'https://docs.espacopessoal.com',
    'https://espacopessoal-v2.vercel.app',
    'https://www.espacopessoal.com',
    'https://dev.espacopessoal.com',
  ];
  
  if (NODE_ENV === 'development') {
    defaultOrigins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'https://localhost:3000',
      'https://localhost:3001'
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
  
  // Add extensions here for persistence (e.g., database)
  // extensions: [
  //   new Database({
  //     // ... database options
  //   }),
  // ],
  
  // Enhanced CORS configuration
  async onRequest(data: onRequestPayload) {
    const { request, response } = data;
    const origin = request.headers.origin!;
    
    // Set CORS headers
    if (isOriginAllowed(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.writeHead(200);
      response.end();
      return;
    }
    
    // Continue with other handlers
    return Promise.resolve();
  },

  // Enhanced connection handling with origin validation
  async onConnect(data: onConnectPayload) {
    const { request, socketId, documentName } = data;
    const origin = request.headers.origin!;
    
    // Validate origin for WebSocket connections
    if (!isOriginAllowed(origin)) {
      console.warn(`[${new Date().toISOString()}] Connection rejected from unauthorized origin: ${origin}`);
      throw new Error('Unauthorized origin');
    }
    
    console.log(`[${new Date().toISOString()}] WebSocket connection accepted from ${origin} (${socketId}) for document: ${documentName}`);
    
    // Initialize document state atomically to prevent race conditions
    initializeDocumentStateIfNeeded(documentName);
    
    const state = documentStates.get(documentName)!;
    state.connectedUsers.add(socketId);
    
    console.log(`[${new Date().toISOString()}] Document ${documentName} now has ${state.connectedUsers.size} connected users`);
  },
  
  async onDisconnect(data: onDisconnectPayload) {
    const { socketId, documentName, document } = data;
    console.log(`[${new Date().toISOString()}] WebSocket connection disconnected: ${socketId} from document: ${documentName}`);
    
    const state = documentStates.get(documentName);
    if (state) {
      state.connectedUsers.delete(socketId);
      
      console.log(`[${new Date().toISOString()}] Document ${documentName} now has ${state.connectedUsers.size} connected users`);
      
      // If no users left, save immediately and clean up
      if (state.connectedUsers.size === 0) {
        console.log(`[${new Date().toISOString()}] No users left for document ${documentName}, saving immediately`);
        
        // Clear any pending save timeout
        if (state.saveTimeout) {
          clearTimeout(state.saveTimeout);
        }
        
        // Perform immediate save
        await performDocumentSave(documentName, document);
        
        // Clean up document state
        documentStates.delete(documentName);
        console.log(`[${new Date().toISOString()}] Cleaned up state for document ${documentName}`);
      }
    }
  },
  
  async onListen(data: onListenPayload) {
    console.log(`[${new Date().toISOString()}] ${SERVER_NAME} listening on ${HOST}:${PORT}`);
    console.log(`[${new Date().toISOString()}] Environment: ${NODE_ENV}`);
    console.log(`[${new Date().toISOString()}] Max connections: ${MAX_CONNECTIONS}`);
    console.log(`[${new Date().toISOString()}] 🔗 Convex URL: ${CONVEX_URL}`);
    console.log(`[${new Date().toISOString()}] 🌐 Convex Site URL: ${CONVEX_SITE_URL}`);
    console.log(`[${new Date().toISOString()}] 📡 HTTP Save endpoint: ${CONVEX_SITE_URL}/updateDocumentContent`);
    console.log(`[${new Date().toISOString()}] 📡 HTTP Load endpoint: ${CONVEX_SITE_URL}/getDocumentContent`);
    console.log(`[${new Date().toISOString()}] Allowed origins: ${allowedOrigins.join(', ')}`);
  },
  
  async onDestroy(data: onDestroyPayload) {
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
        console.log(`[${new Date().toISOString()}] Saving document ${documentName} before shutdown`);
        savePromises.push(performDocumentSave(documentName, document));
      } else {
        console.log(`[${new Date().toISOString()}] No document instance found for ${documentName}, skipping save`);
      }
    }
    
    // Wait for all saves to complete
    try {
      await Promise.all(savePromises);
      console.log(`[${new Date().toISOString()}] All document saves completed before shutdown`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error saving documents during shutdown:`, error);
    }
    
    documentStates.clear();
    documentInstances.clear();
  },
  
  async onLoadDocument(data: onLoadDocumentPayload) {
    const { documentName } = data;
    console.log(`[${new Date().toISOString()}] Loading document: ${documentName}`);
    
    // Try to load from Convex
    const content = await loadDocumentFromConvex(documentName);
    
    if (content && content.trim() !== '' && content !== '<p></p>') {
      // Create Y.js document with the loaded content
      const ydoc = new Y.Doc();
      
      try {
        // For TipTap collaboration, we store content in the prosemirror map
        // This matches the structure expected by TipTap's Collaboration extension
        const prosemirrorMap = ydoc.getMap('prosemirror');
        prosemirrorMap.set('content', content);
        
        console.log(`[${new Date().toISOString()}] Loaded ${content.length} characters for document ${documentName}`);
        return ydoc;
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error applying content to Y.js document:`, error);
      }
    }
    
    // Return null to let Hocuspocus create a new document
    // This will start with empty content and get populated by the editor
    console.log(`[${new Date().toISOString()}] No content found for document ${documentName}, starting with empty document`);
    return null;
  },
  
  async onChange(data: onChangePayload) {
    const { documentName, document } = data;
    
    // Track document instance globally for shutdown handling
    documentInstances.set(documentName, document);

    // Initialize document state atomically to prevent race conditions
    initializeDocumentStateIfNeeded(documentName);
    
    // Schedule save after 2 seconds of inactivity (now consistent with comment)
    scheduleDocumentSave(documentName, document);
  },
  
  async onStoreDocument(data: onStoreDocumentPayload) {
    // This is called by Hocuspocus but we're handling saving in onChange
    console.log(`[${new Date().toISOString()}] onStoreDocument called for: ${data.documentName} (handled by onChange)`);
  },
});

void server.listen();