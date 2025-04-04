

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
  isPrivate: boolean;
  session?: {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  } | null;
  createdById: string;
}

export const DictionaryModal: React.FC<DictionaryModalProps> = ({
  isOpen,
  onClose,
  isPrivate,
  session,
  createdById,
}) => {
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const utils = api.useUtils();

  // Add loading state for dictionary
  const { data: dictionary = [], isLoading: isLoadingDictionary } = !isPrivate 
    ? api.dictionary.getPublicDictionary.useQuery({ userId: session?.user?.id ?? "", createdById })
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
    const trimmedFrom = newFrom.trim();
    const trimmedTo = newTo.trim();
    if (!trimmedFrom || !trimmedTo) return;
    createEntry({ from: trimmedFrom, to: trimmedTo });
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
      <DialogContent className="sm:max-w-[600px] h-[85vh] flex flex-col p-0 gap-0">
        <div className="p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Dicionário de Substituição</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Gerencie suas substituições de texto. Use @ antes de uma palavra para forçar a substituição.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 space-y-4 flex-shrink-0">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Buscar substituições..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-gray-50 transition-all focus:bg-white"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery("")}
                title="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Add/Edit Form */}
          {session?.user && (
            <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {editingId ? "Editar substituição" : "Adicionar nova substituição"}
              </h3>
              <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
                <Input
                  placeholder="De"
                  value={newFrom}
                  onChange={(e) => setNewFrom(e.target.value)}
                  className="font-mono text-sm"
                />
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  placeholder="Para"
                  value={newTo}
                  onChange={(e) => setNewTo(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 mt-1">
                {editingId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="text-xs h-8"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Cancelar
                  </Button>
                )}
                <Button
                  onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                  disabled={isCreating || isUpdating || !newFrom || !newTo}
                  size="sm"
                  className="text-xs h-8"
                >
                  {(isCreating || isUpdating) ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : editingId ? (
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                  ) : (
                    <Plus className="h-3.5 w-3.5 mr-1" />
                  )}
                  {editingId ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoadingDictionary && (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between rounded-md border bg-background p-2 animate-pulse"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-6 w-16 bg-gray-200 rounded-full" />
                    <div className="h-3 w-3 bg-gray-200 rounded-full" />
                    <div className="h-5 w-32 bg-gray-200 rounded-md" />
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <div className="h-8 w-8 bg-gray-200 rounded-md" />
                    <div className="h-8 w-8 bg-gray-200 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dictionary List Header */}
          {!isLoadingDictionary && filteredDictionary.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-medium">
                Substituições 
                <Badge variant="outline" className="ml-2 bg-primary/10 hover:bg-primary/20">
                  {filteredDictionary.length}
                </Badge>
              </h3>
              {dictionary.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  Mostrando {Math.min(filteredDictionary.length, dictionary.length)} de {dictionary.length}
                </p>
              )}
            </div>
          )}

          {/* Dictionary List */}
          <ScrollArea className="flex-grow px-6 pb-6">
            {!isLoadingDictionary && (
              <div className="p-2 space-y-1">
                <AnimatePresence>
                  {filteredDictionary.length > 0 ? (
                    filteredDictionary.map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.2 }}
                        className="group flex items-center justify-between rounded-md border bg-background p-2 hover:bg-accent/50"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <Badge variant="outline" className="font-mono text-xs px-2 py-0 h-6 min-w-8 flex items-center justify-center bg-primary/5">
                            {entry.from}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{entry.to}</span>
                        </div>
                        {session?.user && (
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(entry)}
                              disabled={isDeleting}
                              className="h-8 w-8 p-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteEntry(entry.id)}
                              disabled={isDeleting}
                              className="h-8 w-8 p-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-sm text-muted-foreground">
                        Nenhuma substituição encontrada.
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
