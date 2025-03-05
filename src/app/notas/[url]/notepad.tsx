"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Sidebar from "../../components/Sidebar";
import Editor from "../../components/Editor";
import { Alert } from "../../components/Alert";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { api } from "~/trpc/react";
import { useParams } from "next/navigation";
import { default as debounce } from "lodash/debounce";
import type { DebouncedFunc } from "lodash";
import { DeleteConfirmationModal } from "../../components/DeleteConfirmationModal";
import Header from "~/app/components/Header";
import { Button } from "~/components/ui/button";
import { Menu } from "lucide-react";

interface AppProps {
  password: string | null;
}

const DEBOUNCE_DELAY = 4000;
const MAX_WAIT = DEBOUNCE_DELAY * 2;
const ERROR_MESSAGE_TIMEOUT = 5000;

export interface Note {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface OptimisticNote extends Note {
  isOptimistic: boolean;
}

type ErrorWithMessage = {
  message: string;
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
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
  const utils = api.useUtils();

  // Local state
  const [notes, setNotes] = useState<(Note | OptimisticNote)[]>([]);
  const [currentNoteId, setCurrentNoteId] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<{ id: number; title: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Refs to track optimistic updates:
  const lastSentTextRef = useRef<string>("");
  const lastGoodContentRef = useRef<string>("");

  // Ref to track the latest local content
  const currentContentRef = useRef<string>("");

  // Track if we're expecting a refetch
  const expectingRefetchRef = useRef(false);

  // Fetch notes from the server.
  const { data, error, isLoading, isFetching: queryIsFetching } = api.notes.fetchNotesPublic.useQuery(
    { url, password: password ?? undefined },
    {
      enabled: Boolean(url),
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 0, // Consider data always stale to ensure fresh data
      gcTime: 5 * 60 * 1000, // Cache for 5 minutes
      refetchInterval: false,
      select: (newData: {
        id: number;
        content: string | null;
        createdAt: Date;
        updatedAt: Date;
      }[]) => {
        if (newData && expectingRefetchRef.current) {
          // If we're expecting this refetch (after create), don't reset the current note
          setNotes(
            newData?.map((note: { 
              id: number; 
              content: string | null; 
              createdAt: Date; 
              updatedAt: Date; 
            }) => ({
              ...note,
              content: note.content ?? "",
            })) ?? []
          );
          expectingRefetchRef.current = false;
        }
        return newData;
      }
    }
  );

  useEffect(() => {
    if (data && data.length > 0 && !expectingRefetchRef.current) {
      const processedNotes = data.map((note) => ({
        ...note,
        content: note.content ?? "",
      }));
      setNotes(processedNotes);
      if (processedNotes.length > 0 && currentNoteId === null) {
        setCurrentNoteId(processedNotes[0]?.id ?? null);
        lastGoodContentRef.current = processedNotes[0]?.content ?? "";
      }
    }
  }, [data, currentNoteId]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mutation to update a note.
  const errorTimeoutRef = useRef<NodeJS.Timeout>();
  const updateNoteMutation = api.notes.updateNotePublic.useMutation({
    onMutate: async (newNoteData) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await utils.notes.fetchNotesPublic.cancel({ url });

      // Snapshot the previous state
      const previousNotes = notes;

      // Optimistically update the note
      setNotes((prev) =>
        prev.map((note) =>
          note.id === newNoteData.id
            ? { ...note, content: newNoteData.content }
            : note
        )
      );

      // Return context with the previous state
      return { previousNotes };
    },
    onSuccess: (updatedNote) => {
      setUpdateError(null);
      setIsSaving(false);
      
      // Only update if the server response matches our last sent content
      if (lastSentTextRef.current === currentContentRef.current) {
        lastGoodContentRef.current = updatedNote.content ?? "";
      }
      
      // Quietly invalidate in the background
      void utils.notes.fetchNotesPublic.invalidate({ url, password: password ?? undefined });
    },
    onError: (error, newNote, context) => {
      // On error, restore the previous state
      if (context) {
        setNotes(context.previousNotes);
      }
      
      const errorMessage = getErrorMessage(error);
      setUpdateError(errorMessage);
      setIsSaving(false);
      
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => setUpdateError(null), ERROR_MESSAGE_TIMEOUT);
    },
    retry: 2,
  });

  // Store the mutateAsync function in a ref.
  const updateMutateAsyncRef = useRef(updateNoteMutation.mutateAsync);
  useEffect(() => {
    updateMutateAsyncRef.current = updateNoteMutation.mutateAsync;
  }, [updateNoteMutation]);

  // Create the debounced update function only once.
  const debouncedUpdate: DebouncedFunc<(text: string, noteId: number) => void> =
    useMemo(
      () =>
        debounce(
          (text: string, noteId: number) => {
            //console.log("Debounced update triggered:", {
            //  noteId,
            //  textLength: text.length,
            //});
            setIsSaving(true);
            lastSentTextRef.current = text;
            
            let retryCount = 0;
            const maxRetries = 3;
            
            const retryUpdate = async () => {
              try {
                await updateMutateAsyncRef.current({ 
                  id: noteId, 
                  content: text,
                  url,
                  password: password ?? undefined
                });
                setIsSaving(false);
              } catch (error) {
                if (retryCount < maxRetries) {
                  retryCount++;
                  //console.log(`Retrying update (${retryCount}/${maxRetries})...`);
                  setTimeout(() => void retryUpdate(), 1000 * retryCount);
                } else {
                  handleError(error);
                }
              }
            };

            const handleError = (error: unknown) => {
              console.error("Error updating note:", error);
              setIsSaving(false);
              if (error instanceof Error) {
                setUpdateError(error.message);
              } else {
                setUpdateError("Failed to update note");
              }
            };

            void retryUpdate();
          },
          DEBOUNCE_DELAY,
          { maxWait: MAX_WAIT }
        ),
      [password, url]
    );

  useEffect(() => {
    return () => {
      debouncedUpdate.flush();
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  // Handler to create a new note
  const createNoteMutation = api.notes.createNotePublic.useMutation({
    onMutate: async (newNoteData) => {
      try {
        await utils.notes.fetchNotesPublic.cancel({ url });

        const previousNotes = notes;
        const previousCurrentNoteId = currentNoteId;
        const tempId = -Math.floor(Math.random() * 1000000);
        
        const optimisticNote: OptimisticNote = {
          id: tempId,
          content: newNoteData.content,
          createdAt: new Date(),
          updatedAt: new Date(),
          isOptimistic: true,
        };
        
        setNotes((prev) => [optimisticNote, ...prev]);
        
        return { previousNotes, previousCurrentNoteId, tempId };
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        console.error('Failed to prepare optimistic update:', errorMessage);
        setUpdateError(`Failed to create note: ${errorMessage}`);
        return { previousNotes: notes, previousCurrentNoteId: currentNoteId, tempId: null };
      }
    },
    onError: (error, newNote, context) => {
      if (context) {
        setNotes(context.previousNotes);
        setCurrentNoteId(context.previousCurrentNoteId);
      }
      const errorMessage = getErrorMessage(error);
      console.error('Failed to create note:', errorMessage);
      setUpdateError(`Failed to create note: ${errorMessage}`);
    },
    onSuccess: async (_newNote, _variables, _context) => {
      try {
        await utils.notes.fetchNotesPublic.invalidate({ url, password: password ?? undefined });
      } catch (error) {
        console.error('Error invalidating cache:', getErrorMessage(error));
      }
    },
    retry: 2,
  });

  function createNewNote(): void {
    if (createNoteMutation.isPending) return;
    const newNoteContent = "Título da nota\n\n";
    createNoteMutation.mutate({
      url,
      content: newNoteContent,
      password: password ?? undefined
    });
  }

  // Handler to update a note.
  function updateNote(text: string): void {
    if (currentNoteId !== null) {
      const noteExists = notes.some(note => note.id === currentNoteId);
      if (!noteExists) {
        return; // Ignore updates for non-existent notes
      }

      currentContentRef.current = text;
      
      setNotes((prev) =>
        prev.map((note) =>
          note.id === currentNoteId ? { ...note, content: text } : note
        )
      );
      debouncedUpdate(text, currentNoteId);
    }
  }

  // New: Handler for switching notes that flushes any pending update.
  function handleSwitchNote(newNoteId: number): void {
    if (currentNoteId !== null && currentNoteId !== newNoteId) {
      // Flush pending changes for the current note before switching
      debouncedUpdate.flush();
      
      // Force a refetch to ensure we have the latest data
      void utils.notes.fetchNotesPublic.invalidate({ url, password: password ?? undefined });
    }
    
    setCurrentNoteId(newNoteId);
    if (isMobile) {
      setShowSidebar(false);
    }
    
    // Get the latest version of the note from our notes array
    const newNote = notes.find(note => note.id === newNoteId);
    if (newNote) {
      lastGoodContentRef.current = newNote.content;
    }
  }

  // Handler to delete a note
  const deleteNoteMutation = api.notes.deleteNotePublic.useMutation({
    onMutate: async (deleteData) => {
      try {
        await utils.notes.fetchNotesPublic.cancel({ url });
        
        const previousNotes = notes;
        const previousCurrentNoteId = currentNoteId;
        
        const currentIndex = notes.findIndex(note => note.id === deleteData.id);
        const nextNote = notes[currentIndex + 1] ?? notes[currentIndex - 1];
        
        setNotes((prev) => prev.filter(note => note.id !== deleteData.id));
        
        if (currentNoteId === deleteData.id) {
          setCurrentNoteId(nextNote?.id ?? null);
          if (nextNote) {
            lastGoodContentRef.current = nextNote.content;
          }
        }
        
        return { previousNotes, previousCurrentNoteId, deletedNoteId: deleteData.id };
      } catch (error) {
        console.error('Error in delete onMutate:', getErrorMessage(error));
        return { previousNotes: notes, previousCurrentNoteId: currentNoteId, deletedNoteId: null };
      }
    },
    onError: (error, deleteData, context) => {
      if (context) {
        setNotes(context.previousNotes);
        setCurrentNoteId(context.previousCurrentNoteId);
        lastGoodContentRef.current = context.previousNotes.find(
          note => note.id === context.previousCurrentNoteId
        )?.content ?? "";
      }
      const errorMessage = getErrorMessage(error);
      console.error('Failed to delete note:', errorMessage);
      setUpdateError(`Failed to delete note: ${errorMessage}`);
    },
    onSuccess: async (_, variables, context) => {
      if (!context) return;
      
      if (currentNoteId === context.deletedNoteId) {
        debouncedUpdate.cancel();
      }

      try {
        await utils.notes.fetchNotesPublic.invalidate({ url, password: password ?? undefined });
      } catch (error) {
        console.error('Error invalidating cache after delete:', getErrorMessage(error));
      }
    },
    retry: 2,
  });

  function deleteNote(
    event: React.MouseEvent<HTMLButtonElement>,
    noteId: number
  ): void {
    event.stopPropagation();
    if (deleteNoteMutation.isPending) return;
    
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    const noteTitle = note.content.split('\n')[0]?.trim() ?? "Untitled Note";
    setNoteToDelete({ id: noteId, title: noteTitle });
    setIsDeleteModalOpen(true);
  }

  function handleConfirmDelete(): void {
    if (!noteToDelete || deleteNoteMutation.isPending) return;
    deleteNoteMutation.mutate({ 
      id: noteToDelete.id,
      url,
      password: password ?? undefined
    });
    setIsDeleteModalOpen(false);
    setNoteToDelete(null);
  }

  function findCurrentNote():
    | Note
    | { id: number | null; content: string } {
    return (
      notes.find((note) => note.id === currentNoteId) ?? {
        id: null,
        content: "",
      }
    );
  }

  useEffect(() => {
    setIsFetching(queryIsFetching);
  }, [queryIsFetching]);

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
      {/* Only show header when sidebar is visible on mobile */}
      {(!isMobile || (isMobile && showSidebar)) && <Header />}
      <div className="flex-grow flex">
        <Alert error={updateError} isSaving={isSaving} />
        {notes.length > 0 ? (
          <div className="flex w-full h-full flex-col md:flex-row">
            {/* Sidebar */}
            <div className={`
              w-full md:w-1/6 h-full border-r border-gray-200 transition-all duration-200
              ${isMobile && !showSidebar ? 'hidden' : 'block'}
            `}>
              <Sidebar
                notes={notes}
                currentNote={findCurrentNote()}
                setCurrentNoteId={handleSwitchNote}
                newNote={createNewNote}
                deleteNote={deleteNote}
                isCreating={createNoteMutation.isPending}
                isDeletingId={deleteNoteMutation.isPending ? (deleteNoteMutation.variables?.id ?? null) : null}
                onToggleSidebar={isMobile ? () => setShowSidebar(!showSidebar) : undefined}
                showSidebar={showSidebar}
              />
            </div>

            {/* Editor */}
            <div className={`
              w-full md:w-5/6 h-full transition-all duration-200 relative
              ${currentNoteId !== null ? 'block' : 'hidden md:block'}
            `}>
              {isMobile && !showSidebar && (
                <div className="absolute top-4 left-4 z-10">
                  <Button
                    onClick={() => setShowSidebar(true)}
                    variant="outline"
                    size="icon"
                    className="md:hidden"
                    aria-label="Alternar barra lateral"
                  >
                    <Menu className="w-3 h-3" />
                  </Button>
                </div>
              )}
              {currentNoteId !== null && notes.length > 0 ? (
                <div className="relative">
                  <Editor
                    currentNote={findCurrentNote()}
                    updateNote={updateNote}
                    isSaving={isSaving}
                    isLoading={isFetching}
                  />
                </div>
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
              <h1 className="text-lg font-semibold text-center">Você não tem notas</h1>
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
}

export default App;
