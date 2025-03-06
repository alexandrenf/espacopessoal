"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  MouseEvent,
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
import ResizeHandle from '~/components/ResizeHandle';
const IDLE_WAIT = 4000; // Debounce for idle updates
const ACTIVE_WAIT = 8000; // Debounce if user keeps typing
const ERROR_MESSAGE_TIMEOUT = 5000;
const STRUCTURE_NOTE_TITLE = "!FStruct!";

interface AppProps {
  password: string | null;
}

export interface Note {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isOptimistic?: boolean; // Mark a note as optimistic if needed
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

const App: React.FC<AppProps> = ({ password }) => {
  const params = useParams();
  const url = (params.url as string) || "";

  // --- Local states
  const [notes, setNotes] = useState<Note[]>([]);
  const [structureNote, setStructureNote] = useState<Note | null>(null); // <--- Store our special note
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

  // --- Refs
  const latestContentRef = useRef<string>("");
  const errorTimeoutRef = useRef<NodeJS.Timeout>();
  const typingStartTimeRef = useRef<number | null>(null);
  const continuousTypingTimerRef = useRef<NodeJS.Timeout>();
  const utils = api.useUtils();

  // ------------------------------
  // Fetch notes from the server
  // ------------------------------
  const { data, error, isLoading, refetch: refetchNotes } =
    api.notes.fetchNotesPublic.useQuery(
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
      }
    );

  // After data is loaded, separate out the structure note from normal notes
  useEffect(() => {
    if (!data) return;
    // Look for the special note
    let structNote: Note | null = null;
    const normalNotes: Note[] = [];

    for (const note of data) {
      const firstLine = note.content.split("\n")[0]?.trim();
      if (firstLine === STRUCTURE_NOTE_TITLE) {
        structNote = note;
      } else {
        normalNotes.push(note);
      }
    }

    setStructureNote(structNote);
    setNotes(normalNotes);

    // If no currentNoteId, pick the first normal note if it exists
    if (currentNoteId === null && normalNotes.length > 0) {
      if (normalNotes[0]?.id) {
        setCurrentNoteId(normalNotes[0].id);
        latestContentRef.current = normalNotes[0].content;
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

  // 2. Create a new note
  const createNoteMutation = api.notes.createNotePublic.useMutation({
    onMutate: async (variables) => {
      // Disallow creating a note with "!FStruct!" as its first line
      const firstLine = variables.content.split("\n")[0]?.trim() ?? "";
      if (firstLine === STRUCTURE_NOTE_TITLE) {
        throw new Error(
          `"${STRUCTURE_NOTE_TITLE}" is reserved and cannot be used as a note title.`
        );
      }

      await utils.notes.fetchNotesPublic.cancel({ url });

      // Add an optimistic note
      const tempId = -Math.floor(Math.random() * 100_000);
      const newNote: Note = {
        id: tempId,
        content: variables.content,
        createdAt: new Date(),
        updatedAt: new Date(),
        isOptimistic: true,
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
          prev.filter((note) => note.id !== ctx.optimisticNote.id)
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
        // Replace the optimistic note with the actual one
        setNotes((prev) =>
          prev.map((note) =>
            note.id === ctx.optimisticNote.id
              ? { ...actualNote, content: latestContentRef.current }
              : note
          )
        );
        setCurrentNoteId(actualNote.id);
      }

      // Force a refetch
      await utils.notes.fetchNotesPublic.invalidate({ url, password: password ?? undefined });
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
      await utils.notes.fetchNotesPublic.invalidate({ url, password: password ?? undefined });
    },
    retry: 2,
  });

  // 4. Update the structure note
  const updateStructureMutation = api.notes.updateStructureNote.useMutation({
    onError: (err) => {
      handleError(err);
    },
    onSuccess: async () => {
      // Force a refetch to update the data
      await utils.notes.fetchNotesPublic.invalidate({ 
        url, 
        password: password ?? undefined 
      });
    }
  });

  // Add this mutation along with your other mutations
  const updateNoteStructureMutation = api.notes.updateStructure.useMutation({
    onError: (err) => {
      handleError(err);
    },
    onSuccess: async () => {
      // Force a refetch to update the data
      await utils.notes.fetchNotesPublic.invalidate({ 
        url, 
        password: password ?? undefined 
      });
    }
  });

  // Add this mutation with your other mutations
  const createStructureNoteMutation = api.notes.createStructureNote.useMutation({
    onError: (err) => {
      handleError(err);
    },
    onSuccess: async () => {
      // Force a refetch to update the data
      await utils.notes.fetchNotesPublic.invalidate({ 
        url, 
        password: password ?? undefined 
      });
    }
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
    [currentNoteId, url, password]
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
    [currentNoteId, url, password]
  );

  // ------------------------------
  // Handlers
  // ------------------------------
  function handleError(err: unknown) {
    const msg = getErrorMessage(err);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    setErrorMessage(msg);
    errorTimeoutRef.current = setTimeout(() => setErrorMessage(null), ERROR_MESSAGE_TIMEOUT);
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
    toast({
      title: "Coming soon!",
      description: "Folder creation logic is not yet implemented.",
    });
  }

  async function handleSwitchNote(noteId: number) {
    if (currentNoteId !== null && currentNoteId !== noteId) {
      await Promise.all([idleDebounce.flush(), activeDebounce.flush()]).catch(handleError);
      await refetchNotes().catch(handleError);
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
        note.id === currentNoteId ? { ...note, content: text } : note
      )
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

  const ensureStructureNote = async () => {
    if (structureNote) return structureNote;

    // Se não existe nota de estrutura, cria uma com a ordem atual das notas
    const initialStructure = notes
      .filter(note => !note.content?.startsWith(STRUCTURE_NOTE_TITLE))
      .map((note, index) => ({
        id: note.id,
        parentId: null,
        order: index
      }));

    try {
      // Use a mutation específica para criar a nota de estrutura
      const result = await createStructureNoteMutation.mutateAsync({
        url,
        password: password ?? undefined,
        structure: initialStructure
      });

      // Atualize o estado local
      setStructureNote(result ? { ...result, content: result.content ?? '' } : null);
      return result;
    } catch (err) {
      console.error("[Debug] Error creating structure note:", err);
      handleError(err);
      return null;
    }
  };

  const handleUpdateStructure = async (newStructure: NoteStructure[]) => {
    // Optimistically update the notes order in the UI
    const reorderedNotes = [...notes].sort((a, b) => {
      const aOrder = newStructure.find(s => s.id === a.id)?.order ?? 0;
      const bOrder = newStructure.find(s => s.id === b.id)?.order ?? 0;
      return aOrder - bOrder;
    });
    
    // Update the local state immediately
    setNotes(reorderedNotes);

    try {
      // Use the mutation to update the structure
      await updateNoteStructureMutation.mutateAsync({
        url,
        password: password ?? undefined,
        structure: newStructure
      });
    } catch (error) {
      // If the API call fails, revert to the original order
      setNotes(notes);
      console.error('Failed to update note structure:', error);
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
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', handleResizeEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', handleResizeEnd);
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
    <main className="h-full flex flex-col flex-grow">
      {(!isMobile || (isMobile && showSidebar)) && <Header />}
      <div className="flex-grow flex">
        <Alert error={errorMessage} isSaving={isSaving} />
        {/* Content */}
        {notes.length > 0 ? (
          <div className="flex w-full h-full flex-col md:flex-row">
            {/* Sidebar */}
            <div
              className={`h-full border-r border-gray-200 transition-all duration-200 relative
                ${isMobile && !showSidebar ? "hidden" : "block"}
                ${isMobile ? "w-full" : ""}`}
              style={{ 
                width: isMobile ? '100%' : `${sidebarWidth}px`,
                minWidth: isMobile ? '100%' : '150px',
                maxWidth: isMobile ? '100%' : '50%',
                transition: isResizing ? 'none' : undefined 
              }}
            >
              <Sidebar
                notes={notes}
                currentNote={currentNote ?? { 
                  id: 0, 
                  content: "", 
                  createdAt: new Date(), 
                  updatedAt: new Date() 
                }}
                setCurrentNoteId={handleSwitchNote}
                newNote={createNewNote}
                newFolder={handleNewFolder}
                deleteNote={handleDeleteNote}
                isCreating={createNoteMutation.isPending}
                isDeletingId={
                  deleteNoteMutation.isPending
                    ? deleteNoteMutation.variables?.id ?? null
                    : null
                }
                onToggleSidebar={isMobile ? () => setShowSidebar(!showSidebar) : undefined}
                showSidebar={showSidebar}
                onUpdateStructure={handleUpdateStructure}
                isMobile={isMobile}
              />
              {/* Only show resize handle on desktop */}
              {!isMobile && <ResizeHandle onMouseDown={handleResizeStart} />}
            </div>

            {/* Editor */}
            <div
              className={`h-full transition-all duration-200 relative
                ${currentNoteId !== null ? "block" : "hidden md:block"}
                ${isMobile ? "w-full" : ""}`}
              style={{ 
                width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)` 
              }}
            >
              {isMobile && !showSidebar && (
                <div className="absolute top-4 left-4 z-10">
                  <Button
                    onClick={() => setShowSidebar(true)}
                    variant="outline"
                    size="icon"
                    className="md:hidden"
                  >
                    <Menu className="w-3 h-3" />
                  </Button>
                </div>
              )}
              {currentNote ? (
                <Editor
                  currentNote={currentNote}
                  updateNote={handleTextChange}
                  isSaving={isSaving}
                  isLoading={false}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  Selecione uma nota para começar a editar
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col">
            <div className="flex-grow flex flex-col items-center justify-center gap-8 px-4">
              <h1 className="text-lg font-semibold text-center">
                Você não tem notas
              </h1>
              <button
                className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition"
                onClick={createNewNote}
                disabled={createNoteMutation.isPending}
              >
                {createNoteMutation.isPending ? (
                  <span className="flex items-center">
                    <LoadingSpinner className="w-4 h-4 mr-2" />
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











