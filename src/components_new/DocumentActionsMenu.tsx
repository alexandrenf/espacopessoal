"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useConvexUser } from "../hooks/use-convex-user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { MoreHorizontal, Edit, Copy, Trash2 } from "lucide-react";
import { type Document } from "../types/document";

interface DocumentActionsMenuProps {
  document: Document;
  onRename?: (document: Document) => void;
}

export function DocumentActionsMenu({
  document,
  onRename,
}: DocumentActionsMenuProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Get authenticated user
  const { convexUserId, isLoading: isUserLoading } = useConvexUser();

  const deleteDocument = useMutation(api.documents.removeById);
  const createDocument = useMutation(api.documents.create);

  const handleDuplicate = async () => {
    if (isUserLoading) {
      toast.error("Aguarde a autenticação ser concluída");
      return;
    }

    if (!convexUserId) {
      toast.error(
        "Autenticação de usuário necessária para duplicar documentos",
      );
      return;
    }

    setIsDuplicating(true);
    try {
      const newDocumentId = await createDocument({
        title: `${document.title} (Copy)`,
        userId: convexUserId,
        initialContent: document.initialContent ?? "",
      });

      toast.success("Documento duplicado com sucesso!");
      router.refresh();
    } catch (error) {
      toast.error("Falha ao duplicar documento");
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDelete = async () => {
    if (isUserLoading) {
      toast.error("Aguarde a autenticação ser concluída");
      return;
    }

    if (!convexUserId) {
      toast.error("Autenticação de usuário necessária para excluir documentos");
      return;
    }

    if (
      !confirm(
        `Tem certeza que deseja excluir "${document.title}"? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteDocument({ id: document._id, userId: convexUserId });
      toast.success("Documento excluído com sucesso!");
      router.refresh();
    } catch (error) {
      toast.error("Falha ao excluir documento");
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
          <span className="sr-only">Abrir menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuItem onClick={handleRename}>
          <Edit className="mr-2 h-4 w-4" />
          Renomear
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDuplicate}
          disabled={isDuplicating || isUserLoading}
        >
          <Copy className="mr-2 h-4 w-4" />
          {isDuplicating ? "Duplicando..." : "Duplicar"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          disabled={isDeleting || isUserLoading}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isDeleting ? "Excluindo..." : "Excluir"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
