"use client";

import React, { useMemo, useState, useEffect, memo, useRef } from "react";
import { Button } from "~/components/ui/button";
import { ArrowLeft, FolderPlus, FilePlus} from "lucide-react";
import { ImSpinner8 } from "react-icons/im";
import Tree from 'rc-tree';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import NoteItem from "~/components/SortableNoteItem";
import FolderItem from "./SortableFolderItem";
import type { EventDataNode, Key } from "rc-tree/lib/interface";

// Extend DataNode to include level
interface CustomDataNode {
  key: string;
  title: React.ReactNode;
  children?: CustomDataNode[];
  isLeaf?: boolean;
  level?: number;
}

export interface Note {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isOptimistic?: boolean;
  parentId: number | null;
  isFolder: boolean;
  order: number;
  createdById: string;
}

interface SidebarProps {
  notes: Note[];
  currentNote?: Note;
  setCurrentNoteId: (id: number) => void;
  newNote: () => void;
  newFolder?: () => void;
  deleteNote: (e: React.MouseEvent<Element>, id: number) => void;
  isCreating: boolean;
  isDeletingId?: number;
  onToggleSidebar?: () => void;
  showSidebar?: boolean;
  onUpdateStructure?: (structure: { id: number; parentId: number | null; order: number }[]) => void;
  isMobile?: boolean;
}

interface TreeDropInfo {
  node: EventDataNode<CustomDataNode>;
  dragNode: EventDataNode<CustomDataNode>;
  dragNodesKeys: Key[];
  dropPosition: number;
  dropToGap: boolean;
}

// Add the DropIndicatorProps type
interface DropIndicatorProps {
  dropPosition: number;
  dropLevelOffset: number;
  indent: number;
}

// Custom styles for the drop indicator
const dropIndicatorStyles: React.CSSProperties = {
  position: 'absolute',
  backgroundColor: '#2563eb', // blue-600
  height: '2px',
  pointerEvents: 'none',
  transition: 'all 0.15s ease',
  zIndex: 10,
  width: 'calc(100% - 24px)', // Leave space for the indent
  left: 0,
};

const folderDropStyles: React.CSSProperties = {
  position: 'absolute',
  backgroundColor: '#dbeafe', // blue-100
  border: '2px dashed #60a5fa', // blue-400
  borderRadius: '4px',
  pointerEvents: 'none',
  transition: 'all 0.15s ease',
  zIndex: 10,
  width: 'calc(100% - 24px)', // Leave space for the indent
  left: 0,
  height: '100%',
  top: 0,
};

interface ExtendedDropIndicatorProps extends DropIndicatorProps {
  dropTargetKey?: Key;
  dropTargetPos?: string;
  dropTargetNode?: EventDataNode<CustomDataNode>;
  dragNode?: EventDataNode<CustomDataNode>;
  dropToGap?: boolean;
}

const Sidebar = memo(({
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
  isMobile = false,
}: SidebarProps) => {
  // Use refs for values that don't need to trigger re-renders
  const notesRef = useRef(notes);
  notesRef.current = notes;

  // Local state for UI-specific things
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"write" | "preview">("write");
  const [localNotes, setLocalNotes] = useState<Note[]>(notes);

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  // Add effect to expand parent folder when a note is selected
  useEffect(() => {
    if (currentNote?.parentId) {
      const parentId = currentNote.parentId;
      setExpandedKeys(prevKeys => {
        const parentKey = parentId.toString();
        if (!prevKeys.includes(parentKey)) {
          return [...prevKeys, parentKey];
        }
        return prevKeys;
      });
    }
  }, [currentNote?.parentId]);

  const handleExpand = (e: React.MouseEvent, node: EventDataNode<unknown>) => {
    const key = node.key as string;
    setExpandedKeys(prevKeys => {
      const index = prevKeys.indexOf(key);
      if (index > -1) {
        // Remove key if it exists (collapse)
        return prevKeys.filter(k => k !== key);
      } else {
        // Add key if it doesn't exist (expand)
        return [...prevKeys, key];
      }
    });
  };

  // Convert notes to rc-tree format
  const treeData = useMemo(() => {
    const makeTreeNode = (note: Note, level = 0): CustomDataNode => ({
      key: note.id.toString(),
      title: note.isFolder ? (
        <FolderItem
          folder={note}
          isActive={currentNote?.id === note.id}
          onDelete={deleteNote}
          onClick={() => setCurrentNoteId(note.id)}
          expanded={expandedKeys.includes(note.id.toString())}
          onExpand={handleExpand}
          eventKey={note.id.toString()}
        />
      ) : (
        <NoteItem
          note={note}
          currentNoteId={currentNote?.id}
          onDelete={deleteNote}
          isDeletingId={isDeletingId}
          onSelect={() => setCurrentNoteId(note.id)}
          selected={currentNote?.id === note.id}
          isNested={level > 0}
        />
      ),
      children: note.isFolder
        ? localNotes
            .filter(n => n.parentId === note.id)
            .sort((a, b) => a.order - b.order)
            .map(n => makeTreeNode(n, level + 1))
        : undefined,
      isLeaf: !note.isFolder,
      level,
    });

    return localNotes
      .filter(note => note.parentId === null)
      .sort((a, b) => a.order - b.order)
      .map(note => makeTreeNode(note, 0));
  }, [localNotes, currentNote?.id, isDeletingId, deleteNote, expandedKeys]);

  const handleDrop = (info: TreeDropInfo) => {
    const dropKey = String(info.node.key);
    const dragKey = String(info.dragNode.key);
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    const dragNote = localNotes.find(n => n.id === Number(dragKey));
    const dropNote = localNotes.find(n => n.id === Number(dropKey));

    if (!dragNote || !dropNote || !onUpdateStructure) return;

    const updatedNotes = localNotes.map(note => ({ ...note })); // Create deep copy
    let newParentId: number | null = null;

    // Handle dropping into a folder
    if (dropPosition === 0 && dropNote.isFolder) {
      newParentId = dropNote.id;
      
      // Get existing notes in the target folder
      const notesInFolder = updatedNotes
        .filter(n => n.parentId === newParentId && n.id !== dragNote.id)
        .sort((a, b) => a.order - b.order);

      // Update the dragged note
      const dragNoteIndex = updatedNotes.findIndex(n => n.id === dragNote.id);
      updatedNotes[dragNoteIndex] = {
        ...dragNote,
        parentId: newParentId,
        order: notesInFolder.length // Place at the end
      };

      // Update orders for all affected notes
      updatedNotes.forEach(note => {
        if (note.parentId === dragNote.parentId && note.order > dragNote.order) {
          note.order -= 1; // Shift up notes in the source folder
        }
      });
    } else {
      // Handle dropping between notes
      newParentId = dropNote.parentId;
      
      // Get all notes at the target level (excluding the dragged note)
      const notesInLevel = updatedNotes
        .filter(n => n.parentId === newParentId && n.id !== dragNote.id)
        .sort((a, b) => a.order - b.order);

      const dropIndex = notesInLevel.findIndex(n => n.id === dropNote.id);
      const targetIndex = dropPosition < 0 ? dropIndex : dropIndex + 1;

      // Remove note from its current position
      const dragNoteIndex = updatedNotes.findIndex(n => n.id === dragNote.id);
      const oldParentId = dragNote.parentId;
      const oldOrder = dragNote.order;

      // Update orders in the source folder
      updatedNotes.forEach(note => {
        if (note.parentId === oldParentId && note.order > oldOrder) {
          note.order -= 1;
        }
      });

      // Insert at new position
      updatedNotes[dragNoteIndex] = {
        ...dragNote,
        parentId: newParentId,
        order: targetIndex
      };

      // Update orders in the target folder
      updatedNotes.forEach(note => {
        if (note.parentId === newParentId && note.id !== dragNote.id && note.order >= targetIndex) {
          note.order += 1;
        }
      });
    }

    // Normalize orders to ensure they are sequential
    const normalizeOrders = (parentId: number | null) => {
      const notesInLevel = updatedNotes
        .filter(n => n.parentId === parentId)
        .sort((a, b) => a.order - b.order);
      
      notesInLevel.forEach((note, index) => {
        const noteIndex = updatedNotes.findIndex(n => n.id === note.id);
        updatedNotes[noteIndex]!.order = index;
      });
    };

    // Normalize orders for both source and target folders
    if (typeof dragNote?.parentId !== 'undefined') {
      normalizeOrders(dragNote.parentId);
      if (dragNote.parentId !== newParentId) {
        normalizeOrders(newParentId);
      }
    }

    setLocalNotes(updatedNotes);
    onUpdateStructure(updatedNotes.map(n => ({
      id: n.id,
      parentId: n.parentId,
      order: n.order
    })));
  };

  const renderDropIndicator = (props: ExtendedDropIndicatorProps) => {
    const { dropPosition, dropLevelOffset, indent, dropTargetNode, dropToGap } = props;
    
    const style: React.CSSProperties = {
      ...dropIndicatorStyles,
      transform: `translateX(${dropLevelOffset}px)`,
    };

    // If dropToGap is false, we're dropping into a folder
    const isIntoFolder = dropPosition === 0 && dropToGap === false;

    if (isIntoFolder) {
      // When dropping into a folder
      style.backgroundColor = '#60a5fa'; // lighter blue for folder drop
      style.height = '4px';
      style.borderRadius = '2px';
      style.boxShadow = '0 0 0 1px rgba(96, 165, 250, 0.3)';
      style.transform += ' translateY(-2px)';
    } else if (dropPosition === 1) {
      // When dropping after a node
      style.transform += ' translateY(100%)';
    } else if (dropPosition === -1) {
      // When dropping before a node
      style.transform += ' translateY(-50%)';
    }

    return <div style={style} />;
  };

  return (
    <section className={`w-full h-full md:h-screen flex flex-col bg-white ${isMobile ? 'fixed top-16 left-0 right-0 bottom-0 z-50' : ''}`}>
      <div className="shrink-0 flex items-center justify-between p-4 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {onToggleSidebar && showSidebar && (
            <Button
              onClick={onToggleSidebar}
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-xl font-semibold text-gray-800">Notas</h1>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={isCreating}
                variant="outline"
                size="icon"
                className="bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border-blue-200 hover:border-blue-300 text-blue-700"
              >
                {isCreating ? (
                  <ImSpinner8 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-lg">+</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={newNote} className="flex items-center gap-2 py-2">
                <FilePlus className="h-4 w-4" />
                <span>Nota nota</span>
              </DropdownMenuItem>
              {newFolder && (
                <DropdownMenuItem onClick={newFolder} className="flex items-center gap-2 py-2">
                  <FolderPlus className="h-4 w-4" />
                  <span>Nova pasta</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <Tree
          treeData={treeData}
          draggable={!isMobile}
          onDrop={handleDrop}
          onSelect={([selectedKey]) => {
            if (selectedKey) {
              setCurrentNoteId(Number(selectedKey));
              if (isMobile && onToggleSidebar) {
                onToggleSidebar();
              }
            }
          }}
          selectedKeys={currentNote ? [currentNote.id.toString()] : []}
          expandedKeys={expandedKeys}
          onExpand={(expanded) => setExpandedKeys(expanded as string[])}
          motion={false}
          prefixCls="custom-tree"
          className={`custom-tree-container ${isMobile ? 'px-2' : ''}`}
          dropIndicatorRender={renderDropIndicator}
          defaultExpandAll={false}
          defaultExpandedKeys={[]}
        />
      </div>

      
    </section>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;

