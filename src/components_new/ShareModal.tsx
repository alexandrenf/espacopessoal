"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Share2, Copy, Loader2, Trash2, Link2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { type Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: Id<"documents">;
  userId: string; // Current user ID
}

export function ShareModal({
  isOpen,
  onClose,
  documentId,
  userId,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const data = useQuery(api.documents.getSharedDocumentByDocumentId, {
    documentId,
    userId: userId as Id<"users">,
  });

  const createSharedDocument = useMutation(api.documents.createSharedDocument);
  const deleteSharedDocument = useMutation(api.documents.deleteSharedDocument);

  const isLoading = data === undefined;
  const isOwner = data?.isOwner ?? false;
  const existingSharedDocument = data?.sharedDocument;

  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getShareUrl = (url: string) => {
    return `${window.location.origin}/documents/shared/${url}`;
  };

  const handleCopy = async () => {
    if (!existingSharedDocument) return;
    const shareUrl = getShareUrl(existingSharedDocument.url);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copiado para a área de transferência!");
    } catch (error) {
      toast.error(
        "Erro ao copiar o link. Tente selecionar e copiar manualmente.",
      );
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await createSharedDocument({ documentId, userId: userId as Id<"users"> });
      toast.success("Link de compartilhamento criado com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar link de compartilhamento");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!existingSharedDocument) return;
    setIsDeleting(true);
    try {
      await deleteSharedDocument({
        url: existingSharedDocument.url,
        userId: userId as Id<"users">,
      });
      toast.success("Link de compartilhamento removido");
    } catch (error) {
      toast.error("Erro ao remover link de compartilhamento");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-blue-500" />
            Compartilhar documento
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : data === null ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Erro ao carregar informações do documento. Tente novamente.
            </p>
          </div>
        ) : !isOwner ? (
          <p className="text-sm text-muted-foreground">
            Apenas o criador do documento pode compartilhá-lo.
          </p>
        ) : existingSharedDocument ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Link de visualização do documento. Qualquer pessoa com este link
              poderá visualizar o conteúdo.
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={getShareUrl(existingSharedDocument.url)}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                onClick={handleCopy}
                variant="outline"
                size="icon"
                className="shrink-0"
              >
                {copied ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-green-500"
                  >
                    ✓
                  </motion.span>
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              onClick={handleDelete}
              variant="destructive"
              disabled={isDeleting}
              className="w-full"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removendo link...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover link de compartilhamento
                </>
              )}
            </Button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground">
              Crie um link de visualização para compartilhar seu documento.
              Qualquer pessoa com acesso ao link poderá ler o conteúdo.
            </p>
            <Button
              onClick={handleCreate}
              className="mt-4 w-full"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando link...
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Criar link de compartilhamento
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
