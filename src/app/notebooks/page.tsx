"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Notebook,
  Plus,
  Search,
  Trash2,
  Lock,
  Globe,
  Calendar,
  FileText,
  ArrowRight,
  Eye,
  MoreVertical,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { Textarea } from "~/components/ui/textarea";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CreateNotebookFormData {
  url: string;
  title: string;
  description: string;
  isPrivate: boolean;
  password: string;
}

interface NotebookData {
  _id: string;
  url: string;
  title: string;
  description?: string;
  isPrivate: boolean;
  password?: string;
  createdAt: number;
  updatedAt: number;
}

const CreateNotebookDialog = ({ onSuccess }: { onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CreateNotebookFormData>({
    url: "",
    title: "",
    description: "",
    isPrivate: false,
    password: "",
  });
  const [urlError, setUrlError] = useState<string | null>(null);

  const createNotebook = api.notebooks.create.useMutation({
    onSuccess: () => {
      onSuccess();
      setOpen(false);
      setFormData({
        url: "",
        title: "",
        description: "",
        isPrivate: false,
        password: "",
      });
      setUrlError(null);
    },
    onError: (error) => {
      if (error.message.includes("URL")) {
        setUrlError(error.message);
      }
    },
  });

  const checkUrlAvailability = api.notebooks.checkUrlAvailability.useQuery(
    { url: formData.url },
    {
      enabled: formData.url.length >= 3,
      retry: false,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkUrlAvailability.data?.available) {
      setUrlError("URL não disponível");
      return;
    }
    createNotebook.mutate(formData);
  };

  const handleUrlChange = (value: string) => {
    // Only allow alphanumeric characters, hyphens, and underscores
    const cleanValue = value.toLowerCase().replace(/[^a-z0-9-_]/g, "");
    setFormData(prev => ({ ...prev, url: cleanValue }));
    setUrlError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Notebook
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Notebook</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL do Notebook</Label>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">/notas/</span>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="meu-notebook"
                required
                minLength={3}
                maxLength={50}
                className={cn(
                  "flex-1",
                  urlError && "border-red-500",
                  checkUrlAvailability.data?.available === false && "border-red-500",
                  checkUrlAvailability.data?.available === true && "border-green-500"
                )}
              />
            </div>
            {urlError && (
              <p className="text-sm text-red-500">{urlError}</p>
            )}
            {checkUrlAvailability.data?.available === false && (
              <p className="text-sm text-red-500">URL não disponível</p>
            )}
            {checkUrlAvailability.data?.available === true && (
              <p className="text-sm text-green-500">URL disponível</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Meu Notebook Pessoal"
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva o propósito deste notebook..."
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPrivate"
              checked={formData.isPrivate}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, isPrivate: checked as boolean }))
              }
            />
            <Label htmlFor="isPrivate">Notebook privado</Label>
          </div>

          {formData.isPrivate && (
            <div className="space-y-2">
              <Label htmlFor="password">Senha (opcional)</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Digite uma senha para proteger este notebook"
              />
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createNotebook.isPending || !checkUrlAvailability.data?.available}
            >
              {createNotebook.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Notebook"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const NotebookCard = ({ notebook, onDeleted }: { notebook: NotebookData; onDeleted: () => void }) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteNotebook = api.notebooks.delete.useMutation({
    onSuccess: () => {
      onDeleted();
      setShowDeleteDialog(false);
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Card className="h-full transition-all duration-300 hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 rounded-lg bg-blue-100 p-2">
                <Notebook className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">{notebook.title}</CardTitle>
                <CardDescription className="text-sm">
                  /notas/{notebook.url}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={notebook.isPrivate ? "secondary" : "outline"}>
                {notebook.isPrivate ? (
                  <>
                    <Lock className="h-3 w-3 mr-1" />
                    Privado
                  </>
                ) : (
                  <>
                    <Globe className="h-3 w-3 mr-1" />
                    Público
                  </>
                )}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/notas/${notebook.url}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {notebook.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {notebook.description}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(notebook.createdAt), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <FileText className="h-3 w-3" />
              <span>0 documentos</span>
            </div>
          </div>
          <Button asChild variant="outline" className="w-full group">
            <Link href={`/notas/${notebook.url}`}>
              Abrir Notebook
              <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p>
            Tem certeza que deseja excluir o notebook <strong>{notebook.title}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteNotebook.mutate({ id: notebook._id })}
              disabled={deleteNotebook.isPending}
            >
              {deleteNotebook.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default function NotebooksPage() {
  const { status } = useSession();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: notebooks, isLoading, refetch } = api.notebooks.getByOwner.useQuery(
    undefined,
    {
      enabled: status === "authenticated",
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando notebooks...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/api/auth/signin");
    return null;
  }

  const filteredNotebooks = notebooks?.filter(notebook =>
    notebook.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notebook.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notebook.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Meus Notebooks
          </h1>
          <p className="text-lg text-gray-600">
            Organize suas ideias em coleções temáticas
          </p>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar notebooks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <CreateNotebookDialog onSuccess={() => refetch()} />
        </div>

        {/* Notebooks Grid */}
        {filteredNotebooks.length === 0 ? (
          <div className="text-center py-12">
            <Notebook className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? "Nenhum notebook encontrado" : "Nenhum notebook ainda"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm 
                ? "Tente ajustar sua busca ou criar um novo notebook"
                : "Comece criando seu primeiro notebook para organizar suas ideias"
              }
            </p>
            {!searchTerm && (
              <CreateNotebookDialog onSuccess={() => refetch()} />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredNotebooks.map((notebook) => (
                <NotebookCard 
                  key={notebook._id} 
                  notebook={notebook} 
                  onDeleted={() => refetch()}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}