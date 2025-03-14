"use client";

import React, { useMemo } from "react";
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
  type DragEndEvent,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  // restrictToParentElement, // Removed to allow dragging out of folders
} from '@dnd-kit/modifiers';
import { SortableNoteItem } from "~/components/SortableNoteItem";
import { SortableFolderItem } from './SortableFolderItem';

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

interface SidebarProps {
  notes: Note[];
  currentNote: Note;
  setCurrentNoteId: (id: number) => void;
  newNote: () => void;
  newFolder?: () => void;
  deleteNote: (event: React.MouseEvent<HTMLButtonElement>, noteId: number) => void;
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

  const organizedNotes = useMemo(() => {
    const sorted = notes
      .filter(note => !note.content.startsWith("!FStruct!"))
      .sort((a, b) => a.order - b.order);

    const folders = sorted.filter(note => note.isFolder && !note.parentId);
    const topLevelNotes = sorted.filter(note => !note.isFolder && !note.parentId);

    // Combine top-level folders and notes. 
    // If you want nested folders displayed first, then child notes, etc., 
    // you can sort differently.
    return [...folders, ...topLevelNotes];
  }, [notes]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!onUpdateStructure) return;
    const { active, over } = event;
    if (!over) return;

    const activeId = Number(active.id);
    // If the user drops over "droppable-root", we move to top-level (parentId = null).
    if (over.id === "droppable-root") {
      const newStructureRoot: NoteStructure[] = notes.map((n) => {
        if (n.id === activeId) {
          return {
            id: n.id,
            parentId: null,
            order: n.order, // We'll rely on sorting below to fix order if needed
          };
        }
        return {
          id: n.id,
          parentId: n.parentId,
          order: n.order,
        };
      });
      // Now reorder top-level if needed
      const topLevel = newStructureRoot
        .filter(n => n.parentId === null)
        .sort((a, b) => a.order - b.order);
      topLevel.forEach((item, i) => {
        item.order = (i + 1) * 1000;
      });
      onUpdateStructure(newStructureRoot);
      return;
    }

    // Standard logic for dropping over a note or a folder
    const overId = Number(over.id.toString().replace('droppable-', ''));

    if (activeId === overId) return;

    const activeNote = notes.find((n) => n.id === activeId);
    const overNote = notes.find((n) => n.id === overId);

    if (!activeNote || !overNote) return;

    // If the user is dropping on a droppable folder zone
    const isOverDroppableFolder =
      over.id.toString().startsWith("droppable-") && overNote.isFolder;

    // Disallow dropping one folder into another if desired
    if (activeNote.isFolder && isOverDroppableFolder) {
      return;
    }

    // newParentId: If dropping onto a folder zone, set parent to that folder ID;
    // otherwise, use the overNote's parent.
    const newParentId = isOverDroppableFolder ? overNote.id : overNote.parentId;

    // We'll re-sort among siblings of the same type (folder or note) under new parent
    const siblings = notes
      .filter((n) => n.parentId === newParentId && n.isFolder === activeNote.isFolder)
      .sort((a, b) => a.order - b.order);

    // Remove the active note from those siblings
    const filtered = siblings.filter((s) => s.id !== activeId);

    // Insert active note at the position of the overNote
    const overIndex = filtered.findIndex((s) => s.id === overId);
    if (overIndex === -1) {
      filtered.push(activeNote);
    } else {
      filtered.splice(overIndex, 0, activeNote);
    }

    // Recalculate orders
    filtered.forEach((item, i) => {
      item.order = (i + 1) * 1000;
    });

    // Build new structure
    const newStructure: NoteStructure[] = notes.map((n) => {
      if (n.id === activeId) {
        return {
          id: n.id,
          parentId: newParentId,
          order: (filtered.findIndex((f) => f.id === activeId) + 1) * 1000,
        };
      }
      const updatedIndex = filtered.findIndex((f) => f.id === n.id);
      if (updatedIndex !== -1) {
        return {
          id: n.id,
          parentId: newParentId,
          order: (updatedIndex + 1) * 1000,
        };
      }
      return {
        id: n.id,
        parentId: n.parentId,
        order: n.order,
      };
    });

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
          onDragEnd={handleDragEnd}
          // Removed restrictToParentElement so you can freely drag out of folders
          modifiers={[restrictToVerticalAxis]}
        >
          {/* "Root" droppable area */}
          <div
            ref={setRootDroppableRef}
            className="h-full"
            style={isOverRoot ? { backgroundColor: '#f0f8ff' } : undefined}
          >
            <SortableContext
              items={organizedNotes.map(note => note.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="h-full overflow-y-auto">
                {organizedNotes.map((note) =>
                  note.isFolder ? (
                    <SortableFolderItem
                      key={note.id}
                      folder={note}
                      isActive={currentNote?.id === note.id}
                      onClick={() => setCurrentNoteId(note.id)}
                      onDelete={deleteNote}
                    >
                      {notes.filter(n => n.parentId === note.id).map(childNote => (
                        <SortableNoteItem
                          key={childNote.id}
                          note={childNote}
                          currentNoteId={currentNote?.id ?? -1}
                          onSelect={() => setCurrentNoteId(childNote.id)}
                          onDelete={deleteNote}
                          isDeletingId={isDeletingId}
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
                    />
                  )
                )}
              </ul>
            </SortableContext>
          </div>
        </DndContext>
      </div>
    </section>
  );
};

export default Sidebar;