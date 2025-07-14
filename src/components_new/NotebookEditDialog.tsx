"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Loader2,
  AlertCircle,
  Settings,
  Lock,
  Globe,
  KeyRound,
} from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

interface CreateNotebookFormData {
  url: string;
  title: string;
  description: string;
  accessLevel: "public" | "password" | "private";
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
  accessLevel?: "public" | "password" | "private";
  hasAccess?: boolean;
  isOwner?: boolean;
}

interface NotebookDialogProps {
  onSuccess: () => void;
  editingNotebook?: NotebookData | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export const NotebookDialog = ({ 
  onSuccess, 
  editingNotebook, 
  open: controlledOpen, 
  onOpenChange,
  children 
}: NotebookDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  
  const isEditing = !!editingNotebook;
  
  const [formData, setFormData] = useState<CreateNotebookFormData>({
    url: "",
    title: "",
    description: "",
    accessLevel: "public",
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
        accessLevel: "public",
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

  const updateNotebook = api.notebooks.update.useMutation({
    onSuccess: () => {
      onSuccess();
      setOpen(false);
      setFormData({
        url: "",
        title: "",
        description: "",
        accessLevel: "public",
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

  // Populate form when editing
  useEffect(() => {
    if (isEditing && editingNotebook) {
      const accessLevel = editingNotebook.isPrivate 
        ? (editingNotebook.password ? "password" : "private")
        : "public";
      
      setFormData({
        url: editingNotebook.url,
        title: editingNotebook.title,
        description: editingNotebook.description ?? "",
        accessLevel,
        password: "", // Don't pre-fill password for security
      });
      setUrlError(null);
    } else if (!isEditing) {
      // Reset form for create mode
      setFormData({
        url: "",
        title: "",
        description: "",
        accessLevel: "public",
        password: "",
      });
      setUrlError(null);
    }
  }, [isEditing, editingNotebook]);

  const checkUrlAvailability = api.notebooks.checkUrlAvailability.useQuery(
    { url: formData.url },
    {
      enabled: formData.url.length >= 3,
      retry: false,
    },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing) {
      // For editing, only check URL availability if URL has changed
      if (formData.url !== editingNotebook?.url && !checkUrlAvailability.data?.available) {
        setUrlError("URL não disponível");
        return;
      }
      
      updateNotebook.mutate({
        id: editingNotebook?._id, // Will be converted to proper ID type
        ...formData,
        isPrivate: formData.accessLevel !== "public",
        password: formData.accessLevel === "password" ? formData.password : undefined,
      });
    } else {
      // For creating, check URL availability
      if (!checkUrlAvailability.data?.available) {
        setUrlError("URL não disponível");
        return;
      }
      
      createNotebook.mutate({
        ...formData,
        isPrivate: formData.accessLevel !== "public",
        password: formData.accessLevel === "password" ? formData.password : undefined,
      });
    }
  };

  const handleUrlChange = (value: string) => {
    // Only allow alphanumeric characters, hyphens, and underscores
    const cleanValue = value.toLowerCase().replace(/[^a-z0-9-_]/g, "");
    setFormData((prev) => ({ ...prev, url: cleanValue }));
    setUrlError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Notebook" : "Criar Novo Notebook"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="url">URL do Notebook</Label>
            <div className="relative">
              <div className="flex items-center rounded-md border border-input bg-background transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
                <div className="flex items-center rounded-l-md border-r border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="text-sm font-medium text-gray-600">
                    /notas/
                  </span>
                </div>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="meu-notebook"
                  required
                  minLength={3}
                  maxLength={50}
                  disabled={isEditing}
                  className={cn(
                    "flex-1 rounded-l-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0",
                    urlError && "text-red-600",
                  )}
                />
              </div>
            </div>
            <div className="mt-2 min-h-[24px]">
              {urlError ? (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{urlError}</span>
                </div>
              ) : isEditing ? (
                <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-600">
                  <div className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                  <span>URL não pode ser alterado ao editar</span>
                </div>
              ) : checkUrlAvailability.data?.available === false ? (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>URL não disponível</span>
                </div>
              ) : checkUrlAvailability.data?.available === true ? (
                <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  <div className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
                  <span>URL disponível</span>
                </div>
              ) : formData.url.length >= 3 && checkUrlAvailability.isLoading ? (
                <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-600">
                  <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                  <span>Verificando disponibilidade...</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Nome do seu notebook"
              required
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (Opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Descreva brevemente o que este notebook contém..."
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-3">
            <Label>Nível de Acesso</Label>
            <Select
              value={formData.accessLevel}
              onValueChange={(value: "public" | "password" | "private") =>
                setFormData((prev) => ({ ...prev, accessLevel: value }))
              }
            >
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-w-[400px]">
                <SelectItem value="public" className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Globe className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">Público</div>
                      <div className="mt-1 text-xs text-gray-500">
                        Qualquer pessoa com o link pode gerenciar
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="password" className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <KeyRound className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-medium">Protegido por senha</div>
                      <div className="mt-1 text-xs text-gray-500">
                        Qualquer pessoa com o link e senha pode gerenciar
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="private" className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Lock className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">Privado</div>
                      <div className="mt-1 text-xs text-gray-500">
                        Apenas você pode gerenciar
                      </div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.accessLevel === "password" && (
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder={isEditing ? "Digite nova senha (deixe vazio para manter)" : "Digite uma senha segura"}
                required={!isEditing}
                className="h-12"
              />
              <p className="text-xs text-gray-500">
                {isEditing 
                  ? "Deixe vazio para manter a senha atual"
                  : "Esta senha será necessária para acessar e editar o notebook"
                }
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 border-t border-gray-100 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-11 px-6"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                (isEditing ? updateNotebook.isPending : createNotebook.isPending) ||
                (!isEditing && !checkUrlAvailability.data?.available) ||
                (formData.accessLevel === "password" && !formData.password && !isEditing) ||
                !formData.title.trim() ||
                !formData.url.trim()
              }
              className="h-11 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 hover:from-blue-700 hover:to-indigo-700"
            >
              {(isEditing ? updateNotebook.isPending : createNotebook.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Salvando..." : "Criando notebook..."}
                </>
              ) : (
                <>
                  {isEditing ? (
                    <Settings className="mr-2 h-4 w-4" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {isEditing ? "Salvar Alterações" : "Criar Notebook"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Wrapper for create mode with trigger button
export const CreateNotebookDialog = ({ onSuccess }: { onSuccess: () => void }) => {
  return (
    <NotebookDialog onSuccess={onSuccess}>
      <Button className="h-12 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
        <Plus className="h-4 w-4" />
        Novo Notebook
      </Button>
    </NotebookDialog>
  );
};

export default NotebookDialog;