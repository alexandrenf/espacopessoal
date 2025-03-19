"use client";

import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Folder,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Trash2,
  GripVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

// Reuse from your codebase
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

interface SortableFolderItemProps {
  folder: Note;
  isActive: boolean;
  onClick: () => void;
  onDelete: (event: React.MouseEvent<HTMLButtonElement>, id: number) => void;
  children?: React.ReactNode[];
  initiallyExpanded?: boolean;
  /** If you want to highlight when hovered */
  hovered?: boolean;
}

export function SortableFolderItem({
  folder,
  isActive,
  onClick,
  onDelete,
  children = [],
  initiallyExpanded = true,
  hovered = false,
}: SortableFolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  const { setNodeRef: setDroppableRef, isOver, over } = useDroppable({
    id: `droppable-${folder.id}`,
    data: {
      type: "folder",
      accepts: ["note", "folder"],
      folderId: folder.id,
    },
  });

  // Extract the current drop zone from the drag over data
  const dropZone = over?.data?.current?.dropZone as "above" | "below" | "inside" | undefined;

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: folder.id,
    data: {
      type: "folder",
      isFolder: true,
      parentId: folder.parentId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const title = folder.content.split("\n")[0]?.trim() ?? "Untitled Folder";

  return (
    <div className="flex flex-col relative" ref={setDroppableRef}>
      {/* Debug drop zones */}
      {isOver && (
        <>
          {/* Above zone */}
          <div className={cn(
            "absolute left-0 right-0 top-0 h-[25%] border-2 border-dashed transition-colors duration-200 z-0",
            dropZone === "above" ? "border-blue-500 bg-blue-50/50" : "border-transparent"
          )} />
          
          {/* Inside zone */}
          <div className={cn(
            "absolute left-0 right-0 top-[25%] h-[50%] border-2 border-dashed transition-colors duration-200 z-0",
            dropZone === "inside" ? "border-blue-500 bg-blue-100/50" : "border-transparent"
          )} />
          
          {/* Below zone */}
          <div className={cn(
            "absolute left-0 right-0 bottom-0 h-[25%] border-2 border-dashed transition-colors duration-200 z-0",
            dropZone === "below" ? "border-blue-500 bg-blue-50/50" : "border-transparent"
          )} />
        </>
      )}

      {/* Drop indicator for "above" position */}
      {isOver && dropZone === "above" && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 transform -translate-y-1/2 z-10 
        animate-pulse transition-all duration-200 ease-in-out" />
      )}

      <div
        ref={setSortableRef}
        style={style}
        {...attributes}
        className={cn(
          "group relative flex w-full items-center p-4",
          "border-l-[3px] border-transparent",
          "transition-all duration-200 hover:bg-gray-50",
          isActive && "border-l-blue-500 bg-blue-50",
          hovered && !isOver && "bg-blue-50/50",
          isDragging && "opacity-50 pointer-events-none",
          isOver && dropZone === "inside" && "bg-blue-100 shadow-inner scale-[1.01]",
          isOver && "ring-1 ring-blue-300 transition-all duration-300 ease-in-out",
        )}
        onClick={onClick}
      >
        {/* Animated folder background for "inside" drop targeting */}
        {isOver && dropZone === "inside" && (
          <div className="absolute inset-2 bg-blue-50/80 rounded-md border border-blue-200 
            transition-all duration-300 ease-in-out z-0 animate-pulse" />
        )}

        {/* Expand/collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-0 h-5 w-5 p-0 hover:bg-transparent z-10"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded((prev) => !prev);
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          )}
        </Button>

        {/* Folder Icon + Title */}
        <div className="flex min-w-0 flex-1 items-center gap-2 pl-4 z-10">
          <Folder className={cn(
            "h-4 w-4 shrink-0 transition-all duration-300",
            isOver && dropZone === "inside" ? "text-blue-600 scale-110" : "text-blue-500"
          )} />
          <span
            className={cn(
              "flex-1 truncate text-sm transition-all duration-300",
              isActive ? "font-medium text-blue-700" : "text-gray-700",
              isOver && dropZone === "inside" && "font-medium text-blue-700",
            )}
          >
            {title}
          </span>
        </div>

        {/* Right-side controls */}
        <div className="ml-2 flex items-center gap-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <button
                  className="flex w-full items-center text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(e, folder.id);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete folder
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Drag handle */}
          <div
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab touch-none p-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Drop indicator for "below" position */}
      {isOver && dropZone === "below" && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 transform translate-y-1/2 z-10 
        animate-pulse transition-all duration-200 ease-in-out" />
      )}

      {/* Nested children if expanded */}
      {isExpanded && children && children.length > 0 && (
        <div
          className={cn(
            "ml-3 border-l border-gray-200 transition-all duration-300",
            isOver && dropZone === "inside" && "border-blue-300 bg-blue-50/50 pl-1", // Highlight child area when dropping inside
          )}
        >
          <div className="py-1">{children}</div>
        </div>
      )}
    </div>
  );
}