import React from "react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ChevronDown, ChevronRight, Folder, MoreVertical, Trash2 } from "lucide-react";
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
  const colorLine = folder.content.split("\n").find(line => line.startsWith("!color:"));
  const folderColor = colorLine ? colorLine.replace("!color:", "").trim() : "#FFB3BA";

  return (
    <div className="flex flex-col relative">
      {/* Top drag indicator */}
      {dragOverGapTop && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 transform -translate-y-1/2 z-10 
          animate-pulse transition-all duration-200 ease-in-out" />
      )}

      <div
        className={cn(
          "group relative flex w-full items-center cursor-pointer",
          "transition-all duration-200",
          isActive && "text-blue-700",
          dragOver && "bg-blue-100 shadow-inner scale-[1.01]",
          dragOverGapTop && "border-t-2 border-t-blue-500",
          dragOverGapBottom && "border-b-2 border-b-blue-500",
          "border-l-2 border-l-blue-200"
        )}
        onClick={onClick}
      >
        {/* Expand/collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-transparent z-10 pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            if (onExpand && eventKey) {
              onExpand(e, { key: eventKey, expanded } as EventDataNode<unknown>);
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
        <div className="flex min-w-0 flex-1 items-center gap-3 py-3 px-2 z-10 pointer-events-none">
          <Folder className={cn(
            "h-5 w-5 shrink-0 transition-all duration-300",
            dragOver ? "scale-110" : ""
          )} style={{ color: folderColor }} />
          <span
            className={cn(
              "flex-1 truncate text-sm transition-all duration-300",
              isActive ? "font-medium text-blue-700" : "text-gray-700",
              dragOver && "font-medium text-blue-700"
            )}
          >
            {title}
          </span>
        </div>

        {/* Right-side controls */}
        {onDelete && (
          <div className="mr-2 flex items-center gap-2 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-events-auto"
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
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 transform translate-y-1/2 z-10 
          animate-pulse transition-all duration-200 ease-in-out" />
      )}

      {/* Nested children if expanded */}
      {expanded && children && (
        <div
          className={cn(
            "transition-all duration-300 pl-6 border-l-2 border-l-blue-100",
            dragOver && "bg-blue-50/50"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
});
