"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { type Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Shield,
  Users,
  Lock,
  Trash2,
  RefreshCw,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import PasswordStrength, {
  type PasswordStrengthLevel,
} from "./PasswordStrength";

interface Notebook {
  _id: Id<"notebooks">;
  title: string;
  description?: string;
  isPrivate: boolean;
  password?: string;
  url: string;
}


interface NotebookSession {
  _id: Id<"notebookSessions">;
  userAgent?: string;
  lastAccessedAt: number;
  expiresAt: number;
}

interface NotebookSettingsDialogProps {
  notebook: Notebook | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: Id<"users">;
}

const NotebookSettingsDialog: React.FC<NotebookSettingsDialogProps> = ({
  notebook,
  open,
  onOpenChange,
  userId,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] =
    useState<PasswordStrengthLevel>("weak");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "general" | "security" | "sessions"
  >("general");
  const [revokeExistingSessions, setRevokeExistingSessions] = useState(false);

  // Mutations
  const updateNotebook = useMutation(api.notebooks.update);
  const updatePassword = useMutation(api.notebooks.updatePassword);
  const revokeSessions = useMutation(api.notebooks.revokeSessions);

  // Queries
  const notebookSessionsQuery = useQuery(
    api.notebooks.getNotebookSessions,
    notebook && userId ? { notebookId: notebook._id, userId } : "skip",
  ) as NotebookSession[] | undefined | null;
  
  // Safely extract sessions data with proper type checking
  const notebookSessions: NotebookSession[] = (() => {
    if (!notebookSessionsQuery) return [];
    if (Array.isArray(notebookSessionsQuery)) {
      return notebookSessionsQuery;
    }
    return [];
  })();

  // Initialize form when notebook changes
  useEffect(() => {
    if (notebook) {
      setTitle(notebook.title ?? "");
      setDescription(notebook.description ?? "");
      setIsPrivate(notebook.isPrivate ?? false);
      setPassword(""); // Never pre-fill password
      setShowPassword(false);
    }
  }, [notebook]);

  const handleSave = async () => {
    if (!notebook || !userId) return;

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsLoading(true);

    try {
      // Update general notebook settings
      await updateNotebook({
        id: notebook._id,
        title: title.trim(),
        description: description.trim() ? description.trim() : undefined,
        isPrivate,
        userId,
      });

      // Handle password updates separately
      if (password.trim()) {
        if (passwordStrength === "weak") {
          toast.error(
            "Password is too weak. Please choose a stronger password.",
          );
          setIsLoading(false);
          return;
        }

        await updatePassword({
          notebookId: notebook._id,
          newPassword: password.trim(),
          userId,
          revokeExistingSessions,
        });

        toast.success("Password updated successfully");
      }

      toast.success("Notebook settings updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update notebook:", error);
      toast.error("Failed to update notebook settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePassword = async () => {
    if (!notebook || !userId) return;

    setIsLoading(true);

    try {
      await updatePassword({
        notebookId: notebook._id,
        newPassword: undefined,
        userId,
        revokeExistingSessions: true,
      });

      setPassword("");
      toast.success("Password removed successfully");
    } catch (error) {
      console.error("Failed to remove password:", error);
      toast.error("Failed to remove password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!notebook || !userId) return;

    setIsLoading(true);

    try {
      const result = await revokeSessions({
        notebookId: notebook._id,
        userId,
      }) as { revokedCount: number } | null;

      // Type guard to safely access result properties
      if (result && typeof result === 'object' && 'revokedCount' in result) {
        toast.success(`Revoked ${result.revokedCount} active sessions`);
      } else {
        toast.success("Sessions revoked successfully");
      }
    } catch (error) {
      console.error("Failed to revoke sessions:", error);
      toast.error("Failed to revoke sessions");
    } finally {
      setIsLoading(false);
    }
  };

  const renderGeneralTab = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Notebook title"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-base">Privacy</Label>
          <div className="text-sm text-gray-500">
            Private notebooks are only visible to you and people with access
          </div>
        </div>
        <Switch
          checked={isPrivate}
          onCheckedChange={setIsPrivate}
          disabled={isLoading}
        />
      </div>

      {isPrivate && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-blue-800">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">Private Notebook</span>
          </div>
          <p className="mt-1 text-sm text-blue-700">
            This notebook is private and only visible to you. Add a password for
            extra security.
          </p>
        </div>
      )}
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Password Protection</Label>
            <div className="text-sm text-gray-500">
              Protect your notebook with a password
            </div>
          </div>
          {notebook?.password && (
            <Badge
              variant="outline"
              className="border-green-200 text-green-600"
            >
              <Shield className="mr-1 h-3 w-3" />
              Protected
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">
            {notebook?.password
              ? "New Password (leave blank to keep current)"
              : "Password"}
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                notebook?.password ? "Enter new password" : "Enter password"
              }
              disabled={isLoading}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {password && (
          <PasswordStrength
            password={password}
            onStrengthChange={setPasswordStrength}
            className="mt-3"
          />
        )}

        {password && (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Revoke Existing Sessions</Label>
              <div className="text-sm text-gray-500">
                Log out all devices currently accessing this notebook
              </div>
            </div>
            <Switch
              checked={revokeExistingSessions}
              onCheckedChange={setRevokeExistingSessions}
              disabled={isLoading}
            />
          </div>
        )}
      </div>

      {notebook?.password && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-red-800">
                <Trash2 className="h-4 w-4" />
                <span className="text-sm font-medium">Remove Password</span>
              </div>
              <p className="mt-1 text-sm text-red-700">
                This will remove password protection and revoke all active
                sessions.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemovePassword}
              disabled={isLoading}
            >
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderSessionsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-base">Active Sessions</Label>
          <div className="text-sm text-gray-500">
            Devices currently accessing this notebook
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRevokeAllSessions}
          disabled={isLoading || !notebookSessions || notebookSessions.length === 0}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Revoke All
        </Button>
      </div>

      {notebookSessions && notebookSessions.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          <Users className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p>No active sessions</p>
          <p className="text-sm">
            Sessions will appear here when users access your notebook
          </p>
        </div>
      )}

      {notebookSessions && notebookSessions.length > 0 && (
        <div className="space-y-3">
          {notebookSessions.map((session: NotebookSession) => (
            <div
              key={session._id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex-1">
                <div className="font-medium">
                  {session.userAgent
                    ? session.userAgent.includes("Mobile")
                      ? "Mobile Device"
                      : "Desktop Browser"
                    : "Unknown Device"}
                </div>
                <div className="text-sm text-gray-500">
                  Last accessed:{" "}
                  {new Date(session.lastAccessedAt).toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">
                  Expires: {new Date(session.expiresAt).toLocaleString()}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRevokeAllSessions()}
                disabled={isLoading}
              >
                Revoke
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (!notebook) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Notebook Settings</DialogTitle>
          <DialogDescription>
            Manage your notebook&apos;s general settings, security, and active
            sessions.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b">
          <Button
            variant={activeTab === "general" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("general")}
            className="rounded-b-none"
          >
            General
          </Button>
          <Button
            variant={activeTab === "security" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("security")}
            className="rounded-b-none"
          >
            Security
          </Button>
          <Button
            variant={activeTab === "sessions" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("sessions")}
            className="rounded-b-none"
          >
            Sessions
          </Button>
        </div>

        {/* Tab Content */}
        <div className="py-4">
          {activeTab === "general" && renderGeneralTab()}
          {activeTab === "security" && renderSecurityTab()}
          {activeTab === "sessions" && renderSessionsTab()}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotebookSettingsDialog;
