"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Sidebar from "../../components/Sidebar";
import Editor from "../../components/Editor";
import { api } from "~/trpc/react";
import { useParams } from "next/navigation";
import { default as debounce } from 'lodash/debounce';
import type { DebouncedFunc } from 'lodash';

export interface Note {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function App(): JSX.Element {
  const params = useParams();
  const url = (params.url as string) || "";

  // Local state
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNoteId, setCurrentNoteId] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch notes from the server.
  const { data, error, isLoading } = api.notes.fetchNotesPublic.useQuery(
    { url },
    {
      enabled: Boolean(url),
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    }
  );

  useEffect(() => {
    if (data) {
      setNotes(data.map((note) => ({ ...note, content: note.content ?? "" })));
      if (data.length > 0 && currentNoteId === null) {
        if (data[0]) {
          setCurrentNoteId(data[0].id);
        }
      }
    }
  }, [data, currentNoteId]);

  // Mutation to update a note.
  const updateNoteMutation = api.notes.updateNotePublic.useMutation({
    onSuccess: (updatedNote) => {
      setUpdateError(null);
      setNotes((prev) =>
        prev.map((note) =>
          note.id === updatedNote.id
            ? { ...updatedNote, content: updatedNote.content ?? "" }
            : note
        )
      );
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update note";
      setUpdateError(errorMessage);

      // Revert to last known good state
      const originalNote = notes.find((note) => note.id === currentNoteId);
      if (originalNote) {
        setNotes((prev) =>
          prev.map((note) => (note.id === currentNoteId ? originalNote : note))
        );
      }

      setTimeout(() => setUpdateError(null), 5000);
    },
    retry: 2,
    retryDelay: 1000,
  });

  // Store the mutateAsync function in a ref to avoid recreating the debounced function
  const updateMutateAsyncRef = useRef(updateNoteMutation.mutateAsync);
  useEffect(() => {
    updateMutateAsyncRef.current = updateNoteMutation.mutateAsync;
  }, [updateNoteMutation]);

  // Create the debounced update function only once
  const debouncedUpdate: DebouncedFunc<(text: string, noteId: number) => void> =
    useMemo(
      () =>
        debounce((text: string, noteId: number) => {
          console.log("Debounced update triggered:", {
            noteId,
            textLength: text.length,
          });
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
        }, 4000),
      []
    );

  // Flush and cancel any pending debounced updates on unmount
  useEffect(() => {
    return () => {
      debouncedUpdate.flush();
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  // Handler to create a new note.
  const createNoteMutation = api.notes.createNotePublic.useMutation({
    onSuccess: (newNote) => {
      setNotes((prev) => [
        { ...newNote, content: newNote.content ?? "" },
        ...prev,
      ]);
      setCurrentNoteId(newNote.id);
    },
  });

  function createNewNote(): void {
    if (createNoteMutation.isPending) return;
    createNoteMutation.mutate({
      url,
      content: "# Enter title here \n\n",
    });
  }

  // Handler to update a note.
  function updateNote(text: string): void {
    if (currentNoteId !== null) {
      console.log("Local update triggered:", {
        currentNoteId,
        textLength: text.length,
      });
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

  // Handler to delete a note.
  const deleteNoteMutation = api.notes.deleteNotePublic.useMutation({
    onSuccess: (_, variables) => {
      setNotes((prevNotes) => {
        const newNotes = prevNotes.filter(
          (note) => note.id !== variables.id
        );
        setCurrentNoteId((prevId) =>
          prevId === variables.id ? newNotes[0]?.id ?? null : prevId
        );
        return newNotes;
      });
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
      {updateError && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <span className="block sm:inline">{updateError}</span>
        </div>
      )}
      {isSaving && (
        <div className="fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          <span className="block sm:inline">Saving...</span>
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
