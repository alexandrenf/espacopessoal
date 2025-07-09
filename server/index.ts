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
  type: 'doc';
  content: ProseMirrorNode[];
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
    const content = result.document?.content ?? null;
    
    console.log(`[${new Date().toISOString()}] Successfully loaded document ${documentName} from Convex (${content?.length ?? 0} chars)`);
    
    return content;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error loading document ${documentName} from Convex:`, error);
    return null;
  }
};

// Document saving logic with enhanced scheduling
const scheduleDocumentSave = (documentName: string, document: Y.Doc) => {
  const state = documentStates.get(documentName);
  if (!state) return;

  // Clear existing timeout
  if (state.saveTimeout) {
    clearTimeout(state.saveTimeout);
  }

  // Don't schedule if already pending save
  if (state.pendingSave) {
    console.log(`[${new Date().toISOString()}] Save already pending for ${documentName}, skipping schedule`);
    return;
  }

  // Schedule save after 2 seconds of inactivity (consistent with frontend expectations)
  state.saveTimeout = setTimeout(() => {
    void performDocumentSave(documentName, document);
  }, 2000);

  state.lastActivity = Date.now();
  console.log(`[${new Date().toISOString()}] Scheduled save for ${documentName} in 2 seconds`);
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

// Enhanced function to extract document content from Y.js document
const extractDocumentContent = (ydoc: Y.Doc): string => {
  try {
    console.log('🔍 Starting enhanced content extraction...');
    
    // Get all shared types in the document
    const sharedTypes = Array.from(ydoc.share.keys());
    console.log('🔍 Y.js shared types:', sharedTypes);
    
    // Try multiple fragment names that TipTap might use
    const fragmentNames = ['default', 'prosemirror', 'document', 'content', 'editor'];
    
    for (const fragmentName of fragmentNames) {
      try {
        const fragment = ydoc.getXmlFragment(fragmentName);
        if (fragment) {
          console.log(`🔍 Found fragment '${fragmentName}' with ${fragment.length} children`);
          
          if (fragment.length > 0) {
            const content = convertXmlFragmentToHtml(fragment);
            if (content && content !== '<p></p>') {
              console.log(`✅ Successfully extracted content from fragment '${fragmentName}':`, content);
              return content;
            }
          }
          
          // Also try to get the fragment's internal content
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fragmentChildren = (fragment as any)._start;
            if (fragmentChildren) {
              console.log(`🔍 Fragment '${fragmentName}' has internal children`);
            }
          } catch (error) {
            console.log(`🔍 Could not access internal children of fragment '${fragmentName}':`, error);
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
        console.log(`🔍 Examining shared type '${typeName}':`, typeof sharedType);
        
        if (sharedType instanceof Y.XmlFragment) {
          console.log(`🔍 Shared type '${typeName}' is XmlFragment with ${sharedType.length} children`);
          if (sharedType.length > 0) {
            const content = convertXmlFragmentToHtml(sharedType);
            if (content && content !== '<p></p>') {
              console.log(`✅ Successfully extracted content from shared type '${typeName}':`, content);
              return content;
            }
          }
        } else if (sharedType instanceof Y.XmlElement) {
          console.log(`🔍 Shared type '${typeName}' is XmlElement`);
          const content = convertXmlElementToHtml(sharedType);
          if (content && content !== '<p></p>') {
            console.log(`✅ Successfully extracted content from XmlElement '${typeName}':`, content);
            return content;
          }
        } else if (sharedType instanceof Y.Map) {
          console.log(`🔍 Shared type '${typeName}' is Map with keys:`, Array.from(sharedType.keys()));
        } else if (sharedType instanceof Y.Array) {
          console.log(`🔍 Shared type '${typeName}' is Array with ${sharedType.length} items`);
        } else if (sharedType instanceof Y.Text) {
          console.log(`🔍 Shared type '${typeName}' is Text:`, sharedType.toString());
          const textContent = sharedType.toString();
          if (textContent) {
            return `<p>${textContent}</p>`;
          }
        }
      } catch (error) {
        console.warn(`🔍 Error examining shared type '${typeName}':`, error);
      }
    }
    
    console.log('📄 No collaborative content found, returning empty document');
    return '<p></p>';
  } catch (error) {
    console.error('💥 Error extracting document content:', error);
    return '<p>Error extracting content</p>';
  }
};

// Helper function to convert Y.js XMLFragment to HTML
const convertXmlFragmentToHtml = (fragment: Y.XmlFragment): string => {
  let html = '';

  try {
    fragment.forEach((child, index) => {
      if (!child) return;

      console.log(`🔍 Processing child ${index}:`, child.constructor.name);

      if (child instanceof Y.XmlElement) {
        html += convertXmlElementToHtml(child);
      } else if (child instanceof Y.XmlText) {
        console.log(`🔍 Processing direct text node at index ${index}:`, child.toString());
        const textContent = child.toString();
        if (textContent.trim()) {
          html += `<p>${textContent}</p>`;
        }
      }
    });
  } catch (error) {
    console.error('Error processing XML fragment:', error);
  }

  if (!html.trim()) {
    html = '<p></p>';
  }

  console.log('📄 Fragment HTML result:', html);
  return html;
};

// Helper function to convert Y.js XMLElement to HTML
const convertXmlElementToHtml = (element: Y.XmlElement): string => {
  const nodeName = element.nodeName;
  console.log(`🔍 Processing YXmlElement: ${nodeName}`);

  let innerContent = '';
  
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
    case 'paragraph':
    case 'p':
      return `<p>${innerContent}</p>`;
    case 'heading':
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      const level = element.getAttribute('level') ?? nodeName.charAt(1) ?? '1';
      return `<h${level}>${innerContent}</h${level}>`;
    case 'bulletList':
    case 'ul':
      return `<ul>${innerContent}</ul>`;
    case 'orderedList':
    case 'ol':
      return `<ol>${innerContent}</ol>`;
    case 'listItem':
    case 'li':
      return `<li>${innerContent}</li>`;
    case 'blockquote':
      return `<blockquote>${innerContent}</blockquote>`;
    case 'codeBlock':
    case 'pre':
      return `<pre><code>${innerContent}</code></pre>`;
    case 'hardBreak':
    case 'br':
      return '<br>';
    case 'horizontalRule':
    case 'hr':
      return '<hr>';
    case 'strong':
    case 'b':
      return `<strong>${innerContent}</strong>`;
    case 'em':
    case 'i':
      return `<em>${innerContent}</em>`;
    case 'u':
      return `<u>${innerContent}</u>`;
    case 'code':
      return `<code>${innerContent}</code>`;
    case 'text':
      return innerContent;
    default:
      console.log(`🔍 Unknown element type: ${nodeName}, treating as div`);
      return innerContent ? `<div>${innerContent}</div>` : '';
  }
};

// Helper function to convert ProseMirror JSON to HTML
const convertProseMirrorToHtml = (json: ProseMirrorDocument | ProseMirrorNode): string => {
  try {
    if (!json || typeof json !== 'object') return '';
    
    // If it's a document node, extract content from it
    if (json.type === 'doc' && json.content && Array.isArray(json.content)) {
      return json.content.map((node: ProseMirrorNode) => convertNodeToHtml(node)).join('');
    }
    
    // If it's a single node, convert it
    return convertNodeToHtml(json);
    
  } catch (error) {
    console.error('Error converting ProseMirror JSON to HTML:', error);
    return '';
  }
};

// Helper function to convert a ProseMirror node to HTML
const convertNodeToHtml = (node: ProseMirrorNode): string => {
  if (!node || typeof node !== 'object') return '';
  
  switch (node.type) {
    case 'paragraph':
      const content = node.content ? node.content.map((child: ProseMirrorNode) => convertNodeToHtml(child)).join('') : '';
      return `<p>${content}</p>`;
    
    case 'text':
      let text = node.text ?? '';
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
      const level = node.attrs?.level ?? 1;
      const headingContent = node.content ? node.content.map((child: ProseMirrorNode) => convertNodeToHtml(child)).join('') : '';
      return `<h${level}>${headingContent}</h${level}>`;
    
    case 'bulletList':
      const listItems = node.content ? node.content.map((child: ProseMirrorNode) => convertNodeToHtml(child)).join('') : '';
      return `<ul>${listItems}</ul>`;
    
    case 'orderedList':
      const orderedItems = node.content ? node.content.map((child: ProseMirrorNode) => convertNodeToHtml(child)).join('') : '';
      return `<ol>${orderedItems}</ol>`;
    
    case 'listItem':
      const itemContent = node.content ? node.content.map((child: ProseMirrorNode) => convertNodeToHtml(child)).join('') : '';
      return `<li>${itemContent}</li>`;
    
    case 'blockquote':
      const quoteContent = node.content ? node.content.map((child: ProseMirrorNode) => convertNodeToHtml(child)).join('') : '';
      return `<blockquote>${quoteContent}</blockquote>`;
    
    case 'codeBlock':
      const codeContent = node.content ? node.content.map((child: ProseMirrorNode) => convertNodeToHtml(child)).join('') : '';
      return `<pre><code>${codeContent}</code></pre>`;
    
    case 'hardBreak':
      return '<br>';
    
    case 'horizontalRule':
      return '<hr>';
    
    default:
      // For unknown node types, try to extract content
      if (node.content && Array.isArray(node.content)) {
        return node.content.map((child: ProseMirrorNode) => convertNodeToHtml(child)).join('');
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

  // Enhanced connection handling with origin validation and connection limits
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
    
    const connectionCount = state.connectedUsers.size;
    console.log(`[${new Date().toISOString()}] Document ${documentName} now has ${connectionCount} connected users`);
    
    // Enhanced connection monitoring and limits
    if (connectionCount > 10) {
      console.error(`[${new Date().toISOString()}] 🚨 CRITICAL: Too many connections for document ${documentName}: ${connectionCount} users. Rejecting connection to prevent server overload.`);
      throw new Error('Too many connections for this document');
    } else if (connectionCount > 5) {
      console.warn(`[${new Date().toISOString()}] ⚠️  High connection count for document ${documentName}: ${connectionCount} users. This may indicate connection leaks.`);
    }
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
    
    // Enhanced debugging - log actual Y.js document state
    console.log(`[${new Date().toISOString()}] 📝 Document ${documentName} changed`);
    
    // Debug Y.js document structure
    try {
      const sharedTypes = Array.from(document.share.keys());
      console.log(`[${new Date().toISOString()}] 🔍 Shared types in onChange:`, sharedTypes);
      
      // Check default fragment specifically
      const defaultFragment = document.getXmlFragment('default');
      console.log(`[${new Date().toISOString()}] 🔍 Default fragment children:`, defaultFragment.length);
      
      if (defaultFragment.length > 0) {
        console.log(`[${new Date().toISOString()}] ✅ Found content in default fragment!`);
        defaultFragment.forEach((child, index) => {
          if (child instanceof Y.XmlElement) {
            console.log(`[${new Date().toISOString()}] 📄 Child ${index}: ${child.nodeName}`);
          } else if (child instanceof Y.XmlText) {
            console.log(`[${new Date().toISOString()}] 📄 Text ${index}: "${child.toString()}"`);
          }
        });
      } else {
        console.log(`[${new Date().toISOString()}] ⚠️ Default fragment is empty in onChange`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error debugging Y.js document:`, error);
    }
    
    // Schedule save after 2 seconds of inactivity (consistent with frontend expectations)
    scheduleDocumentSave(documentName, document);
  },
  
  async onStoreDocument(data: onStoreDocumentPayload) {
    // This is called by Hocuspocus but we're handling saving in onChange
    console.log(`[${new Date().toISOString()}] onStoreDocument called for: ${data.documentName} (handled by onChange)`);
  },
});

void server.listen();