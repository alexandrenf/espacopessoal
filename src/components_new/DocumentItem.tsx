"use client";

import React, { useState, useRef, useEffect } from "react";
import { FileText, MoreHorizontal, Trash, Edit } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { useConvexUser } from "../hooks/use-convex-user";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { type Id } from "../../convex/_generated/dataModel";
import { type Document } from "../types/document";

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
  const [isRenaming, setIsRenaming] = useState(false);
  const [documentTitle, setDocumentTitle] = useState(document.title);
  const [isUpdating, setIsUpdating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { convexUserId, isLoading: isUserLoading } = useConvexUser();
  const userIdString = convexUserId;
  const updateDocument = useMutation(api.documents.updateById);
  
  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);
  
  // Update local title when document prop changes
  useEffect(() => {
    setDocumentTitle(document.title);
  }, [document.title]);

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
  
  const handleRename = (e: React.MouseEvent<Element>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDeleting) return; // Prevent renaming during deletion
    setIsRenaming(true);
    setDocumentTitle(document.title);
  };
  
  const handleRenameSubmit = async () => {
    if (!documentTitle.trim() || documentTitle.trim() === document.title) {
      setIsRenaming(false);
      setDocumentTitle(document.title);
      return;
    }
    
    if (isUserLoading) {
      toast.error("Please wait for authentication to complete");
      return;
    }
    
    if (!userIdString) {
      toast.error("User authentication required to rename documents");
      return;
    }
    
    setIsUpdating(true);
    try {
      await updateDocument({
        id: document._id,
        title: documentTitle.trim(),
        userId: userIdString,
      });
      
      toast.success("Document renamed successfully!");
      setIsRenaming(false);
    } catch (error) {
      console.error("Failed to rename document:", error);
      toast.error("Failed to rename document");
      setDocumentTitle(document.title);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleRenameCancel = () => {
    setIsRenaming(false);
    setDocumentTitle(document.title);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleRenameSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleRenameCancel();
    }
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
          onSelect();
        }
      }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <FileText className={`h-4 w-4 flex-shrink-0 ${selected ? 'text-blue-600' : 'text-gray-600'}`} />
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            onBlur={() => void handleRenameSubmit()}
            onKeyDown={handleKeyDown}
            className="text-sm font-medium bg-white border border-blue-300 rounded px-2 py-1 flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isUpdating}
          />
        ) : (
          <span className={`text-sm font-medium truncate transition-colors ${selected ? 'font-semibold text-blue-900' : 'text-gray-800'}`}>
            {document.title}
          </span>
        )}
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
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem
            onClick={handleRename}
            className="focus:bg-blue-50"
            disabled={isDeleting || isRenaming}
          >
            <Edit className="h-3 w-3 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-red-600 focus:text-red-600 focus:bg-red-50"
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