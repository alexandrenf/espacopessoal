"use client";

import React from "react";
import { FaTrash } from "react-icons/fa";
import { ImSpinner8 } from "react-icons/im";
import { Button } from "~/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
  onToggleSidebar?: () => void;
  showSidebar?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  notes,  // This will now always be the local version
  currentNote,
  setCurrentNoteId,
  newNote,
  deleteNote,
  isCreating,
  isDeletingId,
  onToggleSidebar,
  showSidebar,
}) => {
  const noteList = notes.map((note) => {
    // Get the title from the note's content - always use the first line
    const noteTitle = note.content.split("\n")[0]?.trim() ?? "Untitled Note";
    
    return (
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
            {noteTitle}
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
              className={`
                md:opacity-0 md:group-hover:opacity-100 absolute right-4 p-1.5 rounded-full transition-all duration-200
                ${note.id === currentNote.id ? "md:opacity-100" : ""}
                ${isDeletingId === note.id ? "bg-red-50 dark:bg-red-900/20" : "hover:bg-red-50 dark:hover:bg-red-900/20"}
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2
                focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900
                focus:opacity-100
              `}
              aria-label={`Delete note: ${noteTitle}`}
            >
              {isDeletingId === note.id ? (
                <ImSpinner8 className="w-4 h-4 animate-spin text-red-500" />
              ) : (
                <FaTrash className="w-4 h-4 text-red-500" />
              )}
            </button>
          )}
        </div>
      </li>
    );
  });

  return (
    <section className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-800">
            Notes
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {onToggleSidebar && showSidebar && (
            <Button
              onClick={onToggleSidebar}
              variant="outline"
              size="icon"
              className="md:hidden"
              aria-label="Toggle sidebar"
            >
              <ArrowLeft className="w-3 h-3" />
            </Button>
          )}
          <Button
            onClick={newNote}
            disabled={isCreating}
            aria-busy={isCreating}
            aria-label="Create new note"
            variant="outline"
            size="icon"
            className={`bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border-blue-200 hover:border-blue-300 text-blue-700
              ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isCreating ? (
              <ImSpinner8 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="text-lg">+</span>
            )}
          </Button>
        </div>
      </div>
      <ul 
        className="flex-1 flex flex-col divide-y divide-gray-100 overflow-y-auto"
        role="listbox"
        aria-label="Notes list"
      >
        {noteList}
      </ul>
    </section>
  );
};

export default Sidebar;
