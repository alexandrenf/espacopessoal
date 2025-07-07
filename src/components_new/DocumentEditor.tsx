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
  Replace
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

// TipTap Extensions
import { FontSizeExtension } from "../extensions/font-size";
import { LineHeightExtension } from "../extensions/line-height";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { Heading } from "@tiptap/extension-heading";
import { Highlight } from "@tiptap/extension-highlight";
import { Link as LinkExtension } from "@tiptap/extension-link";
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
import { useEditorStore } from "../store/use-editor-store";
import { LEFT_MARGIN_DEFAULT, RIGHT_MARGIN_DEFAULT } from "../constants/margins";

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

export function DocumentEditor({ document: doc, initialContent, isReadOnly }: EditorProps) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const undoManagerRef = useRef<UndoManager | null>(null);
  const [documentTitle, setDocumentTitle] = useState(doc.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  // Note: Save state is no longer tracked client-side since server handles saving
  
  // Margin state
  const [leftMargin, setLeftMargin] = useState(LEFT_MARGIN_DEFAULT);
  const [rightMargin, setRightMargin] = useState(RIGHT_MARGIN_DEFAULT);

  // Sidebar state
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showSpellCheck, setShowSpellCheck] = useState(false);
  const [isDictionaryModalOpen, setIsDictionaryModalOpen] = useState(false);
  const [replacementSuggestion, setReplacementSuggestion] = useState<{
    word: string;
    replacement: string;
    start: number;
    end: number;
  } | null>(null);
  const [recentlyRejected, setRecentlyRejected] = useState<string | null>(null);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const dictionary =
    useQuery(api.dictionary.getDictionary, { userId: 'demo-user' }) || [];

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setShowSidebar(false); // Hide sidebar on mobile by default
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const { setEditor, setUndoManager } = useEditorStore();
  const updateDocument = useMutation(api.documents.updateById);
  // Note: updateContent is now handled by the Hocus Pocus server

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

  const rejectReplacement = () => {
    if (replacementSuggestion) {
      setRecentlyRejected(replacementSuggestion.word);
    }
    setReplacementSuggestion(null);
  };

  const acceptReplacement = () => {
    if (!editor || !replacementSuggestion) return;
    editor
      .chain()
      .focus()
      .insertContentAt({ from: replacementSuggestion.start, to: replacementSuggestion.end }, replacementSuggestion.replacement)
      .run();
    setReplacementSuggestion(null);
  };

  const handleTextReplace = () => {
    if (!editor) return;
    const pos = editor.state.selection.from;
    const textBefore = editor.state.doc.textBetween(0, pos, ' ');
    const match = /\S+$/.exec(textBefore);
    if (!match) return;
    const lastWord = match[0];
    const entry = dictionary.find(
      (e: any) => e.from === lastWord || (lastWord.startsWith('@') && e.from === lastWord.slice(1))
    );
    if (entry && lastWord !== recentlyRejected) {
      setReplacementSuggestion({
        word: lastWord,
        replacement: entry.to,
        start: pos - lastWord.length,
        end: pos,
      });
      if (suggestionTimeoutRef.current) clearTimeout(suggestionTimeoutRef.current);
      suggestionTimeoutRef.current = setTimeout(() => {
        acceptReplacement();
      }, 2000);
    }
  };


  // Initialize Y.js document
  ydocRef.current ??= new Y.Doc();
  
  // Save logic is now handled by the Hocus Pocus server

  // Enhanced WebSocket and Y.js integration
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
      // Document changes are now automatically saved by the Hocus Pocus server
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
      StarterKit.configure({
        history: false, // Disable StarterKit history to avoid conflicts with Collaboration
        heading: false, // Disable StarterKit heading to use our custom Heading extension
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
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
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
        HTMLAttributes: {
          class: 'heading',
        },
      }),
      Highlight.configure({ 
        multicolor: true,
        HTMLAttributes: {
          class: 'highlight',
        },
      }),
      Color.configure({
        types: ['textStyle'],
      }),
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
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
      Collaboration.configure({
        document: ydocRef.current,
      }),
    ],
  });

  useEffect(() => {
    const ydoc = ydocRef.current!;
    const documentName = doc._id;
    
    // Get WebSocket URL from environment or create secure fallback
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 
      `ws://127.0.0.1:6001`;
    
    console.log('🔗 Connecting to WebSocket:', wsUrl);
    console.log('📄 Document ID:', documentName);
    
    // Enhanced IndexedDB persistence with error handling
    const persistence = new IndexeddbPersistence(documentName, ydoc);
    
    persistence.on('update', () => {
      console.log('📦 Document loaded from IndexedDB');
    });

    // Enhanced HocusPocus provider with better error handling
    const newProvider = new HocuspocusProvider({
      url: wsUrl,
      name: documentName,
      document: ydoc,
    });

    providerRef.current = newProvider;

    // Create Y.js UndoManager for collaborative undo/redo
    const undoManager = new UndoManager(ydoc.getXmlFragment('default'), {
      captureTimeout: 1000,
    });
    undoManagerRef.current = undoManager;
    setUndoManager(undoManager);

    // Enhanced status tracking
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

    // Load initial content if available and Y.js is empty
    if ((doc.initialContent ?? initialContent) && editor) {
      setTimeout(() => {
        if (editor.isEmpty) {
          editor.commands.setContent(doc.initialContent ?? initialContent ?? '');
        }
      }, 100);
    }

    // Cleanup function
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
  }, [doc._id, doc.initialContent, initialContent, editor]);

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
    };
  }, [editor, dictionary, replacementSuggestion, recentlyRejected]);

  // Enhanced title handling
  const handleTitleSubmit = async () => {
    if (documentTitle.trim() && documentTitle !== doc.title) {
      try {
        await updateDocument({ 
          id: doc._id, 
          title: documentTitle.trim() 
        });
        toast.success("Document title updated!");
      } catch (error) {
        toast.error("Failed to update title");
        setDocumentTitle(doc.title); // Revert on error
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

  // Manual save is no longer needed - server handles automatic saving
  const handleForceSave = () => {
    toast.info("Documents are automatically saved by the server after 2 seconds of inactivity");
  };

  // Sidebar handlers
  const handleToggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const handleNavigateToHome = () => {
    window.location.href = '/';
  };

  const handleSetCurrentDocument = (documentId: Id<"documents">) => {
    window.location.href = `/documents/${documentId}`;
  };

  // Enhanced connection status indicator
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

  if (!editor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading collaborative editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FBFD] flex">
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
                  onBlur={handleTitleSubmit}
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
              
              {/* Info button about automatic saving */}
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
                      <MenubarItem onClick={() => setIsDictionaryModalOpen(true)}>
                        <Replace className="size-4 mr-2" />
                        Dicionário
                      </MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>
                </>
              )}
            </Menubar>
          </div>
        </div>
      </header>

      {/* Editor Container - Exactly like the reference */}
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

      <DictionaryModal
        isOpen={isDictionaryModalOpen}
        onClose={() => setIsDictionaryModalOpen(false)}
        isPrivate={true}
        session={null}
        createdById="demo-user"
      />

      {replacementSuggestion && (
        <ReplacementPopup
          word={replacementSuggestion.word}
          replacement={replacementSuggestion.replacement}
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