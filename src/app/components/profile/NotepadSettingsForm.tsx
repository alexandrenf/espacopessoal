"use client";

import { useState, type FormEvent } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { useRouter } from "next/navigation";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "~/server/api/root";

interface NoteSettings {
  notePadUrl: string | null;
  privateOrPublicUrl: boolean;
  password: string | null;
}

interface NotepadSettingsFormProps {
  initialSettings: NoteSettings;
}

export function NotepadSettingsForm({
  initialSettings,
}: NotepadSettingsFormProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<NoteSettings>({
    notePadUrl: initialSettings.notePadUrl ?? "",
    privateOrPublicUrl: initialSettings.privateOrPublicUrl,
    password: initialSettings.password ?? "",
  });

  const updateSettingsMutation =
    api.userSettings.updateNoteSettings.useMutation({
      onSuccess: () => {
        toast.success("Configurações salvas", {
          description: "Suas configurações foram atualizadas com sucesso.",
        });

        // Refresh all routes to update the header state
        router.refresh();
      },
      onError: (error: TRPCClientErrorLike<AppRouter>) => {
        toast.error("Erro ao salvar", {
          description: error.message,
        });
      },
    });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate password if private
    if (
      formData.privateOrPublicUrl &&
      (!formData.password || formData.password.length < 3)
    ) {
      toast.error(
        "Password must be at least 3 characters for private notepads",
      );
      return;
    }

    updateSettingsMutation.mutate({
      notePadUrl: formData.notePadUrl ?? "",
      privateOrPublicUrl: formData.privateOrPublicUrl,
      password: formData.privateOrPublicUrl ? formData.password : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="url">Sua URL do Bloco de Notas</Label>
        <div className="mt-1 flex items-center">
          <span className="mr-2 text-gray-500">/notas/</span>
          <div className="flex-1">
            <Input
              id="url"
              name="url"
              value={formData.notePadUrl ?? ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notePadUrl: e.target.value }))
              }
              placeholder="sua-url-personalizada"
              disabled={!isEditing}
              className={!isEditing ? "bg-gray-50" : ""}
            />
          </div>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Esta é sua URL personalizada do bloco de notas
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="private">Privacidade do Bloco de Notas</Label>
          <p className="text-sm text-gray-500">
            {formData.privateOrPublicUrl
              ? "Privado: Somente você pode acessar com senha"
              : "Público: Qualquer pessoa com a URL pode acessar"}
          </p>
        </div>
        <div>
          <Switch
            id="private"
            checked={formData.privateOrPublicUrl}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, privateOrPublicUrl: checked }))
            }
            disabled={!isEditing}
          />
        </div>
      </div>

      {formData.privateOrPublicUrl && (
        <div>
          <Label htmlFor="password">Proteção por Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, password: e.target.value }))
            }
            placeholder="Digite a senha"
            disabled={!isEditing}
            className={!isEditing ? "bg-gray-50" : ""}
          />
          <p className="mt-1 text-sm text-gray-500">
            {!isEditing && formData.password
              ? "Seu bloco de notas é protegido por senha"
              : "Defina uma senha para proteger seu bloco de notas privado"}
          </p>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-2">
        {isEditing ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  notePadUrl: initialSettings.notePadUrl ?? "",
                  privateOrPublicUrl: initialSettings.privateOrPublicUrl,
                  password: initialSettings.password ?? "",
                });
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateSettingsMutation.isPending}>
              {updateSettingsMutation.isPending
                ? "Salvando..."
                : "Salvar Configurações"}
            </Button>
          </>
        ) : (
          <Button type="button" onClick={() => setIsEditing(true)}>
            Editar Configurações
          </Button>
        )}
      </div>
    </form>
  );
}
