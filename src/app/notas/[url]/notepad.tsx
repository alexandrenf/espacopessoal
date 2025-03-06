"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Sidebar from "../../components/Sidebar";
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

// ---- Constants: tweak as needed
const IDLE_WAIT = 4000;    // Send update after 4s of no typing
const ACTIVE_WAIT = 8000;  // Force update if typing continues for 8s
const ERROR_MESSAGE_TIMEOUT = 5000;

interface AppProps {
  password: string | null;
}

export interface Note {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
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

  // --- Refs
  const latestContentRef = useRef("");
  const errorTimeoutRef = useRef<NodeJS.Timeout>();
  const utils = api.useUtils();
  const typingStartTimeRef = useRef<number | null>(null);
  const continuousTypingTimerRef = useRef<NodeJS.Timeout>();

  // ==========================
  // =        Queries         =
  // ==========================
  // Fetch all notes
  // ...
const {
  data,
  error,
  isLoading,
  refetch: refetchNotes
} = api.notes.fetchNotesPublic.useQuery(
  { url, password: password ?? undefined },
  {
    enabled: Boolean(url),
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30000, // Consider data stale after 30 seconds
    // Transform data as it arrives
    select: (fetchedNotes) =>
      fetchedNotes.map(note => ({
        ...note,
        content: note.content ?? ""
      })),
  }
);

// 2) Then handle "onSuccess" style logic with a useEffect
useEffect(() => {
  if (data && data.length > 0) {
    // e.g. store them in local state:
    setNotes(data);

    // If needed, pick a default note:
    if (currentNoteId === null) {
      if (data[0]?.id) {
        setCurrentNoteId(data[0].id);
      }
    }
  }
}, [data, currentNoteId]);
// ...

  // Track screen resizing for mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ==========================
  // =       Mutations        =
  // ==========================
  // Update note
  const updateNoteMutation = api.notes.updateNotePublic.useMutation({
    onMutate: async () => {
      // optional: cancel queries so we don’t overwrite local state
      await utils.notes.fetchNotesPublic.cancel({ url });
    },
    onSuccess: () => {
      // Don’t update local state here; we only do that after a “long pause” refetch
      setIsSaving(false);
    },
    onError: (err) => {
      handleError(err);
      setIsSaving(false);
    },
    retry: 2,
  });

  // We’ll store our update mutate function in a ref
  const updateNoteRef = useRef(updateNoteMutation.mutateAsync);
  useEffect(() => {
    updateNoteRef.current = updateNoteMutation.mutateAsync;
  }, [updateNoteMutation]);

  // Create note
  const createNoteMutation = api.notes.createNotePublic.useMutation({
    onMutate: async (variables) => {
      await utils.notes.fetchNotesPublic.cancel({ url });
      // Basic optimistic approach
      const newId = -Math.floor(Math.random() * 100000);
      const newNote: Note = {
        id: newId,
        content: variables.content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setNotes((prev) => [newNote, ...prev]);
      setCurrentNoteId(newId);
    },
    onError: (err) => handleError(err),
    onSuccess: () => {
      // After creating, we’re not forcibly refreshing right away
      // We rely on the “long pause” refetch for a full sync
    },
    retry: 2,
  });

  // Single source of truth for merging server and local state
  const handleServerDataUpdate = useCallback((serverData: Note[]) => {
    setNotes((prevNotes) => {
      return prevNotes.map(localNote => {
        const serverNote = serverData.find(n => n.id === localNote.id);
        // Preserve local changes for current note
        if (localNote.id === currentNoteId && latestContentRef.current) {
          return { ...localNote, content: latestContentRef.current };
        }
        // Use server data if available, otherwise keep local version
        return serverNote ?? localNote;
      });
    });

    // Handle initial note selection
    if (currentNoteId === null && serverData.length > 0) {
      const firstNote = serverData[0];
      if (firstNote?.id) {
        setCurrentNoteId(firstNote.id);
        latestContentRef.current = firstNote.content ?? "";
      }
    }
  }, [currentNoteId]);

  // Use the handler in the data effect
  useEffect(() => {
    if (data) {
      handleServerDataUpdate(data);
    }
  }, [data, handleServerDataUpdate]);

  // Delete note
  const deleteNoteMutation = api.notes.deleteNotePublic.useMutation({
    onMutate: async (deleteData) => {
      await utils.notes.fetchNotesPublic.cancel({ url });
      const previousNotes = notes;
      const previousCurrentNoteId = currentNoteId;

      // Optimistic update
      setNotes((prev) => prev.filter((n) => n.id !== deleteData.id));
      if (deleteData.id === currentNoteId) {
        setCurrentNoteId(null);
      }

      return { previousNotes, previousCurrentNoteId, deletedNoteId: deleteData.id };
    },
    onError: (error, _, context) => {
      if (context) {
        setNotes(context.previousNotes);
        setCurrentNoteId(context.previousCurrentNoteId);
        if (context.previousCurrentNoteId) {
          latestContentRef.current = context.previousNotes.find(
            note => note.id === context.previousCurrentNoteId
          )?.content ?? "";
        }
      }
      handleError(error);
    },
    onSuccess: async (_, variables, context) => {
      if (!context) return;

      if (currentNoteId === context.deletedNoteId) {
        idleDebounce.cancel();
        activeDebounce.cancel();
      }

      await utils.notes.fetchNotesPublic.invalidate({ 
        url, 
        password: password ?? undefined 
      });
    },
    retry: 2,
  });

  // ==========================
  // =       Debouncing       =
  // ==========================
  // This callback sends an update to the server after user stops typing
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
    [url, password, currentNoteId]
  );

  // This callback forces an update if user keeps typing
  const activeDebounce = useMemo(
    () =>
      debounce(
        async () => {
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
          // Reset typing start time after save
          typingStartTimeRef.current = null;
        },
        ACTIVE_WAIT
      ),
    [url, password, currentNoteId]
  );

  const handleTextChange = (text: string) => {
    latestContentRef.current = text;

    // Update local notes immediately for UI responsiveness
    // This will update the title in the sidebar letter by letter
    setNotes((prev) =>
      prev.map((note) =>
        note.id === currentNoteId 
          ? { ...note, content: text }  // Using the new content directly
          : note
      )
    );

    // Start tracking continuous typing if not already started
    if (!typingStartTimeRef.current) {
      typingStartTimeRef.current = Date.now();
    }

    // Calculate elapsed time since typing started
    const elapsedTime = Date.now() - (typingStartTimeRef.current ?? Date.now());
    
    // If we've been typing continuously for 8s or more, trigger an update
    if (elapsedTime >= ACTIVE_WAIT) {
      void activeDebounce();
      typingStartTimeRef.current = null; // Reset the timer after triggering
      return;
    }

    // Handle idle debounce normally
    void idleDebounce();
  };

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (continuousTypingTimerRef.current) {
        clearTimeout(continuousTypingTimerRef.current);
      }
    };
  }, []);

  // ==========================
  // =         Helpers        =
  // ==========================
  function handleError(err: unknown) {
    const message = getErrorMessage(err);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    setErrorMessage(message);
    errorTimeoutRef.current = setTimeout(() => setErrorMessage(null), ERROR_MESSAGE_TIMEOUT);
  }

  function createNewNote() {
    if (createNoteMutation.isPending) return;
    createNoteMutation.mutate({
      url,
      content: "Título da nota\n\n",
      password: password ?? undefined,
    });
  }

  async function handleSwitchNote(newNoteId: number) {
    // If we are switching to a different note
    if (currentNoteId !== null && currentNoteId !== newNoteId) {
      // Flush pending changes for the current note first
      await Promise.all([
        idleDebounce.flush(),
        activeDebounce.flush()
      ]).catch(err => handleError(err));

      // Force a refetch to ensure we have latest data
      await refetchNotes().catch(err => handleError(err));
    }

    // Switch current note
    setCurrentNoteId(newNoteId);
    if (isMobile) {
      setShowSidebar(false);
    }

    // Update our local ref to the selected note's content so the Editor sees the correct text
    const newNote = notes.find(note => note.id === newNoteId);
    if (newNote) {
      latestContentRef.current = newNote.content;
    }
  }

  function handleDeleteNote(e: React.MouseEvent<HTMLButtonElement>, noteId: number) {
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

  function findCurrentNote(): Note | null {
    return notes.find((n) => n.id === currentNoteId) ?? null;
  }

  // ==========================
  // =        Rendering       =
  // ==========================

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

  const currentNote = findCurrentNote();

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
              className={`w-full md:w-1/6 h-full border-r border-gray-200 transition-all duration-200
              ${isMobile && !showSidebar ? "hidden" : "block"}`}
            >
              <Sidebar
                notes={notes}
                currentNote={currentNote ?? { id: null, content: "" }}
                setCurrentNoteId={handleSwitchNote}
                newNote={createNewNote}
                deleteNote={handleDeleteNote}
                isCreating={createNoteMutation.isPending}
                isDeletingId={
                  deleteNoteMutation.isPending
                    ? deleteNoteMutation.variables?.id ?? null
                    : null
                }
                onToggleSidebar={isMobile ? () => setShowSidebar(!showSidebar) : undefined}
                showSidebar={showSidebar}
              />
            </div>
            {/* Editor */}
            <div
              className={`w-full md:w-5/6 h-full transition-all duration-200 relative
              ${currentNoteId !== null ? "block" : "hidden md:block"}`}
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
                  // Instead of passing "updateNote", we pass our handleTextChange
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
          // No notes
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






