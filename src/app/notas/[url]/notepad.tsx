"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  type MouseEvent,
} from "react";
import Sidebar, { type Note } from "~/app/components/Sidebar";
import Editor from "../../components/Editor";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { api } from "~/trpc/react";
import { useParams } from "next/navigation";
import { default as debounce } from "lodash/debounce";
import { default as throttle } from "lodash/throttle";
import { DeleteConfirmationModal } from "../../components/DeleteConfirmationModal";
import Header from "~/app/components/Header";
import { Button } from "~/components/ui/button";
import { Menu } from "lucide-react";
import { toast } from "~/hooks/use-toast";
import ResizeHandle from "~/components/ResizeHandle";
import FolderEditor from "~/app/components/FolderEditor";
import { useSession } from "next-auth/react";

const IDLE_WAIT = 4000; // Debounce for idle updates
const ACTIVE_WAIT = 8000; // Debounce if user keeps typing
const ERROR_MESSAGE_TIMEOUT = 5000;
const TYPING_TIMEOUT = 1000; // Time without keystrokes to consider typing stopped
// const STRUCTURE_NOTE_TITLE = "!FStruct!"; // Removed

interface AppProps {
  password: string | null;
}

type ErrorWithMessage = { message: string };

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;
  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    return new Error(String(maybeError));
  }
}

function getErrorMessage(error: unknown): string {
  return toErrorWithMessage(error).message;
}

interface UpdateStructureItem {
  id: number;
  parentId: number | null;
  order: number;
}

const App = ({ password }: AppProps): JSX.Element => {
  const params = useParams();
  const url = (params.url as string) || "";
  const { data: session } = useSession();

  // --- Local states
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNoteId, setCurrentNoteId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(250); // Default width
  const [isResizing, setIsResizing] = useState(false);
  const [isNoteLoading, setIsNoteLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const [localContent, setLocalContent] = useState<string>("");

  // --- Refs
  const latestContentRef = useRef<string>("");
  const errorTimeoutRef = useRef<NodeJS.Timeout>();
  const lastKeystrokeRef = useRef<number | null>(null);
  const continuousTypingTimerRef = useRef<NodeJS.Timeout>();
  const utils = api.useUtils();
  const debouncedUpdateNotes = useRef(
    debounce((text: string) => {
      setNotes((old) =>
        old.map((note) =>
          note.id === currentNoteId ? { ...note, content: text } : note
        )
      );
    }, 1000)
  );

  // ------------------------------
  // Fetch notes from the server
  // ------------------------------
  const {
    data,
    error,
    isLoading,
    refetch: refetchNotes,
  } = api.notes.fetchNotesPublic.useQuery(
    { url, password: password ?? undefined },
    {
      enabled: Boolean(url),
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30000,
      select: (fetchedNotes) =>
        fetchedNotes.map((note) => ({
          ...note,
          content: note.content ?? "",
        })),
    },
  );

  // After data is loaded, separate out the structure note from normal notes
  useEffect(() => {
    if (!data) return;

    setNotes(data);

    // If no currentNoteId, pick the first note if it exists
    if (currentNoteId === null && data.length > 0) {
      if (data[0]?.id) {
        setCurrentNoteId(data[0].id);
        latestContentRef.current = data[0].content;
      }
    }
  }, [data, currentNoteId]);

  // Check if user is on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ------------------------------
  // Mutations
  // ------------------------------
  // 1. Update a note
  const updateNoteMutation = api.notes.updateNotePublic.useMutation({
    onMutate: async () => {
      // Cancel any incoming refetch so we don't overwrite local state
      await utils.notes.fetchNotesPublic.cancel({ url });
    },
    onSuccess: () => {
      setIsSaving(false);
    },
    onError: (err) => {
      handleError(err);
      setIsSaving(false);
    },
    retry: 2,
  });

  // We'll store our update mutate function in a ref for easy usage
  const updateNoteRef = useRef(updateNoteMutation.mutateAsync);
  useEffect(() => {
    updateNoteRef.current = updateNoteMutation.mutateAsync;
  }, [updateNoteMutation]);

  // Helper function to handle notes with problematic orders
  const handleExistingNotesOrders = (currentNotes: Note[]) => {
    // Group notes by parent
    const groupedNotes = currentNotes.reduce((acc, note) => {
      const key = note.parentId?.toString() ?? "root";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(note);
      return acc;
    }, {} as Record<string, Note[]>);

    // Process each group independently
    const updatedNotes = currentNotes.map(note => {
      const groupKey = note.parentId?.toString() ?? "root";
      const group = groupedNotes[groupKey] ?? [];
      const indexInGroup = group.findIndex(n => n.id === note.id);
      
      return {
        ...note,
        order: indexInGroup + 1 // Start from 1
      };
    });

    // Sort by parentId and order to maintain hierarchy
    return updatedNotes.sort((a, b) => {
      if (a.parentId !== b.parentId) {
        return (a.parentId ?? 0) - (b.parentId ?? 0);
      }
      return a.order - b.order;
    });
  };

  // 2. Create a new note
  const createNoteMutation = api.notes.createNotePublic.useMutation({
    onMutate: async (variables) => {
      await utils.notes.fetchNotesPublic.cancel({ url });

      // Add an optimistic note
      const tempId = -Math.floor(Math.random() * 100_000);

      // Handle existing notes with problematic orders
      const updatedNotes = handleExistingNotesOrders(notes);
      if (updatedNotes !== notes) {
        setNotes(updatedNotes);
      }

      // Calculate initial order for the new note
      const siblings = updatedNotes.filter(n => n.parentId === null);
      const maxOrder = siblings.length > 0 
        ? Math.max(...siblings.map(n => n.order))
        : 0;
      
      const newNote: Note = {
        id: tempId,
        content: variables.content,
        createdAt: new Date(),
        updatedAt: new Date(),
        isOptimistic: true,
        parentId: null,
        isFolder: variables.isFolder ?? false,
        order: maxOrder + 1,
      };

      // Insert optimistically
      setNotes((prev) => [newNote, ...prev]);
      if (!variables.isFolder) {
        setCurrentNoteId(tempId);
      }
      latestContentRef.current = newNote.content;

      return { optimisticNote: newNote };
    },
    onError: (err, _, ctx) => {
      // If error creating note, revert
      if (ctx?.optimisticNote) {
        setNotes((prev) =>
          prev.filter((note) => note.id !== ctx.optimisticNote.id),
        );
        if (currentNoteId === ctx.optimisticNote.id) {
          setCurrentNoteId(null);
          latestContentRef.current = "";
        }
      }
      handleError(err);
    },
    onSuccess: async (actualNote, variables, ctx) => {
      if (ctx?.optimisticNote) {
        // Calculate proper order for the new note
        const siblings = notes.filter(n => n.parentId === null);
        const maxOrder = siblings.length > 0 
          ? Math.max(...siblings.map(n => n.order))
          : 0;
        
        setNotes((prev) =>
          prev.map((note) =>
            note.id === ctx.optimisticNote.id
              ? ({
                  ...actualNote,
                  content: latestContentRef.current,
                  parentId: null,
                  isFolder: variables.isFolder ?? false,
                  order: maxOrder + 1,
                } as Note)
              : note,
          ),
        );
        if (!variables.isFolder) {
          setCurrentNoteId(actualNote.id);
        }
      }

      // Force a refetch
      await utils.notes.fetchNotesPublic.invalidate({
        url,
        password: password ?? undefined,
      });
    },
    retry: 2,
  });

  // 3. Delete a note
  const deleteNoteMutation = api.notes.deleteNotePublic.useMutation({
    onMutate: async (variables) => {
      await utils.notes.fetchNotesPublic.cancel({ url });

      const prev = notes;
      const prevCurrent = currentNoteId;

      // Remove from local
      setNotes((old) => old.filter((n) => n.id !== variables.id));
      if (variables.id === currentNoteId) {
        setCurrentNoteId(null);
      }

      return {
        previousNotes: prev,
        previousCurrentNoteId: prevCurrent,
        deletedId: variables.id,
      };
    },
    onError: (err, _vars, ctx) => {
      // Revert if error
      if (ctx) {
        setNotes(ctx.previousNotes);
        setCurrentNoteId(ctx.previousCurrentNoteId);
        latestContentRef.current =
          ctx.previousNotes.find((n) => n.id === ctx.previousCurrentNoteId)
            ?.content ?? "";
      }
      handleError(err);
    },
    onSuccess: async (_data, _vars, ctx) => {
      if (ctx?.deletedId === currentNoteId) {
        idleDebounce.cancel();
        activeDebounce.cancel();
      }

      // Force refetch
      await utils.notes.fetchNotesPublic.invalidate({
        url,
        password: password ?? undefined,
      });
    },
    retry: 2,
  });

  // Add this mutation along with your other mutations
  const updateNoteStructureMutation = api.notes.updateStructure.useMutation({
    onError: (err) => {
      handleError(err);
    },
    // Remove the onSuccess refetch
  });

  // ------------------------------
  // Debounced Updates
  // ------------------------------
  // For user typing
  const idleDebounce = useMemo(
    () =>
      debounce(async () => {
        if (!currentNoteId) return;
        setIsSaving(true);
        try {
          await updateNoteRef.current({
            id: currentNoteId,
            content: latestContentRef.current,
            url,
            password: password ?? undefined,
          });
          setIsSaving(false);
        } catch (err) {
          handleError(err);
        }
      }, IDLE_WAIT),
    [currentNoteId, url, password],
  );

  const activeDebounce = useMemo(
    () =>
      throttle(async () => {
        if (!currentNoteId) return;
        setIsSaving(true);
        try {
          await updateNoteRef.current({
            id: currentNoteId,
            content: latestContentRef.current,
            url,
            password: password ?? undefined,
          });
          setIsSaving(false);
        } catch (err) {
          handleError(err);
        }
      }, ACTIVE_WAIT, { leading: false, trailing: true }),
    [currentNoteId, url, password],
  );

  // ------------------------------
  // Handlers
  // ------------------------------
  function handleError(err: unknown) {
    const msg = getErrorMessage(err);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    setErrorMessage(msg);
    errorTimeoutRef.current = setTimeout(
      () => setErrorMessage(null),
      ERROR_MESSAGE_TIMEOUT,
    );
    console.error("[Error]", msg);
  }

  function createNewNote() {
    if (createNoteMutation.isPending) return;
    createNoteMutation.mutate({
      url,
      content: "Título da nota\n",
      password: password ?? undefined,
    });
  }

  function handleNewFolder() {
    if (createNoteMutation.isPending) return;
    createNoteMutation.mutate({
      url,
      content: "Nova Pasta\n!color:#FFB3BA",
      password: password ?? undefined,
      isFolder: true,
    });
  }

  async function handleSwitchNote(noteId: number) {
    if (currentNoteId !== null && currentNoteId !== noteId) {
      setIsNoteLoading(true);
      try {
        await Promise.all([idleDebounce.flush(), activeDebounce.flush()]);
        await refetchNotes();
      } catch (err) {
        handleError(err);
      } finally {
        setIsNoteLoading(false);
      }
    }

    setCurrentNoteId(noteId);
    if (isMobile) setShowSidebar(false);

    const found = notes.find((n) => n.id === noteId);
    if (found) {
      latestContentRef.current = found.content;
    }
  }

  function handleDeleteNote(e: MouseEvent<Element>, noteId: number) {
    e.stopPropagation();
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const title = note.content.split("\n")[0]?.trim() ?? "Untitled";
    setNoteToDelete({ id: noteId, title });
    setIsDeleteModalOpen(true);
  }

  function handleConfirmDelete() {
    if (!noteToDelete || deleteNoteMutation.isPending) return;
    deleteNoteMutation.mutate({
      id: noteToDelete.id,
      url,
      password: password ?? undefined,
    });
    setIsDeleteModalOpen(false);
    setNoteToDelete(null);
  }

  function handleTextChange(text: string) {
    setLocalContent(text);
    
    // Update latest content ref immediately
    latestContentRef.current = text;
    
    // Find current note
    const currentNote = notes.find((n) => n.id === currentNoteId);
    if (!currentNote) return;

    // Immediately update the note in the notes array for UI purposes
    setNotes(prevNotes => prevNotes.map(note => 
      note.id === currentNoteId ? { ...note, content: text } : note
    ));
    
    // Update last keystroke timestamp
    const now = Date.now();
    lastKeystrokeRef.current = now;
    setIsTyping(true);

    // Clear any existing typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Debounce the notes state update
    debouncedUpdateNotes.current?.(text);

    // Clear any existing continuous typing timer
    if (continuousTypingTimerRef.current) {
      clearTimeout(continuousTypingTimerRef.current);
    }

    // Set up a new continuous typing timer
    continuousTypingTimerRef.current = setTimeout(() => {
      const currentTime = Date.now();
      const timeSinceLastKeystroke = lastKeystrokeRef.current 
        ? currentTime - lastKeystrokeRef.current 
        : 0;
      
      if (timeSinceLastKeystroke >= TYPING_TIMEOUT) {
        void activeDebounce.flush();
        lastKeystrokeRef.current = null;
      }
    }, TYPING_TIMEOUT);

    // Trigger both timers
    void idleDebounce();
    void activeDebounce();
  }

  const handleUpdateStructure = async (updates: UpdateStructureItem[]) => {
    // Store the previous state for rollback
    const previousNotes = [...notes];

    try {
      // Optimistically update the local state
      setNotes((prev) => {
        const updated = prev.map((note) => {
          const structureItem = updates.find((s) => s.id === note.id);
          if (!structureItem) return note;
          
          return {
            ...note,
            parentId: structureItem.parentId,
            order: structureItem.order,
          };
        });

        // Sort by parentId and order to maintain hierarchy
        return updated.sort((a, b) => {
          if (a.parentId !== b.parentId) {
            return (a.parentId ?? 0) - (b.parentId ?? 0);
          }
          return a.order - b.order;
        });
      });

      // Call the mutation
      await updateNoteStructureMutation.mutateAsync({
        url,
        password: password ?? undefined,
        updates,
      });

      // No need to refetch immediately since we're using optimistic updates
    } catch (error) {
      // Revert to previous state on error
      setNotes(previousNotes);
      handleError(error);
      toast({
        title: "Failed to update note structure",
        description: "Your changes couldn't be saved. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleResize = (e: globalThis.MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      // Limit the sidebar width between 150px and 50% of the window width
      const minWidth = 150;
      const maxWidth = window.innerWidth * 0.5;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleResize);
      window.addEventListener("mouseup", handleResizeEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleResize);
      window.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [isResizing]);

  // Cleanup
  useEffect(() => {
    return () => {
      idleDebounce.cancel();
      activeDebounce.cancel();
      if (continuousTypingTimerRef.current) {
        clearTimeout(continuousTypingTimerRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [idleDebounce, activeDebounce]);

  // The currently selected note for the editor
  const currentNote = notes.find((n) => n.id === currentNoteId) ?? null;

  // ------------------------------
  // Render
  // ------------------------------
  if (!url) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">URL inválida</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-red-500">{error.message}</div>
      </div>
    );
  }

  return (
    <main className="flex h-full flex-grow flex-col">
      {(!isMobile || (isMobile && showSidebar)) && <Header />}
      <div className="flex flex-grow">
        {/* Content */}
        {notes.length > 0 ? (
          <div className="flex h-full w-full flex-col md:flex-row">
            {/* Sidebar */}
            <div
              className={`relative h-full border-r border-gray-200 transition-all duration-200 ${isMobile && !showSidebar ? "hidden" : "block"} ${isMobile ? "w-full" : ""}`}
              style={{
                width: isMobile ? "100%" : `${sidebarWidth}px`,
                minWidth: isMobile ? "100%" : "150px",
                maxWidth: isMobile ? "100%" : "50%",
                transition: isResizing ? "none" : undefined,
              }}
            >
              <Sidebar
                notes={notes}
                currentNote={
                  currentNote ?? {
                    id: 0,
                    content: "",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    order: 0,
                    parentId: null,
                    isFolder: false,
                  }
                }
                setCurrentNoteId={handleSwitchNote}
                newNote={createNewNote}
                newFolder={handleNewFolder}
                deleteNote={handleDeleteNote}
                isCreating={createNoteMutation.isPending}
                isDeletingId={
                  deleteNoteMutation.isPending
                    ? (deleteNoteMutation.variables?.id ?? undefined)
                    : undefined
                }
                onToggleSidebar={
                  isMobile ? () => setShowSidebar(!showSidebar) : undefined
                }
                showSidebar={showSidebar}
                onUpdateStructure={handleUpdateStructure}
                isMobile={isMobile}
              />
              {/* Only show resize handle on desktop */}
              {!isMobile && <ResizeHandle onMouseDown={handleResizeStart} />}
            </div>

            {/* Editor */}
            <div
              className={`relative h-full transition-all duration-200 ${currentNoteId !== null ? "block" : "hidden md:block"} ${isMobile ? "w-full" : ""}`}
              style={{
                width: isMobile ? "100%" : `calc(100% - ${sidebarWidth}px)`,
              }}
            >
              {isMobile && !showSidebar && (
                <div className="fixed left-3 top-4 z-[100]">
                  <Button
                    onClick={() => setShowSidebar(true)}
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-9 w-9 bg-white/80 backdrop-blur-md hover:bg-white/90 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.15)] border border-gray-100/50 rounded-xl transition-all duration-200"
                  >
                    <Menu className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              )}
              {currentNote ? (
                currentNote.isFolder ? (
                  <FolderEditor
                    folder={currentNote}
                    onUpdate={handleTextChange}
                    isSaving={isSaving}
                  />
                ) : (
                  <Editor
                    currentNote={currentNote}
                    updateNote={handleTextChange}
                    isSaving={isSaving}
                    isLoading={isNoteLoading}
                    session={session}
                  />
                )
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Selecione uma nota para começar a editar
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col">
            <div className="flex flex-grow flex-col items-center justify-center gap-8 px-4">
              <h1 className="text-center text-lg font-semibold">
                Você não tem notas
              </h1>
              <button
                className="mt-4 rounded-lg bg-blue-500 px-6 py-3 text-white shadow-md transition hover:bg-blue-600"
                onClick={createNewNote}
                disabled={createNoteMutation.isPending}
              >
                {createNoteMutation.isPending ? (
                  <span className="flex items-center">
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Criando...
                  </span>
                ) : (
                  "Criar agora"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setNoteToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          noteTitle={noteToDelete?.title ?? ""}
          isDeleting={deleteNoteMutation.isPending}
        />
      </div>
    </main>
  );
};

export default App;
