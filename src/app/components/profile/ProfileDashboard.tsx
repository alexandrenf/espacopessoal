"use client";

import { type FormEvent, useState, useRef } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Camera, RefreshCw, Upload } from "lucide-react";
import Image from "next/image";
import { 
  convertToWebP, 
  validateImageFile, 
  generateUniqueFilename,
  createCachedImageUrl,
  setCachedProfileImage 
} from "~/lib/image-utils";

interface User {
  id: string;
  name: string | null | undefined;
  email: string | null | undefined;
  image: string | null | undefined;
  emailVerified: Date | null | number | undefined;
}

interface ProfileDashboardProps {
  user: User;
}

interface FormData {
  name: string;
  email: string;
  image: string;
}

export function ProfileDashboard({ user }: ProfileDashboardProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    name: user.name ?? "",
    email: user.email ?? "",
    image: user.image ?? "",
  });
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = api.useUtils();
  const updateProfile = api.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      setIsEditing(false);
      void utils.users.getUserProfile.invalidate();
    },
    onError: (error: unknown) => {
      // Safely extract an error message.
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error(errorMessage);
    },
  });

  const generateUploadUrl = api.users.generateUploadUrl.useMutation();
  const updateProfileImage = api.users.updateProfileImage.useMutation({
    onSuccess: (updatedUser) => {
      toast.success("Profile image updated successfully");
      void utils.users.getUserProfile.invalidate();
      
      // Cache the new profile image
      if (updatedUser?.image) {
        setCachedProfileImage(user.id, updatedUser.image);
      }
      
      setIsUploading(false);
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update profile image";
      toast.error(errorMessage);
      setIsUploading(false);
    },
  });

  const getUserAccounts = api.users.getUserAccounts.useQuery();
  const refetchAuthProviderImage = api.users.refetchAuthProviderImage.useMutation({
    onSuccess: () => {
      toast.success("Profile image refreshed from auth provider");
      void utils.users.getUserProfile.invalidate();
      setIsRefetching(false);
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to refresh profile image";
      toast.error(errorMessage);
      setIsRefetching(false);
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void updateProfile.mutate(formData);
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsUploading(true);
    try {
      // Convert to WebP
      const webpBlob = await convertToWebP(file, 0.85);
      const webpFile = new File([webpBlob], generateUniqueFilename(file.name), {
        type: 'image/webp',
      });

      // Get upload URL
      const { uploadUrl } = await generateUploadUrl.mutateAsync();
      
      // Upload file to Convex
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': webpFile.type },
        body: webpFile,
      });

      if (!result.ok) {
        throw new Error('Failed to upload file');
      }

      const { storageId } = (await result.json()) as { storageId: string };

      // Update profile with new image
      await updateProfileImage.mutateAsync({ 
        storageId,
        filename: webpFile.name,
        fileSize: webpFile.size,
        mimeType: webpFile.type,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      toast.error(errorMessage);
      setIsUploading(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRefetchFromAuth = async () => {
    const accounts = getUserAccounts.data;
    if (!accounts?.length) {
      toast.error("No connected auth providers found");
      return;
    }

    // Use the first available provider (could be enhanced to let user choose)
    const provider = accounts[0]?.provider;
    if (!provider) {
      toast.error("No auth provider available");
      return;
    }

    setIsRefetching(true);
    try {
      await refetchAuthProviderImage.mutateAsync({ provider });
    } catch (_error) {
      // Error handling is already done in the mutation
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Image Section */}
        <div className="space-y-4">
          <Label>Imagem de Perfil</Label>
          
          {/* Current Profile Image */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {formData.image ?? user.image ? (
                <Image
                  src={createCachedImageUrl(formData.image ?? user.image ?? "")}
                  alt="Profile"
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-200"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-slate-200 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-slate-400" />
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              {/* Upload Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-fit"
              >
                {isUploading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Enviar Nova Foto
                  </>
                )}
              </Button>
              
              {/* Refetch from Auth Provider Button */}
              {getUserAccounts.data?.length ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRefetchFromAuth}
                  disabled={isRefetching}
                  className="w-fit"
                >
                  {isRefetching ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Atualizar do {getUserAccounts.data[0]?.provider}
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          </div>
          
          <p className="text-sm text-gray-600">
            Envie uma nova foto ou atualize a partir do seu provedor de autenticação.
            A imagem será convertida para WebP e otimizada automaticamente.
          </p>
          
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <div>
          <Label htmlFor="name">Nome</Label>
          <Input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            disabled={!isEditing}
            className={!isEditing ? "bg-gray-50" : ""}
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            disabled={!isEditing}
            className={!isEditing ? "bg-gray-50" : ""}
          />
        </div>

        <div>
          <Label htmlFor="image">URL da Imagem de Perfil (Opcional)</Label>
          <Input
            type="url"
            id="image"
            name="image"
            value={formData.image}
            onChange={(e) => handleInputChange("image", e.target.value)}
            disabled={!isEditing}
            className={!isEditing ? "bg-gray-50" : ""}
            placeholder="https://exemplo.com/imagem.jpg"
          />
          <p className="text-sm text-gray-600 mt-1">
            Você também pode inserir manualmente a URL de uma imagem
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          {isEditing ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    name: user.name ?? "",
                    email: user.email ?? "",
                    image: user.image ?? "",
                  });
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateProfile.status === "pending"}
              >
                {updateProfile.status === "pending"
                  ? "Salvando..."
                  : "Salvar Alterações"}
              </Button>
            </>
          ) : (
            // In your ProfileDashboard.tsx file, find the "Editar Perfil" button and add the class
            <Button
              type="button"
              onClick={() => setIsEditing(true)}
              className="edit-profile-btn"
            >
              Editar Perfil
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
