"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Share2, Copy, Loader2, Trash2, Link2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "~/trpc/react";
import { toast } from "~/hooks/use-toast";
import Link from "next/link";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: number;
  session?: {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  } | null;
}

interface SharedNote {
  id: string;
  url: string;
  noteId: number;
  createdAt: Date;
  updatedAt: Date;
  note: {
    createdBy: {
      name: string | null;
      id: string;
    };
  };
}

// Update the query response type
interface GetSharedNoteResponse {
  isOwner: boolean;
  sharedNote: SharedNote | null;
}

export function ShareModal({ isOpen, onClose, noteId, session }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const utils = api.useUtils();

  const { data, isLoading } = api.notes.getSharedNoteByNoteId.useQuery(
    { noteId },
    { enabled: isOpen }
  );

  // Use the new response structure
  const isOwner = data?.isOwner ?? false;
  const existingSharedNote = data?.sharedNote;

  const { mutate: createSharedNote, isPending: isCreating } = api.notes.createSharedNote.useMutation({
    onSuccess: () => {
      void utils.notes.getSharedNoteByNoteId.invalidate({ noteId });
      toast({
        title: "Link criado com sucesso!",
        description: "Agora você pode compartilhar sua nota.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao criar link",
        description: "Não foi possível criar o link de compartilhamento.",
        variant: "destructive",
      });
    },
  });

  const { mutate: deleteSharedNote, isPending: isDeleting } = api.notes.deleteSharedNote.useMutation({
    onSuccess: () => {
      void utils.notes.getSharedNoteByNoteId.invalidate({ noteId });
      toast({
        title: "Link deletado",
        description: "O link de compartilhamento foi removido.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao deletar link",
        description: "Não foi possível remover o link de compartilhamento.",
        variant: "destructive",
      });
    },
  });

  const getShareUrl = (note: SharedNote) => {
    return `${window.location.origin}/notas/view/${note.url}`;
  };

  const handleCopy = async () => {
    if (!existingSharedNote) return;
    const shareUrl = getShareUrl(existingSharedNote);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para sua área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link. Tente selecionar e copiar manualmente.",
        variant: "destructive",
      });
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = () => {
    createSharedNote({ noteId });
  };

  const handleDelete = () => {
    if (!existingSharedNote) return;
    deleteSharedNote({ url: existingSharedNote.url });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative z-50 w-full max-w-md rounded-lg border bg-white shadow-xl"
          >
            <div className="p-6">
              <button
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>

              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Share2 className="h-5 w-5 text-blue-500" />
                  Compartilhar nota
                </h2>
                
                <div className="mt-4">
                  {isLoading ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-center py-8"
                    >
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    </motion.div>
                  ) : existingSharedNote ? (
                    // Show shared note info if it exists
                    <div className="flex flex-col gap-4">
                      <p className="text-sm text-muted-foreground">
                        Link de visualização da nota.
                        <span className="mt-2 block">
                          Compartilhado por {existingSharedNote.note.createdBy.name ?? "você"}
                        </span>
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          value={getShareUrl(existingSharedNote)}
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
                      {isOwner && (
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
                      )}
                    </div>
                  ) : !session ? (
                    <p className="text-sm text-muted-foreground">
                      Você precisa estar logado para compartilhar notas.
                      <Link href="/api/auth/signin" className="ml-1 text-blue-500 hover:underline">
                        Fazer login
                      </Link>
                    </p>
                  ) : !isOwner ? (
                    <p className="text-sm text-muted-foreground">
                      Apenas o criador da nota pode compartilhá-la.
                    </p>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Crie um link de visualização para compartilhar sua nota. Quem tiver acesso ao link poderá apenas ler o conteúdo.
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
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
