"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaTrash } from "react-icons/fa";
import { ImSpinner8 } from "react-icons/im";

interface Note {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isOptimistic?: boolean;
}

interface SortableNoteItemProps {
  note: Note;
  currentNoteId: number;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isDeletingId: number | null;
}

export const SortableNoteItem: React.FC<SortableNoteItemProps> = ({
  note,
  currentNoteId,
  onSelect,
  onDelete,
  isDeletingId,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    cursor: 'grab',
  };

  const getFirstLine = (content: string) => {
    return content.split('\n')[0]?.trim() ?? "Untitled";
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      onClick={onSelect}  // Add click handler to the entire li element
      className={`
        group relative flex items-center justify-between
        w-full p-4 hover:bg-gray-50 cursor-pointer
        ${note.id === currentNoteId ? "bg-blue-50 border-l-4 border-blue-500" : ""}
        ${note.isOptimistic ? "opacity-50" : ""}
        transition-colors duration-200
      `}
    >
      <div 
        className="flex-1 min-w-0"
        // Remove onClick from here since it's now on the parent li
      >
        <span
          className={`
            block truncate text-sm
            ${note.id === currentNoteId ? "text-blue-700 font-medium" : "text-gray-700"}
          `}
        >
          {getFirstLine(note.content)}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-2">
        {!note.isOptimistic && (
          <button
            onClick={(e) => {
              e.stopPropagation();  // Make sure this is present to prevent note selection when deleting
              onDelete(e);
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
        
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}  // Add this to prevent note selection when using drag handle
          className="touch-none p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing"
        >
          <DragHandle />
        </div>
      </div>
    </li>
  );
};

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
