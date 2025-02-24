"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  const url = (params.url as string) || ""; // always a string

  // Always call hooks unconditionally.
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNoteId, setCurrentNoteId] = useState<number | null>(null);

  // Use the query but disable it if URL is empty.
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
      setNotes(data.map(note => ({ ...note, content: note.content ?? "" })) ?? []);
      if (data.length > 0 && currentNoteId === null) {
        if (data[0]) {
          setCurrentNoteId(data[0].id);
        }
      }
    }
  }, [data, currentNoteId]);

  const createNoteMutation = api.notes.createNotePublic.useMutation({
    onSuccess: (newNote) => {
      setNotes((prev) => [{ ...newNote, content: newNote.content ?? "" }, ...prev]);
      setCurrentNoteId(newNote.id);
    },
  });

  const updateNoteMutation = api.notes.updateNotePublic.useMutation({
    onSuccess: (updatedNote) => {
      setNotes((prev) =>
        prev.map((note) =>
          note.id === updatedNote.id
            ? { ...updatedNote, content: updatedNote.content ?? "" }
            : note
        )
      );
    },
  });

  const deleteNoteMutation = api.notes.deleteNotePublic.useMutation({
    onSuccess: (_, variables) => {
      setNotes((prevNotes) => {
        const newNotes = prevNotes.filter((note) => note.id !== variables.id);
        setCurrentNoteId((prevId) =>
          prevId === variables.id ? newNotes[0]?.id ?? null : prevId
        );
        return newNotes;
      });
    },
  });

  const debouncedUpdate: DebouncedFunc<(text: string, noteId: number) => void> =
    useCallback(
      debounce((text: string, noteId: number) => {
        try {
          void updateNoteMutation.mutate({
            id: noteId,
            content: text,
          });
        } catch (error: unknown) {
          if (error instanceof Error) {
            console.error("Error updating note:", error.message);
          } else {
            console.error("Error updating note:", String(error));
          }
        }
      }, 1000),
      [updateNoteMutation]
    );

  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  function createNewNote(): void {
    if (createNoteMutation.status === 'pending') return;
    createNoteMutation.mutate({
      url,
      content: "# Enter title here \n\n",
    });
  }

  function updateNote(text: string): void {
    if (currentNoteId !== null) {
      debouncedUpdate(text, currentNoteId);
    }
  }

  function deleteNote(
    event: React.MouseEvent<HTMLButtonElement>,
    noteId: number
  ): void {
    event.stopPropagation();
    if (deleteNoteMutation.status === 'pending') return;
    deleteNoteMutation.mutate({ id: noteId });
  }

  function findCurrentNote(): Note | { id: number | null; content: string } {
    return (
      notes.find((note) => note.id === currentNoteId) ?? {
        id: null,
        content: "",
      }
    );
  }

  // Render error message if URL is invalid.
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
              <Editor currentNote={findCurrentNote()} updateNote={updateNote} />
            )}
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-8">
          <h1 className="text-lg font-semibold">You have no notes</h1>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition"
            onClick={createNewNote}
            disabled={createNoteMutation.status === 'pending'}
          >
            {createNoteMutation.status === 'pending' ? "Creating..." : "Create one now"}
          </button>
        </div>
      )}
    </main>
  );
}