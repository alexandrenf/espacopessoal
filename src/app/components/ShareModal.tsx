import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Share2, Copy, Loader2, Trash2, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "~/trpc/react";
import { toast } from "~/hooks/use-toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: number;
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
    };
  };
}

export function ShareModal({ isOpen, onClose, noteId }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const utils = api.useUtils();

  const { data: existingSharedNote } = api.notes.getSharedNoteByNoteId.useQuery(
    { noteId },
    { enabled: isOpen }
  );

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
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({
      title: "Link copiado!",
      description: "O link foi copiado para sua área de transferência.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = () => {
    createSharedNote({ noteId });
  };

  const handleDelete = () => {
    if (!existingSharedNote) return;
    deleteSharedNote({ url: existingSharedNote.url });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-blue-500" />
            Compartilhar nota
          </DialogTitle>
          <DialogDescription>
            Crie um link de visualização para compartilhar sua nota. 
            Quem tiver acesso ao link poderá apenas ler o conteúdo.
            {existingSharedNote && (
              <p className="mt-2 text-sm text-muted-foreground">
                Compartilhado por {existingSharedNote.note.createdBy.name ?? "você"}
              </p>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          <AnimatePresence mode="wait">
            {existingSharedNote ? (
              <motion.div
                key="share-info"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col gap-4"
              >
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
                    <AnimatePresence>
                      {copied ? (
                        <motion.span
                          key="check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="text-green-500"
                        >
                          ✓
                        </motion.span>
                      ) : (
                        <motion.span
                          key="copy"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Copy className="h-4 w-4" />
                        </motion.span>
                      )}
                    </AnimatePresence>
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
              </motion.div>
            ) : (
              <motion.div
                key="create-button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Button
                  onClick={handleCreate}
                  className="w-full"
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
} 