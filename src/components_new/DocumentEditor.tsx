"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { UndoManager } from "yjs";
import { toast } from "sonner";
import Link from "next/link";
import {
  useOptimizedDocument,
  useOptimizedDictionary,
  useOptimizedDocumentMutations,
} from "~/hooks/useOptimizedConvex";
import { api } from "~/trpc/react";
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
  Download,
  Upload,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Text,
  RemoveFormatting,
  PanelLeft,
  Sparkles,
  Replace,
  Share2,
  User,
  Settings,
  LogOut,
  LogIn,
  ChevronDown,
  Menu,
  Home,
  NotebookPen,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
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
import { useRouter } from "next/navigation";
import { signOut, signIn, useSession } from "next-auth/react";
import Image from "next/image";

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
import { SpellCheckSidebar } from "./SpellCheckSidebar";
import { DictionaryModal } from "./DictionaryModal";
import { ReplacementPopup } from "./ReplacementPopup";
import { ShareModal } from "./ShareModal";
import { useEditorStore } from "../store/use-editor-store";
import {
  LEFT_MARGIN_DEFAULT,
  RIGHT_MARGIN_DEFAULT,
} from "../constants/margins";
import { useConvexUser } from "../hooks/use-convex-user";
import { debounce } from "lodash";
import "./DocumentEditor.css";

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
  notebookId?: Id<"notebooks">;
  sessionToken?: string; // For private notebook authentication
  showSidebar?: boolean; // To control minimum margin when sidebar is retracted
}

export function DocumentEditor({
  document: initialDocument,
  initialContent,
  isReadOnly,
  notebookId,
  sessionToken,
  showSidebar = true,
}: EditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  // New state management for document switching
  const [currentDocumentId, setCurrentDocumentId] = useState<Id<"documents">>(
    initialDocument._id,
  );
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);

  // Add refs to track switching state and prevent race conditions
  const isSwitchingRef = useRef(false);
  const pendingDocumentIdRef = useRef<Id<"documents"> | null>(null);
  const switchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get authenticated user with proper error handling
  const { convexUserId, isLoading: isUserLoading } = useConvexUser();

  // Get NextAuth session for user profile info
  const { data: session } = useSession();

  // Get user profile from Convex for updated profile image
  const { data: userProfile } = api.users.getUserProfile.useQuery(undefined, {
    enabled: !!convexUserId,
  });

  // OPTIMIZED: Use consolidated optimized queries instead of individual ones
  const currentDocument = useOptimizedDocument(
    currentDocumentId,
    convexUserId,
    isUserLoading,
  );
  const dictionary = useOptimizedDictionary(convexUserId);
  const {
    update: updateDocument,
    updateInPublic: updateDocumentInPublicNotebook,
  } = useOptimizedDocumentMutations();

  // Fallback to initial document if query is loading
  const doc = currentDocument ?? initialDocument;

  const [documentTitle, setDocumentTitle] = useState(doc.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [leftMargin, setLeftMargin] = useState(LEFT_MARGIN_DEFAULT);
  const [rightMargin, setRightMargin] = useState(RIGHT_MARGIN_DEFAULT);
  const [status, setStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("connecting");
  const [isContentLoading, setIsContentLoading] = useState(false);
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
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const undoManagerRef = useRef<UndoManager | null>(null);
  const [isYdocReady, setIsYdocReady] = useState(false);
  const [isPersistenceReady, setIsPersistenceReady] = useState(false);
  const currentDocumentIdRef = useRef<Id<"documents">>(currentDocumentId);
  const documentInstances = useRef<Map<string, Y.Doc>>(new Map());

  // Y.js document management - each document gets its own Y.js instance
  // Create document immediately with current document ID
  const ydocRef = useRef<Y.Doc>(new Y.Doc());

  // OPTIMIZATION: Enhanced document caching with performance metrics
  const MAX_CACHED_DOCUMENTS = 8; // Increased from 5 for better performance
  const documentAccessOrder = useRef<string[]>([]);
  const documentCacheStats = useRef<{
    hits: number;
    misses: number;
    evictions: number;
  }>({ hits: 0, misses: 0, evictions: 0 });

  // OPTIMIZATION: Enhanced cleanup function with performance metrics
  const cleanupOldDocuments = useCallback(() => {
    if (documentInstances.current.size > MAX_CACHED_DOCUMENTS) {
      // Remove least recently used documents with proper error handling
      while (
        documentInstances.current.size > MAX_CACHED_DOCUMENTS &&
        documentAccessOrder.current.length > 0
      ) {
        const oldestDocId = documentAccessOrder.current.shift();
        if (oldestDocId && oldestDocId !== currentDocumentId) {
          const oldDoc = documentInstances.current.get(oldestDocId);
          if (oldDoc) {
            try {
              if (process.env.NODE_ENV === "development") {
                console.log("🧹 Destroying old Y.js document:", oldestDocId);
              }
              oldDoc.destroy();
              documentInstances.current.delete(oldestDocId);
              documentCacheStats.current.evictions++;
            } catch (error) {
              if (process.env.NODE_ENV === "development") {
                console.error(
                  `Error cleaning up document ${oldestDocId}:`,
                  error,
                );
              }
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
          if (!doc || typeof doc.destroy !== "function") {
            if (process.env.NODE_ENV === "development") {
              console.log("🧹 Removing invalid document instance:", docId);
            }
            documentInstances.current.delete(docId);
          }
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error(`Error checking document ${docId}:`, error);
          }
          documentInstances.current.delete(docId);
        }
      }
    }
  }, [currentDocumentId]);

  // Update document title when document changes (but not when user is editing)
  useEffect(() => {
    if (doc && doc.title !== documentTitle && !isEditingTitle) {
      setDocumentTitle(doc.title);
    }
  }, [doc, documentTitle, isEditingTitle]);

  // Reset switching state when current document successfully loads
  useEffect(() => {
    if (currentDocument && currentDocument._id === currentDocumentId) {
      // Document loaded successfully, ensure switching state is reset
      if (isSwitchingRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "🔄 Document loaded successfully, resetting switching state",
          );
        }
        isSwitchingRef.current = false;
        setIsLoadingDocument(false);
      }
    }
  }, [currentDocument, currentDocumentId]);

  // Handle document query errors
  useEffect(() => {
    if (currentDocument === null && currentDocumentId !== initialDocument._id) {
      // Document was deleted or doesn't exist, redirect to home
      if (process.env.NODE_ENV === "development") {
        console.log("Document not found, redirecting to home");
      }
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } else if (currentDocument && isLoadingDocument) {
      // Document loaded successfully
      setIsLoadingDocument(false);
      toast.success("Document loaded successfully");
    }
  }, [
    currentDocument,
    currentDocumentId,
    initialDocument._id,
    isLoadingDocument,
  ]);

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

    // Reset switching state on mount to prevent stuck states
    if (process.env.NODE_ENV === "development") {
      console.log("🔄 Component mounted, ensuring switching state is clean");
    }
    isSwitchingRef.current = false;
    pendingDocumentIdRef.current = null;
    setIsLoadingDocument(false);

    // Component cleanup on unmount - enhanced memory management
    return () => {
      if (process.env.NODE_ENV === "development") {
        console.log(
          "🧹 Component unmounting, cleaning up Y.js documents and connections",
        );
      }

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
          if (process.env.NODE_ENV === "development") {
            console.error("Error destroying provider:", error);
          }
        }
        providerRef.current = null;
      }

      // Clean up all document instances with error handling
      for (const [docId, ydoc] of documentInstances.current.entries()) {
        try {
          if (process.env.NODE_ENV === "development") {
            console.log("🧹 Destroying Y.js document for:", docId);
          }
          ydoc.destroy();
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error(`Error destroying Y.js document ${docId}:`, error);
          }
        }
      }
      documentInstances.current.clear();
      documentAccessOrder.current = [];

      // Reset all state to prevent memory leaks
      setIsYdocReady(false);
      setIsPersistenceReady(false);
      setStatus("disconnected");
    };
  }, []);

  // Y.js document recreation per document - SIMPLE approach to prevent content mixing
  useEffect(() => {
    const docName = currentDocumentId;

    if (process.env.NODE_ENV === "development") {
      console.log("📄 Creating fresh Y.js document for:", docName);
    }

    // Reset Y.js ready state to force editor recreation
    setIsYdocReady(false);

    // CRITICAL: Always create a fresh Y.js document for each document to prevent content mixing
    // This is the simplest solution to the duplication problem
    const newDoc = new Y.Doc();
    ydocRef.current = newDoc;

    // Store in instances for potential cleanup (but don't reuse to prevent content mixing)
    documentInstances.current.set(docName, newDoc);

    // Clean up old documents
    cleanupOldDocuments();

    if (process.env.NODE_ENV === "development") {
      console.log("📄 Created new Y.js document with GUID:", newDoc.guid);
    }

    // Set ready state after a small delay to ensure document is fully initialized
    setTimeout(() => {
      setIsYdocReady(true);
    }, 50);

    return () => {
      if (process.env.NODE_ENV === "development") {
        console.log("📄 Destroying Y.js document for:", docName);
      }
    };
  }, [currentDocumentId, cleanupOldDocuments]);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const { setEditor, setUndoManager, undoManager } = useEditorStore();

  // Menu actions
  const onSaveJSON = () => {
    if (!editor) return;
    const content = editor.getJSON();
    const blob = new Blob([JSON.stringify(content, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onSaveHTML = () => {
    if (!editor) return;
    const content = editor.getHTML();
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onSaveText = () => {
    if (!editor) return;
    const content = editor.getText();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onSavePDF = async () => {
    if (!editor) return;
    try {
      const { exportToPdf } = await import("~/lib/pdf-export");
      await exportToPdf({ documentTitle: doc.title });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("PDF export failed:", error);
      }
    }
  };

  const onSaveMarkdown = async () => {
    if (!editor) return;
    try {
      const TurndownService = (await import("turndown")).default;
      const turndownService = new TurndownService({
        headingStyle: "atx",
        bulletListMarker: "-",
        codeBlockStyle: "fenced",
      });

      const html = editor.getHTML();
      const markdown = turndownService.turndown(html);

      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.title}.md`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Documento exportado como Markdown!");
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Markdown export failed:", error);
      }
      toast.error("Falha ao exportar como Markdown");
    }
  };

  const onImportMarkdown = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.markdown,text/markdown";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && editor) {
        try {
          const text = await file.text();

          // Convert Markdown to HTML using showdown (already available in the project)
          const { Converter } = await import("showdown");
          const converter = new Converter({
            tables: true,
            strikethrough: true,
            tasklists: true,
            simpleLineBreaks: true,
            openLinksInNewWindow: true,
          });

          const html = converter.makeHtml(text);

          // Set the content in the editor
          editor.commands.setContent(html);

          toast.success("Arquivo Markdown importado com sucesso!");
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error("Markdown import failed:", error);
          }
          toast.error("Falha ao importar arquivo Markdown");
        }
      }
    };
    input.click();
  };

  const onNewDocument = () => {
    window.open("/", "_blank");
  };

  const insertTable = ({ rows, cols }: { rows: number; cols: number }) => {
    editor
      ?.chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: false })
      .run();
  };

  // Memoize base extensions to prevent recreation on every render
  const baseExtensions = useMemo(
    () => [
      StarterKit.configure({
        history: false,
        heading: false,
        // Explicitly ensure list extensions are enabled
        bulletList: {
          HTMLAttributes: {
            class: "bullet-list",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "ordered-list",
          },
        },
        listItem: {
          HTMLAttributes: {
            class: "list-item",
          },
        },
      }),
      // Add Heading extension after StarterKit to ensure it works properly
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
        HTMLAttributes: {
          class: "heading",
        },
      }),
      // Add TaskList and TaskItem extensions
      TaskList.configure({
        HTMLAttributes: {
          class: "task-list",
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "task-item",
        },
      }),
      Table.configure({
        resizable: true,
        handleWidth: 5,
        cellMinWidth: 50,
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-gray-300 p-2",
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: "border border-gray-300 p-2 bg-gray-100 font-bold",
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: "border-b border-gray-300",
        },
      }),
      ImageResize,
      Underline,
      FontFamily,
      TextStyle,
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: "highlight",
        },
      }),
      Color.configure({
        types: ["textStyle"],
      }),
      LinkExtension.extend({
        renderHTML({ HTMLAttributes }) {
          const href = HTMLAttributes.href as string;
          const safeHref = createSafeHref(href);

          return [
            "a",
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
            setLink:
              (attributes) =>
              ({ commands }) => {
                if (attributes.href && !validateLinkUrl(attributes.href)) {
                  if (process.env.NODE_ENV === "development") {
                    console.warn(
                      "Blocked attempt to set unsafe URL:",
                      attributes.href,
                    );
                  }
                  return false;
                }

                const sanitizedAttributes = {
                  ...attributes,
                  href: attributes.href
                    ? createSafeHref(attributes.href)
                    : attributes.href,
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
          class: "text-blue-600 underline cursor-pointer",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      FontSizeExtension,
      LineHeightExtension,
    ],
    [],
  ); // Empty dependency array since these are static configurations

  // Enhanced WebSocket and Y.js integration - create editor with Collaboration from start
  const editor = useEditor(
    {
      autofocus: false, // Disable autofocus to prevent cursor positioning issues during content loading
      immediatelyRender: false,
      editable: !isReadOnly,
      onCreate({ editor }) {
        setEditor(editor);
        if (process.env.NODE_ENV === "development") {
          console.log("📝 Editor created for document:", currentDocumentId);
        }

        // Focus the editor after a short delay to ensure content is loaded
        if (!isReadOnly) {
          setTimeout(() => {
            editor.commands.focus("start");
          }, 100);
        }
      },
      onDestroy() {
        setEditor(null);
        if (process.env.NODE_ENV === "development") {
          console.log("📝 Editor destroyed for document:", currentDocumentId);
        }
      },
      onUpdate({ editor, transaction }) {
        setEditor(editor);
        if (transaction.docChanged) {
          if (process.env.NODE_ENV === "development") {
            console.log("📝 Document content changed for:", currentDocumentId);
          }

          // Debug Y.js document state on frontend
          if (ydocRef.current) {
            const fragment = ydocRef.current.getXmlFragment("default");
            if (process.env.NODE_ENV === "development") {
              console.log(
                "📝 Frontend Y.js default fragment length:",
                fragment.length,
              );
              console.log(
                "📝 Frontend Y.js shared types:",
                Array.from(ydocRef.current.share.keys()),
              );
            }

            if (fragment.length > 0) {
              if (process.env.NODE_ENV === "development") {
                console.log("📝 Frontend has content in Y.js fragment!");
              }
            } else {
              if (process.env.NODE_ENV === "development") {
                console.log(
                  "📝 Frontend Y.js fragment is empty - this is the problem!",
                );
                console.log("📝 Editor HTML content:", editor.getHTML());
                console.log(
                  "📝 Editor JSON content:",
                  JSON.stringify(editor.getJSON(), null, 2),
                );
              }
            }
          }
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
        if (process.env.NODE_ENV === "development") {
          console.error(
            "📝 Editor content error for document:",
            currentDocumentId,
          );
        }
      },
      editorProps: {
        attributes: {
          style: `padding-left: ${leftMargin}px; padding-right: ${rightMargin}px;`,
          class: `focus:outline-none print:border-0 bg-white border border-[#C7C7C7] flex flex-col min-h-[1054px] w-[816px] pt-10 pr-14 pb-10 cursor-text`,
        },
      },
      extensions: useMemo(() => {
        // Always include base extensions to ensure proper schema
        const extensions = [...baseExtensions];

        // Only add Collaboration extension when Y.js document is ready
        return isYdocReady && ydocRef.current
          ? [
              ...extensions,
              Collaboration.configure({ document: ydocRef.current }),
            ]
          : extensions;
      }, [baseExtensions, isYdocReady]),
    },
    [leftMargin, rightMargin, isReadOnly, currentDocumentId, isYdocReady],
  );

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

  // Enhanced document switching with proper synchronization
  const handleDocumentSwitch = useCallback(
    async (newDocumentId: Id<"documents">) => {
      // Prevent switching to the same document
      if (newDocumentId === currentDocumentId) {
        if (process.env.NODE_ENV === "development") {
          console.log("🔄 Ignoring switch to same document:", newDocumentId);
        }
        return;
      }

      // Prevent multiple simultaneous switches with atomic flag
      if (isSwitchingRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            "🔄 Switch in progress, rejecting new switch request to:",
            newDocumentId,
          );
        }
        return; // Don't queue, just reject to prevent buildup
      }

      // Set switching flag immediately
      isSwitchingRef.current = true;
      setIsLoadingDocument(true);
      pendingDocumentIdRef.current = null; // Clear any pending switches

      if (process.env.NODE_ENV === "development") {
        console.log(
          "🔄 Starting atomic document switch from:",
          currentDocumentId,
          "to:",
          newDocumentId,
        );
      }

      try {
        // Step 1: Immediately disconnect current provider to prevent conflicts
        if (providerRef.current) {
          const currentProvider = providerRef.current;
          const providerName =
            (currentProvider as { configuration?: { name?: string } })
              .configuration?.name ?? "unknown";
          if (process.env.NODE_ENV === "development") {
            console.log("🔄 Forcefully disconnecting provider:", providerName);
          }

          // Synchronous cleanup
          currentProvider.disconnect();
          currentProvider.destroy();
          providerRef.current = null;
        }

        // Step 2: Clear editor content immediately
        if (editor) {
          if (process.env.NODE_ENV === "development") {
            console.log("🔄 Clearing editor content");
          }
          editor.commands.clearContent();
        }

        // Step 3: Reset all Y.js states
        setIsYdocReady(false);
        setIsPersistenceReady(false);
        setIsContentLoading(false); // Reset content loading state
        setStatus("connecting");

        // Step 4: Small delay to ensure cleanup completes
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Step 5: Update document ID (this triggers the useEffect chain)
        setCurrentDocumentId(newDocumentId);

        // Step 6: Update URL
        const newUrl = `/documents/${newDocumentId}`;
        window.history.pushState({ documentId: newDocumentId }, "", newUrl);

        if (process.env.NODE_ENV === "development") {
          console.log("🔄 Document switch initiated successfully");
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("🔄 Critical error during document switch:", error);
        }
        // Reset states on error
        isSwitchingRef.current = false;
        setIsLoadingDocument(false);
        toast.error("Failed to switch document");
      }
    },
    [currentDocumentId, editor],
  );

  // Simplified and more robust Y.js document management
  useEffect(() => {
    // Only proceed if we're in a valid switching state
    if (!isSwitchingRef.current && currentDocumentId === initialDocument._id) {
      // This is the initial load, not a switch
      if (process.env.NODE_ENV === "development") {
        console.log("📄 Initial document load for:", currentDocumentId);
      }
    }

    const docName = currentDocumentId;
    if (process.env.NODE_ENV === "development") {
      console.log("📄 Setting up Y.js document for:", docName);
    }

    // Force cleanup any existing provider connection
    if (providerRef.current) {
      const existingProvider = providerRef.current;
      const providerName =
        (existingProvider as { configuration?: { name?: string } })
          .configuration?.name ?? "unknown";
      if (process.env.NODE_ENV === "development") {
        console.log("🧹 Forcing cleanup of existing provider:", providerName);
      }
      try {
        existingProvider.disconnect();
        existingProvider.destroy();
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error during forced cleanup:", error);
        }
      }
      providerRef.current = null;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("📄 Y.js document ready for collaboration with:", docName);
    }

    // Clean up old cached documents
    cleanupOldDocuments();

    // WebSocket configuration
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) {
      if (process.env.NODE_ENV === "development") {
        console.error("WebSocket URL not configured");
      }
      toast.error("WebSocket configuration missing");
      setIsYdocReady(true);
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("🔗 Initializing WebSocket connection for:", docName);
    }

    // Reset states
    setIsPersistenceReady(false);
    setStatus("connecting");

    // Mark persistence as ready immediately (no IndexedDB)
    setIsPersistenceReady(true);

    // Create new WebSocket provider with the current Y.js document and session authentication
    if (process.env.NODE_ENV === "development") {
      console.log("🔗 Creating WebSocket provider for:", docName);
    }

    // Build WebSocket URL with authentication parameters
    const wsUrlWithAuth = new URL(wsUrl);
    if (sessionToken) {
      wsUrlWithAuth.searchParams.set("sessionToken", sessionToken);
      if (process.env.NODE_ENV === "development") {
        console.log("🔐 Adding session token to WebSocket connection");
      }
    }
    if (convexUserId) {
      wsUrlWithAuth.searchParams.set("userId", convexUserId);
    }

    const newProvider = new HocuspocusProvider({
      url: wsUrlWithAuth.toString(),
      name: docName,
      document: ydocRef.current,
    });

    providerRef.current = newProvider;

    // Enhanced connection event handlers
    const handleConnected = () => {
      if (process.env.NODE_ENV === "development") {
        console.log("✅ WebSocket connected for:", docName);
      }
      if (currentDocumentIdRef.current === docName) {
        setStatus("connected");
        setIsContentLoading(true); // Show loading while server loads content

        // Hide loading state after server has time to load content
        setTimeout(() => {
          setIsContentLoading(false);
        }, 2000);

        // Complete the document switch
        if (isSwitchingRef.current) {
          if (process.env.NODE_ENV === "development") {
            console.log("🔄 Document switch completed successfully");
          }
          isSwitchingRef.current = false;
          setIsLoadingDocument(false);
          toast.success("Document loaded successfully");
        }
      }
    };

    const handleDisconnected = ({ event }: { event: CloseEvent }) => {
      if (process.env.NODE_ENV === "development") {
        console.log("❌ WebSocket disconnected for:", docName, event.code);
      }
      if (currentDocumentIdRef.current === docName) {
        setStatus("disconnected");
        setIsContentLoading(false); // Reset loading state on disconnect
      }
    };

    const handleError = (error: Error) => {
      if (process.env.NODE_ENV === "development") {
        console.error("💥 WebSocket error for:", docName, error);
      }
      if (currentDocumentIdRef.current === docName) {
        setStatus("error");

        // Reset switching state on connection error
        if (isSwitchingRef.current) {
          isSwitchingRef.current = false;
          setIsLoadingDocument(false);
          toast.error("Connection failed");
        }
      }
    };

    // Attach event listeners
    newProvider.on("connect", handleConnected);
    newProvider.on("disconnect", handleDisconnected);
    newProvider.on("error", handleError);

    // Initialize undo manager with the current Y.js document
    const undoManager = new UndoManager(
      ydocRef.current.getXmlFragment("default"),
      {
        captureTimeout: 1000,
      },
    );
    undoManagerRef.current = undoManager;
    setUndoManager(undoManager);

    setIsYdocReady(true);

    // Enhanced cleanup
    return () => {
      if (process.env.NODE_ENV === "development") {
        console.log("🧹 Cleaning up document setup for:", docName);
      }

      setIsPersistenceReady(false);

      // Remove event listeners
      newProvider.off("connect", handleConnected);
      newProvider.off("disconnect", handleDisconnected);
      newProvider.off("error", handleError);

      // Only destroy if this is the current provider
      if (providerRef.current === newProvider) {
        if (process.env.NODE_ENV === "development") {
          console.log("🧹 Destroying current provider for:", docName);
        }
        try {
          newProvider.disconnect();
          newProvider.destroy();
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error("Error during cleanup:", error);
          }
        }
        providerRef.current = null;
      }
    };
  }, [currentDocumentId, cleanupOldDocuments, initialDocument._id]);

  // Safety timeout to prevent permanent stuck states
  useEffect(() => {
    if (isSwitchingRef.current) {
      const timeout = setTimeout(() => {
        if (process.env.NODE_ENV === "development") {
          console.warn("🔄 Document switch timeout reached, forcing reset");
        }
        isSwitchingRef.current = false;
        setIsLoadingDocument(false);
        toast.error("Document switch timed out");
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [currentDocumentId]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (
        event.state &&
        typeof event.state === "object" &&
        "documentId" in event.state
      ) {
        const state = event.state as { documentId: unknown };
        const documentId = state.documentId;
        if (
          typeof documentId === "string" &&
          documentId !== currentDocumentId
        ) {
          // Use the document switch handler to properly switch documents
          void handleDocumentSwitch(documentId as Id<"documents">);
        }
      } else if (
        !event.state &&
        window.location.pathname.startsWith("/documents/")
      ) {
        // Handle direct URL navigation
        const pathParts = window.location.pathname.split("/");
        const docIdFromUrl = pathParts[pathParts.length - 1];
        if (docIdFromUrl && docIdFromUrl !== currentDocumentId) {
          void handleDocumentSwitch(docIdFromUrl as Id<"documents">);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);

    // Handle initial page load with document ID in URL
    if (isMounted && window.location.pathname.startsWith("/documents/")) {
      const pathParts = window.location.pathname.split("/");
      const docIdFromUrl = pathParts[pathParts.length - 1];
      if (
        docIdFromUrl &&
        docIdFromUrl !== currentDocumentId &&
        docIdFromUrl !== initialDocument._id
      ) {
        // Set initial state for browser history
        window.history.replaceState(
          { documentId: docIdFromUrl },
          "",
          window.location.pathname,
        );
      }
    }

    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentDocumentId, handleDocumentSwitch, isMounted, initialDocument._id]);

  const acceptReplacement = useCallback(() => {
    if (!editor || !replacementSuggestion) return;

    editor
      .chain()
      .focus()
      .insertContentAt(
        {
          from: replacementSuggestion.position.from,
          to: replacementSuggestion.position.to,
        },
        replacementSuggestion.suggestion,
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
    const textBefore = editor.state.doc.textBetween(0, pos, " ");
    const match = /\S+$/.exec(textBefore);
    if (!match) return;

    const lastWord = match[0];
    const entry = dictionary.find(
      (e: { from: string; to: string }) =>
        e.from === lastWord ||
        (lastWord.startsWith("@") && e.from === lastWord.slice(1)),
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

  // This useEffect has been replaced by the enhanced document switching logic above

  // Server handles all content loading - no frontend content setting needed

  // Fix: Properly handle useEffect dependencies and cleanup
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      handleTextReplace();
    };

    const dom = editor.view.dom;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle undo/redo keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) {
          // Ctrl+Z or Cmd+Z for undo
          e.preventDefault();
          if (undoManager?.canUndo()) {
            undoManager.undo();
          }
          return;
        }
        if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
          // Ctrl+Y or Cmd+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
          e.preventDefault();
          if (undoManager?.canRedo()) {
            undoManager.redo();
          }
          return;
        }
      }

      if (
        e.key === " " &&
        replacementSuggestion &&
        replacementSuggestion.word !== recentlyRejected
      ) {
        e.preventDefault();
        acceptReplacement();
        return;
      }
      if (e.key === " ") {
        setRecentlyRejected(null);
      }
    };

    editor.on("update", handleUpdate);
    dom.addEventListener("keydown", handleKeyDown);

    return () => {
      editor.off("update", handleUpdate);
      dom.removeEventListener("keydown", handleKeyDown);

      // Fix: Clear timeout on cleanup
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
        suggestionTimeoutRef.current = null;
      }
    };
  }, [
    editor,
    handleTextReplace,
    acceptReplacement,
    replacementSuggestion,
    recentlyRejected,
    undoManager,
  ]);

  // Enhanced title handling
  const handleTitleSubmit = async () => {
    if (!documentTitle.trim()) {
      // If empty, restore original title
      setDocumentTitle(doc.title);
      setIsEditingTitle(false);
      return;
    }

    if (documentTitle.trim() === doc.title) {
      // No change, just exit editing mode
      setIsEditingTitle(false);
      return;
    }

    try {
      // Use appropriate update function based on authentication status
      if (convexUserId) {
        // User is authenticated - use regular update function (works for both public and private notebooks)
        await updateDocument({
          id: doc._id,
          title: documentTitle.trim(),
          userId: convexUserId,
        });
      } else if (notebookId) {
        // User not authenticated but has notebookId - try public notebook update
        await updateDocumentInPublicNotebook({
          id: doc._id,
          title: documentTitle.trim(),
          notebookId,
        });
      } else {
        toast.error("Please wait for authentication to complete");
        return;
      }
      toast.success("Document title updated!");
      setIsEditingTitle(false);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to update document title:", error);
      }
      if (error instanceof Error) {
        toast.error(`Failed to update title: ${error.message}`);
      } else {
        toast.error("Failed to update title");
      }
      setDocumentTitle(doc.title);
      setIsEditingTitle(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void handleTitleSubmit();
    } else if (e.key === "Escape") {
      setDocumentTitle(doc.title);
      setIsEditingTitle(false);
    }
  };

  const handleForceSave = () => {
    toast.info(
      "Documents are automatically saved when content changes after 10 seconds of inactivity",
    );
  };

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Logout error:", error);
      }
      toast.error("Failed to logout");
    }
  };

  const getUserDisplayName = () => {
    if (session?.user?.name) {
      return session.user.name;
    }
    if (session?.user?.email) {
      return session.user.email;
    }
    return "User";
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusIcon = () => {
    switch (status) {
      case "connected":
        return <Wifi className="h-4 w-4 text-green-600" />;
      case "connecting":
        return (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        );
      case "disconnected":
        return <WifiOff className="h-4 w-4 text-red-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "connected":
        return "Conectado(a)";
      case "connecting":
        return "Connecting...";
      case "disconnected":
        return "Desconectado(a)";
      case "error":
        return "Erro";
      default:
        return "Desconhecido";
    }
  };

  // Monitor reconnections for debugging
  useEffect(() => {
    if (!editor || !isYdocReady || !providerRef.current || !ydocRef.current)
      return;

    const provider = providerRef.current;

    const handleConnect = () => {
      // Simple reconnect monitoring
      setTimeout(() => {
        try {
          const fragment = ydocRef.current?.getXmlFragment("default");
          if (process.env.NODE_ENV === "development") {
            console.log(
              `[FRONTEND] Reconnected to document ${currentDocumentId}, fragment length: ${fragment?.length || 0}`,
            );
          }
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error(`[FRONTEND] Error during reconnect check:`, error);
          }
        }
      }, 500);
    };

    provider.on("connect", handleConnect);

    return () => {
      provider.off("connect", handleConnect);
    };
  }, [editor, isYdocReady, currentDocumentId]);

  if (!editor || isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">
            {isUserLoading
              ? "Loading user session..."
              : "Loading collaborative editor..."}
          </p>
        </div>
      </div>
    );
  }

  // Show loading state if current document is null (deleted)
  if (currentDocument === null && currentDocumentId !== initialDocument._id) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
          <p className="text-sm text-gray-600">
            Document was deleted, redirecting...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F9FBFD]">
      {/* Loading overlay for document switching */}
      {isLoadingDocument && (
        <div className="no-export fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading document...</p>
          </div>
        </div>
      )}

      {/* Loading overlay for content loading */}
      {isContentLoading && status === "connected" && (
        <div className="no-export fixed inset-0 z-40 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="text-center">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="mb-1 text-sm font-medium text-gray-700">
              Loading document content...
            </p>
            <p className="text-xs text-gray-500">Fetching from server</p>
          </div>
        </div>
      )}

      {/* Sidebar will be rendered as a sibling component */}

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Enhanced header with better status indicators */}
        <header className="no-export relative z-20 border-b bg-white py-3 pl-0 pr-4 md:px-4">
          <div className="mx-auto max-w-6xl">
            {/* Title and controls row */}
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {(() => {
                  const titleMargin = isMobile
                    ? "ml-[40px] mt-0.5"
                    : showSidebar
                      ? ""
                      : "ml-[56px] md:ml-[40px] xl:ml-0";

                  return isEditingTitle ? (
                    <input
                      type="text"
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      onBlur={() => void handleTitleSubmit()}
                      onKeyDown={handleTitleKeyDown}
                      className={`${titleMargin} rounded border-none bg-transparent px-2 py-1 text-lg font-semibold outline-none focus:bg-gray-50`}
                      autoFocus
                    />
                  ) : (
                    <h1
                      className={`${titleMargin} cursor-pointer rounded px-2 py-1 text-lg font-semibold hover:bg-gray-50`}
                      onClick={() => setIsEditingTitle(true)}
                    >
                      {documentTitle}
                    </h1>
                  );
                })()}
              </div>

              <div className="flex items-center gap-4">
                {/* Enhanced connection status */}
                <div
                  className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
                    status === "connected"
                      ? "bg-green-100 text-green-800"
                      : status === "connecting"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {getStatusIcon()}
                  <span>{getStatusText()}</span>
                </div>

                {/* Quick Actions Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/" className="cursor-pointer">
                        <Home className="mr-2 h-4 w-4" />
                        <span>Página inicial</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/notas" className="cursor-pointer">
                        <NotebookPen className="mr-2 h-4 w-4" />
                        <span>Notas</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {convexUserId ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative h-8 w-8 rounded-full p-0 hover:bg-gray-100"
                      >
                        {(userProfile?.image ?? session?.user?.image) ? (
                          <Image
                            className="h-8 w-8 rounded-full object-cover"
                            src={
                              userProfile?.image ?? session?.user?.image ?? ""
                            }
                            alt={getUserDisplayName()}
                            width={32}
                            height={32}
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-medium text-white">
                            {getUserInitials()}
                          </div>
                        )}
                        <ChevronDown className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-white p-0.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="flex items-center justify-start gap-2 p-2">
                        <div className="flex flex-col space-y-1 leading-none">
                          {session?.user?.name && (
                            <p className="font-medium">{session.user.name}</p>
                          )}
                          {session?.user?.email && (
                            <p className="w-[200px] truncate text-sm text-muted-foreground">
                              {session.user.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/settings" className="cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="cursor-pointer"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-2 px-3 text-sm"
                      >
                        <User className="h-4 w-4" />
                        <span>Guest</span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <div className="p-4 text-center">
                        <User className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                        <p className="mb-1 font-medium text-gray-900">
                          Sign in to access all features
                        </p>
                        <p className="mb-3 text-sm text-gray-600">
                          Create your own documents, collaborate in real-time,
                          and save your work.
                        </p>
                        <Button
                          onClick={() => signIn()}
                          className="w-full gap-2"
                          size="sm"
                        >
                          <LogIn className="h-4 w-4" />
                          Sign in
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Menu bar row */}
            <div className="flex">
              <Menubar className="h-auto border-none bg-transparent p-0 shadow-none">
                {!isReadOnly && (
                  <>
                    <MenubarMenu>
                      <MenubarTrigger className="h-auto rounded-sm px-[7px] py-0.5 text-sm font-normal hover:bg-muted">
                        Arquivo
                      </MenubarTrigger>
                      <MenubarContent className="print:hidden">
                        <MenubarSub>
                          <MenubarSubTrigger>
                            <File className="mr-2 size-4" />
                            Exportar
                          </MenubarSubTrigger>
                          <MenubarSubContent>
                            <MenubarItem onClick={onSaveJSON}>
                              <FileJson className="mr-2 size-4" />
                              JSON
                            </MenubarItem>
                            <MenubarItem onClick={onSaveHTML}>
                              <Globe className="mr-2 size-4" />
                              HTML
                            </MenubarItem>
                            <MenubarItem onClick={onSaveMarkdown}>
                              <Download className="mr-2 size-4" />
                              Markdown
                            </MenubarItem>
                            <MenubarItem onClick={onSavePDF}>
                              <Printer className="mr-2 size-4" />
                              PDF
                            </MenubarItem>
                            <MenubarItem onClick={onSaveText}>
                              <FileText className="mr-2 size-4" />
                              Text
                            </MenubarItem>
                          </MenubarSubContent>
                        </MenubarSub>
                        <MenubarSub>
                          <MenubarSubTrigger>
                            <Upload className="mr-2 size-4" />
                            Importar
                          </MenubarSubTrigger>
                          <MenubarSubContent>
                            <MenubarItem onClick={onImportMarkdown}>
                              <Upload className="mr-2 size-4" />
                              Markdown
                            </MenubarItem>
                          </MenubarSubContent>
                        </MenubarSub>
                        <MenubarItem onClick={onNewDocument}>
                          <FilePlus className="mr-2 size-4" />
                          Novo documento
                        </MenubarItem>
                        <MenubarSeparator />
                        {convexUserId && (
                          <MenubarItem
                            onClick={() => setIsShareModalOpen(true)}
                          >
                            <Share2 className="mr-2 size-4" />
                            Compartilhar
                          </MenubarItem>
                        )}
                        <MenubarItem onClick={() => window.print()}>
                          <Printer className="mr-2 size-4" />
                          Imprimir <MenubarShortcut>Ctrl+P</MenubarShortcut>
                        </MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                    <MenubarMenu>
                      <MenubarTrigger className="h-auto rounded-sm px-[7px] py-0.5 text-sm font-normal hover:bg-muted">
                        Editar
                      </MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem
                          onClick={() => {
                            if (undoManager?.canUndo()) {
                              undoManager.undo();
                            }
                          }}
                        >
                          <Undo2 className="mr-2 size-4" />
                          Desfazer <MenubarShortcut>Ctrl+Z</MenubarShortcut>
                        </MenubarItem>
                        <MenubarItem
                          onClick={() => {
                            if (undoManager?.canRedo()) {
                              undoManager.redo();
                            }
                          }}
                        >
                          <Redo2 className="mr-2 size-4" />
                          Refazer <MenubarShortcut>Ctrl+Y</MenubarShortcut>
                        </MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                    <MenubarMenu>
                      <MenubarTrigger className="h-auto rounded-sm px-[7px] py-0.5 text-sm font-normal hover:bg-muted">
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
                      <MenubarTrigger className="h-auto rounded-sm px-[7px] py-0.5 text-sm font-normal hover:bg-muted">
                        Formatar
                      </MenubarTrigger>
                      <MenubarContent>
                        <MenubarSub>
                          <MenubarSubTrigger>
                            <Text className="mr-2 size-4" />
                            Texto
                          </MenubarSubTrigger>
                          <MenubarSubContent>
                            <MenubarItem
                              onClick={() =>
                                editor?.chain().focus().toggleBold().run()
                              }
                            >
                              <Bold className="mr-2 size-4" />
                              Negrito <MenubarShortcut>Ctrl+B</MenubarShortcut>
                            </MenubarItem>
                            <MenubarItem
                              onClick={() =>
                                editor?.chain().focus().toggleItalic().run()
                              }
                            >
                              <Italic className="mr-2 size-4" />
                              Itálico <MenubarShortcut>Ctrl+I</MenubarShortcut>
                            </MenubarItem>
                            <MenubarItem
                              onClick={() =>
                                editor?.chain().focus().toggleUnderline().run()
                              }
                            >
                              <UnderlineIcon className="mr-2 size-4" />
                              Sublinhado{" "}
                              <MenubarShortcut>Ctrl+U</MenubarShortcut>
                            </MenubarItem>
                            <MenubarItem
                              onClick={() =>
                                editor?.chain().focus().toggleStrike().run()
                              }
                            >
                              <Strikethrough className="mr-2 size-4" />
                              Tachado
                            </MenubarItem>
                          </MenubarSubContent>
                        </MenubarSub>
                        <MenubarItem
                          onClick={() =>
                            editor?.chain().focus().unsetAllMarks().run()
                          }
                        >
                          <RemoveFormatting className="mr-2 size-4" />
                          Remover formatação
                        </MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                    <MenubarMenu>
                      <MenubarTrigger className="h-auto rounded-sm px-[7px] py-0.5 text-sm font-normal hover:bg-muted">
                        Ferramentas
                      </MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem onClick={() => setShowSpellCheck(true)}>
                          <Sparkles className="mr-2 size-4" />
                          Verificação Ortográfica
                        </MenubarItem>
                        {convexUserId && (
                          <MenubarItem
                            onClick={() => setIsDictionaryOpen(true)}
                          >
                            <Replace className="mr-2 size-4" />
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
        <div className="size-full overflow-x-auto bg-[#F9FBFD] px-4 print:overflow-visible print:bg-white print:p-0">
          <div className="mx-auto max-w-[816px]">
            <Toolbar />
          </div>
          <Ruler
            leftMargin={leftMargin}
            rightMargin={rightMargin}
            onLeftMarginChange={setLeftMargin}
            onRightMarginChange={setRightMargin}
          />
          <div className="mx-auto flex w-[816px] min-w-max justify-center py-4 print:w-full print:min-w-0 print:py-0">
            {/* Loading overlay for document switching */}
            {(isLoadingDocument ||
              (status === "connecting" && isSwitchingRef.current)) && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 backdrop-blur-sm transition-opacity duration-300">
                <div className="document-switching text-center">
                  <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                  <p className="mb-1 text-sm font-medium text-blue-600">
                    Switching document...
                  </p>
                  <p className="text-xs text-gray-600">Loading {doc.title}</p>
                </div>
              </div>
            )}

            {/* Loading overlay for connection issues */}
            {status !== "connected" &&
              status !== "connecting" &&
              !isLoadingDocument && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                  <div className="text-center">
                    <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
                    <p className="mb-1 text-sm font-medium text-red-600">
                      {status === "error" ? "Connection Error" : "Offline Mode"}
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

      {convexUserId && (
        <DictionaryModal
          isOpen={isDictionaryOpen}
          onClose={() => setIsDictionaryOpen(false)}
          isPrivate={true} // Use private mode for authenticated users
          session={{ user: { id: convexUserId } }} // Use real authenticated session
          createdById={convexUserId}
        />
      )}

      {convexUserId && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          documentId={doc._id}
          userId={convexUserId}
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
