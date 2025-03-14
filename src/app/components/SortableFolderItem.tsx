import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Folder, ChevronRight, ChevronDown, MoreVertical, Trash2, GripVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import type { Note } from './Sidebar';

interface SortableFolderItemProps {
  folder: Note;
  isActive: boolean;
  onClick: () => void;
  onDelete: (event: React.MouseEvent<HTMLButtonElement>, id: number) => void;
  children?: React.ReactNode[];
}

export function SortableFolderItem({
  folder,
  isActive,
  onClick,
  onDelete,
  children = [],
}: SortableFolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `droppable-${folder.id}`,
    data: {
      type: 'folder',
      accepts: ['note', 'folder'],
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
      type: 'folder',
      isFolder: true,
      parentId: folder.parentId
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const title = folder.content.split('\n')[0] ?? 'Untitled Folder';

  return (
    <div className="flex flex-col" ref={setDroppableRef}>
      <div
        ref={setSortableRef}
        style={style}
        {...attributes}
        className={cn(
          'group relative flex items-center w-full p-4',
          'border-l-[3px] border-transparent',
          'hover:bg-gray-50 transition-colors duration-200',
          isActive && 'bg-blue-50 border-l-blue-500',
          isDragging && 'opacity-50',
          isOver && 'bg-blue-50/50 ring-1 ring-blue-200'
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
          className="flex flex-1 items-center gap-2 pl-4 min-w-0"
          onClick={onClick}
        >
          <Folder className="h-4 w-4 text-blue-500 shrink-0" />
          <span className={cn(
            "flex-1 truncate text-sm",
            isActive ? "text-blue-700 font-medium" : "text-gray-700"
          )}>
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <button
                  className="w-full flex items-center text-red-600"
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
            className="touch-none p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab"
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>

      {isExpanded && children && children.length > 0 && (
        <div className={cn(
          "ml-3 border-l border-gray-200",
          isOver && "border-blue-200"
        )}>
          <div className="py-1">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}