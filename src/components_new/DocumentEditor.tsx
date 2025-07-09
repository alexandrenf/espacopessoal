"use client";

import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
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
  FilePen,
  FileText,
  FileJson,
  Globe,
  Printer,
  Trash,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Text,
  RemoveFormatting,
  Menu,
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
  const mutation = useMutation(api.documents.updateById);
  const updateDocument = useMutation(api.documents.updateById);
  const create = useMutation(api.documents.create);
  
  // New state management for document switching
  const [currentDocumentId, setCurrentDocumentId] = useState<Id<"documents">>(initialDocument._id);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  
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
  const [isSpellCheckOpen, setIsSpellCheckOpen] = useState(false);
  const [showSpellCheck, setShowSpellCheck] = useState(false);
  const [replacementSuggestion, setReplacementSuggestion] = useState<{
    word: string;
    suggestion: string;
    position: { from: number; to: number };
  } | null>(null);
  const [recentlyRejected, setRecentlyRejected] = useState<string | null>(null);
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorStore = useEditorStore();
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const undoManagerRef = useRef<UndoManager | null>(null);
  const [isYdocReady, setIsYdocReady] = useState(false);
  const currentDocumentIdRef = useRef<Id<"documents">>(currentDocumentId);
  
  // Use Convex API for dictionary functionality with real user authentication
  const dictionary = useQuery(
    api.dictionary.getDictionary, 
    userIdString ? { userId: userIdString } : "skip"
  ) ?? [];

  // Update document title when document changes
  useEffect(() => {
    if (doc && doc.title !== documentTitle) {
      setDocumentTitle(doc.title);
    }
  }, [doc?.title]);

  // Handle document query errors
  useEffect(() => {
    if (currentDocument === null && currentDocumentId !== initialDocument._id) {
      setDocumentError("Document not found");
      toast.error("Document not found. Switching back to original document.");
      setCurrentDocumentId(initialDocument._id);
    }
  }, [currentDocument, currentDocumentId, initialDocument._id]);

  // Update URL when document changes without navigation
  useEffect(() => {
    if (currentDocumentId !== initialDocument._id && isMounted) {
      const newUrl = `/documents/${currentDocumentId}`;
      window.history.pushState({ documentId: currentDocumentId }, '', newUrl);
    }
    currentDocumentIdRef.current = currentDocumentId;
  }, [currentDocumentId, initialDocument._id, isMounted]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && typeof event.state === 'object' && 'documentId' in event.state) {
        const state = event.state as { documentId: unknown };
        const documentId = state.documentId;
        if (typeof documentId === 'string') {
          setCurrentDocumentId(documentId as Id<"documents">);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Set mounted state to handle router mounting
  useEffect(() => {
    setIsMounted(true);
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

  // Create base extensions that don't require Y.js
  const baseExtensions = [
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
  ];

  // Enhanced WebSocket and Y.js integration - always create editor with basic extensions
  const editor = useEditor({
    autofocus: !isReadOnly,
    immediatelyRender: false,
    editable: !isReadOnly,
    onCreate({ editor }) {
      setEditor(editor);
    },
    onDestroy() {
      setEditor(null);
    },
    onUpdate({ editor, transaction }) {
      setEditor(editor);
      if (transaction.docChanged) {
        console.log('Document changed - server will handle saving');
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
    },
    editorProps: {
      attributes: {
        style: `padding-left: ${leftMargin}px; padding-right: ${rightMargin}px;`,
        class: `focus:outline-none print:border-0 bg-white border border-[#C7C7C7] flex flex-col min-h-[1054px] w-[816px] pt-10 pr-14 pb-10 cursor-text`,
      },
    },
    extensions: [
      ...baseExtensions,
      // Only add Collaboration when Y.js document is ready
      ...(isYdocReady && ydocRef.current ? [
        Collaboration.configure({
          document: ydocRef.current,
        }),
      ] : []),
    ],
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

  // Efficient document switching function
  const handleDocumentSwitch = useCallback(async (newDocumentId: Id<"documents">) => {
    if (newDocumentId === currentDocumentId) return;
    
    setIsLoadingDocument(true);
    setDocumentError(null);
    
    try {
      // Update the document ID state - this will trigger the useEffect to handle Y.js document switching
      setCurrentDocumentId(newDocumentId);
      
      toast.success("Document switched successfully");
    } catch (error) {
      console.error('Error switching document:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to switch document";
      setDocumentError(errorMessage);
      toast.error(errorMessage);
      
      // Revert to previous document on error
      setCurrentDocumentId(currentDocumentId);
    } finally {
      setIsLoadingDocument(false);
    }
  }, [currentDocumentId]);

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
    // Clean up previous Y.js document and provider
    if (ydocRef.current) {
      ydocRef.current.destroy();
    }
    if (providerRef.current) {
      providerRef.current.destroy();
    }
    
    // Create new Y.js document for current document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    
    const documentName = currentDocumentId;
    
    // Ensure WebSocket URL is properly configured - no fallback for production safety
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    
    if (!wsUrl) {
      console.error('WebSocket URL not configured. Please set NEXT_PUBLIC_WS_URL environment variable.');
      toast.error('WebSocket configuration missing. Real-time collaboration unavailable.');
      setIsYdocReady(true); // Still allow editor to work without collaboration
      return;
    }
    
    console.log('🔗 Connecting to WebSocket:', wsUrl);
    console.log('📄 Document ID:', documentName);
    
    const persistence = new IndexeddbPersistence(documentName, ydoc);
    
    persistence.on('update', () => {
      console.log('📦 Document loaded from IndexedDB');
    });

    const newProvider = new HocuspocusProvider({
      url: wsUrl,
      name: documentName,
      document: ydoc,
    });

    providerRef.current = newProvider;

    const undoManager = new UndoManager(ydoc.getXmlFragment('default'), {
      captureTimeout: 1000,
    });
    undoManagerRef.current = undoManager;
    setUndoManager(undoManager);

    newProvider.on('status', (event: { status: string }) => {
      console.log('📡 Provider status:', event.status);
      const validStatuses = ['connecting', 'connected', 'disconnected', 'error'] as const;
      const statusValue = (validStatuses as readonly string[]).includes(event.status) 
        ? (event.status as typeof validStatuses[number])
        : 'disconnected';
      setStatus(statusValue);
      
      if (event.status === 'connected') {
        toast.success("Connected to real-time collaboration");
      } else if (event.status === 'disconnected') {
        toast.error("Disconnected from collaboration server");
      }
    });

    newProvider.on('connect', () => {
      console.log('✅ WebSocket connected successfully!');
      setStatus('connected');
    });

    newProvider.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setStatus('disconnected');
    });

    newProvider.on('close', () => {
      console.log('🔒 WebSocket closed');
      setStatus('disconnected');
    });

    newProvider.on('error', (error: Error) => {
      console.error('💥 WebSocket error occurred:', error);
      setStatus('error');
      toast.error("Connection error occurred");
    });

    setIsYdocReady(true);

    return () => {
      console.log('🧹 Cleaning up editor and connections');
      
      setUndoManager(null);
      if (newProvider) {
        newProvider.destroy();
      }
      if (ydoc) {
        ydoc.destroy();
      }
    };
  }, [currentDocumentId]);

  // Separate useEffect to handle initial content setting when editor becomes ready
  useEffect(() => {
    if (!editor || !isYdocReady) return;
    
    const contentToSet = doc.initialContent ?? initialContent;
    if (!contentToSet) return;

    // Use editor state to determine when it's truly ready
    const checkEditorReady = () => {
      if (editor.isEmpty && editor.isEditable) {
        editor.commands.setContent(contentToSet);
        return true;
      }
      return false;
    };
    
    // Try immediately, then use requestAnimationFrame with retry limit if needed
    if (!checkEditorReady()) {
      let retryCount = 0;
      const maxRetries = 50; // Limit to prevent infinite loops
      
      const trySetContent = () => {
        if (retryCount >= maxRetries) {
          console.warn('Editor content setting failed after maximum retries');
          return;
        }
        
        retryCount++;
        if (!checkEditorReady()) {
          requestAnimationFrame(trySetContent);
        }
      };
      requestAnimationFrame(trySetContent);
    }
  }, [editor, isYdocReady, doc.initialContent, initialContent]);

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
      } catch (error) {
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