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
    console.log('🔍 Starting content extraction...');
    
    // The key insight: TipTap stores content in YXmlFragment, but we need to traverse the tree structure
    // From the debug output, we know there's a 'default' fragment with length 2 that contains the actual content
    
    const defaultFragment = ydoc.getXmlFragment('default');
    if (defaultFragment && defaultFragment.length > 0) {
      console.log(`🔍 Found default fragment with ${defaultFragment.length} children`);
      
      // Build HTML by traversing the Y.js XML structure
      const extractFromXmlFragment = (fragment: Y.XmlFragment): string => {
        let html = '';
        
        for (let i = 0; i < fragment.length; i++) {
          const child = fragment.get(i);
          if (!child) continue;
          
          console.log(`🔍 Processing child ${i}:`, child.constructor?.name ?? typeof child);
          
          // Handle YXmlElement (like paragraphs, headings, etc.)
          if (child.constructor?.name === 'YXmlElement') {
            const xmlElement = child as unknown as {
              nodeName?: string;
              getAttributes?: () => Record<string, unknown>;
              length: number;
              get: (index: number) => unknown;
            };
            
            const nodeName = xmlElement.nodeName ?? 'div';
            const attrs = xmlElement.getAttributes ? xmlElement.getAttributes() : {};
            
            console.log(`🔍 YXmlElement: ${nodeName}`, attrs);
            
            // Get the text content from this element
            let innerContent = '';
            if (xmlElement.length > 0) {
              for (let j = 0; j < xmlElement.length; j++) {
                const grandChild = xmlElement.get(j);
                if (grandChild && typeof grandChild === 'object' && (grandChild as any).constructor?.name === 'YXmlText') {
                  const textContent = (grandChild as any).toString();
                  if (textContent && textContent !== '[object Object]') {
                    innerContent += textContent;
                  }
                }
              }
            }
            
            // Convert to HTML based on node type
            if (nodeName === 'paragraph') {
              html += `<p>${innerContent}</p>`;
            } else if (nodeName === 'heading') {
              const level = attrs.level || 1;
              html += `<h${level}>${innerContent}</h${level}>`;
            } else {
              html += `<${nodeName}>${innerContent}</${nodeName}>`;
            }
          }
          // Handle YXmlText (direct text content)
          else if (child.constructor?.name === 'YXmlText') {
            const textContent = child.toString();
            if (textContent && textContent !== '[object Object]') {
              html += `<p>${textContent}</p>`;
            }
          }
          // Handle other types by trying toString
          else if (child.toString && typeof child.toString === 'function') {
            const content = child.toString();
            if (content && content !== '[object Object]' && content.length > 0) {
              html += content;
            }
          }
        }
        
        return html;
      };
      
      const extractedHtml = extractFromXmlFragment(defaultFragment);
      if (extractedHtml && extractedHtml.length > 0) {
        console.log('📄 Successfully extracted content from default fragment:', extractedHtml);
        return extractedHtml;
      }
    }
    
    // Fallback: Try prosemirror fragment
    const prosemirrorFragment = ydoc.getXmlFragment('prosemirror');
    if (prosemirrorFragment && prosemirrorFragment.length > 0) {
      console.log(`🔍 Trying prosemirror fragment with ${prosemirrorFragment.length} children`);
      
      // Use the same extraction logic
      const extractFromXmlFragment = (fragment: any): string => {
        let html = '';
        for (let i = 0; i < fragment.length; i++) {
          const child = fragment.get(i);
          if (child?.constructor?.name === 'YXmlElement') {
            const nodeName = child.nodeName || 'div';
            let innerContent = '';
            if (child.length > 0) {
              for (let j = 0; j < child.length; j++) {
                const grandChild = child.get(j);
                if (grandChild?.constructor?.name === 'YXmlText') {
                  const textContent = grandChild.toString();
                  if (textContent && textContent !== '[object Object]') {
                    innerContent += textContent;
                  }
                }
              }
            }
            html += nodeName === 'paragraph' ? `<p>${innerContent}</p>` : `<${nodeName}>${innerContent}</${nodeName}>`;
          }
        }
        return html;
      };
      
      const extractedHtml = extractFromXmlFragment(prosemirrorFragment);
      if (extractedHtml && extractedHtml.length > 0) {
        console.log('📄 Successfully extracted content from prosemirror fragment:', extractedHtml);
        return extractedHtml;
      }
    }
    
    console.log('📄 No content found, returning empty document');
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
    
    // For now, let the client handle initial content loading to avoid sync conflicts
    // The server will focus on saving content changes made through collaboration
    console.log(`[${new Date().toISOString()}] Letting client handle initial content for document ${documentName}`);
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