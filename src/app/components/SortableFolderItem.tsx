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
import type { Note } from "./Sidebar";

interface SortableFolderItemProps {
  folder: Note;
  isActive: boolean;
  onClick: () => void;
  onDelete: (event: React.MouseEvent<HTMLButtonElement>, id: number) => void;
  children?: React.ReactNode[];
  initiallyExpanded?: boolean;
}

export function SortableFolderItem({
  folder,
  isActive,
  onClick,
  onDelete,
  children = [],
  initiallyExpanded = true, // Default value in destructuring
}: SortableFolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `droppable-${folder.id}`,
    data: {
      type: "folder",
      accepts: ["note", "folder"],
      folderId: folder.id,
    },
  });

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
    <div className="flex flex-col" ref={setDroppableRef}>
      <div
        ref={setSortableRef}
        style={style}
        {...attributes}
        className={cn(
          "group relative flex w-full items-center p-4",
          "border-l-[3px] border-transparent",
          "transition-colors duration-200 hover:bg-gray-50",
          isActive && "border-l-blue-500 bg-blue-50",
          isDragging && "opacity-50",
          isOver && "bg-blue-50/50 ring-1 ring-blue-200",
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-0 h-5 w-5 p-0 hover:bg-transparent"
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

        <div
          className="flex min-w-0 flex-1 items-center gap-2 pl-4"
          onClick={onClick}
        >
          <Folder className="h-4 w-4 shrink-0 text-blue-500" />
          <span
            className={cn(
              "flex-1 truncate text-sm",
              isActive ? "font-medium text-blue-700" : "text-gray-700",
            )}
          >
            {title}
          </span>
        </div>

        <div className="ml-2 flex items-center gap-2">
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
                  onClick={(e) => onDelete(e, folder.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete folder
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab touch-none p-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      {isExpanded && children && children.length > 0 && (
        <div
          className={cn(
            "ml-3 border-l border-gray-200",
            isOver && "border-blue-200",
          )}
        >
          <div className="py-1">{children}</div>
        </div>
      )}
    </div>
  );
}
