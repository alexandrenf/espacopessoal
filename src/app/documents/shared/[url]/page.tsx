"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Eye, Share2, RefreshCw } from "lucide-react";
import { Button } from "../../../../components_new/ui/button";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { HocuspocusProvider } from "@hocuspocus/provider";

// TipTap Extensions for read-only viewing
import { FontSizeExtension } from "../../../../extensions/font-size";
import { LineHeightExtension } from "../../../../extensions/line-height";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { Heading } from "@tiptap/extension-heading";
import { Highlight } from "@tiptap/extension-highlight";
import { Link as LinkExtension } from "@tiptap/extension-link";
import { validateLinkUrl, createSafeHref } from "../../../../lib/link-security";
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

export default function SharedDocumentPage() {
  const { url } = useParams();
  const urlString = Array.isArray(url) ? url[0] : url;

  const sharedDocument = useQuery(
    api.documents.getSharedDocument,
    urlString ? { url: urlString } : "skip",
  );

  const handleManualRefresh = () => {
    setRefreshKey((prev: number) => prev + 1);
    setLastRefresh(Date.now());
  };

  const isLoading = sharedDocument === undefined;
  const hasError = sharedDocument === null;

  // Force refresh shared document data periodically to ensure latest content
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Track initial load completion to distinguish between loading and intentionally empty documents
  useEffect(() => {
    if (sharedDocument !== undefined && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [sharedDocument, isInitialLoad]);

  // Real-time collaboration setup for shared documents
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);
  const [isYdocReady, setIsYdocReady] = useState(false);
  const [collaborativeContent, setCollaborativeContent] = useState<
    string | null
  >(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");

  // Initialize Y.js document for real-time collaboration
  useEffect(() => {
    if (!sharedDocument?.document) return;

    // Initialize Y.js document only once
    if (!ydocRef.current) {
      ydocRef.current = new Y.Doc();
      setIsYdocReady(true);
    }

    // Clean up previous provider and persistence if exists
    if (providerRef.current) {
      providerRef.current.destroy();
    }
    if (persistenceRef.current) {
      void persistenceRef.current.destroy();
    }

    // Connect to collaborative server in read-only mode
    const documentId = sharedDocument.document._id;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;

    if (wsUrl && ydocRef.current) {
      setConnectionStatus("connecting");

      const persistence = new IndexeddbPersistence(documentId, ydocRef.current);
      persistenceRef.current = persistence;

      const provider = new HocuspocusProvider({
        url: wsUrl,
        name: documentId,
        document: ydocRef.current,
      });

      providerRef.current = provider;

      // Listen for document updates
      const updateContent = () => {
        if (ydocRef.current) {
          const prosemirrorState = ydocRef.current.getMap("prosemirror");
          const content = prosemirrorState.get("content");
          if (typeof content === "string" && content) {
            setCollaborativeContent(content);
          }
        }
      };

      provider.on("status", (event: { status: string }) => {
        if (event.status === "connected") {
          setConnectionStatus("connected");
          updateContent();
        } else if (event.status === "connecting") {
          setConnectionStatus("connecting");
        } else {
          setConnectionStatus("disconnected");
        }
      });

      provider.on("connect", () => {
        setConnectionStatus("connected");
        updateContent();
      });

      provider.on("disconnect", () => {
        setConnectionStatus("disconnected");
      });

      provider.on("error", (error: Error) => {
        console.error("WebSocket error in shared document:", error);
        setConnectionStatus("disconnected");
      });

      ydocRef.current.on("update", updateContent);

      return () => {
        provider.destroy();
        void persistence.destroy();
        setConnectionStatus("disconnected");
      };
    }
  }, [sharedDocument?.document._id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
      }
      if (persistenceRef.current) {
        void persistenceRef.current.destroy();
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
      }
    };
  }, []);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
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
          resizable: false,
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
        }).configure({
          openOnClick: true,
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
        // Add collaboration extension for real-time content
        ...(isYdocReady && ydocRef.current
          ? [
              Collaboration.configure({
                document: ydocRef.current,
              }),
            ]
          : []),
      ],
      editable: false, // Make editor read-only for shared documents
      content: "<p>Loading document...</p>",
      editorProps: {
        attributes: {
          class: `focus:outline-none print:border-0 bg-white border border-[#C7C7C7] flex flex-col min-h-[1054px] w-[816px] pt-10 pr-14 pb-10`,
        },
      },
    },
    [isYdocReady],
  );

  // Update content when shared document loads or collaborative content changes
  useEffect(() => {
    if (editor && sharedDocument?.document) {
      // Prioritize collaborative content if available and connected
      let contentToSet: string;

      if (collaborativeContent && connectionStatus === "connected") {
        contentToSet = collaborativeContent;
      } else if (sharedDocument.document.initialContent) {
        contentToSet = sharedDocument.document.initialContent;
      } else {
        contentToSet = "<p>This document appears to be empty.</p>";
      }

      // Only update if content actually changed to avoid unnecessary re-renders
      const currentContent = editor.getHTML();
      if (currentContent !== contentToSet) {
        editor.commands.setContent(contentToSet);
      }
    }
  }, [
    editor,
    sharedDocument?.document,
    collaborativeContent,
    connectionStatus,
    refreshKey,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FBFD]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading shared document...</p>
        </div>
      </div>
    );
  }

  if (hasError || !sharedDocument) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FBFD]">
        <div className="mx-auto max-w-md p-6 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Document Not Found
          </h1>
          <p className="mb-6 text-gray-600">
            This shared document doesn&apos;t exist or may have been removed.
          </p>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FBFD]">
      {/* Header */}
      <header className="border-b bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-blue-500" />
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {sharedDocument.document.title}
                  </h1>
                  <p className="text-sm text-gray-500">
                    Shared by{" "}
                    {sharedDocument.document.owner?.name ?? "Unknown owner"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </Button>

              {/* Connection Status */}
              <div
                className={`flex items-center gap-1 rounded-full px-2 py-1 text-sm ${
                  connectionStatus === "connected"
                    ? "bg-green-100 text-green-700"
                    : connectionStatus === "connecting"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                {connectionStatus === "connected" ? (
                  <>
                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                    <span>Live</span>
                  </>
                ) : connectionStatus === "connecting" ? (
                  <>
                    <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                    <span>Offline</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Eye className="h-4 w-4" />
                <span>Read-only</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Document Content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[816px] py-4">
          <div className="flex min-w-max justify-center">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}
