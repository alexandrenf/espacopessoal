"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Loader2, Trash2, Plus, Pencil, Search, ArrowRight, X } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "~/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Badge } from "~/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

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
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewFrom("");
    setNewTo("");
  };

  // Filter dictionary based on search query
  const filteredDictionary = dictionary.filter(entry => 
    entry.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.to.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Dicionário de Substituição</DialogTitle>
          <DialogDescription>
            Gerencie suas substituições de texto. Use @ antes de uma palavra para forçar a substituição.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Buscar substituições..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Add/Edit Form */}
          <div className="flex flex-col gap-2 rounded-lg border bg-gray-50/50 p-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="De"
                value={newFrom}
                onChange={(e) => setNewFrom(e.target.value)}
                className="font-mono"
              />
              <ArrowRight className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Para"
                value={newTo}
                onChange={(e) => setNewTo(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              {editingId && (
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              )}
              <Button
                onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                disabled={isCreating || isUpdating || !newFrom || !newTo}
                className="gap-2"
              >
                {(isCreating || isUpdating) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingId ? (
                  <Pencil className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editingId ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          </div>

          {/* Dictionary List */}
          <ScrollArea className="h-[300px] rounded-md border">
            <div className="p-4 space-y-2">
              <AnimatePresence>
                {filteredDictionary.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="group flex items-center justify-between rounded-lg border bg-white p-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm">{entry.from}</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{entry.to}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(entry)}
                        disabled={isDeleting}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEntry(entry.id)}
                        disabled={isDeleting}
                        className="h-8 w-8 p-0 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>

          {/* Empty State */}
          {filteredDictionary.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="rounded-full bg-gray-100 p-3">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {searchQuery 
                  ? "Nenhuma substituição encontrada para sua busca."
                  : "Nenhuma substituição cadastrada ainda."}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};