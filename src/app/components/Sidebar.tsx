"use client";

import React from "react";
import { FaTrash } from "react-icons/fa";
import { ImSpinner8 } from "react-icons/im";
import { Button } from "~/components/ui/button";

interface Note {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isOptimistic?: boolean;
}

interface SidebarProps {
  notes: Note[];
  currentNote: Note | { id: number | null; content: string };
  setCurrentNoteId: (id: number) => void;
  newNote: () => void;
  deleteNote: (event: React.MouseEvent<HTMLButtonElement>, noteId: number) => void;
  isCreating: boolean;
  isDeletingId: number | null;
}

const Sidebar: React.FC<SidebarProps> = ({
  notes,
  currentNote,
  setCurrentNoteId,
  newNote,
  deleteNote,
  isCreating,
  isDeletingId,
}) => {
  const noteList = notes.map((note) => (
    <li
      key={note.id}
      onClick={() => setCurrentNoteId(note.id)}
      className={`group w-full p-4 border-b border-gray-200 cursor-pointer relative transition-all duration-200 hover:bg-gray-50 ${
        note.id === currentNote.id
          ? "bg-blue-50 border-l-4 border-l-blue-500"
          : ""
      } ${note.isOptimistic ? 'opacity-50' : ''}`}
      role="option"
      aria-selected={note.id === currentNote.id}
      aria-busy={note.isOptimistic}
    >
      <div className="flex items-center justify-between">
        <span className={`line-clamp-1 text-sm ${
          note.id === currentNote.id 
            ? "text-blue-700 font-medium" 
            : "text-gray-700"
        }`}>
          {note.content.split("\n")[0] ?? "Untitled Note"}
        </span>
        {note.isOptimistic ? (
          <ImSpinner8 
            className="animate-spin text-blue-500 mr-4" 
            role="status"
            aria-label="Creating note..."
          />
        ) : (
          <button
            onClick={(event) => deleteNote(event, note.id)}
            disabled={isDeletingId === note.id}
            className={`opacity-0 group-hover:opacity-100 absolute right-4 p-1.5 rounded-full transition-all duration-200
              ${note.id === currentNote.id ? "opacity-100" : ""}
              ${isDeletingId === note.id ? "bg-red-50" : "hover:bg-red-50"}
              focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
              focus:opacity-100
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isDeletingId === note.id ? "cursor-wait" : ""}
            `}
            aria-label={`Delete note: ${note.content.split("\n")[0] ?? "Untitled Note"}`}
            aria-busy={isDeletingId === note.id}
            aria-disabled={isDeletingId === note.id}
            role="button"
            tabIndex={isDeletingId === note.id ? -1 : 0}
          >
            {isDeletingId === note.id ? (
              <ImSpinner8 
                className="animate-spin text-red-500" 
                role="status"
                aria-label="Deleting note..."
              />
            ) : (
              <FaTrash className="text-red-500 w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </li>
  ));

  return (
    <section className="w-full h-screen bg-white border-r border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-800">
          Notas
        </h1>
        <Button
          onClick={newNote}
          disabled={isCreating}
          aria-busy={isCreating}
          aria-label="Create new note"
          variant="outline"
          size="sm"
          className={`gap-2 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border-blue-200 hover:border-blue-300 text-blue-700
            ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isCreating ? (
            <ImSpinner8 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span className="text-lg">+</span>
              <span>Criar</span>
            </>
          )}
        </Button>
      </div>
      <ul 
        className="flex flex-col divide-y divide-gray-100 overflow-y-auto"
        style={{ height: "calc(100vh - 65px)" }}
        role="listbox"
        aria-label="Notes list"
      >
        {noteList}
      </ul>
    </section>
  );
};

export default Sidebar;
