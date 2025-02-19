"use client";

import React from "react";
import type { Note } from "../notas/[url]/page";
import { FaTrash } from "react-icons/fa"; // Import the trash icon

interface SidebarProps {
  notes: Note[];
  currentNote: Note;
  setCurrentNoteId: (id: string) => void;
  newNote: () => void;
  deleteNote: (
    event: React.MouseEvent<HTMLButtonElement>,
    noteId: string
  ) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  notes,
  currentNote,
  setCurrentNoteId,
  newNote,
  deleteNote,
}) => {
  const noteList = notes.map((note) => (
    <li
      key={note.id}
      onClick={() => setCurrentNoteId(note.id)}
      className={`w-full p-4 pr-8 text-center border-b border-[#69626D] cursor-pointer relative ${
        note.id === currentNote.id
          ? "bg-[#3C91E6] text-white text-xl font-bold"
          : ""
      }`}
    >
      <span>{note.body.split("\n")[0]}</span>
      <button
        onClick={(event) => deleteNote(event, note.id)}
        className="absolute right-4 top-[1.2rem] text-[#070600] bg-transparent cursor-pointer hover:text-white"
      >
        <FaTrash />
      </button>
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