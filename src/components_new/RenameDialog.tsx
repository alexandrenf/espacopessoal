"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components_new/ui/dialog";
import { Button } from "../components_new/ui/button";
import { Input } from "../components_new/ui/input";

type Document = {
  _id: Id<"documents">;
  title: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  organizationId?: string;
  initialContent?: string;
  roomId?: string;
};

interface RenameDialogProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Displays a modal dialog for renaming a document.
 *
 * Renders a form allowing the user to update the document's title. Handles input validation, mutation to update the document, and provides user feedback on success or failure. The dialog is controlled via the `open` prop and closes on successful rename, cancellation, or Escape key press. Returns `null` if no document is provided.
 *
 * @param document - The document to be renamed, or `null` to hide the dialog
 * @param open - Whether the dialog is visible
 * @param onOpenChange - Callback to update the dialog's open state
 */
export function RenameDialog({ document, open, onOpenChange }: RenameDialogProps) {
  const [title, setTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  
  const updateDocument = useMutation(api.documents.updateById);

  useEffect(() => {
    if (document) {
      setTitle(document.title);
    }
  }, [document]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!document || !title.trim()) return;

    if (title.trim() === document.title) {
      onOpenChange(false);
      return;
    }

    setIsRenaming(true);
    try {
      await updateDocument({
        id: document._id,
        title: title.trim(),
      });
      
      toast.success("Document renamed successfully!");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to rename document");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  if (!document) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Document</DialogTitle>
          <DialogDescription>
            Enter a new name for your document.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Document name"
              autoFocus
              disabled={isRenaming}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isRenaming || !title.trim()}
            >
              {isRenaming ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 