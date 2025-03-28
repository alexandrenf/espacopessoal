"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Loader2, Trash2, Plus, Pencil } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "~/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

interface DictionaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicOrPrivate: boolean;
  session?: {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  } | null;
}

export const DictionaryModal: React.FC<DictionaryModalProps> = ({
  isOpen,
  onClose,
  publicOrPrivate,
  session,
}) => {
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: dictionary = [] } = publicOrPrivate 
    ? api.dictionary.getPublicDictionary.useQuery({ userId: session?.user?.id ?? "" })
    : api.dictionary.getDictionary.useQuery(undefined, {
        enabled: !!session?.user
      });

  const { mutate: createEntry, isPending: isCreating } = api.dictionary.create.useMutation({
    onSuccess: () => {
      setNewFrom("");
      setNewTo("");
      void utils.dictionary.getDictionary.invalidate();
      void utils.dictionary.getPublicDictionary.invalidate();
      toast({
        title: "Entrada criada",
        description: "Nova substituição adicionada com sucesso.",
      });
    }
  });

  const { mutate: updateEntry, isPending: isUpdating } = api.dictionary.update.useMutation({
    onSuccess: () => {
      setEditingId(null);
      void utils.dictionary.getDictionary.invalidate();
      void utils.dictionary.getPublicDictionary.invalidate();
      toast({
        title: "Entrada atualizada",
        description: "Substituição atualizada com sucesso.",
      });
    }
  });

  const { mutate: deleteEntry, isPending: isDeleting } = api.dictionary.delete.useMutation({
    onSuccess: () => {
      void utils.dictionary.getDictionary.invalidate();
      void utils.dictionary.getPublicDictionary.invalidate();
      toast({
        title: "Entrada removida",
        description: "Substituição removida com sucesso.",
      });
    }
  });

  const handleCreate = () => {
    if (!newFrom || !newTo) return;
    createEntry({ from: newFrom, to: newTo });
  };

  const handleUpdate = (id: string) => {
    if (!newFrom || !newTo) return;
    updateEntry({ id, from: newFrom, to: newTo });
  };

  const handleEdit = (entry: { id: string; from: string; to: string }) => {
    setEditingId(entry.id);
    setNewFrom(entry.from);
    setNewTo(entry.to);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Dicionário de Substituição</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Add/Edit Form */}
          <div className="flex gap-2">
            <Input
              placeholder="De"
              value={newFrom}
              onChange={(e) => setNewFrom(e.target.value)}
            />
            <Input
              placeholder="Para"
              value={newTo}
              onChange={(e) => setNewTo(e.target.value)}
            />
            <Button
              onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
              disabled={isCreating || isUpdating || !newFrom || !newTo}
            >
              {(isCreating || isUpdating) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingId ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Dictionary List */}
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {dictionary.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono">{entry.from}</span>
                  <span>→</span>
                  <span>{entry.to}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(entry)}
                    disabled={isDeleting}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteEntry({ id: entry.id })}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};