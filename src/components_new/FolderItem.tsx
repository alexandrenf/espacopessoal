"use client";

import React from "react";
import { Folder, FolderOpen, ChevronRight, ChevronDown, MoreHorizontal, Trash } from "lucide-react";
import { Button } from "../components_new/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components_new/ui/dropdown-menu";
import type { EventDataNode } from "rc-tree/lib/interface";
import { Id } from "../../convex/_generated/dataModel";

export interface Document {
  _id: Id<"documents">;
  title: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  organizationId?: string;
  initialContent?: string;
  roomId?: string;
  parentId?: Id<"documents">;
  order: number;
  isFolder: boolean;
}

interface FolderItemProps {
  folder: Document;
  isActive: boolean;
  onDelete: (e: React.MouseEvent<Element>, id: Id<"documents">) => void;
  onClick: () => void;
  expanded: boolean;
  onExpand: (e: React.MouseEvent, node: EventDataNode<unknown>) => void;
  eventKey: string;
}

const FolderItem: React.FC<FolderItemProps> = ({
  folder,
  isActive,
  onDelete,
  onClick,
  expanded,
  onExpand,
  eventKey,
}) => {
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

  return (
    <div
      className={`
        group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors
        ${isActive ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'}
      `}
    >
      <div className="flex items-center gap-1 flex-1 min-w-0" onClick={handleFolderClick}>
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
          <FolderOpen className="h-4 w-4 text-yellow-600 flex-shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-yellow-600 flex-shrink-0" />
        )}
        
        <span className="text-sm font-medium truncate">
          {folder.title}
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
          >
            <Trash className="h-3 w-3 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default FolderItem; 