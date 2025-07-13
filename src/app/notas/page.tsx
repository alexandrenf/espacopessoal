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
  KeyRound,
  User,
  LogIn,
  AlertCircle,
} from "lucide-react";
import Header from "~/app/components/Header";
import Link from "next/link";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const CreateNotebookDialog = ({ onSuccess }: { onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
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

  const checkUrlAvailability = api.notebooks.checkUrlAvailability.useQuery(
    { url: formData.url },
    {
      enabled: formData.url.length >= 3,
      retry: false,
    },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkUrlAvailability.data?.available) {
      setUrlError("URL não disponível");
      return;
    }
    createNotebook.mutate({
      ...formData,
      isPrivate: formData.accessLevel !== "public",
      password:
        formData.accessLevel === "password" ? formData.password : undefined,
    });
  };

  const handleUrlChange = (value: string) => {
    // Only allow alphanumeric characters, hyphens, and underscores
    const cleanValue = value.toLowerCase().replace(/[^a-z0-9-_]/g, "");
    setFormData((prev) => ({ ...prev, url: cleanValue }));
    setUrlError(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-12 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          <Plus className="h-4 w-4" />
          Novo Notebook
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Notebook</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="url">URL do Notebook</Label>
            <div className="relative">
              <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-colors">
                <div className="flex items-center bg-gray-50 px-3 py-2 border-r border-gray-200 rounded-l-md">
                  <span className="text-sm font-medium text-gray-600">/notas/</span>
                </div>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="meu-notebook"
                  required
                  minLength={3}
                  maxLength={50}
                  className={cn(
                    "border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-none flex-1",
                    urlError && "text-red-600",
                  )}
                />
              </div>
            </div>
            <div className="min-h-[24px] mt-2">
              {urlError ? (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{urlError}</span>
                </div>
              ) : checkUrlAvailability.data?.available === false ? (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>URL não disponível</span>
                </div>
              ) : checkUrlAvailability.data?.available === true ? (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md border border-green-200">
                  <div className="h-2 w-2 bg-green-500 rounded-full flex-shrink-0" />
                  <span>URL disponível</span>
                </div>
              ) : formData.url.length >= 3 && checkUrlAvailability.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md border border-blue-200">
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
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
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Descreva o propósito deste notebook..."
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="accessLevel">Nível de Acesso</Label>
            <Select
              value={formData.accessLevel}
              onValueChange={(value: "public" | "password" | "private") =>
                setFormData((prev) => ({ ...prev, accessLevel: value }))
              }
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecione o nível de acesso" />
              </SelectTrigger>
              <SelectContent className="max-w-[400px]">
                <SelectItem value="public" className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Globe className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">Público</div>
                      <div className="text-xs text-gray-500 mt-1">
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
                      <div className="text-xs text-gray-500 mt-1">
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
                      <div className="text-xs text-gray-500 mt-1">
                        Apenas você pode gerenciar
                      </div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.accessLevel === "password" && (
            <div className="space-y-3">
              <Label htmlFor="password">Senha de Proteção</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder="Digite uma senha segura para proteger este notebook"
                required
                className="h-12"
              />
              <p className="text-xs text-gray-500">
                Esta senha será necessária para acessar e editar o notebook
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
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
                createNotebook.isPending ||
                !checkUrlAvailability.data?.available ||
                (formData.accessLevel === "password" && !formData.password) ||
                !formData.title.trim() ||
                !formData.url.trim()
              }
              className="h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {createNotebook.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando notebook...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Notebook
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const NotebookCard = ({
  notebook,
  onDeleted,
}: {
  notebook: NotebookData;
  onDeleted: () => void;
}) => {
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
      whileHover={{ y: -4, scale: 1.02 }}
      className="group"
    >
      <Card className="h-full border-slate-200/50 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-2">
                <Notebook className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">{notebook.title}</CardTitle>
                <CardDescription className="text-sm">
                  /notas/{notebook.url}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge
                variant={
                  notebook.accessLevel === "private"
                    ? "secondary"
                    : notebook.accessLevel === "password"
                      ? "default"
                      : "outline"
                }
              >
                {notebook.accessLevel === "private" ? (
                  <>
                    <Lock className="mr-1 h-3 w-3" />
                    Privado
                  </>
                ) : notebook.accessLevel === "password" ? (
                  <>
                    <KeyRound className="mr-1 h-3 w-3" />
                    Protegido
                  </>
                ) : (
                  <>
                    <Globe className="mr-1 h-3 w-3" />
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
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {notebook.description && (
            <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
              {notebook.description}
            </p>
          )}
          <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>
                {format(new Date(notebook.createdAt), "dd/MM/yyyy", {
                  locale: ptBR,
                })}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <FileText className="h-3 w-3" />
              <span>0 documentos</span>
            </div>
          </div>
          <Button asChild variant="outline" className="group w-full">
            <Link href={`/notas/${notebook.url}`}>
              Abrir Notebook
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
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
            Tem certeza que deseja excluir o notebook{" "}
            <strong>{notebook.title}</strong>? Esta ação não pode ser desfeita.
          </p>
          <div className="mt-4 flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteNotebook.mutate({ id: notebook._id })}
              disabled={deleteNotebook.isPending}
            >
              {deleteNotebook.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

export default function NotasPage() {
  const { status } = useSession();
  const [searchTerm, setSearchTerm] = useState("");

  // Only try to get user notebooks if authenticated
  const {
    data: notebooks,
    isLoading,
    refetch,
  } = api.notebooks.getByOwner.useQuery(undefined, {
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Background grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Background gradient orbs */}
        <div className="absolute right-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-blue-400/10 to-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 h-80 w-80 animate-pulse rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-500/10 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-900">
            Carregando notebooks...
          </h3>
          <p className="text-slate-600">Preparando seu espaço digital</p>
        </motion.div>
      </div>
    );
  }

  const filteredNotebooks =
    notebooks?.filter(
      (notebook) =>
        notebook.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notebook.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notebook.description?.toLowerCase().includes(searchTerm.toLowerCase()),
    ) ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="relative flex-grow overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Background grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Background gradient orbs */}
        <div className="absolute right-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-blue-400/10 to-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 h-80 w-80 animate-pulse rounded-full bg-gradient-to-br from-indigo-400/10 to-purple-500/10 blur-3xl" />

        <div className="container relative mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div className="mx-auto max-w-4xl text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-8"
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm text-blue-700 ring-1 ring-blue-200">
                  <Notebook className="h-4 w-4" />
                  {status === "authenticated"
                    ? "Seus Notebooks"
                    : "Notebooks Públicos"}
                </div>
              </motion.div>

              <h1 className="mb-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
                {status === "authenticated" ? "Meus Notebooks" : "Notebooks"}
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-slate-600">
                {status === "authenticated"
                  ? "Organize suas ideias em coleções temáticas"
                  : "Acesse notebooks públicos ou entre para gerenciar os seus próprios"}
              </p>
            </div>
          </motion.div>

          {/* Authentication Status Bar */}
          {status === "unauthenticated" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-8"
            >
              <Card className="border-blue-200/50 bg-white/80 shadow-lg backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-2">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          Você não está logado
                        </p>
                        <p className="text-sm text-slate-600">
                          Faça login para criar e gerenciar seus próprios
                          notebooks
                        </p>
                      </div>
                    </div>
                    <Button
                      asChild
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      <Link
                        href="/api/auth/signin"
                        className="flex items-center gap-2"
                      >
                        <LogIn className="h-4 w-4" />
                        Entrar
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Search and Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-8 flex flex-col gap-4 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={
                  status === "authenticated"
                    ? "Buscar meus notebooks..."
                    : "Digite a URL de um notebook para acessar"
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 border-slate-200/50 bg-white/80 pl-10 backdrop-blur-sm focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            {status === "authenticated" && (
              <CreateNotebookDialog onSuccess={() => refetch()} />
            )}
            {status === "unauthenticated" && searchTerm && (
              <Button
                asChild
                className="h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Link href={`/notas/${searchTerm}`}>Acessar Notebook</Link>
              </Button>
            )}
          </motion.div>

          {/* Notebooks Grid */}
          {status === "authenticated" ? (
            // Authenticated user view - show their notebooks
            filteredNotebooks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="py-16 text-center"
              >
                <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
                  <Notebook className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="mb-4 text-2xl font-semibold text-slate-900">
                  {searchTerm
                    ? "Nenhum notebook encontrado"
                    : "Nenhum notebook ainda"}
                </h3>
                <p className="mx-auto mb-8 max-w-md text-slate-600">
                  {searchTerm
                    ? "Tente ajustar sua busca ou criar um novo notebook"
                    : "Comece criando seu primeiro notebook para organizar suas ideias"}
                </p>
                {!searchTerm && (
                  <CreateNotebookDialog onSuccess={() => refetch()} />
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
              >
                <AnimatePresence>
                  {filteredNotebooks.map((notebook) => {
                    // Determine access level for display
                    const accessLevel = !notebook.isPrivate
                      ? "public"
                      : notebook.password
                        ? "password"
                        : "private";

                    return (
                      <NotebookCard
                        key={notebook._id}
                        notebook={{
                          ...notebook,
                          accessLevel,
                          hasAccess: true,
                          isOwner: true,
                        }}
                        onDeleted={() => refetch()}
                      />
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )
          ) : (
            // Unauthenticated user view - show instructions
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="py-16 text-center"
            >
              <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
                <Notebook className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="mb-4 text-2xl font-semibold text-slate-900">
                Acesse um Notebook
              </h3>
              <p className="mx-auto mb-8 max-w-md text-slate-600">
                Digite a URL de um notebook no campo de busca acima para
                acessá-lo.
                <br />
                Para criar e gerenciar seus próprios notebooks, faça login.
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  asChild
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Link href="/api/auth/signin">
                    <LogIn className="mr-2 h-4 w-4" />
                    Fazer Login
                  </Link>
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
