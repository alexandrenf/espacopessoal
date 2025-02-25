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

// Add a type for error handling
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
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<{ id: number; title: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Refs to track optimistic updates:
  // - lastSentTextRef: holds the text that was sent with the mutation
  // - lastGoodContentRef: holds the last successfully saved content
  const lastSentTextRef = useRef<string>("");
  const lastGoodContentRef = useRef<string>("");

  // Add a ref to track the latest local content
  const currentContentRef = useRef<string>("");

  // Add this to track if we're expecting a refetch
  const expectingRefetchRef = useRef(false);

  // Fetch notes from the server.
  const { data, error, isLoading } = api.notes.fetchNotesPublic.useQuery(
    { url, password: password ?? undefined },
    {
      enabled: Boolean(url),
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
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
    onSuccess: (updatedNote) => {
      setUpdateError(null);
      
      if (lastSentTextRef.current === currentContentRef.current) {
        setNotes((prev) =>
          prev.map((note) =>
            note.id === updatedNote.id
              ? { ...updatedNote, content: updatedNote.content ?? "" }
              : note
          )
        );
        lastGoodContentRef.current = updatedNote.content ?? "";
      }
    },
    onError: (error) => {
      const errorMessage = getErrorMessage(error);
      setUpdateError(errorMessage);
      console.error('Failed to update note:', errorMessage);

      if (lastSentTextRef.current === currentContentRef.current) {
        setNotes((prev) =>
          prev.map((note) =>
            note.id === currentNoteId
              ? { ...note, content: lastGoodContentRef.current }
              : note
          )
        );
      }

      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => setUpdateError(null), ERROR_MESSAGE_TIMEOUT);
    },
    retry: 2,
  });

  // Store the mutateAsync function in a ref to avoid recreating the debounced function.
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
            console.log("Debounced update triggered:", {
              noteId,
              textLength: text.length,
            });
            setIsSaving(true);
            lastSentTextRef.current = text;
            
            let retryCount = 0;
            const maxRetries = 3;
            
            const retryUpdate = async () => {
              try {
                const result = await updateMutateAsyncRef.current({ 
                  id: noteId, 
                  content: text,
                  url,
                  password: password ?? undefined
                });
                console.log("Note saved successfully:", result);
                setIsSaving(false);
              } catch (error) {
                if (retryCount < maxRetries) {
                  retryCount++;
                  console.log(`Retrying update (${retryCount}/${maxRetries})...`);
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
      []
    );

  // Add cleanup effect for debounced updates
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
    onSuccess: async (newNote, variables, context) => {
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
      password: password ?? undefined  // Add the password here
    });
  }

  // Handler to update a note.
  function updateNote(text: string): void {
    if (currentNoteId !== null) {
      // Check if the note still exists
      const noteExists = notes.some(note => note.id === currentNoteId);
      if (!noteExists) {
        return; // Silently ignore updates for non-existent notes
      }

      // Update our ref with the latest content
      currentContentRef.current = text;
      
      // Update local state immediately
      setNotes((prev) =>
        prev.map((note) =>
          note.id === currentNoteId ? { ...note, content: text } : note
        )
      );
      // Schedule the debounced update
      debouncedUpdate(text, currentNoteId);
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
    <main className="h-screen flex">
      <Alert error={updateError} isSaving={isSaving} />
      {notes.length > 0 ? (
        <div className="flex w-full h-full flex-col md:flex-row">
          {/* Sidebar */}
          <div className={`
            w-full md:w-1/6 h-full border-r border-gray-300 transition-all duration-200
            ${isMobile && !showSidebar ? 'hidden' : 'block'}
          `}>
            <Sidebar
              notes={notes}
              currentNote={findCurrentNote()}
              setCurrentNoteId={(id) => {
                setCurrentNoteId(id);
                if (isMobile) {
                  setShowSidebar(false);
                }
              }}
              newNote={createNewNote}
              deleteNote={deleteNote}
              isCreating={createNoteMutation.isPending}
              isDeletingId={deleteNoteMutation.isPending ? (deleteNoteMutation.variables?.id ?? null) : null}
            />
          </div>
          {/* Botão de alternância da barra lateral para mobile */}
          {isMobile && (
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="fixed top-4 left-4 z-50 p-2 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-colors"
              aria-label="Alternar barra lateral"
              type="button"
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 6h16M4 12h16M4 18h16" 
                />
              </svg>
            </button>
          )}
          {/* Editor */}
          <div className={`
            w-full md:w-5/6 h-full transition-all duration-200
            ${currentNoteId !== null ? 'block' : 'hidden md:block'}
          `}>
            {currentNoteId !== null && notes.length > 0 ? (
              <div className="relative">
                <Editor
                  currentNote={findCurrentNote()}
                  updateNote={updateNote}
                  isSaving={isSaving}
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
        <div className="w-full h-full flex flex-col items-center justify-center gap-8 px-4">
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
    </main>
  );
}

export default App;
