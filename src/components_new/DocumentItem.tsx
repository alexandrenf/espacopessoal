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
  currentDocumentId: _currentDocumentId,
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
        group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ease-in-out
        ${selected ? 'bg-blue-100 text-blue-900 shadow-sm ring-2 ring-blue-200' : 'hover:bg-gray-50 hover:shadow-sm'}
        ${isNested ? 'ml-4' : ''}
        ${isDeleting ? 'opacity-50 pointer-events-none animate-pulse' : ''}
        hover:scale-[1.02] active:scale-[0.98]
      `}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`p-1 rounded-md transition-colors ${selected ? 'bg-blue-200' : 'bg-gray-100 group-hover:bg-gray-200'}`}>
          <FileText className={`h-4 w-4 flex-shrink-0 ${selected ? 'text-blue-700' : 'text-gray-600'}`} />
        </div>
        <span className={`text-sm font-medium truncate transition-colors ${selected ? 'font-semibold text-blue-900' : 'text-gray-800'}`}>
          {document.title}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-50 hover:text-red-600"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-red-600 focus:text-red-600 focus:bg-red-50"
            disabled={isDeleting}
          >
            <Trash className="h-4 w-4 mr-2" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default DocumentItem; 