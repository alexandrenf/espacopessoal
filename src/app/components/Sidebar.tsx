"use client";

import React, { useMemo, useState, useEffect } from "react";
import { ImSpinner8 } from "react-icons/im";
import { Button } from "~/components/ui/button";
import { ArrowLeft, FolderPlus, FilePlus, Folder, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DragMoveEvent,
  useDroppable,
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableNoteItem } from "~/components/SortableNoteItem";
import { SortableFolderItem } from "./SortableFolderItem";
import { cn } from "~/lib/utils";

/* --- Constants & Helpers --- */

export interface Note {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isOptimistic?: boolean;
  parentId: number | null;
  isFolder: boolean;
  order: number;
}

export interface NoteStructure {
  id: number;
  parentId: number | null;
  order: number;
}

/**
 * Normalizes the order values of notes to use sequential integers
 */
const normalizeOrders = (notes: Note[]): Note[] => {
  // Sort by parentId and order to maintain hierarchy
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.parentId !== b.parentId) {
      return (a.parentId ?? 0) - (b.parentId ?? 0);
    }
    return a.order - b.order;
  });

  // Group notes by parent
  const groupedNotes = sortedNotes.reduce((acc, note) => {
    const key = note.parentId?.toString() ?? "root";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(note);
    return acc;
  }, {} as Record<string, Note[]>);

  // Normalize each group independently with sequential integers
  return sortedNotes.map((note) => {
    const groupKey = note.parentId?.toString() ?? "root";
    const group = groupedNotes[groupKey] ?? [];
    const indexInGroup = group.findIndex((n) => n.id === note.id);
    
    return {
      ...note,
      order: indexInGroup + 1, // Start from 1
    };
  });
};

/**
 * Calculates a new order value between two existing orders
 * Uses sequential integers
 */
const calculateNewOrder = (prevOrder: number | null, nextOrder: number | null): number => {
  // If we're at the start of the list
  if (!prevOrder && nextOrder) {
    return 1;
  }
  
  // If we're at the end of the list
  if (!nextOrder && prevOrder) {
    return prevOrder + 1;
  }
  
  // If we have both orders, place between them
  if (prevOrder && nextOrder) {
    // If there's space between orders, use the middle
    if (nextOrder - prevOrder > 1) {
      return Math.floor((prevOrder + nextOrder) / 2);
    }
    // If orders are consecutive, increment the next item's order
    return prevOrder + 1;
  }
  
  // Fallback case - shouldn't happen in practice
  return 1;
};

/* --- Sidebar Component --- */

interface SidebarProps {
  notes: Note[];
  currentNote: Note;
  setCurrentNoteId: (id: number) => void;
  newNote: () => void;
  newFolder?: () => void;
  deleteNote: (
    event: React.MouseEvent<HTMLButtonElement>,
    noteId: number
  ) => void;
  isCreating: boolean;
  isDeletingId: number | null;
  onToggleSidebar?: () => void;
  showSidebar?: boolean;
  onUpdateStructure?: (structure: NoteStructure[]) => void;
  isMobile: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  notes,
  currentNote,
  setCurrentNoteId,
  newNote,
  newFolder,
  deleteNote,
  isCreating,
  isDeletingId,
  onToggleSidebar,
  showSidebar = true,
  onUpdateStructure,
}) => {
  // Use local/optimistic state
  const [localNotes, setLocalNotes] = useState<Note[]>(notes);
  // Track active item ID while dragging
  const [activeId, setActiveId] = useState<number | null>(null);
  // Track hovered droppable
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { setNodeRef: setRootDroppableRef, isOver: isOverRoot } = useDroppable({
    id: "droppable-root",
    data: { type: "root" },
  });

  // Filter out special notes and sort top-level
  const organizedNotes = useMemo(() => {
    return localNotes
      .filter((note) => !note.content.startsWith("!FStruct!"))
      .filter((note) => note.parentId === null)
      .sort((a, b) => a.order - b.order);
  }, [localNotes]);

  /**
   * onDragStart: Track the item being dragged
   */
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(Number(active.id));
  };

  /**
   * onDragOver: Decide if above/below or inside folder
   * We'll rely on comparing the midpoint of the dragged item
   * to the bounding box of the item currently under the pointer.
   */
  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event;
    if (!over) {
      setHoveredId(null);
      return;
    }

    const overIdString = over.id.toString();
    if (overIdString !== "droppable-root" && !overIdString.startsWith("droppable-")) {
      setHoveredId(null);
      return;
    }

    if (overIdString === "droppable-root") {
      setHoveredId(null);
      return;
    }

    const overId = Number(overIdString.replace("droppable-", ""));
    const overNote = localNotes.find((n) => n.id === overId);
    if (!overNote) {
      setHoveredId(null);
      return;
    }

    setHoveredId(overId);

    const overRect = over.rect;
    if (!overRect) return;

    // Get the current pointer coordinates relative to the viewport
    const pointerY = (event.activatorEvent as MouseEvent).clientY;
    const overTop = overRect.top;
    const overHeight = overRect.height;

    if (overNote.isFolder) {
      const topThreshold = overTop + overHeight * 0.25;
      const bottomThreshold = overTop + overHeight * 0.75;

      const dragPosition = pointerY < topThreshold 
        ? "above" 
        : pointerY > bottomThreshold 
          ? "below" 
          : "inside";

      console.log('Drop zone debug:', {
        pointerY,
        overTop,
        overHeight,
        topThreshold,
        bottomThreshold,
        dragPosition,
        currentDropZone: (over.data.current as { dropZone?: "above" | "below" | "inside" })?.dropZone,
        activeId: active.id,
        overId: over.id
      });

      // Update the drop zone in the over data
      over.data.current = {
        ...over.data.current,
        dragPosition,
        dropZone: dragPosition,
      } as { dragPosition: "above" | "below" | "inside"; dropZone: "above" | "below" | "inside" };
    } else {
      const midLine = overTop + overHeight / 2;
      const dragPosition = pointerY < midLine ? "above" : "below";

      over.data.current = {
        ...over.data.current,
        dragPosition,
      } as { dragPosition: "above" | "below" };
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { over, active } = event;
    if (!over) return;

    const overIdString = over.id.toString();
    if (overIdString !== "droppable-root" && !overIdString.startsWith("droppable-")) {
      return;
    }

    if (overIdString === "droppable-root") {
      return;
    }

    const moveOverId = Number(overIdString.replace("droppable-", ""));
    const moveOverNote = localNotes.find((n) => n.id === moveOverId);
    if (!moveOverNote?.isFolder) return;

    const overRect = over.rect;
    if (!overRect) return;

    // Get the current pointer coordinates relative to the viewport
    const pointerY = (event.activatorEvent as MouseEvent).clientY;
    const overTop = overRect.top;
    const overHeight = overRect.height;

    const topThreshold = overTop + overHeight * 0.25;
    const bottomThreshold = overTop + overHeight * 0.75;

    const moveDragPosition = pointerY < topThreshold 
      ? "above" 
      : pointerY > bottomThreshold 
        ? "below" 
        : "inside";

    console.log('Drag move debug:', {
      pointerY,
      overTop,
      overHeight,
      topThreshold,
      bottomThreshold,
      moveDragPosition,
      currentDropZone: (over.data.current as { dropZone?: "above" | "below" | "inside" })?.dropZone,
      activeId: active.id,
      overId: over.id
    });

    over.data.current = {
      ...over.data.current,
      dragPosition: moveDragPosition,
      dropZone: moveDragPosition,
    } as { dragPosition: "above" | "below" | "inside"; dropZone: "above" | "below" | "inside" };
  };

  /**
   * onDragEnd: re-order or re-parent based on where we dropped
   */
  const handleDragEnd = (event: DragEndEvent) => {
    if (!onUpdateStructure) return;

    setActiveId(null);
    setHoveredId(null);

    const { active, over } = event;
    if (!over) return;

    const overIdString = over.id.toString();
    const activeIdNum = Number(active.id);

    // Handle root dropping
    if (overIdString === "droppable-root") {
      const activeNote = localNotes.find((n) => n.id === activeIdNum);
      if (!activeNote) return;

      // Place the note/folder at root with the largest order
      const rootNotes = localNotes.filter((n) => n.parentId === null);
      const maxOrder =
        rootNotes.length > 0
          ? Math.max(...rootNotes.map((n) => n.order))
          : 0;

      const rootUpdatedNotes = localNotes.map((n) =>
        n.id === activeIdNum
          ? { ...n, parentId: null, order: maxOrder + 1 }
          : n
      );

      // Normalize orders before updating
      const rootNormalizedNotes = normalizeOrders(rootUpdatedNotes);
      setLocalNotes(rootNormalizedNotes);

      const rootNewStructure = rootNormalizedNotes.map((n) => ({
        id: n.id,
        parentId: n.parentId ?? null,
        order: n.order,
      }));
      onUpdateStructure(rootNewStructure);
      return;
    }

    const dropOverId = Number(overIdString.replace("droppable-", ""));
    if (activeIdNum === dropOverId) return;

    const activeNote = localNotes.find((n) => n.id === activeIdNum);
    const dropOverNote = localNotes.find((n) => n.id === dropOverId);
    if (!activeNote || !dropOverNote) return;

    const isOverFolder = dropOverNote.isFolder;
    const dropData = over.data.current as { dragPosition?: "above" | "below" | "inside" };
    const dragPosition = dropData?.dragPosition ?? "below";

    // Initialize with empty array since we'll assign it in both branches
    const updatedNotes = dragPosition === "inside" && isOverFolder
      ? (() => {
          // Prevent placing a folder inside itself or its descendants
          if (activeNote.isFolder) {
            const isCircular = (folderId: number, targetId: number): boolean => {
              if (folderId === targetId) return true;
              const childFolders = localNotes.filter(n => n.parentId === folderId && n.isFolder);
              return childFolders.some(folder => isCircular(folder.id, targetId));
            };
            
            if (isCircular(activeIdNum, dropOverId)) {
              return localNotes; // Return unchanged notes if circular reference
            }
          }

          // Get children of the target folder
          const children = localNotes
            .filter((n) => n.parentId === dropOverNote.id)
            .sort((a, b) => a.order - b.order);

          // Calculate new order based on children
          const newOrder = children.length > 0
            ? Math.max(...children.map(n => n.order)) + 1
            : 1;

          return localNotes.map((n) =>
            n.id === activeIdNum
              ? { ...n, parentId: dropOverNote.id, order: newOrder }
              : n
          );
        })()
      : (() => {
          const siblings = localNotes
            .filter(n => n.parentId === dropOverNote.parentId)
            .sort((a, b) => a.order - b.order);

          const oldIndex = siblings.findIndex(n => n.id === activeIdNum);
          const overIndex = siblings.findIndex(n => n.id === dropOverNote.id);

          let newOrder: number;
          if (oldIndex > overIndex) {
            // Dragging upward
            const targetIndex = overIndex;
            const prevOrder = targetIndex > 0 ? siblings[targetIndex - 1]?.order ?? 0 : 0;
            const nextOrder = siblings[targetIndex]?.order ?? 0;
            
            // When dragging up, we want to place the item at the target position
            // and shift other items down by 1
            newOrder = nextOrder;
            
            // Shift all items between old and new position down by 1
            return localNotes.map((n) => {
              if (n.id === activeIdNum) {
                return { ...n, parentId: dropOverNote.parentId, order: newOrder };
              }
              // Only shift items that are between the old and new position
              const noteIndex = siblings.findIndex(s => s.id === n.id);
              if (noteIndex >= targetIndex && noteIndex < oldIndex) {
                return { ...n, order: n.order + 1 };
              }
              return n;
            });
          } else {
            // Dragging downward
            const prevOrder = dropOverNote.order;
            const nextOrder = overIndex < siblings.length - 1 
              ? siblings[overIndex + 1]?.order ?? 0
              : prevOrder + 1;
            newOrder = calculateNewOrder(prevOrder, nextOrder);

            return localNotes.map((n) =>
              n.id === activeIdNum
                ? { ...n, parentId: dropOverNote.parentId, order: newOrder }
                : n
            );
          }
        })();

    // Normalize orders before updating
    const normalizedNotes = normalizeOrders(updatedNotes);
    setLocalNotes(normalizedNotes);

    const newStructure = normalizedNotes.map((n) => ({
      id: n.id,
      parentId: n.parentId,
      order: n.order,
    }));
    onUpdateStructure(newStructure);
  };

  return (
    <section className="w-full h-full md:h-screen flex flex-col bg-white">
      <div className="shrink-0 flex items-center justify-between p-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-800">Notes</h1>
        <div className="flex items-center gap-2">
          {onToggleSidebar && showSidebar && (
            <Button
              onClick={onToggleSidebar}
              variant="outline"
              size="icon"
              className="md:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={isCreating}
                variant="outline"
                size="icon"
                className="bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border-blue-200 hover:border-blue-300 text-blue-700"
              >
                {isCreating ? (
                  <ImSpinner8 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="text-lg">+</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={newNote}>
                <FilePlus className="mr-2 h-4 w-4" />
                Nova nota
              </DropdownMenuItem>
              {newFolder && (
                <DropdownMenuItem onClick={newFolder}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Nova pasta
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
          autoScroll={{
            threshold: {
              x: 0,
              y: 0.2,
            },
            acceleration: 10,
            interval: 5,
          }}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always
            }
          }}
        >
          {/* "Root" droppable area */}
          <div
            ref={setRootDroppableRef}
            className={cn(
              "h-full relative overflow-y-auto transition-colors duration-300",
              isOverRoot && "bg-blue-50 shadow-inner"
            )}
            style={{ minHeight: "100%" }}
            id="droppable-root"
            data-type="root"
            data-accepts="note,folder"
          >
            {isOverRoot && (
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-blue-100 to-transparent 
                pointer-events-none transition-opacity duration-300" />
            )}
            
            <SortableContext
              items={organizedNotes.map((note) => note.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="relative space-y-[1px]">
                {organizedNotes.map((note) =>
                  note.isFolder ? (
                    <SortableFolderItem
                      key={note.id}
                      folder={note}
                      isActive={currentNote?.id === note.id}
                      onClick={() => setCurrentNoteId(note.id)}
                      onDelete={deleteNote}
                      hovered={hoveredId === note.id} // highlight
                    >
                      {localNotes
                        .filter((n) => n.parentId === note.id)
                        .sort((a, b) => a.order - b.order)
                        .map((childNote) => (
                          <SortableNoteItem
                            key={childNote.id}
                            note={childNote}
                            currentNoteId={currentNote?.id ?? -1}
                            onSelect={() => setCurrentNoteId(childNote.id)}
                            onDelete={deleteNote}
                            isDeletingId={isDeletingId}
                            hovered={hoveredId === childNote.id} // highlight
                          />
                        ))}
                    </SortableFolderItem>
                  ) : (
                    <SortableNoteItem
                      key={note.id}
                      note={note}
                      currentNoteId={currentNote?.id ?? -1}
                      onSelect={() => setCurrentNoteId(note.id)}
                      onDelete={deleteNote}
                      isDeletingId={isDeletingId}
                      hovered={hoveredId === note.id} // highlight
                    />
                  )
                )}
                {/* Extra space to improve drag-to-bottom */}
                <li className="h-[100px] w-full" />
              </ul>
            </SortableContext>
          </div>

          {/* DragOverlay for a clean preview while dragging */}
          <DragOverlay dropAnimation={{
            duration: 250,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)', // Bouncy effect for satisfying drop
          }}>
            {activeId !== null ? (
              // You can choose how to render the dragged item.
              <div className="p-2 border border-gray-300 bg-white shadow-md rounded-sm
                transition-all duration-300 transform scale-105">
                {(() => {
                  const note = localNotes.find((n) => n.id === activeId);
                  if (!note) return null;
                  return note.isFolder
                    ? <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{note.content.substring(0, 20)}...</span>
                      </div>
                    : <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span>{note.content.substring(0, 20)}...</span>
                      </div>;
                })()}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </section>
  );
};

export default Sidebar;