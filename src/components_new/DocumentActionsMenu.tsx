"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components_new/ui/dropdown-menu";
import { Button } from "../components_new/ui/button";
import { 
  MoreHorizontal, 
  Edit, 
  Copy, 
  Trash2 
} from "lucide-react";

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

interface DocumentActionsMenuProps {
  document: Document;
  onRename?: (document: Document) => void;
}

export function DocumentActionsMenu({ document, onRename }: DocumentActionsMenuProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  
  const deleteDocument = useMutation(api.documents.removeById);
  const createDocument = useMutation(api.documents.create);

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const newDocumentId = await createDocument({
        title: `${document.title} (Copy)`,
        initialContent: document.initialContent || "",
      });
      
      toast.success("Document duplicated successfully!");
      router.refresh();
    } catch (error) {
      toast.error("Failed to duplicate document");
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${document.title}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteDocument({ id: document._id });
      toast.success("Document deleted successfully!");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRename = () => {
    if (onRename) {
      onRename(document);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuItem onClick={handleRename}>
          <Edit className="mr-2 h-4 w-4" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleDuplicate}
          disabled={isDuplicating}
        >
          <Copy className="mr-2 h-4 w-4" />
          {isDuplicating ? "Duplicating..." : "Duplicate"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isDeleting ? "Deleting..." : "Delete"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 