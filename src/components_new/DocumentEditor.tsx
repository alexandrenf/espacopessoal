"use client";

import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { UndoManager } from 'yjs';
import { toast } from 'sonner';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Wifi, 
  WifiOff, 
  Save, 
  AlertCircle,
  File,
  FilePlus,
  FileText,
  FileJson,
  Globe,
  Printer,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Text,
  RemoveFormatting,
  PanelLeft,
  Sparkles,
  Replace,
  Share2
} from 'lucide-react';
import { Button } from './ui/button';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "../components_new/ui/menubar";
import { useRouter } from 'next/navigation';

// TipTap Extensions
import { FontSizeExtension } from "../extensions/font-size";
import { LineHeightExtension } from "../extensions/line-height";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { Heading } from "@tiptap/extension-heading";
import { Highlight } from "@tiptap/extension-highlight";
import { Link as LinkExtension } from "@tiptap/extension-link";
import { validateLinkUrl, createSafeHref } from "../lib/link-security";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { ImageResize } from "tiptap-extension-resize-image";

// Components
import { Ruler } from "./Ruler";
import { Threads } from "./Threads";
import { Toolbar } from "./Toolbar";
import DocumentSidebar from "./DocumentSidebar";
import { SpellCheckSidebar } from "./SpellCheckSidebar";
import { DictionaryModal } from "./DictionaryModal";
import { ReplacementPopup } from "./ReplacementPopup";
import { ShareModal } from "./ShareModal";
import { useEditorStore } from "../store/use-editor-store";
import { LEFT_MARGIN_DEFAULT, RIGHT_MARGIN_DEFAULT } from "../constants/margins";
import { useConvexUser } from "../hooks/use-convex-user";
import { debounce } from 'lodash';

type Document = {
  _id: Id<"documents">;
  title: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  organizationId?: string;
  initialContent?: string;
  roomId?: string;
  parentId?: Id<"documents">;
  order: number;
  isFolder: boolean;
};

interface EditorProps {
  document: Document;
  initialContent?: string | undefined;
  isReadOnly?: boolean;
}

export function DocumentEditor({ document: initialDocument, initialContent, isReadOnly }: EditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const updateDocument = useMutation(api.documents.updateById);
  
  // New state management for document switching
  const [currentDocumentId, setCurrentDocumentId] = useState<Id<"documents">>(initialDocument._id);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  
  // Add refs to track switching state and prevent race conditions
  const isSwitchingRef = useRef(false);
  const pendingDocumentIdRef = useRef<Id<"documents"> | null>(null);
  const switchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get authenticated user with proper error handling
  const { convexUserId, isLoading: isUserLoading } = useConvexUser();
  const userIdString = convexUserId;
  
  // Query for current document
  const currentDocument = useQuery(
    api.documents.getById,
    !isUserLoading && userIdString && currentDocumentId
      ? { id: currentDocumentId, userId: userIdString }
      : "skip"
  );

  // Fallback to initial document if query is loading
  const doc = currentDocument ?? initialDocument;
  
  const [documentTitle, setDocumentTitle] = useState(doc.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [leftMargin, setLeftMargin] = useState(LEFT_MARGIN_DEFAULT);
  const [rightMargin, setRightMargin] = useState(RIGHT_MARGIN_DEFAULT);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [showSidebar, setShowSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showSpellCheck, setShowSpellCheck] = useState(false);
  const [replacementSuggestion, setReplacementSuggestion] = useState<{
    word: string;
    suggestion: string;
    position: { from: number; to: number };
  } | null>(null);
  const [recentlyRejected, setRecentlyRejected] = useState<string | null>(null);
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const undoManagerRef = useRef<UndoManager | null>(null);
  const [isYdocReady, setIsYdocReady] = useState(false);
  const [isPersistenceReady, setIsPersistenceReady] = useState(false);
  const currentDocumentIdRef = useRef<Id<"documents">>(currentDocumentId);
  const documentInstances = useRef<Map<string, Y.Doc>>(new Map());
  
  // Add a limit to cached documents to prevent memory leaks
  const MAX_CACHED_DOCUMENTS = 5;
  const documentAccessOrder = useRef<string[]>([]);
  
  // Enhanced cleanup function with memory leak prevention
  const cleanupOldDocuments = useCallback(() => {
    if (documentInstances.current.size > MAX_CACHED_DOCUMENTS) {
      // Remove least recently used documents with proper error handling
      while (documentInstances.current.size > MAX_CACHED_DOCUMENTS && documentAccessOrder.current.length > 0) {
        const oldestDocId = documentAccessOrder.current.shift();
        if (oldestDocId && oldestDocId !== currentDocumentId) {
          const oldDoc = documentInstances.current.get(oldestDocId);
          if (oldDoc) {
            try {
              console.log('🧹 Cleaning up old Y.js document:', oldestDocId);
              oldDoc.destroy();
              documentInstances.current.delete(oldestDocId);
            } catch (error) {
              console.error(`Error cleaning up document ${oldestDocId}:`, error);
              // Force removal even if destroy fails
              documentInstances.current.delete(oldestDocId);
            }
          }
        }
      }
    }
    
    // Additional cleanup: remove any orphaned entries
    for (const [docId, doc] of documentInstances.current.entries()) {
      if (docId !== currentDocumentId) {
        try {
          // Check if document is still valid
          if (!doc || typeof doc.destroy !== 'function') {
            console.log('🧹 Removing invalid document instance:', docId);
            documentInstances.current.delete(docId);
          }
        } catch (error) {
          console.error(`Error checking document ${docId}:`, error);
          documentInstances.current.delete(docId);
        }
      }
    }
  }, [currentDocumentId]);
  
  // Use Convex API for dictionary functionality with real user authentication
  const dictionaryQuery = useQuery(
    api.dictionary.getDictionary, 
    userIdString ? { userId: userIdString } : "skip"
  );
  const dictionary = useMemo(() => dictionaryQuery ?? [], [dictionaryQuery]);

  // Update document title when document changes
  useEffect(() => {
    if (doc && doc.title !== documentTitle) {
      setDocumentTitle(doc.title);
    }
  }, [doc, documentTitle]);

  // Handle document query errors
  useEffect(() => {
    if (currentDocument === null && currentDocumentId !== initialDocument._id) {
      toast.error("Document not found. Switching back to original document.");
      setCurrentDocumentId(initialDocument._id);
    } else if (currentDocument && isLoadingDocument) {
      // Document loaded successfully
      setIsLoadingDocument(false);
      toast.success("Document loaded successfully");
    }
  }, [currentDocument, currentDocumentId, initialDocument._id, isLoadingDocument]);

  // Update URL when document changes without navigation
  useEffect(() => {
    // URL update is now handled in handleDocumentSwitch to prevent race conditions
    // if (currentDocumentId !== initialDocument._id && isMounted) {
    //   const newUrl = `/documents/${currentDocumentId}`;
    //   window.history.pushState({ documentId: currentDocumentId }, '', newUrl);
    // }
    currentDocumentIdRef.current = currentDocumentId;
  }, [currentDocumentId, initialDocument._id, isMounted]);

  // Browser navigation handling moved after handleDocumentSwitch declaration to fix dependency order

  // Set mounted state to handle router mounting with comprehensive cleanup
  useEffect(() => {
    setIsMounted(true);
    
    // Component cleanup on unmount - enhanced memory management
    return () => {
      console.log('🧹 Component unmounting, cleaning up Y.js documents and connections');
      
      // Clear all timeouts to prevent memory leaks
      if (switchTimeoutRef.current) {
        clearTimeout(switchTimeoutRef.current);
        switchTimeoutRef.current = null;
      }
      
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
        suggestionTimeoutRef.current = null;
      }
      
      // Clean up editor state
      setUndoManager(null);
      setEditor(null);
      
      // Destroy WebSocket provider with proper cleanup
      if (providerRef.current) {
        try {
          providerRef.current.disconnect();
          providerRef.current.destroy();
        } catch (error) {
          console.error('Error destroying provider:', error);
        }
        providerRef.current = null;
      }
      
      // Clean up all document instances with error handling
      for (const [docId, ydoc] of documentInstances.current.entries()) {
        try {
          console.log('🧹 Destroying Y.js document for:', docId);
          ydoc.destroy();
        } catch (error) {
          console.error(`Error destroying Y.js document ${docId}:`, error);
        }
      }
      documentInstances.current.clear();
      documentAccessOrder.current = [];
      
      // Reset all state to prevent memory leaks
      setIsYdocReady(false);
      setIsPersistenceReady(false);
      setStatus('disconnected');
    };
  }, []);

  // Initialize Y.js document first
  useEffect(() => {
    if (!ydocRef.current) {
      ydocRef.current = new Y.Doc();
      console.log('📄 Y.js document initialized');
    }
    setIsYdocReady(true);
  }, []);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setShowSidebar(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const { setEditor, setUndoManager } = useEditorStore();

  // Menu actions
  const onSaveJSON = () => {
    if (!editor) return;
    const content = editor.getJSON();
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onSaveHTML = () => {
    if (!editor) return;
    const content = editor.getHTML();
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onSaveText = () => {
    if (!editor) return;
    const content = editor.getText();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onNewDocument = () => {
    window.open('/', '_blank');
  };

  const insertTable = ({ rows, cols }: { rows: number; cols: number }) => {
    editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: false }).run();
  };

  // Memoize base extensions to prevent recreation on every render
  const baseExtensions = useMemo(() => [
    StarterKit.configure({
      history: false,
      heading: false,
      // Explicitly ensure list extensions are enabled
      bulletList: {
        HTMLAttributes: {
          class: 'bullet-list',
        },
      },
      orderedList: {
        HTMLAttributes: {
          class: 'ordered-list',
        },
      },
      listItem: {
        HTMLAttributes: {
          class: 'list-item',
        },
      },
    }),
    // Add Heading extension after StarterKit to ensure it works properly
    Heading.configure({
      levels: [1, 2, 3, 4, 5, 6],
      HTMLAttributes: {
        class: 'heading',
      },
    }),
    // Add TaskList and TaskItem extensions
    TaskList.configure({
      HTMLAttributes: {
        class: 'task-list',
      },
    }),
    TaskItem.configure({ 
      nested: true,
      HTMLAttributes: {
        class: 'task-item',
      },
    }),
    Table.configure({
      resizable: true,
      handleWidth: 5,
      cellMinWidth: 50,
    }),
    TableCell.configure({
      HTMLAttributes: {
        class: 'border border-gray-300 p-2',
      },
    }),
    TableHeader.configure({
      HTMLAttributes: {
        class: 'border border-gray-300 p-2 bg-gray-100 font-bold',
      },
    }),
    TableRow.configure({
      HTMLAttributes: {
        class: 'border-b border-gray-300',
      },
    }),
    ImageResize,
    Underline,
    FontFamily,
    TextStyle,
    Highlight.configure({ 
      multicolor: true,
      HTMLAttributes: {
        class: 'highlight',
      },
    }),
    Color.configure({
      types: ['textStyle'],
    }),
    LinkExtension.extend({
      renderHTML({ HTMLAttributes }) {
        const href = HTMLAttributes.href as string;
        const safeHref = createSafeHref(href);
        
        return [
          'a',
          {
            ...HTMLAttributes,
            href: safeHref,
          },
          0,
        ];
      },
      
      addCommands() {
        return {
          ...this.parent?.(),
          setLink: (attributes) => ({ commands }) => {
            if (attributes.href && !validateLinkUrl(attributes.href)) {
              console.warn('Blocked attempt to set unsafe URL:', attributes.href);
              return false;
            }
            
            const sanitizedAttributes = {
              ...attributes,
              href: attributes.href ? createSafeHref(attributes.href) : attributes.href,
            };
            
            return commands.setMark(this.name, sanitizedAttributes);
          },
        };
      },
    }).configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
      validate: (url: string) => Boolean(validateLinkUrl(url)),
      HTMLAttributes: {
        class: 'text-blue-600 underline cursor-pointer',
        rel: 'noopener noreferrer',
        target: '_blank',
      },
    }),
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    FontSizeExtension,
    LineHeightExtension,
  ], []); // Empty dependency array since these are static configurations

  // Enhanced WebSocket and Y.js integration - always create editor with basic extensions
  const editor = useEditor({
    autofocus: !isReadOnly,
    immediatelyRender: false,
    editable: !isReadOnly,
    onCreate({ editor }) {
      setEditor(editor);
      console.log('📝 Editor created for document:', currentDocumentId);
    },
    onDestroy() {
      setEditor(null);
      console.log('📝 Editor destroyed for document:', currentDocumentId);
    },
    onUpdate({ editor, transaction }) {
      setEditor(editor);
      if (transaction.docChanged) {
        console.log('📝 Document content changed - server will handle saving');
      }
    },
    onSelectionUpdate({ editor }) {
      setEditor(editor);
    },
    onTransaction({ editor }) {
      setEditor(editor);
    },
    onFocus({ editor }) {
      setEditor(editor);
    },
    onBlur({ editor }) {
      setEditor(editor);
    },
    onContentError({ editor }) {
      setEditor(editor);
      console.error('📝 Editor content error for document:', currentDocumentId);
    },
    editorProps: {
      attributes: {
        style: `padding-left: ${leftMargin}px; padding-right: ${rightMargin}px;`,
        class: `focus:outline-none print:border-0 bg-white border border-[#C7C7C7] flex flex-col min-h-[1054px] w-[816px] pt-10 pr-14 pb-10 cursor-text`,
      },
    },
    extensions: useMemo(() => [
      ...baseExtensions,
      // Only add Collaboration when Y.js document is ready
      ...(isYdocReady && ydocRef.current ? [
        Collaboration.configure({
          document: ydocRef.current,
        }),
      ] : []),
    ], [baseExtensions, isYdocReady]),
  }, [isYdocReady, leftMargin, rightMargin, isReadOnly, currentDocumentId]);

  // Functions that use editor - must be defined after editor is declared
  const rejectReplacement = useCallback(() => {
    if (replacementSuggestion) {
      setRecentlyRejected(replacementSuggestion.word);
    }
    setReplacementSuggestion(null);
    
    // Clear the timeout when rejecting
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
      suggestionTimeoutRef.current = null;
    }
  }, [replacementSuggestion]);

  // Enhanced document switching function with proper synchronization
  const handleDocumentSwitch = useCallback(async (newDocumentId: Id<"documents">) => {
    // Prevent switching to the same document
    if (newDocumentId === currentDocumentId) {
      console.log('🔄 Ignoring switch to same document:', newDocumentId);
      return;
    }
    
    // Prevent multiple simultaneous switches
    if (isSwitchingRef.current) {
      console.log('🔄 Switch in progress, queuing:', newDocumentId);
      // Queue the switch for later
      pendingDocumentIdRef.current = newDocumentId;
      return;
    }
    
    // Clear any pending switch timeout
    if (switchTimeoutRef.current) {
      clearTimeout(switchTimeoutRef.current);
      switchTimeoutRef.current = null;
    }
    
    // Debounce rapid switches with longer delay for stability
    switchTimeoutRef.current = setTimeout(() => {
      void (async () => {
        isSwitchingRef.current = true;
        setIsLoadingDocument(true);
        
        console.log('🔄 Starting document switch from:', currentDocumentId, 'to:', newDocumentId);
        
        try {
          // Step 1: Clean up current editor state
          if (editor) {
            console.log('🔄 Clearing editor content for clean switch');
            editor.commands.clearContent();
          }
          
          // Step 2: Clean up current provider connection immediately
          if (providerRef.current) {
            console.log('🔄 Disconnecting current provider:', providerRef.current.configuration.name);
            await new Promise<void>((resolve) => {
              const currentProvider = providerRef.current;
              if (currentProvider) {
                currentProvider.disconnect();
                // Wait for disconnect to complete
                setTimeout(() => {
                  currentProvider.destroy();
                  resolve();
                }, 100);
              } else {
                resolve();
              }
            });
            providerRef.current = null;
          }
          
          // Step 3: Reset Y.js document ready state
          setIsYdocReady(false);
          setIsPersistenceReady(false);
          
          // Step 4: Update the document ID state - this will trigger the useEffect to handle Y.js document switching
          setCurrentDocumentId(newDocumentId);
          
          // Step 5: Update browser URL without causing navigation
          const newUrl = `/documents/${newDocumentId}`;
          window.history.pushState({ documentId: newDocumentId }, '', newUrl);
          
          console.log('🔄 Document switch state updated, waiting for Y.js connection...');
          
        } catch (error) {
          console.error('🔄 Error during document switch:', error);
          const errorMessage = error instanceof Error ? error.message : "Failed to switch document";
          toast.error(errorMessage);
          
          // Reset switching state on error
          isSwitchingRef.current = false;
          setIsLoadingDocument(false);
        }
      })();
    }, 200); // Debounce time for stability
  }, [currentDocumentId, editor]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && typeof event.state === 'object' && 'documentId' in event.state) {
        const state = event.state as { documentId: unknown };
        const documentId = state.documentId;
        if (typeof documentId === 'string' && documentId !== currentDocumentId) {
          // Use the document switch handler to properly switch documents
          void handleDocumentSwitch(documentId as Id<"documents">);
        }
      } else if (!event.state && window.location.pathname.startsWith('/documents/')) {
        // Handle direct URL navigation
        const pathParts = window.location.pathname.split('/');
        const docIdFromUrl = pathParts[pathParts.length - 1];
        if (docIdFromUrl && docIdFromUrl !== currentDocumentId) {
          void handleDocumentSwitch(docIdFromUrl as Id<"documents">);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Handle initial page load with document ID in URL
    if (isMounted && window.location.pathname.startsWith('/documents/')) {
      const pathParts = window.location.pathname.split('/');
      const docIdFromUrl = pathParts[pathParts.length - 1];
      if (docIdFromUrl && docIdFromUrl !== currentDocumentId && docIdFromUrl !== initialDocument._id) {
        // Set initial state for browser history
        window.history.replaceState({ documentId: docIdFromUrl }, '', window.location.pathname);
      }
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentDocumentId, handleDocumentSwitch, isMounted, initialDocument._id]);

  const acceptReplacement = useCallback(() => {
    if (!editor || !replacementSuggestion) return;
    
    editor
      .chain()
      .focus()
      .insertContentAt(
        { from: replacementSuggestion.position.from, to: replacementSuggestion.position.to }, 
        replacementSuggestion.suggestion
      )
      .run();
    
    setReplacementSuggestion(null);
    
    // Clear the timeout when accepting
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
      suggestionTimeoutRef.current = null;
    }
  }, [editor, replacementSuggestion]);

  const handleTextReplace = useCallback(() => {
    if (!editor || !dictionary || dictionary.length === 0) return;
    
    const pos = editor.state.selection.from;
    const textBefore = editor.state.doc.textBetween(0, pos, ' ');
    const match = /\S+$/.exec(textBefore);
    if (!match) return;
    
    const lastWord = match[0];
    const entry = dictionary.find(
      (e: { from: string; to: string }) => e.from === lastWord || (lastWord.startsWith('@') && e.from === lastWord.slice(1))
    );
    
    if (entry && lastWord !== recentlyRejected) {
      setReplacementSuggestion({
        word: lastWord,
        suggestion: entry.to,
        position: { from: pos - lastWord.length, to: pos },
      });
      
      // Clear any existing timeout
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
      
      // Set new timeout
      suggestionTimeoutRef.current = setTimeout(() => {
        acceptReplacement();
      }, 2000);
    }
  }, [editor, dictionary, recentlyRejected, acceptReplacement]);

  useEffect(() => {
    // Get or create Y.js document for this specific document ID
    const docName = currentDocumentId;
    let ydoc = documentInstances.current.get(docName);
    
    // Always create a fresh Y.js document for each switch to avoid confusion
    // This prevents content from one document appearing in another
    if (ydoc) {
      console.log('📄 Destroying existing Y.js document for clean switch:', docName);
      ydoc.destroy();
      documentInstances.current.delete(docName);
    }
    
    // Create new Y.js document
    ydoc = new Y.Doc();
    documentInstances.current.set(docName, ydoc);
    documentAccessOrder.current.push(docName);
    console.log('📄 Fresh Y.js document created for:', docName);
    
    // Clean up old documents after creating a new one
    cleanupOldDocuments();
    
    ydocRef.current = ydoc;
    
    // Ensure WebSocket URL is properly configured - no fallback for production safety
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    
    if (!wsUrl) {
      console.error('WebSocket URL not configured. Please set NEXT_PUBLIC_WS_URL environment variable.');
      toast.error('WebSocket configuration missing. Real-time collaboration unavailable.');
      setIsYdocReady(true); // Still allow editor to work without collaboration
      return;
    }
    
    console.log('🔗 Connecting to WebSocket:', wsUrl);
    console.log('📄 Document ID:', docName);
    
    // Reset persistence ready state for new document
    setIsPersistenceReady(false);
    
    const persistence = new IndexeddbPersistence(docName, ydocRef.current);
    
    persistence.on('update', () => {
      console.log('📦 Document loaded from IndexedDB');
    });
    
    // Wait for IndexedDB to fully load before allowing initial content setting
    persistence.on('synced', () => {
      console.log('📦 IndexedDB fully synchronized for:', docName);
      // Only set persistence ready if this is still the current document
      if (currentDocumentIdRef.current === docName) {
        setIsPersistenceReady(true);
      }
    });

    const newProvider = new HocuspocusProvider({
      url: wsUrl,
      name: docName,
      document: ydocRef.current,
    });

    providerRef.current = newProvider;

    // Initialize undo manager with fresh document reference
    const undoManager = new UndoManager(ydocRef.current.getXmlFragment('default'), {
      captureTimeout: 1000,
    });
    undoManagerRef.current = undoManager;
    setUndoManager(undoManager);

    newProvider.on('status', (event: { status: string }) => {
      // Verify this event is for the current document
      if (newProvider.configuration.name !== currentDocumentId) {
        console.log('📡 Ignoring status event for old document:', newProvider.configuration.name);
        return;
      }
      
      console.log('📡 Provider status for', docName, ':', event.status);
      const validStatuses = ['connecting', 'connected', 'disconnected', 'error'] as const;
      const statusValue = (validStatuses as readonly string[]).includes(event.status) 
        ? (event.status as typeof validStatuses[number])
        : 'disconnected';
      setStatus(statusValue);
      
      if (event.status === 'connected' && isLoadingDocument) {
        // Only show success message if we're actively switching documents
        toast.success("Connected to real-time collaboration");
        // Mark document switching as complete
        if (isSwitchingRef.current) {
          setTimeout(() => {
            isSwitchingRef.current = false;
            setIsLoadingDocument(false);
            
            // Check if there's a pending switch
            if (pendingDocumentIdRef.current && pendingDocumentIdRef.current !== docName) {
              const pendingId = pendingDocumentIdRef.current;
              pendingDocumentIdRef.current = null;
              console.log('🔄 Executing pending document switch to:', pendingId);
              void handleDocumentSwitch(pendingId);
            }
          }, 100);
        }
      }
    });

    newProvider.on('connect', () => {
      // Verify this event is for the current document
      if (newProvider.configuration.name !== currentDocumentId) {
        console.log('✅ Ignoring connect event for old document:', newProvider.configuration.name);
        return;
      }
      
      console.log('✅ WebSocket connected successfully for:', docName);
      setStatus('connected');
    });

    newProvider.on('disconnect', ({ event }: { event: CloseEvent }) => {
      console.log('❌ WebSocket disconnected:', event.code, event.reason);
      setStatus('disconnected');
      
      // Only show error for unexpected disconnections
      if (event.code === 1006) {
        console.log("Connection lost, provider will attempt to reconnect automatically");
      }
    });

    newProvider.on('close', ({ event }: { event: CloseEvent }) => {
      console.log('🔒 WebSocket closed:', event.code, event.reason);
      setStatus('disconnected');
    });

    newProvider.on('error', (error: Error) => {
      console.error('💥 WebSocket error occurred:', error);
      setStatus('error');
      // Don't show error toast for every error, let the status indicator handle it
    });

    // Add reconnection handler
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;
    
    newProvider.on('reconnect', () => {
      reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect... (${reconnectAttempts}/${maxReconnectAttempts})`);
      
      if (reconnectAttempts === maxReconnectAttempts) {
        toast.error("Unable to establish connection. Please check your internet connection and refresh the page.");
      }
    });
    
    newProvider.on('reconnected', () => {
      reconnectAttempts = 0;
      console.log('🔄 Reconnected successfully!');
      toast.success("Reconnected to collaboration server");
    });

    setIsYdocReady(true);

    return () => {
      console.log('🧹 Cleaning up provider connection for document:', docName);
      
      // Reset persistence ready state when cleaning up
      setIsPersistenceReady(false);
      
      // Immediately destroy the provider if we're switching to a different document
      if (providerRef.current && currentDocumentIdRef.current !== docName) {
        console.log('🧹 Destroying provider for old document:', docName);
        providerRef.current.disconnect();
        providerRef.current.destroy();
      }
    };
  }, [currentDocumentId, cleanupOldDocuments, isLoadingDocument, handleDocumentSwitch]);

  // Optimized content setting with debounced retries and proper cleanup
  const debouncedSetContent = useCallback(
    debounce((content: string, retryCount = 0) => {
      if (!editor || !editor.isEditable || retryCount >= 5) {
        if (retryCount >= 5) {
          console.warn('Content setting failed after maximum retries for document:', currentDocumentId);
        }
        return;
      }
      
      try {
        if (editor.isEmpty) {
          console.log('📄 Setting initial content for:', currentDocumentId);
          editor.commands.clearContent();
          editor.commands.setContent(content);
          editor.commands.focus('start');
        } else {
          // Retry with exponential backoff
          setTimeout(() => {
            debouncedSetContent(content, retryCount + 1);
          }, Math.min(100 * (retryCount + 1), 1000));
        }
      } catch (error) {
        console.error('Error setting content:', error);
      }
    }, 100),
    [editor, currentDocumentId]
  );

  // Enhanced content setting logic with proper synchronization
  useEffect(() => {
    if (!editor || !isYdocReady || !ydocRef.current || !isPersistenceReady) {
      return;
    }
    
    const contentToSet = doc.initialContent ?? initialContent;
    if (!contentToSet) {
      return;
    }

    // Check if the Y.js document already has content from collaboration/IndexedDB
    const fragment = ydocRef.current.getXmlFragment('default');
    const hasCollaborativeContent = fragment.length > 0;
    
    if (hasCollaborativeContent) {
      console.log('📄 Document already has collaborative content, skipping initial content setting for:', currentDocumentId);
      return;
    }

    // Use debounced content setting to prevent excessive retries
    debouncedSetContent(contentToSet);
    
    // Cleanup function to cancel pending debounced calls
    return () => {
      debouncedSetContent.cancel();
    };
  }, [editor, isYdocReady, isPersistenceReady, doc.initialContent, initialContent, currentDocumentId, debouncedSetContent]);

  // Fix: Properly handle useEffect dependencies and cleanup
  useEffect(() => {
    if (!editor) return;
    
    const handleUpdate = () => {
      handleTextReplace();
    };
    
    const dom = editor.view.dom;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === ' ' &&
        replacementSuggestion &&
        replacementSuggestion.word !== recentlyRejected
      ) {
        e.preventDefault();
        acceptReplacement();
        return;
      }
      if (e.key === ' ') {
        setRecentlyRejected(null);
      }
    };
    
    editor.on('update', handleUpdate);
    dom.addEventListener('keydown', handleKeyDown);
    
    return () => {
      editor.off('update', handleUpdate);
      dom.removeEventListener('keydown', handleKeyDown);
      
      // Fix: Clear timeout on cleanup
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
        suggestionTimeoutRef.current = null;
      }
    };
  }, [editor, handleTextReplace, acceptReplacement, replacementSuggestion, recentlyRejected]);

  // Enhanced title handling
  const handleTitleSubmit = async () => {
    if (documentTitle.trim() && documentTitle !== doc.title) {
      if (!userIdString) {
        toast.error("Please wait for authentication to complete");
        return;
      }
      
      try {
        await updateDocument({ 
          id: doc._id, 
          title: documentTitle.trim(),
          userId: userIdString
        });
        toast.success("Document title updated!");
      } catch {
        toast.error("Failed to update title");
        setDocumentTitle(doc.title);
      }
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setDocumentTitle(doc.title);
      setIsEditingTitle(false);
    }
  };

  const handleForceSave = () => {
    toast.info("Documents are automatically saved by the server after 2 seconds of inactivity");
  };

  const handleToggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // Safe router navigation functions - modified to use document switching
  const safeNavigate = (path: string) => {
    if (path.startsWith('/documents/')) {
      const documentId = path.split('/documents/')[1];
      if (documentId && documentId !== currentDocumentId) {
        void handleDocumentSwitch(documentId as Id<"documents">);
      }
    } else {
      // For non-document paths, use normal navigation
      if (isMounted && router) {
        try {
          void router.push(path);
        } catch (error) {
          console.error('Router navigation failed:', error);
          if (typeof window !== 'undefined') {
            window.location.href = path;
          }
        }
      } else {
        if (typeof window !== 'undefined') {
          window.location.href = path;
        }
      }
    }
  };

  const handleNavigateToHome = () => {
    safeNavigate('/');
  };

  const handleSetCurrentDocument = (documentId: Id<"documents">) => {
    void handleDocumentSwitch(documentId);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'connecting':
        return <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Offline';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  if (!editor || isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {isUserLoading ? "Loading user session..." : "Loading collaborative editor..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FBFD] flex">
      {/* Loading overlay for document switching */}
      {isLoadingDocument && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              Loading document...
            </p>
          </div>
        </div>
      )}
      
      {/* Sidebar */}
      {showSidebar && (
        <div className={`${isMobile ? 'fixed inset-0 z-50 bg-white' : 'w-80 border-r bg-white'}`}>
          <DocumentSidebar
            currentDocument={doc}
            setCurrentDocumentId={handleSetCurrentDocument}
            onToggleSidebar={handleToggleSidebar}
            showSidebar={showSidebar}
            isMobile={isMobile}
            onNavigateToHome={handleNavigateToHome}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Enhanced header with better status indicators */}
        <header className="border-b bg-white px-4 py-3">
          <div className="max-w-6xl mx-auto">
            {/* Title and controls row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                {!showSidebar && (
                  <Button variant="ghost" size="icon" onClick={handleToggleSidebar}>
                    <PanelLeft className="h-4 w-4" />
                  </Button>
                )}
                {!showSidebar && (
                  <Button variant="ghost" size="icon" asChild>
                    <Link href="/">
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    onBlur={() => void handleTitleSubmit()}
                    onKeyDown={handleTitleKeyDown}
                    className="text-lg font-semibold bg-transparent border-none outline-none focus:bg-gray-50 px-2 py-1 rounded"
                    autoFocus
                  />
                ) : (
                  <h1 
                    className="text-lg font-semibold cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                    onClick={() => setIsEditingTitle(true)}
                  >
                    {documentTitle}
                  </h1>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                {/* Enhanced connection status */}
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  status === 'connected' 
                    ? 'bg-green-100 text-green-800' 
                    : status === 'connecting'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {getStatusIcon()}
                  <span>{getStatusText()}</span>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleForceSave}
                  className="text-xs"
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save Info
                </Button>
                
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                  {doc.ownerId.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
            
            {/* Menu bar row */}
            <div className="flex">
              <Menubar className="border-none bg-transparent shadow-none h-auto p-0">
                {!isReadOnly && (
                  <>
                    <MenubarMenu>
                      <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                        Arquivo
                      </MenubarTrigger>
                      <MenubarContent className="print:hidden">
                        <MenubarSub>
                          <MenubarSubTrigger>
                            <File className="size-4 mr-2" />
                            Exportar
                          </MenubarSubTrigger>
                          <MenubarSubContent>
                            <MenubarItem onClick={onSaveJSON}>
                              <FileJson className="size-4 mr-2" />
                              JSON
                            </MenubarItem>
                            <MenubarItem onClick={onSaveHTML}>
                              <Globe className="size-4 mr-2" />
                              HTML
                            </MenubarItem>
                            <MenubarItem onClick={() => window.print()}>
                              <Printer className="size-4 mr-2" />
                              PDF
                            </MenubarItem>
                            <MenubarItem onClick={onSaveText}>
                              <FileText className="size-4 mr-2" />
                              Text
                            </MenubarItem>
                          </MenubarSubContent>
                        </MenubarSub>
                        <MenubarItem onClick={onNewDocument}>
                          <FilePlus className="size-4 mr-2" />
                          Novo documento
                        </MenubarItem>
                        <MenubarSeparator />
                        {userIdString && (
                          <MenubarItem onClick={() => setIsShareModalOpen(true)}>
                            <Share2 className="size-4 mr-2" />
                            Compartilhar
                          </MenubarItem>
                        )}
                        <MenubarItem onClick={() => window.print()}>
                          <Printer className="size-4 mr-2" />
                          Imprimir <MenubarShortcut>Ctrl+P</MenubarShortcut>
                        </MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                    <MenubarMenu>
                      <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                        Editar
                      </MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem
                          onClick={() => editor?.chain().focus().undo().run()}
                        >
                          <Undo2 className="size-4 mr-2" />
                          Desfazer <MenubarShortcut>Ctrl+Z</MenubarShortcut>
                        </MenubarItem>
                        <MenubarItem
                          onClick={() => editor?.chain().focus().redo().run()}
                        >
                          <Redo2 className="size-4 mr-2" />
                          Refazer <MenubarShortcut>Ctrl+Y</MenubarShortcut>
                        </MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                    <MenubarMenu>
                      <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                        Inserir
                      </MenubarTrigger>
                      <MenubarContent>
                        <MenubarSub>
                          <MenubarSubTrigger>Tabela</MenubarSubTrigger>
                          <MenubarSubContent>
                            <MenubarItem
                              onClick={() => insertTable({ rows: 1, cols: 1 })}
                            >
                              1x1
                            </MenubarItem>
                            <MenubarItem
                              onClick={() => insertTable({ rows: 2, cols: 2 })}
                            >
                              2x2
                            </MenubarItem>
                            <MenubarItem
                              onClick={() => insertTable({ rows: 3, cols: 3 })}
                            >
                              3x3
                            </MenubarItem>
                            <MenubarItem
                              onClick={() => insertTable({ rows: 4, cols: 4 })}
                            >
                              4x4
                            </MenubarItem>
                          </MenubarSubContent>
                        </MenubarSub>
                      </MenubarContent>
                    </MenubarMenu>
                    <MenubarMenu>
                      <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                        Formatar
                      </MenubarTrigger>
                      <MenubarContent>
                        <MenubarSub>
                          <MenubarSubTrigger>
                            <Text className="size-4 mr-2" />
                            Texto
                          </MenubarSubTrigger>
                          <MenubarSubContent>
                            <MenubarItem
                              onClick={() =>
                                editor?.chain().focus().toggleBold().run()
                              }
                            >
                              <Bold className="size-4 mr-2" />
                              Negrito <MenubarShortcut>Ctrl+B</MenubarShortcut>
                            </MenubarItem>
                            <MenubarItem
                              onClick={() =>
                                editor?.chain().focus().toggleItalic().run()
                              }
                            >
                              <Italic className="size-4 mr-2" />
                              Itálico <MenubarShortcut>Ctrl+I</MenubarShortcut>
                            </MenubarItem>
                            <MenubarItem
                              onClick={() =>
                                editor?.chain().focus().toggleUnderline().run()
                              }
                            >
                              <UnderlineIcon className="size-4 mr-2" />
                              Sublinhado <MenubarShortcut>Ctrl+U</MenubarShortcut>
                            </MenubarItem>
                            <MenubarItem
                              onClick={() =>
                                editor?.chain().focus().toggleStrike().run()
                              }
                            >
                              <Strikethrough className="size-4 mr-2" />
                              Tachado
                            </MenubarItem>
                          </MenubarSubContent>
                        </MenubarSub>
                        <MenubarItem
                          onClick={() =>
                            editor?.chain().focus().unsetAllMarks().run()
                          }
                        >
                          <RemoveFormatting className="size-4 mr-2" />
                          Remover formatação
                        </MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                    <MenubarMenu>
                      <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                        Ferramentas
                      </MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem
                          onClick={() => setShowSpellCheck(true)}
                        >
                          <Sparkles className="size-4 mr-2" />
                          Verificação Ortográfica
                        </MenubarItem>
                        {userIdString && (
                          <MenubarItem onClick={() => setIsDictionaryOpen(true)}>
                            <Replace className="size-4 mr-2" />
                            Dicionário
                          </MenubarItem>
                        )}
                      </MenubarContent>
                    </MenubarMenu>
                  </>
                )}
              </Menubar>
            </div>
          </div>
        </header>

        {/* Editor Container */}
        <div className="size-full overflow-x-auto bg-[#F9FBFD] px-4 print:p-0 print:bg-white print:overflow-visible">
          <div className="max-w-[816px] mx-auto">
            <Toolbar />
          </div>
          <Ruler 
            leftMargin={leftMargin}
            rightMargin={rightMargin}
            onLeftMarginChange={setLeftMargin}
            onRightMarginChange={setRightMargin}
          />
          <div className="min-w-max flex justify-center w-[816px] py-4 print:py-0 mx-auto print:w-full print:min-w-0">
            {/* Loading overlay for connection issues */}
            {status !== 'connected' && status !== 'connecting' && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-red-600 mb-1">
                    {status === 'error' ? 'Connection Error' : 'Offline Mode'}
                  </p>
                  <p className="text-xs text-gray-600">
                    Real-time collaboration unavailable
                  </p>
                </div>
              </div>
            )}
            <EditorContent editor={editor} />
            <Threads editor={editor} />
          </div>
        </div>
      </div>

      {userIdString && (
        <DictionaryModal
          isOpen={isDictionaryOpen}
          onClose={() => setIsDictionaryOpen(false)}
          isPrivate={true} // Use private mode for authenticated users
          session={{ user: { id: userIdString } }} // Use real authenticated session
          createdById={userIdString}
        />
      )}

      {userIdString && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          documentId={doc._id}
          userId={userIdString}
        />
      )}

      {replacementSuggestion && (
        <ReplacementPopup
          word={replacementSuggestion.word}
          replacement={replacementSuggestion.suggestion}
          onAccept={acceptReplacement}
          onReject={rejectReplacement}
        />
      )}

      {/* Spell Check Sidebar */}
      <SpellCheckSidebar
        editor={editor}
        isOpen={showSpellCheck}
        onClose={() => setShowSpellCheck(false)}
      />
    </div>
  );
} 