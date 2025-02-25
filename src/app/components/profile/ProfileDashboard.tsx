'use client';

import { type FormEvent, useState } from 'react';
import { api } from '~/trpc/react';
import { toast } from 'sonner';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  emailVerified: Date | null;
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
    name: user.name ?? '',
    email: user.email ?? '',
    image: user.image ?? '',
  });

  const utils = api.useUtils();
  const updateProfile = api.userUpdate.updateProfile.useMutation({
    onSuccess: () => {
      toast.success('Profile updated successfully');
      setIsEditing(false);
      void utils.userUpdate.getUserProfile.invalidate();
    },
    onError: (error: unknown) => {
      // Safely extract an error message.
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void updateProfile.mutate(formData);
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
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
            onChange={(e) => handleInputChange('email', e.target.value)}
            disabled={!isEditing}
            className={!isEditing ? "bg-gray-50" : ""}
          />
        </div>

        <div>
          <Label htmlFor="image">URL da Imagem de Perfil</Label>
          <Input
            type="url"
            id="image"
            name="image"
            value={formData.image}
            onChange={(e) => handleInputChange('image', e.target.value)}
            disabled={!isEditing}
            className={!isEditing ? "bg-gray-50" : ""}
          />
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
                    name: user.name ?? '',
                    email: user.email ?? '',
                    image: user.image ?? '',
                  });
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateProfile.status === 'pending'}
              >
                {updateProfile.status === 'pending' ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => setIsEditing(true)}
            >
              Editar Perfil
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
