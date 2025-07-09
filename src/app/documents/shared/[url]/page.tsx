"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Eye, Share2, RefreshCw } from 'lucide-react';
import { Button } from "../../../../components_new/ui/button";
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { HocuspocusProvider } from '@hocuspocus/provider';

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
    urlString ? { url: urlString } : "skip"
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
  const [isYdocReady, setIsYdocReady] = useState(false);
  const [collaborativeContent, setCollaborativeContent] = useState<string | null>(null);

  // Initialize Y.js document for real-time collaboration
  useEffect(() => {
    if (sharedDocument?.document && !ydocRef.current) {
      ydocRef.current = new Y.Doc();
      setIsYdocReady(true);
      
      // Connect to collaborative server in read-only mode
      const documentId = sharedDocument.document._id;
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
      
      if (wsUrl) {
        const persistence = new IndexeddbPersistence(documentId, ydocRef.current);
        
        const provider = new HocuspocusProvider({
          url: wsUrl,
          name: documentId,
          document: ydocRef.current,
        });
        
        providerRef.current = provider;
        
        // Listen for document updates
        const updateContent = () => {
          if (ydocRef.current) {
            const prosemirrorState = ydocRef.current.getMap('prosemirror');
            const content = prosemirrorState.get('content');
            if (typeof content === 'string' && content) {
              setCollaborativeContent(content);
            }
          }
        };
        
        provider.on('status', (event: { status: string }) => {
          if (event.status === 'connected') {
            updateContent();
          }
        });
        
        ydocRef.current.on('update', updateContent);
        
        return () => {
          provider.destroy();
          ydocRef.current?.destroy();
        };
      }
    }
  }, [sharedDocument?.document]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
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
        resizable: false,
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
      }).configure({
        openOnClick: true,
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
      // Add collaboration extension for real-time content
      ...(isYdocReady && ydocRef.current ? [
        Collaboration.configure({
          document: ydocRef.current,
        }),
      ] : []),
    ],
    editable: false, // Make editor read-only for shared documents
    content: '<p>Loading document...</p>',
    editorProps: {
      attributes: {
        class: `focus:outline-none print:border-0 bg-white border border-[#C7C7C7] flex flex-col min-h-[1054px] w-[816px] pt-10 pr-14 pb-10`,
      },
    },
  }, [isYdocReady]);

  // Update content when shared document loads or collaborative content changes
  useEffect(() => {
    if (editor && sharedDocument?.document) {
      // Use collaborative content if available, otherwise fall back to initialContent
      const contentToSet = collaborativeContent ?? 
                          sharedDocument.document.initialContent ?? 
                          '<p>This document appears to be empty.</p>';
      
      editor.commands.setContent(contentToSet);
    }
  }, [editor, sharedDocument?.document, collaborativeContent, refreshKey]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBFD]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared document...</p>
        </div>
      </div>
    );
  }

  if (hasError || !sharedDocument) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBFD]">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Document Not Found</h1>
          <p className="text-gray-600 mb-6">
            This shared document doesn&apos;t exist or may have been removed.
          </p>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
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
        <div className="max-w-6xl mx-auto">
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
                    Shared by {sharedDocument.document.owner?.name ?? 'Unknown owner'}
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
        <div className="max-w-[816px] mx-auto py-4">
          <div className="min-w-max flex justify-center">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
} 