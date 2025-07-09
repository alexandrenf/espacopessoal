import React from "react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { EventDataNode } from "rc-tree/lib/interface";

interface FolderItemProps {
  folder: {
    id: number;
    content: string;
    parentId: number | null;
    isFolder: boolean;
  };
  isActive?: boolean;
  onDelete?: (e: React.MouseEvent, id: number) => void;
  onClick?: () => void;
  children?: React.ReactNode;
  expanded?: boolean;
  dragOver?: boolean;
  dragOverGapTop?: boolean;
  dragOverGapBottom?: boolean;
  onExpand?: (e: React.MouseEvent, node: EventDataNode<unknown>) => void;
  eventKey?: string;
}

export default React.memo(function FolderItem({
  folder,
  isActive,
  onDelete,
  onClick,
  children,
  expanded,
  dragOver,
  dragOverGapTop,
  dragOverGapBottom,
  onExpand,
  eventKey,
}: FolderItemProps) {
  const title = folder.content.split("\n")[0]?.trim() ?? "Untitled Folder";
  const colorLine = folder.content
    .split("\n")
    .find((line) => line.startsWith("!color:"));
  const folderColor = colorLine
    ? colorLine.replace("!color:", "").trim()
    : "#FFB3BA";

  return (
    <div className="relative flex flex-col">
      {/* Top drag indicator */}
      {dragOverGapTop && (
        <div className="absolute left-0 right-0 top-0 z-10 h-1 -translate-y-1/2 transform animate-pulse bg-blue-500 transition-all duration-200 ease-in-out" />
      )}

      <div
        className={cn(
          "group relative flex w-full cursor-pointer items-center",
          "transition-all duration-200",
          isActive && "text-blue-700",
          dragOver && "scale-[1.01] bg-blue-100 shadow-inner",
          dragOverGapTop && "border-t-2 border-t-blue-500",
          dragOverGapBottom && "border-b-2 border-b-blue-500",
          "border-l-2 border-l-blue-200",
        )}
        onClick={onClick}
      >
        {/* Expand/collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="pointer-events-auto z-10 h-7 w-7 p-0 hover:bg-transparent"
          onClick={(e) => {
            e.stopPropagation();
            if (onExpand && eventKey) {
              onExpand(e, {
                key: eventKey,
                expanded,
              } as EventDataNode<unknown>);
            }
          }}
        >
          {expanded ? (
            <ChevronDown className="h-5 w-5 text-blue-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-blue-400" />
          )}
        </Button>

        {/* Folder Icon + Title */}
        <div className="pointer-events-none z-10 flex min-w-0 flex-1 items-center gap-3 px-2 py-3">
          <Folder
            className={cn(
              "h-5 w-5 shrink-0 transition-all duration-300",
              dragOver ? "scale-110" : "",
            )}
            style={{ color: folderColor }}
          />
          <span
            className={cn(
              "flex-1 truncate text-sm transition-all duration-300",
              isActive ? "font-medium text-blue-700" : "text-gray-700",
              dragOver && "font-medium text-blue-700",
            )}
          >
            {title}
          </span>
        </div>

        {/* Right-side controls */}
        {onDelete && (
          <div className="z-10 mr-2 flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="pointer-events-auto h-8 w-8 p-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-5 w-5 text-gray-500" />
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
          </div>
        )}
      </div>

      {/* Bottom drag indicator */}
      {dragOverGapBottom && (
        <div className="absolute bottom-0 left-0 right-0 z-10 h-1 translate-y-1/2 transform animate-pulse bg-blue-500 transition-all duration-200 ease-in-out" />
      )}

      {/* Nested children if expanded */}
      {expanded && children && (
        <div
          className={cn(
            "border-l-2 border-l-blue-100 pl-6 transition-all duration-300",
            dragOver && "bg-blue-50/50",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
});
