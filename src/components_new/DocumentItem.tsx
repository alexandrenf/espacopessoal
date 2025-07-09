"use client";

import React from "react";
import { FileText, MoreHorizontal, Trash } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Id } from "../../convex/_generated/dataModel";
import { Document } from "../types/document";

interface DocumentItemProps {
  document: Document;
  currentDocumentId?: Id<"documents">;
  onDelete: (e: React.MouseEvent<Element>, id: Id<"documents">) => void;
  isDeletingId?: Id<"documents">;
  onSelect: () => void;
  selected: boolean;
  isNested?: boolean;
}

const DocumentItem: React.FC<DocumentItemProps> = ({
  document,
  currentDocumentId,
  onDelete,
  isDeletingId,
  onSelect,
  selected,
  isNested = false,
}) => {
  const isDeleting = isDeletingId === document._id;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDeleting) {
      onSelect();
    }
  };

  const handleDelete = (e: React.MouseEvent<Element>) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(e, document._id);
  };

  return (
    <div
      className={`
        group flex items-center justify-between p-2 rounded-md cursor-pointer transition-all duration-150
        ${selected ? 'bg-blue-100 text-blue-900 shadow-sm' : 'hover:bg-gray-100'}
        ${isNested ? 'ml-4' : ''}
        ${isDeleting ? 'opacity-50 pointer-events-none' : ''}
      `}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          // Create a synthetic mouse event for keyboard activation
          const syntheticEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          onSelect();
        }
      }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <FileText className={`h-4 w-4 flex-shrink-0 ${selected ? 'text-blue-600' : 'text-gray-600'}`} />
        <span className={`text-sm font-medium truncate ${selected ? 'font-semibold' : ''}`}>
          {document.title}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-red-600 focus:text-red-600"
            disabled={isDeleting}
          >
            <Trash className="h-3 w-3 mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default DocumentItem; 