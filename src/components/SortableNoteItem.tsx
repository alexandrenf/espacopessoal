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
      className={`
        group relative flex items-center justify-between
        w-full p-4 border-l border-gray-200 hover:bg-gray-50
        transition-colors duration-200
        ${note.id === currentNoteId ? "bg-blue-50 border-l-4 border-blue-500" : ""}
        ${note.isOptimistic ? "opacity-50" : ""}
        ${hovered ? "bg-blue-50/50" : ""}
        ${isDragging ? "pointer-events-none" : ""}
      `}
    >
      {/* Optional overlay highlight when hovered */}
      {hovered && (
        <div className="pointer-events-none absolute inset-0 bg-blue-50/30" />
      )}

      <div className="flex-1 min-w-0 flex items-center gap-2">
        <FileText className="h-4 w-4 text-gray-400 shrink-0" />
        <span
          className={`
            block truncate text-sm
            ${note.id === currentNoteId ? "text-blue-700 font-medium" : "text-gray-700"}
            ${note.parentId ? "pl-2" : ""}
          `}
        >
          {getFirstLine(note.content)}
        </span>
      </div>

      {/* Right-side actions */}
      <div className="flex items-center gap-2 ml-2">
        {!note.isOptimistic && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e, note.id);
            }}
            disabled={isDeletingId === note.id}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-gray-100 rounded"
            aria-label="Delete note"
          >
            {isDeletingId === note.id ? (
              <ImSpinner8 className="w-4 h-4 animate-spin text-red-500" />
            ) : (
              <FaTrash className="w-4 h-4 text-red-500" />
            )}
          </button>
        )}

        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className={`
            touch-none p-1
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
          `}
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