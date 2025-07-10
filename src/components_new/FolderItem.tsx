"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Trash,
  Edit,
} from "lucide-react";
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
import type { EventDataNode } from "rc-tree/lib/interface";
import { type Id } from "../../convex/_generated/dataModel";
import { type DocumentWithTreeProps } from "../types/document";

interface FolderItemProps {
  folder: DocumentWithTreeProps;
  isActive: boolean;
  onDelete: (e: React.MouseEvent<Element>, id: Id<"documents">) => void;
  onClick: () => void;
  expanded: boolean;
  onExpand: (e: React.MouseEvent, node: EventDataNode<unknown>) => void;
  eventKey: string;
  isPublicView?: boolean; // Flag for public view mode
}

const FolderItem: React.FC<FolderItemProps> = ({
  folder,
  isActive,
  onDelete,
  onClick,
  expanded,
  onExpand,
  eventKey,
  isPublicView = false,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [folderTitle, setFolderTitle] = useState(folder.title);
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

  // Update local title when folder prop changes
  useEffect(() => {
    setFolderTitle(folder.title);
  }, [folder.title]);
  const handleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onExpand(e, { key: eventKey } as EventDataNode<unknown>);
  };

  const handleFolderClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  const handleDelete = (e: React.MouseEvent<Element>) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(e, folder._id);
  };

  const handleRename = (e: React.MouseEvent<Element>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRenaming(true);
    setFolderTitle(folder.title);
  };

  const handleRenameSubmit = async () => {
    if (!folderTitle.trim() || folderTitle.trim() === folder.title) {
      setIsRenaming(false);
      setFolderTitle(folder.title);
      return;
    }

    if (isUserLoading) {
      toast.error("Please wait for authentication to complete");
      return;
    }

    if (!userIdString) {
      toast.error("User authentication required to rename folders");
      return;
    }

    setIsUpdating(true);
    try {
      await updateDocument({
        id: folder._id,
        title: folderTitle.trim(),
        userId: userIdString,
      });

      toast.success("Folder renamed successfully!");
      setIsRenaming(false);
    } catch (error) {
      console.error("Failed to rename folder:", error);
      toast.error("Failed to rename folder");
      setFolderTitle(folder.title);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setFolderTitle(folder.title);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleRenameSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleRenameCancel();
    }
  };

  return (
    <div
      className={`group flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors ${isActive ? "bg-blue-100 text-blue-900" : "hover:bg-gray-100"} `}
    >
      <div
        className="flex min-w-0 flex-1 items-center gap-1"
        onClick={handleFolderClick}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-0 hover:bg-transparent"
          onClick={handleExpand}
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>

        {expanded ? (
          <FolderOpen className="h-4 w-4 flex-shrink-0 text-yellow-600" />
        ) : (
          <Folder className="h-4 w-4 flex-shrink-0 text-yellow-600" />
        )}

        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={folderTitle}
            onChange={(e) => setFolderTitle(e.target.value)}
            onBlur={() => void handleRenameSubmit()}
            onKeyDown={handleKeyDown}
            className="min-w-0 flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isUpdating}
          />
        ) : (
          <span className="truncate text-sm font-medium">{folder.title}</span>
        )}
      </div>

      {/* Hide dropdown menu for public view */}
      {!isPublicView && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
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
            >
              <Edit className="mr-2 h-3 w-3" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-red-600 focus:bg-red-50 focus:text-red-600"
            >
              <Trash className="mr-2 h-3 w-3" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default FolderItem;
