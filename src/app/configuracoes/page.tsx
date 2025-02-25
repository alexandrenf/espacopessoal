"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { useToast } from "~/components/ui/use-toast";
import { LoadingSpinner } from "~/components/loading";

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [isPrivate, setIsPrivate] = useState(true);
  const [url, setUrl] = useState("");
  const [password, setPassword] = useState<string>("");

  // Fetch current settings
  const { data: settings, isLoading } = api.userSettings.getNoteSettings.useQuery(undefined, {
    onSuccess: (data) => {
      setIsPrivate(data.privateOrPublicUrl ?? true);
      setUrl(data.notePadUrl ?? "");
      setPassword(data.password ?? "");
    },
  });

  const updateSettings = api.userSettings.updateNoteSettings.useMutation({
    onSuccess: () => {
      toast({
        title: "Configurações atualizadas",
        description: "Suas configurações foram salvas com sucesso.",
      });
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate({
      notePadUrl: url,
      privateOrPublicUrl: isPrivate,
      password: isPrivate ? password : null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <h1 className="mb-8 text-2xl font-bold">Configurações do Bloco de Notas</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="url">URL do seu bloco de notas</Label>
          <Input
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="meu-bloco-de-notas"
          />
          <p className="text-sm text-gray-500">
            Esta será a URL para acessar suas notas: /notas/{url}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
            <Label htmlFor="private">Bloco de notas privado</Label>
          </div>
          <p className="text-sm text-gray-500">
            {isPrivate
              ? "Apenas você pode ver e editar as notas"
              : "Qualquer pessoa com a URL pode ver e editar as notas"}
          </p>
        </div>

        {isPrivate && (
          <div className="space-y-2">
            <Label htmlFor="password">Senha (opcional)</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite uma senha"
            />
            <p className="text-sm text-gray-500">
              Se definida, será necessária para acessar suas notas
            </p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={updateSettings.isPending}
        >
          {updateSettings.isPending ? (
            <>
              <LoadingSpinner className="mr-2 h-4 w-4" />
              Salvando...
            </>
          ) : (
            "Salvar configurações"
          