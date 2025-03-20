"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { ArrowLeft, FolderPlus, FilePlus, FileText, Eye } from "lucide-react";
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
  isMobile = false,
}) => {
  const [localNotes, setLocalNotes] = useState<Note[]>(notes);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"write" | "preview">("write");

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

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

    const updatedNotes = [...localNotes];
    let newParentId: number | null = null;
    let newOrder: number;

    if (dropPosition === 0 && dropNote.isFolder) {
      newParentId = dropNote.id;
      const notesInFolder = localNotes.filter(n => n.parentId === newParentId);
      newOrder = notesInFolder.length > 0 
        ? Math.max(...notesInFolder.map(n => n.order)) + 1 
        : 0;
    } else {
      newParentId = dropNote.parentId;
      const notesInLevel = localNotes
        .filter(n => n.parentId === newParentId)
        .sort((a, b) => a.order - b.order);
      
      const dropIndex = notesInLevel.findIndex(n => n.id === dropNote.id);
      
      // Calculate new order based on drop position
      if (dropPosition < 0) {
        // Dropping above
        newOrder = dropNote.order;
      } else {
        // Dropping below
        newOrder = dropNote.order + 1;
      }

      // Update orders for all affected notes
      notesInLevel.forEach(note => {
        if (note.order >= newOrder) {
          note.order += 1;
        }
      });
    }

    const updatedNote = {
      ...dragNote,
      parentId: newParentId,
      order: newOrder
    };

    const finalNotes = updatedNotes.map(n => 
      n.id === dragNote.id ? updatedNote : n
    );

    setLocalNotes(finalNotes);
    onUpdateStructure(finalNotes.map(n => ({
      id: n.id,
      parentId: n.parentId,
      order: n.order
    })));
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
          <h1 className="text-xl font-semibold text-gray-800">Notes</h1>
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
                <span>New note</span>
              </DropdownMenuItem>
              {newFolder && (
                <DropdownMenuItem onClick={newFolder} className="flex items-center gap-2 py-2">
                  <FolderPlus className="h-4 w-4" />
                  <span>New folder</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <Tree
          treeData={treeData}
          draggable={!isMobile} // Disable drag and drop on mobile
          onDrop={handleDrop}
          onSelect={([selectedKey]) => {
            if (selectedKey) {
              setCurrentNoteId(Number(selectedKey));
              // Close sidebar on mobile after selection
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
          dropIndicatorRender={() => null}
        />
      </div>

      {/* Mobile bottom bar */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 flex items-center justify-around">
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1"
            onClick={() => setSelectedTab("write")}
          >
            <FileText className="h-5 w-5" />
            <span className="text-xs">Write</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center gap-1"
            onClick={() => setSelectedTab("preview")}
          >
            <Eye className="h-5 w-5" />
            <span className="text-xs">Preview</span>
          </Button>
        </div>
      )}
    </section>
  );
};

export default Sidebar;
