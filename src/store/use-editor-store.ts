import { create } from "zustand";
import { type Editor } from "@tiptap/react";
import { UndoManager } from "yjs";

interface EditorState {
  editor: Editor | null;
  undoManager: UndoManager | null;
  setEditor: (editor: Editor | null) => void;
  setUndoManager: (undoManager: UndoManager | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  editor: null,
  undoManager: null,
  setEditor: (editor) => set({ editor }),
  setUndoManager: (undoManager) => set({ undoManager }),
})); 