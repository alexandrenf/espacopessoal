"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  type MouseEvent,
} from "react";
import Sidebar, { type NoteStructure } from "../../components/Sidebar";
import Editor from "../../components/Editor";
import { Alert } from "../../components/Alert";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { api } from "~/trpc/react";
import { useParams } from "next/navigation";
import { default as debounce } from "lodash/debounce";
import { DeleteConfirmationModal } from "../../components/DeleteConfirmationModal";
import Header from "~/app/components/Header";
import { Button } from "~/components/ui/button";
import { Menu } from "lucide-react";
import { toast } from "~/hooks/use-toast";
import ResizeHandle from "~/components/ResizeHandle";
const IDLE_WAIT = 4000; // Debounce for idle updates
const ACTIVE_WAIT = 8000; // Debounce if user keeps typing
const ERROR_MESSAGE_TIMEOUT = 5000;
// const STRUCTURE_NOTE_TITLE = "!FStruct!"; // Removed

interface AppProps {
  password: string | null;
}

export interface Note {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isOptimistic?: boolean; // Mark a note as optimistic if needed
  parentId: number | null;
  isFolder: boolean;
  order: number;
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

const App = ({ password }: AppProps): JSX.Element => {
  const params = useParams();
  const url = (params.url as string) || "";

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

  // --- Refs
  const latestContentRef = useRef<string>("");
  const errorTimeoutRef = useRef<NodeJS.Timeout>();
  const typingStartTimeRef = useRef<number | null>(null);
  const continuousTypingTimerRef = useRef<NodeJS.Timeout>();
  const utils = api.useUtils();

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
      // Cancel any incoming refetch so we don’t overwrite local state
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

  // Helper function to handle notes with zero order
  const handleExistingZeroOrderNotes = (currentNotes: Note[]) => {
    const existingZeroOrderNotes = currentNotes.filter(
      (note) => note.order === 0,
    );
    if (existingZeroOrderNotes.length === 0) return currentNotes;

    const nonZeroOrders = currentNotes
      .filter((note) => note.order > 0)
      .map((note) => note.order);

    const highestOrder =
      nonZeroOrders.length > 0 ? Math.max(...nonZeroOrders) : 0;

    return currentNotes.map((note) =>
      note.order === 0 ? { ...note, order: highestOrder } : note,
    );
  };

  // 2. Create a new note
  const createNoteMutation = api.notes.createNotePublic.useMutation({
    onMutate: async (variables) => {
      await utils.notes.fetchNotesPublic.cancel({ url });

      // Add an optimistic note
      const tempId = -Math.floor(Math.random() * 100_000);

      // Handle existing notes with order 0
      const updatedNotes = handleExistingZeroOrderNotes(notes);
      if (updatedNotes !== notes) {
        setNotes(updatedNotes);
      }

      const newNote: Note = {
        id: tempId,
        content: variables.content,
        createdAt: new Date(),
        updatedAt: new Date(),
        isOptimistic: true,
        parentId: null,
        isFolder: false,
        order: 0, // New note stays at 0 to appear first
      };

      // Insert optimistically
      setNotes((prev) => [newNote, ...prev]);
      setCurrentNoteId(tempId);
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
    onSuccess: async (actualNote, _, ctx) => {
      if (ctx?.optimisticNote) {
        setNotes((prev) =>
          prev.map((note) =>
            note.id === ctx.optimisticNote.id
              ? ({
                  ...actualNote,
                  content: latestContentRef.current,
                  parentId: null,
                  isFolder: false,
                  order: 0,
                } as Note)
              : note,
          ),
        );
        setCurrentNoteId(actualNote.id);
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
        typingStartTimeRef.current = null;
      }, ACTIVE_WAIT),
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
      content: "Título da nota\n\n",
      password: password ?? undefined,
    });
  }

  function handleNewFolder() {
    if (createNoteMutation.isPending) return;
    createNoteMutation.mutate({
      url,
      content: "Nova Pasta\n\n",
      password: password ?? undefined,
      isFolder: true, // Add this parameter to indicate it's a folder
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

  function handleDeleteNote(e: MouseEvent<HTMLButtonElement>, noteId: number) {
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
    latestContentRef.current = text;
    setNotes((old) =>
      old.map((note) =>
        note.id === currentNoteId ? { ...note, content: text } : note,
      ),
    );

    if (!typingStartTimeRef.current) {
      typingStartTimeRef.current = Date.now();
    }

    const elapsed = Date.now() - (typingStartTimeRef.current ?? Date.now());
    if (elapsed >= ACTIVE_WAIT) {
      void activeDebounce();
      typingStartTimeRef.current = null;
      return;
    }
    void idleDebounce();
  }

  const handleUpdateStructure = async (newStructure: NoteStructure[]) => {
    // Store the previous state for rollback
    const previousNotes = [...notes];

    try {
      // Optimistically update the local state
      setNotes((prev) => {
        const updated = prev.map((note) => {
          const structureItem = newStructure.find((s) => s.id === note.id);
          return structureItem ? { ...note, order: structureItem.order } : note;
        });
        return updated.sort((a, b) => a.order - b.order);
      });

      await updateNoteStructureMutation.mutateAsync({
        url,
        password: password ?? undefined,
        updates: newStructure,
      });

      // Refetch notes to ensure consistency
      await utils.notes.fetchNotesPublic.invalidate({
        url,
        password: password ?? undefined,
      });
    } catch (error) {
      // Revert to previous state on error
      setNotes(previousNotes);
      handleError(error);
      // Add a user-friendly toast notification
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
    // Store ref value in a variable inside the effect
    const timerRef = continuousTypingTimerRef.current;

    return () => {
      idleDebounce.cancel();
      activeDebounce.cancel();
      if (timerRef) {
        clearTimeout(timerRef);
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
        <Alert error={errorMessage} isSaving={isSaving} />
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
                    ? (deleteNoteMutation.variables?.id ?? null)
                    : null
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
                <div className="absolute left-4 top-4 z-10">
                  <Button
                    onClick={() => setShowSidebar(true)}
                    variant="outline"
                    size="icon"
                    className="md:hidden"
                  >
                    <Menu className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {currentNote ? (
                <Editor
                  currentNote={currentNote}
                  updateNote={handleTextChange}
                  isSaving={isSaving}
                  isLoading={isNoteLoading}
                />
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
