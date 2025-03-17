"use client";

import React, { useMemo, useState, useEffect } from "react";
import { ImSpinner8 } from "react-icons/im";
import { Button } from "~/components/ui/button";
import { ArrowLeft, FolderPlus, FilePlus } from "lucide-react";
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
  useDroppable,
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

// Adjust these if needed
const NORMALIZE_THRESHOLD = 1000000;
export const BASE_ORDER_INCREMENT = 1000;

const normalizeOrders = (notes: Note[]): Note[] => {
  // Sort by order and parentId to ensure consistent hierarchy
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.parentId !== b.parentId) {
      return (a.parentId ?? 0) - (b.parentId ?? 0);
    }
    return a.order - b.order;
  });

  // Group them by parent
  const groupedNotes = sortedNotes.reduce((acc, note) => {
    const key = note.parentId?.toString() ?? "root";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(note);
    return acc;
  }, {} as Record<string, Note[]>);

  // Reset the order field in increments
  return sortedNotes.map((note) => {
    const groupKey = note.parentId?.toString() ?? "root";
    const group = groupedNotes[groupKey] ?? [];
    const indexInGroup = group.findIndex((n) => n.id === note.id);
    return {
      ...note,
      order: (indexInGroup + 1) * BASE_ORDER_INCREMENT,
    };
  });
};

const calculateNewOrder = (prevOrder: number | null, nextOrder: number | null): number => {
  if (!prevOrder && nextOrder) return nextOrder - BASE_ORDER_INCREMENT;
  if (!nextOrder && prevOrder) return prevOrder + BASE_ORDER_INCREMENT;
  
  return Math.floor((prevOrder! + nextOrder!) / 2);
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
    const { over } = event;
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

    const activeRect = event.active.rect.current.translated;
    const overRect = over.rect;
    if (!activeRect || !overRect) return;

    const pointerY = activeRect.top + activeRect.height / 2;
    const activeHeight = activeRect.height;

    if (overNote.isFolder) {
      const topThreshold = overRect.top + overRect.height * 0.25;
      const bottomThreshold = overRect.top + overRect.height * 0.75;

      const dragPosition = pointerY < topThreshold 
        ? "above" 
        : pointerY > bottomThreshold 
          ? "below" 
          : "inside";

      over.data.current = {
        ...over.data.current,
        dragPosition,
      };
    } else {
      const midLine = overRect.top + overRect.height / 2;
      const aboveThreshold = midLine - (activeHeight * 0.75);
      const dragPosition = pointerY < aboveThreshold ? "above" : "below";

      over.data.current = {
        ...over.data.current,
        dragPosition,
      };
    }
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
      const activeId = Number(active.id);
      const activeNote = localNotes.find((n) => n.id === activeId);
      if (!activeNote) return;

      // Place the note/folder at root with the largest order
      const topLevel = localNotes.filter((n) => n.parentId === null);
      const maxOrder =
        topLevel.length > 0
          ? Math.max(...topLevel.map((n) => n.order))
          : 0;

      let updatedNotes = localNotes.map((n) =>
        n.id === activeId
          ? { ...n, parentId: null, order: maxOrder + BASE_ORDER_INCREMENT }
          : n
      );

      // Check for possible normalization
      const maxCurrentOrder = Math.max(...updatedNotes.map((n) => n.order));
      if (maxCurrentOrder > NORMALIZE_THRESHOLD) {
        updatedNotes = normalizeOrders(updatedNotes);
      }

      setLocalNotes(updatedNotes);

      const newStructure = updatedNotes.map((n) => ({
        id: n.id,
        parentId: n.parentId ?? null,
        order: n.order,
      }));
      onUpdateStructure(newStructure);
      return;
    }

    const overId = Number(overIdString.replace("droppable-", ""));
    if (activeIdNum === overId) return;

    const activeNote = localNotes.find((n) => n.id === activeIdNum);
    const overNote = localNotes.find((n) => n.id === overId);
    if (!activeNote || !overNote) return;

    const isOverFolder = overNote.isFolder;
    const dropData = over.data.current as { dragPosition?: "above" | "below" | "inside" };
    const dragPosition = dropData?.dragPosition ?? "below";


    let updatedNotes: Note[] = [];

    if (dragPosition === "inside" && isOverFolder) {
      // Place the dragged note inside the folder
      const children = localNotes
        .filter((n) => n.parentId === overNote.id)
        .sort((a, b) => a.order - b.order);
      const maxOrder =
        children.length > 0
          ? children[children.length - 1]?.order ?? 0
          : overNote.order ?? 0;
      const newOrder = maxOrder + BASE_ORDER_INCREMENT;

      updatedNotes = localNotes.map((n) =>
        n.id === activeIdNum
          ? { ...n, parentId: overNote.id, order: newOrder }
          : n
      );
    } else {
      // Modified sibling handling
      const siblings = localNotes
        .filter(n => n.parentId === overNote.parentId)
        .sort((a, b) => a.order - b.order);

      // Find current index positions
      const oldIndex = siblings.findIndex(n => n.id === activeIdNum);
      const overIndex = siblings.findIndex(n => n.id === overNote.id);

      let newOrder: number;

      if (oldIndex > overIndex) { // Dragging upward
        const targetIndex = overIndex;
        
        // Get neighbor orders with guaranteed spacing
        const prevOrder = targetIndex > 0 ? siblings[targetIndex - 1]?.order ?? 0 : 0;
        const nextOrder = siblings[targetIndex]?.order ?? 0;
        
        newOrder = calculateNewOrder(prevOrder, nextOrder);
      } else {
        // Existing downward logic
        const prevOrder = overNote.order;
        const nextOrder = overIndex < siblings.length - 1 
          ? siblings[overIndex + 1]?.order ?? 0
          : prevOrder + BASE_ORDER_INCREMENT;
        newOrder = calculateNewOrder(prevOrder, nextOrder);
      }

      updatedNotes = localNotes.map((n) =>
        n.id === activeIdNum
          ? { ...n, parentId: overNote.parentId, order: newOrder }
          : n
      );
    }

    // Normalize if needed
    const maxOrder = Math.max(...updatedNotes.map((n) => n.order));
    if (maxOrder > NORMALIZE_THRESHOLD) {
      updatedNotes = normalizeOrders(updatedNotes);
    }

    setLocalNotes(updatedNotes);

    const newStructure = updatedNotes.map((n) => ({
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
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          {/* "Root" droppable area */}
          <div
            ref={setRootDroppableRef}
            className={cn(
              "h-full relative overflow-y-auto transition-colors",
              isOverRoot && "bg-blue-50"
            )}
            style={{ minHeight: "100%" }}
            id="droppable-root"
          >
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
          <DragOverlay>
            {activeId !== null ? (
              // You can choose how to render the dragged item.
              <div className="p-2 border border-gray-300 bg-white shadow-md rounded-sm">
                {(() => {
                  const note = localNotes.find((n) => n.id === activeId);
                  if (!note) return null;
                  return note.isFolder
                    ? `Folder: ${note.content}`
                    : `Note: ${note.content.substring(0, 20)}...`;
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