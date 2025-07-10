# Undo/Redo Fix for DocumentEditor

## Problem
The undo and redo functionality in the DocumentEditor component was not working properly because:

1. **TipTap's history was disabled**: The StarterKit was configured with `history: false` to work with Y.js collaboration
2. **Mixed implementations**: The menu bar was using TipTap's built-in undo/redo commands (`editor.chain().undo().run()`) while the toolbar was correctly using Y.js UndoManager
3. **Missing keyboard shortcuts**: Ctrl+Z and Ctrl+Y shortcuts weren't working because TipTap's history extension was disabled

## Solution

### 1. Updated Menu Bar Actions
Changed the menu bar undo/redo actions from TipTap commands to Y.js UndoManager:

**Before:**
```typescript
onClick={() => editor?.chain().focus().undo().run()}
onClick={() => editor?.chain().focus().redo().run()}
```

**After:**
```typescript
onClick={() => {
  if (undoManager?.canUndo()) {
    undoManager.undo();
  }
}}
onClick={() => {
  if (undoManager?.canRedo()) {
    undoManager.redo();
  }
}}
```

### 2. Added Keyboard Shortcuts
Enhanced the existing `handleKeyDown` function to support undo/redo keyboard shortcuts:

```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  // Handle undo/redo keyboard shortcuts
  if (e.ctrlKey || e.metaKey) {
    if (e.key === "z" && !e.shiftKey) {
      // Ctrl+Z or Cmd+Z for undo
      e.preventDefault();
      if (undoManager?.canUndo()) {
        undoManager.undo();
      }
      return;
    }
    if ((e.key === "y") || (e.key === "z" && e.shiftKey)) {
      // Ctrl+Y or Cmd+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
      e.preventDefault();
      if (undoManager?.canRedo()) {
        undoManager.redo();
      }
      return;
    }
  }
  // ... rest of the function
};
```

### 3. Updated Dependencies
Added `undoManager` to the useEffect dependency array to ensure the keyboard shortcuts work with the latest undo manager instance.

## Testing
To test the fix:

1. **Menu Bar**: Click "Editar" → "Desfazer" or "Refazer"
2. **Toolbar**: Click the undo/redo buttons in the toolbar
3. **Keyboard Shortcuts**: 
   - Press Ctrl+Z (or Cmd+Z on Mac) to undo
   - Press Ctrl+Y (or Cmd+Y on Mac) to redo
   - Press Ctrl+Shift+Z (or Cmd+Shift+Z on Mac) to redo (alternative)

## Files Modified
- `src/components_new/DocumentEditor.tsx`: Updated menu actions and keyboard shortcuts

## Notes
- The toolbar undo/redo buttons were already working correctly as they were using Y.js UndoManager
- This fix ensures consistency across all undo/redo interfaces (menu, toolbar, keyboard)
- The solution supports both Windows/Linux (Ctrl) and Mac (Cmd) keyboard shortcuts
- Both Ctrl+Y and Ctrl+Shift+Z are supported for redo to match common editor conventions
