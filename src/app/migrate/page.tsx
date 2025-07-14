"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Notebook,
  FileText,
  ArrowRight,
  Check,
  Loader2,
  FolderOpen,
  Plus,
  AlertCircle,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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

const CreateNotebookDialog = ({ onSuccess }: { onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CreateNotebookFormData>({
    url: "",
    title: "",
    description: "",
    isPrivate: false,
    password: "",
  });

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
    if (!checkUrlAvailability.data?.available) return;
    createNotebook.mutate(formData);
  };

  const handleUrlChange = (value: string) => {
    const cleanValue = value.toLowerCase().replace(/[^a-z0-9-_]/g, "");
    setFormData((prev) => ({ ...prev, url: cleanValue }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Criar Novo Notebook
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
                  checkUrlAvailability.data?.available === false &&
                    "border-red-500",
                  checkUrlAvailability.data?.available === true &&
                    "border-green-500",
                )}
              />
            </div>
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPrivate"
              checked={formData.isPrivate}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  isPrivate: checked as boolean,
                }))
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
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder="Digite uma senha para proteger este notebook"
              />
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                createNotebook.isPending ||
                !checkUrlAvailability.data?.available
              }
            >
              {createNotebook.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

export default function MigratePage() {
  const { status } = useSession();
  const router = useRouter();
  const [migrationStep, setMigrationStep] = useState<
    "setup" | "organizing" | "complete"
  >("setup");

  // Get user's notebooks
  const {
    data: notebooks,
    isLoading: notebooksLoading,
    refetch: refetchNotebooks,
  } = api.notebooks.getByOwner.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  // Get documents without notebooks (orphaned documents)
  // Note: This would need to be implemented in the backend
  // For now, we'll create a default notebook if none exists
  const getOrCreateDefault = api.notebooks.getOrCreateDefault.useMutation({
    onSuccess: () => {
      void refetchNotebooks();
      setMigrationStep("complete");
    },
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      void router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading" || notebooksLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">
            Carregando informações de migração...
          </p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const hasNotebooks = notebooks && notebooks.length > 0;

  if (migrationStep === "complete") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md text-center"
        >
          <div className="mb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              Migração Concluída!
            </h1>
            <p className="text-gray-600">
              Seus documentos foram organizados com sucesso. Agora você pode
              gerenciar seus notebooks.
            </p>
          </div>
          <div className="space-y-3">
            <Button
              onClick={() => router.push("/notebooks")}
              className="w-full"
            >
              Gerenciar Notebooks
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="w-full"
            >
              Voltar ao Início
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Sparkles className="h-8 w-8 text-blue-600" />
            </div>
          </motion.div>
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Organizar em Notebooks
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Organize seus documentos em notebooks temáticos para melhor
            organização e acesso.
          </p>
        </div>

        {/* Migration Steps */}
        <div className="mx-auto max-w-4xl">
          {!hasNotebooks ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="mb-8">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                    Primeiro Notebook
                  </CardTitle>
                  <CardDescription>
                    Vamos criar seu primeiro notebook para organizar seus
                    documentos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Detectamos que você não possui notebooks ainda. Vamos
                      criar um notebook padrão para organizar seus documentos
                      existentes.
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-center space-x-4">
                    <Button
                      onClick={() => getOrCreateDefault.mutate()}
                      disabled={getOrCreateDefault.isPending}
                      className="gap-2"
                    >
                      {getOrCreateDefault.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Criando notebook padrão...
                        </>
                      ) : (
                        <>
                          <Notebook className="h-4 w-4" />
                          Criar Notebook Padrão
                        </>
                      )}
                    </Button>

                    <CreateNotebookDialog onSuccess={refetchNotebooks} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="mb-8">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2 text-green-600">
                    <Check className="h-6 w-6" />
                    Sistema de Notebooks Ativo
                  </CardTitle>
                  <CardDescription>
                    Você já possui notebooks configurados e pode gerenciá-los
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-lg bg-blue-50 p-4 text-center">
                      <Notebook className="mx-auto mb-2 h-8 w-8 text-blue-600" />
                      <h3 className="font-semibold text-blue-900">
                        {notebooks.length} Notebook
                        {notebooks.length !== 1 ? "s" : ""}
                      </h3>
                      <p className="text-sm text-blue-700">
                        Notebooks ativos no sistema
                      </p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-4 text-center">
                      <FileText className="mx-auto mb-2 h-8 w-8 text-green-600" />
                      <h3 className="font-semibold text-green-900">
                        Sistema Organizado
                      </h3>
                      <p className="text-sm text-green-700">
                        Documentos organizados em notebooks
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center space-x-4">
                    <Button
                      onClick={() => router.push("/notebooks")}
                      className="gap-2"
                    >
                      <FolderOpen className="h-4 w-4" />
                      Gerenciar Notebooks
                    </Button>

                    <CreateNotebookDialog onSuccess={refetchNotebooks} />
                  </div>
                </CardContent>
              </Card>

              {/* Notebook List */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {notebooks.map((notebook) => (
                  <motion.div
                    key={notebook._id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -2 }}
                  >
                    <Card className="h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 rounded-lg bg-blue-100 p-2">
                              <Notebook className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                {notebook.title}
                              </CardTitle>
                              <CardDescription>
                                /notas/{notebook.url}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge
                            variant={
                              notebook.isPrivate ? "secondary" : "outline"
                            }
                          >
                            {notebook.isPrivate ? "Privado" : "Público"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {notebook.description && (
                          <p className="mb-3 text-sm text-muted-foreground">
                            {notebook.description}
                          </p>
                        )}
                        <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            Criado em{" "}
                            {format(
                              new Date(notebook.createdAt),
                              "dd/MM/yyyy",
                              { locale: ptBR },
                            )}
                          </span>
                        </div>
                        <Button asChild variant="outline" className="w-full">
                          <a href={`/notas/${notebook.url}`}>
                            Abrir Notebook
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
