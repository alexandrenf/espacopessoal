"use client";

import React, { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import Sidebar from "../../components/Sidebar";
import Editor from "../../components/Editor";

export interface Note {
  id: string;
  body: string;
}

export default function App(): JSX.Element {
  const [notes, setNotes] = useState<Note[]>(() => {
    const savedNotes = localStorage.getItem("notes");
    if (savedNotes) {
      try {
        const parsed: unknown = JSON.parse(savedNotes);
        if (Array.isArray(parsed)) {
          if (Array.isArray(parsed)) {
            return parsed as Note[];
          }
        }
      } catch (error) {
        console.error("Error parsing notes from localStorage", error);
      }
    }
    return [];
  });

  const [currentNoteId, setCurrentNoteId] = useState<string>(
    notes.length > 0 && notes[0] ? notes[0].id : ""
  );

  useEffect(() => {
    localStorage.setItem("notes", JSON.stringify(notes));
  }, [notes]);

  function createNewNote(): void {
    const newNote: Note = {
      id: nanoid(),
      body: "# Enter title here \n\n",
    };
    setNotes((prevNotes) => [newNote, ...prevNotes]);
    setCurrentNoteId(newNote.id);
  }

  function updateNote(text: string): void {
    setNotes((oldNotes) => {
      const updatedNotes: Note[] = [];
      for (const note of oldNotes) {
        if (note.id === currentNoteId) {
          updatedNotes.unshift({ ...note, body: text });
        } else {
          updatedNotes.push(note);
        }
      }
      return updatedNotes;
    });
  }

  function deleteNote(
    event: React.MouseEvent<HTMLButtonElement>,
    noteId: string
  ): void {
    event.stopPropagation();
    setNotes((oldNotes) => oldNotes.filter((note) => note.id !== noteId));
  }

  function findCurrentNote(): Note {
    // Since we only call findCurrentNote when notes.length > 0,
    // we can safely return the found note or notes[0] as a fallback.
    return notes.find((note) => note.id === currentNoteId) ?? { id: "", body: "" };
  }

  return (
    <main className="h-screen flex">
      {notes.length > 0 ? (
        <div className="flex w-full h-full">
          {/* Sidebar – occupies 1/6 of the width */}
          <div className="w-1/6 h-full border-r border-gray-300">
            <Sidebar
              notes={notes}
              currentNote={findCurrentNote()}
              setCurrentNoteId={setCurrentNoteId}
              newNote={createNewNote}
              deleteNote={deleteNote}
            />
          </div>
          {/* Editor – occupies 5/6 of the width */}
          <div className="w-5/6 h-full">
            {currentNoteId && notes.length > 0 && (
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
          >
            Create one now
          </button>
        </div>
      )}
    </main>
  );
}