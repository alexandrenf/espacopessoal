"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FaTrash } from "react-icons/fa";
import { ImSpinner8 } from "react-icons/im";
import { FileText } from "lucide-react";

/** Data model shared in your app */
interface Note {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isOptimistic?: boolean;
  parentId: number | null;
  isFolder: boolean;
  order: number;
}

/** Props for the note item */
interface SortableNoteItemProps {
  note: Note;
  currentNoteId: number;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent<HTMLButtonElement>, noteId: number) => void;
  isDeletingId: number | null;
  /** If the user wants to highlight the item being hovered */
  hovered?: boolean;
}

/**
 * Single draggable note item
 */
export const SortableNoteItem: React.FC<SortableNoteItemProps> = ({
  note,
  currentNoteId,
  onSelect,
  onDelete,
  isDeletingId,
  hovered = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: note.id,
    data: {
      type: "note",
      isFolder: false,
      parentId: note.parentId,
      canBeDroppedInside: true,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    cursor: isDragging ? "grabbing" : "grab",
    position: "relative" as const,
    zIndex: isDragging ? 999 : "auto",
  };

  const getFirstLine = (content: string) => {
    return content.split("\n")[0]?.trim() ?? "Untitled";
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative flex w-full items-center justify-between border-l border-gray-200 p-4 transition-all duration-200 hover:bg-gray-50 ${note.id === currentNoteId ? "border-l-4 border-blue-500 bg-blue-50" : ""} ${note.isOptimistic ? "opacity-50" : ""} ${hovered ? "bg-blue-50/50" : ""} ${isDragging ? "pointer-events-none" : ""} `}
    >
      {/* Optional overlay highlight when hovered */}
      {hovered && (
        <div className="pointer-events-none absolute inset-0 bg-blue-50/30 transition-all duration-200" />
      )}

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <FileText className="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 group-hover:text-blue-400" />
        <span
          className={`block truncate text-sm transition-all duration-200 ${note.id === currentNoteId ? "font-medium text-blue-700" : "text-gray-700"} ${note.parentId ? "pl-2" : ""} `}
        >
          {getFirstLine(note.content)}
        </span>
      </div>

      {/* Right-side actions */}
      <div className="ml-2 flex items-center gap-2">
        {!note.isOptimistic && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e, note.id);
            }}
            disabled={isDeletingId === note.id}
            className="rounded p-1 opacity-0 transition-all duration-200 hover:bg-gray-100 group-hover:opacity-100"
            aria-label="Delete note"
          >
            {isDeletingId === note.id ? (
              <ImSpinner8 className="h-4 w-4 animate-spin text-red-500" />
            ) : (
              <FaTrash className="h-4 w-4 text-red-500" />
            )}
          </button>
        )}

        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className={`cursor-grab touch-none p-1 opacity-0 transition-all duration-200 hover:scale-110 group-hover:opacity-100`}
        >
          <DragHandle />
        </div>
      </div>
    </li>
  );
};

/**
 * Separate drag-handle icon
 */
const DragHandle = () => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-gray-400"
  >
    <circle cx="9" cy="12" r="1" fill="currentColor" />
    <circle cx="9" cy="5" r="1" fill="currentColor" />
    <circle cx="9" cy="19" r="1" fill="currentColor" />
    <circle cx="15" cy="12" r="1" fill="currentColor" />
    <circle cx="15" cy="5" r="1" fill="currentColor" />
    <circle cx="15" cy="19" r="1" fill="currentColor" />
  </svg>
);

export default SortableNoteItem;
