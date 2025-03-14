"use client"

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
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import { SortableNoteItem } from "~/components/SortableNoteItem";

export interface Note {
  order: number;
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isOptimistic?: boolean;
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
  notes,  // This will now always be the local version
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

  const displayNotes = useMemo(() => 
    notes
      .filter(note => !note.content.startsWith("!FStruct!"))
      .sort((a, b) => a.order - b.order),
    [notes]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!onUpdateStructure) return;
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = displayNotes.findIndex((note) => note.id === active.id);
      if (!over) return;
      const newIndex = displayNotes.findIndex((note) => note.id === over.id);
      
      // Create a copy of the notes array
      const reorderedNotes = [...displayNotes];
      // Remove the dragged item
      const [movedItem] = reorderedNotes.splice(oldIndex, 1);
      // Insert it at the new position
      reorderedNotes.splice(newIndex, 0, movedItem!);
      
      // Update orders sequentially
      const newStructure: NoteStructure[] = reorderedNotes.map((note, index) => ({
        id: note.id,
        parentId: null,
        order: index,
      }));

      onUpdateStructure(newStructure);
    }
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
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext 
            items={displayNotes.map(note => note.id)} 
            strategy={verticalListSortingStrategy}
          >
            <ul className="h-full overflow-y-auto">
              {displayNotes.map((note) => (
                <SortableNoteItem
                  key={note.id}
                  note={note}
                  currentNoteId={currentNote.id}
                  onSelect={() => setCurrentNoteId(note.id)}
                  onDelete={(e) => deleteNote(e, note.id)}
                  isDeletingId={isDeletingId}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>

    </section>
  );
};

export default Sidebar;
