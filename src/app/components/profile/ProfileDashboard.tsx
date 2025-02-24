'use client';

import { type FormEvent, useState } from 'react';
import { api } from '~/trpc/react';
import { toast } from 'sonner';

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
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            disabled={!isEditing}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            disabled={!isEditing}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        <div>
          <label htmlFor="image" className="block text-sm font-medium text-gray-700">
            Profile Image URL
          </label>
          <input
            type="url"
            id="image"
            name="image"
            value={formData.image}
            onChange={(e) => handleInputChange('image', e.target.value)}
            disabled={!isEditing}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        <div className="flex justify-end space-x-3">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    name: user.name ?? '',
                    email: user.email ?? '',
                    image: user.image ?? '',
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={updateProfile.status === 'pending'}
              >
                {updateProfile.status === 'pending' ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Edit Profile
            </button>
          )}
        </div>
      </form>
    </div>
  );
}