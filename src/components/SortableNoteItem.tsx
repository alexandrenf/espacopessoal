"use client";

import React from "react";
import { ImSpinner8 } from "react-icons/im";
import { FileText } from "lucide-react";
import type { DataNode } from "rc-tree/lib/interface";
import { cn } from "~/lib/utils";

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
interface NoteItemProps {
  note: Note;
  currentNoteId?: number;
  onSelect?: () => void;
  onDelete?: (e: React.MouseEvent<HTMLButtonElement>, noteId: number) => void;
  isDeletingId?: number | null;
  /** rc-tree specific props */
  dragOver?: boolean;
  dragOverGapTop?: boolean;
  dragOverGapBottom?: boolean;
  selected?: boolean;
  isNested?: boolean; // Add this prop
}

/**
 * Single note item component for rc-tree
 */
export const NoteItem: React.FC<NoteItemProps> = ({
  note,
  currentNoteId,
  onSelect,
  onDelete,
  isDeletingId,
  dragOver,
  dragOverGapTop,
  dragOverGapBottom,
  selected,
  isNested = false,
}) => {
  const getFirstLine = (content: string) => {
    return content.split("\n")[0]?.trim() ?? "Untitled";
  };

  return (
    <div className="relative">
      {/* Top drag indicator */}
      {dragOverGapTop && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 transform -translate-y-1/2 z-10 
          animate-pulse transition-all duration-200 ease-in-out" />
      )}

      <div
        onClick={onSelect}
        className={cn(
          isNested && "pl-10",
          "group relative flex w-full items-center justify-between cursor-pointer",
          "transition-all duration-200",
          selected && "text-blue-700",
          note.isOptimistic && "opacity-50",
          dragOver && "bg-blue-100 shadow-inner scale-[1.01]",
          dragOverGapTop && "border-t-2 border-t-blue-500",
          dragOverGapBottom && "border-b-2 border-b-blue-500",
          isNested ? "bg-gray-50/80 hover:bg-gray-100/80 border-l-2 border-l-gray-300" : "hover:bg-gray-50"
        )}
      >
        <div className={cn(
          "flex min-w-0 flex-1 items-center gap-3 py-3 px-2 z-10 pointer-events-none"
        )}>
          <FileText 
            className={cn(
              "h-5 w-5 shrink-0 transition-all duration-300",
              dragOver ? "text-blue-600 scale-110" : isNested ? "text-gray-500" : "text-gray-400"
            )} 
          />
          <span
            className={cn(
              "block truncate text-sm transition-all duration-200",
              selected ? "font-medium text-blue-700" : isNested ? "text-gray-600" : "text-gray-700",
              dragOver && "font-medium text-blue-700"
            )}
          >
            {getFirstLine(note.content)}
          </span>
        </div>

        {/* Right-side actions */}
        {!note.isOptimistic && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e, note.id);
            }}
            disabled={isDeletingId === note.id}
            className={cn(
              "mr-2 rounded p-1.5 transition-all duration-200",
              "opacity-0 group-hover:opacity-100",
              "hover:bg-gray-100 z-10 pointer-events-auto",
              isNested ? "hover:bg-gray-200" : "hover:bg-gray-100"
            )}
            aria-label="Delete note"
          >
            {isDeletingId === note.id ? (
              <ImSpinner8 className="h-4 w-4 animate-spin text-red-500" />
            ) : (
              <DeleteIcon />
            )}
          </button>
        )}
      </div>

      {/* Bottom drag indicator */}
      {dragOverGapBottom && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 transform translate-y-1/2 z-10 
          animate-pulse transition-all duration-200 ease-in-out" />
      )}
    </div>
  );
};

/**
 * Delete icon component
 */
const DeleteIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-red-500"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

export default NoteItem;
