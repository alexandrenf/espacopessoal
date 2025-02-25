"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Sidebar from "../../components/Sidebar";
import Editor from "../../components/Editor";
import { api } from "~/trpc/react";
import { useParams } from "next/navigation";
import { default as debounce } from "lodash/debounce";
import type { DebouncedFunc } from "lodash";

const DEBOUNCE_DELAY = 4000;
const MAX_WAIT = DEBOUNCE_DELAY * 2;

export interface Note {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface OptimisticNote extends Note {
  isOptimistic: boolean;
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
      
      // Only update if the content hasn't changed since we sent the mutation
      if (lastSentTextRef.current === currentContentRef.current) {
        setNotes((prev) =>
          prev.map((note) =>
            note.id === updatedNote.id
              ? { ...updatedNote, content: updatedNote.content ?? "" }
              : note
          )
        );
        // Update last good content only if we actually used the server response
        lastGoodContentRef.current = updatedNote.content ?? "";
      }
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update note";
      setUpdateError(errorMessage);

      // Only revert if no new changes were made
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
      errorTimeoutRef.current = setTimeout(() => setUpdateError(null), 5000);
    },
    retry: 2,
    retryDelay: 1000,
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
            // Record the text that is being sent
            lastSentTextRef.current = text;
            updateMutateAsyncRef
              .current({ id: noteId, content: text })
              .then((result) => {
                console.log("Note saved successfully:", result);
                setIsSaving(false);
              })
              .catch((error: unknown) => {
                console.error("Error updating note:", error);
                setIsSaving(false);
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
      // Cancel any outgoing refetches
      await utils.notes.fetchNotesPublic.cancel({ url });

      // Snapshot the previous value
      const previousNotes = notes;
      const previousCurrentNoteId = currentNoteId;
      
      // Generate a temporary negative ID to ensure uniqueness
      const tempId = -Math.floor(Math.random() * 1000000);
      
      const optimisticNote: OptimisticNote = {
        id: tempId,
        content: newNoteData.content,
        createdAt: new Date(),
        updatedAt: new Date(),
        isOptimistic: true,
      };
      
      // Update state optimistically, but maintain current selection
      setNotes((prev) => [optimisticNote, ...prev]);
      
      return { 
        previousNotes, 
        previousCurrentNoteId,
        tempId 
      };
    },
    onError: (err, newNote, context) => {
      if (context) {
        setNotes(context.previousNotes);
        setCurrentNoteId(context.previousCurrentNoteId);
      }
      setUpdateError("Failed to create note");
    },
    onSuccess: async (newNote, variables, context) => {
      // Invalidate and refetch
      await utils.notes.fetchNotesPublic.invalidate({ url });
    },
  });

  function createNewNote(): void {
    if (createNoteMutation.isPending) return;
    const newNoteContent = "# Enter title here \n\n";
    createNoteMutation.mutate({
      url,
      content: newNoteContent,
    });
  }

  // Handler to update a note.
  function updateNote(text: string): void {
    if (currentNoteId !== null) {
      // Update our ref with the latest content
      currentContentRef.current = text;
      
      // Update local state immediately
      setNotes((prev) =>
        prev.map((note) =>
          note.id === currentNoteId ? { ...note, content: text } : note
        )
      );
      setIsSaving(true);
      // Schedule the debounced update
      debouncedUpdate(text, currentNoteId);
    }
  }

  // Handler to delete a note
  const deleteNoteMutation = api.notes.deleteNotePublic.useMutation({
    onMutate: async (deleteData) => {
      // Cancel any outgoing refetches
      await utils.notes.fetchNotesPublic.cancel({ url });
      
      // Snapshot current state
      const previousNotes = notes;
      const previousCurrentNoteId = currentNoteId;
      
      // Find the next note to select
      const currentIndex = notes.findIndex(note => note.id === deleteData.id);
      const nextNote = notes[currentIndex + 1] ?? notes[currentIndex - 1];
      
      // Update state optimistically
      setNotes((prev) => prev.filter(note => note.id !== deleteData.id));
      
      // Update current note selection
      if (currentNoteId === deleteData.id) {
        setCurrentNoteId(nextNote?.id ?? null);
        if (nextNote) {
          lastGoodContentRef.current = nextNote.content;
        }
      }
      
      return { 
        previousNotes, 
        previousCurrentNoteId,
        deletedNoteId: deleteData.id 
      };
    },
    onError: (err, deleteData, context) => {
      if (context) {
        // Revert all changes
        setNotes(context.previousNotes);
        setCurrentNoteId(context.previousCurrentNoteId);
        lastGoodContentRef.current = context.previousNotes.find(
          note => note.id === context.previousCurrentNoteId
        )?.content ?? "";
      }
      setUpdateError("Failed to delete note");
    },
    onSuccess: async (_, variables, context) => {
      if (!context) return;
      
      // Clear any pending updates for the deleted note
      if (currentNoteId === context.deletedNoteId) {
        debouncedUpdate.cancel();
      }

      // Invalidate and refetch
      await utils.notes.fetchNotesPublic.invalidate({ url });
    },
  });

  function deleteNote(
    event: React.MouseEvent<HTMLButtonElement>,
    noteId: number
  ): void {
    event.stopPropagation();
    if (deleteNoteMutation.isPending) return;
    deleteNoteMutation.mutate({ id: noteId });
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
      {(updateError !== null || isSaving === true) && (
        <div
          role="alert"
          aria-live="polite"
          className={`fixed top-4 right-4 px-4 py-3 rounded shadow-md ${
            updateError
              ? "bg-red-100 border border-red-400 text-red-700"
              : "bg-blue-100 border border-blue-400 text-blue-700"
          }`}
        >
          <span className="block sm:inline">
            {updateError ?? (isSaving ? "Saving..." : "")}
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
    </main>
  );
}
