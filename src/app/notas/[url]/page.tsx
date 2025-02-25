"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Sidebar from "../../components/Sidebar";
import Editor from "../../components/Editor";
import { api } from "~/trpc/react";
import { useParams } from "next/navigation";
import { default as debounce } from "lodash/debounce";
import type { DebouncedFunc } from "lodash";
import { DeleteConfirmationModal } from "../../components/DeleteConfirmationModal";

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

export default function App(): JSX.Element {
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
    { url },
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
            setIsSaving(true); // Set saving state when update starts
            lastSentTextRef.current = text;
            updateMutateAsyncRef
              .current({ id: noteId, content: text })
              .then((result) => {
                console.log("Note saved successfully:", result);
                setIsSaving(false); // Clear saving state on success
              })
              .catch((error: unknown) => {
                console.error("Error updating note:", error);
                setIsSaving(false); // Clear saving state on error
                if (error instanceof Error) {
                  setUpdateError(error.message);
                } else {
                  setUpdateError("Failed to update note");
                }
              });
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
        console.error('Error in onMutate:', getErrorMessage(error));
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
        await utils.notes.fetchNotesPublic.invalidate({ url });
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
        await utils.notes.fetchNotesPublic.invalidate({ url });
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
    deleteNoteMutation.mutate({ id: noteToDelete.id });
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
        <div className="text-lg">Invalid URL</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
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
      {(updateError !== null || isSaving) && (
        <div
          role="alert"
          aria-live="polite"
          className={`fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg flex items-center gap-2 transition-all duration-200 ${
            updateError
              ? "bg-red-100 border border-red-400 text-red-700"
              : "bg-blue-50 border border-blue-200 text-blue-700"
          }`}
        >
          {isSaving && (
            <svg 
              className="animate-spin h-4 w-4" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          <span className="block text-sm font-medium">
            {updateError ?? (isSaving ? "Saving changes..." : "")}
          </span>
        </div>
      )}
      {notes.length > 0 ? (
        <div className="flex w-full h-full">
          <div className="w-1/6 h-full border-r border-gray-300">
            <Sidebar
              notes={notes}
              currentNote={findCurrentNote()}
              setCurrentNoteId={setCurrentNoteId}
              newNote={createNewNote}
              deleteNote={deleteNote}
              isCreating={createNoteMutation.isPending}
              isDeletingId={deleteNoteMutation.isPending ? (deleteNoteMutation.variables?.id ?? null) : null}
            />
          </div>
          <div className="w-5/6 h-full">
            {currentNoteId !== null && notes.length > 0 && (
              <Editor
                currentNote={findCurrentNote()}
                updateNote={updateNote}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-8">
          <h1 className="text-lg font-semibold">You have no notes</h1>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition"
            onClick={createNewNote}
            disabled={createNoteMutation.isPending}
          >
            {createNoteMutation.isPending ? "Creating..." : "Create one now"}
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
