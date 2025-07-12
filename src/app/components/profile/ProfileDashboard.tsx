"use client";

import { type FormEvent, useState, useRef } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Camera, RefreshCw, Upload, User, Mail, ImageIcon } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  convertToWebP,
  validateImageFile,
  generateUniqueFilename,
  createCachedImageUrl,
  setCachedProfileImage,
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
        error instanceof Error
          ? error.message
          : "Failed to update profile image";
      toast.error(errorMessage);
      setIsUploading(false);
    },
  });

  const getUserAccounts = api.users.getUserAccounts.useQuery();
  const refetchAuthProviderImage =
    api.users.refetchAuthProviderImage.useMutation({
      onSuccess: () => {
        toast.success("Profile image refreshed from auth provider");
        void utils.users.getUserProfile.invalidate();
        setIsRefetching(false);
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to refresh profile image";
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

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
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
        type: "image/webp",
      });

      // Get upload URL
      const { uploadUrl } = await generateUploadUrl.mutateAsync();

      // Upload file to Convex
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": webpFile.type },
        body: webpFile,
      });

      if (!result.ok) {
        throw new Error("Failed to upload file");
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
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload image";
      toast.error(errorMessage);
      setIsUploading(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile Image Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-2">
              <ImageIcon className="h-5 w-5 text-white" />
            </div>
            <Label className="text-lg font-semibold text-slate-900">
              Imagem de Perfil
            </Label>
          </div>

          {/* Current Profile Image */}
          <div className="flex flex-col gap-6 rounded-xl border border-blue-200/30 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 p-6 sm:flex-row sm:items-center">
            <div className="group relative">
              {(formData.image ?? user.image) ? (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <Image
                    src={createCachedImageUrl(
                      formData.image ?? user.image ?? "",
                    )}
                    alt="Profile"
                    width={100}
                    height={100}
                    className="h-24 w-24 rounded-full object-cover shadow-lg ring-4 ring-white transition-shadow duration-300 group-hover:shadow-xl"
                  />
                </motion.div>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                  className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 shadow-lg ring-4 ring-white transition-shadow duration-300 group-hover:shadow-xl"
                >
                  <Camera className="h-8 w-8 text-slate-500" />
                </motion.div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {/* Upload Button */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
                >
                  {isUploading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Enviar Nova Foto
                    </>
                  )}
                </Button>
              </motion.div>

              {/* Refetch from Auth Provider Button */}
              {getUserAccounts.data?.length ? (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRefetchFromAuth}
                    disabled={isRefetching}
                    className="rounded-xl border-slate-300 bg-white/80 px-6 py-2.5 font-medium text-slate-700 shadow-sm transition-all duration-300 hover:bg-slate-50 hover:shadow-md"
                  >
                    {isRefetching ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                        Atualizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Atualizar do {getUserAccounts.data[0]?.provider}
                      </>
                    )}
                  </Button>
                </motion.div>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-blue-200/50 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
            <p className="text-sm leading-relaxed text-slate-600">
              💡 <strong>Dica:</strong> Envie uma nova foto ou atualize a partir
              do seu provedor de autenticação. A imagem será convertida para
              WebP e otimizada automaticamente.
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileUpload}
            className="hidden"
          />
        </motion.div>

        {/* Personal Information Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-2">
              <User className="h-5 w-5 text-white" />
            </div>
            <Label className="text-lg font-semibold text-slate-900">
              Informações Pessoais
            </Label>
          </div>

          <div className="grid gap-6">
            <div className="space-y-3">
              <Label
                htmlFor="name"
                className="flex items-center gap-2 text-sm font-medium text-slate-700"
              >
                <User className="h-4 w-4" />
                Nome
              </Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                disabled={!isEditing}
                className={`rounded-xl border-slate-300 transition-all duration-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                  !isEditing
                    ? "bg-slate-50 text-slate-600"
                    : "bg-white hover:border-slate-400"
                }`}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-3">
              <Label
                htmlFor="email"
                className="flex items-center gap-2 text-sm font-medium text-slate-700"
              >
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                disabled={!isEditing}
                className={`rounded-xl border-slate-300 transition-all duration-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                  !isEditing
                    ? "bg-slate-50 text-slate-600"
                    : "bg-white hover:border-slate-400"
                }`}
                placeholder="seu@email.com"
              />
            </div>

            <div className="space-y-3">
              <Label
                htmlFor="image"
                className="flex items-center gap-2 text-sm font-medium text-slate-700"
              >
                <ImageIcon className="h-4 w-4" />
                URL da Imagem de Perfil (Opcional)
              </Label>
              <Input
                type="url"
                id="image"
                name="image"
                value={formData.image}
                onChange={(e) => handleInputChange("image", e.target.value)}
                disabled={!isEditing}
                className={`rounded-xl border-slate-300 transition-all duration-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                  !isEditing
                    ? "bg-slate-50 text-slate-600"
                    : "bg-white hover:border-slate-400"
                }`}
                placeholder="https://exemplo.com/imagem.jpg"
              />
              <div className="rounded-lg border border-amber-200/50 bg-amber-50 p-3">
                <p className="text-sm leading-relaxed text-amber-700">
                  ℹ️ <strong>Alternativa:</strong> Você também pode inserir
                  manualmente a URL de uma imagem
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col justify-end gap-3 border-t border-slate-200 pt-6 sm:flex-row"
        >
          {isEditing ? (
            <>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
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
                  className="rounded-xl border-slate-300 bg-white px-6 py-2.5 font-medium text-slate-700 shadow-sm transition-all duration-300 hover:bg-slate-50 hover:shadow-md"
                >
                  Cancelar
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  disabled={updateProfile.status === "pending"}
                  className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-2.5 font-medium text-white shadow-lg transition-all duration-300 hover:from-green-700 hover:to-emerald-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updateProfile.status === "pending" ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </motion.div>
            </>
          ) : (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                onClick={() => setIsEditing(true)}
                className="edit-profile-btn rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-2.5 font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
              >
                ✏️ Editar Perfil
              </Button>
            </motion.div>
          )}
        </motion.div>
      </form>
    </div>
  );
}
