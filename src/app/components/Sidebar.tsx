"use client";

import React from "react";
import { FaTrash } from "react-icons/fa";
import { ImSpinner8 } from "react-icons/im";

interface Note {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isOptimistic?: boolean;
}

interface SidebarProps {
  notes: (Note | { id: number; content: string; createdAt: Date; updatedAt: Date; isOptimistic?: boolean })[];
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
      className={`w-full p-4 pr-8 text-center border-b border-[#69626D] cursor-pointer relative ${
        note.id === currentNote.id
          ? "bg-[#3C91E6] text-white text-xl font-bold"
          : ""
      } ${note.isOptimistic ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span>{note.content.split("\n")[0]}</span>
        {note.isOptimistic ? (
          <ImSpinner8 className="animate-spin mr-4" />
        ) : (
          <button
            onClick={(event) => deleteNote(event, note.id)}
            disabled={isDeletingId === note.id}
            className="absolute right-4 top-[1.2rem] text-[#070600] bg-transparent cursor-pointer hover:text-white disabled:cursor-not-allowed"
          >
            {isDeletingId === note.id ? (
              <ImSpinner8 className="animate-spin" />
            ) : (
              <FaTrash />
            )}
          </button>
        )}
      </div>
    </li>
  ));

  return (
    <section className="w-full h-screen">
      <div className="flex items-center gap-4 p-8 h-[10vh]">
        <h1 className="text-2xl font-serif uppercase text-[#070600]">
          Notes
        </h1>
        <button
          onClick={newNote}
          className="w-6 h-6 flex justify-center items-center text-white bg-[#3C91E6] text-2xl rounded-full cursor-pointer hover:text-[#070600]"
        >
          +
        </button>
      </div>
      <ul className="flex flex-col justify-center items-center">{noteList}</ul>
    </section>
  );
};

export default Sidebar;
