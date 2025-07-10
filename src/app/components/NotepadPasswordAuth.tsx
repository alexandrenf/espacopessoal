"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { toast } from "sonner";

interface NotepadPasswordAuthProps {
  url: string;
  onAuthenticated: (password: string) => void;
}

export function NotepadPasswordAuth({
  url,
  onAuthenticated,
}: NotepadPasswordAuthProps) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const verifyPassword = api.notebooks.verifyPassword.useMutation({
    onSuccess: () => {
      onAuthenticated(password);
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      toast.error("Error", {
        description: errorMessage,
      });
      setIsLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    verifyPassword.mutate({ url, password });
  };

  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Protected Notepad</h2>
          <p className="mt-2 text-gray-600">
            This notepad is password protected. Please enter the password to
            continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Verifying..." : "Access Notepad"}
          </Button>
        </form>
      </div>
    </div>
  );
}
