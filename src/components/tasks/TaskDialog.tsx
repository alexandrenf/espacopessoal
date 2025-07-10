import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { DateTimePicker } from "~/components/ui/date-time-picker";
import { DeleteConfirmationModal } from "~/app/components/DeleteConfirmationModal";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type ReminderFrequency = "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY";

interface TaskDialogProps {
  taskId?: string;
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDialog({
  boardId,
  taskId,
  open,
  onOpenChange,
}: TaskDialogProps) {
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDateTime, setReminderDateTime] = useState<Date | undefined>();
  const [reminderFrequency, setReminderFrequency] =
    useState<ReminderFrequency>("ONCE");

  const isEditMode = !!taskId;

  // Query hooks
  const { data: task, isLoading } = api.tasks.getTask.useQuery(
    { taskId: taskId! },
    {
      enabled: !!taskId,
      staleTime: 0,
      gcTime: 0,
    },
  );

  // Prevent modal from opening until data is loaded
  useEffect(() => {
    if (isEditMode && !task && !isLoading) {
      onOpenChange(false);
    }
  }, [isEditMode, task, isLoading, onOpenChange]);

  // Mutation hooks
  const { mutate: createTask, isPending: isCreating } =
    api.tasks.createTask.useMutation({
      onSuccess: async () => {
        try {
          await utils.boards.getBoards.invalidate();
          onOpenChange(false);
        } catch (error) {
          console.error(
            "Failed to invalidate cache:",
            error instanceof Error ? error.message : String(error),
          );
        }
      },
      onError: (error: unknown) => {
        console.error("Failed to create task:", error);
        if (error instanceof Error) {
          console.error(error.message);
        } else if (typeof error === "object" && error !== null) {
          console.error(JSON.stringify(error));
        } else {
          console.error(String(error));
        }
      },
    });

  const { mutate: updateTask, isPending: isUpdating } =
    api.tasks.updateTask.useMutation({
      onSuccess: async () => {
        try {
          await utils.boards.getBoards.invalidate();
          onOpenChange(false);
        } catch (error) {
          console.error(
            "Failed to invalidate cache:",
            error instanceof Error ? error.message : String(error),
          );
        }
      },
      onError: (error: unknown) => {
        console.error("Failed to update task:", error);
        if (error instanceof Error) {
          console.error(error.message);
        } else if (typeof error === "object" && error !== null) {
          console.error(JSON.stringify(error));
        } else {
          console.error(String(error));
        }
      },
    });

  const { mutate: deleteTask, isPending: isDeleting } =
    api.tasks.deleteTask.useMutation({
      onSuccess: async () => {
        try {
          await utils.boards.getBoards.invalidate();
          onOpenChange(false);
        } catch (error) {
          console.error("Failed to invalidate cache:", error);
        }
      },
      onError: (error: unknown) => {
        console.error("Failed to delete task:", error);
      },
    });

  useEffect(() => {
    // Only update form state if we have task data or we're creating a new task
    if (!open) return;

    if (taskId && task) {
      // When editing an existing task, use its data
      setName(task.name ?? "");
      setDescription(task.description ?? "");
      setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
      setStatus((task.status as TaskStatus) ?? "TODO");
      setReminderEnabled(task.reminderEnabled ?? false);
      setReminderDateTime(task.reminderDateTime ? new Date(task.reminderDateTime) : undefined);
      setReminderFrequency(task.reminderFrequency! as ReminderFrequency ?? "ONCE");
    } else if (!taskId) {
      // Only reset form when explicitly creating a new task
      setName("");
      setDescription("");
      setDueDate(undefined);
      setStatus("TODO");
      setReminderEnabled(false);
      setReminderDateTime(undefined);
      setReminderFrequency("ONCE");
    }
  }, [task, taskId, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setValidationError(null);

    if (reminderEnabled) {
      if (!reminderDateTime) {
        setValidationError("Please select a reminder date and time");
        return;
      }

      if (reminderDateTime < new Date()) {
        setValidationError("Reminder date must be in the future");
        return;
      }
    }

    if (isEditMode && taskId) {
      updateTask({ 
        taskId,
        status,
        description,
        name,
        dueDate: dueDate?.toISOString(),
        reminderEnabled,
        reminderDateTime: reminderDateTime?.toISOString(),
        reminderFrequency: reminderEnabled ? reminderFrequency : undefined,
      });
    } else {
      createTask({
        boardId,
        name,
        description,
        dueDate: dueDate,
        reminderEnabled,
        reminderDateTime: reminderDateTime?.toISOString(),
        reminderFrequency: reminderEnabled ? reminderFrequency : undefined,
      });
    }
  };

  const isPending = (isCreating ?? false) || (isUpdating ?? false) || (isDeleting ?? false);

  const handleDeleteConfirm = () => {
    if (!taskId) return;
    deleteTask({ taskId, boardId });
    setIsDeleteModalOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Task" : "Create New Task"}
            </DialogTitle>
          </DialogHeader>
          {isEditMode && isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="space-y-4 py-4">
                <div className="grid w-full gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Task Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter task name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add task description"
                      className="h-24"
                    />
                  </div>

                  {isEditMode && (
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={status}
                        onValueChange={(value) =>
                          setStatus(value as TaskStatus)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TODO">To Do</SelectItem>
                          <SelectItem value="IN_PROGRESS">
                            In Progress
                          </SelectItem>
                          <SelectItem value="DONE">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <DateTimePicker value={dueDate} onChange={setDueDate} />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="reminder">Enable Reminder</Label>
                      <Switch
                        id="reminder"
                        checked={reminderEnabled}
                        onCheckedChange={setReminderEnabled}
                      />
                    </div>

                    {reminderEnabled && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="reminderDateTime">
                            Reminder Date & Time
                          </Label>
                          <DateTimePicker
                            value={reminderDateTime}
                            onChange={setReminderDateTime}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="reminderFrequency">Repeat</Label>
                          <Select
                            value={reminderFrequency}
                            onValueChange={(value) =>
                              setReminderFrequency(value as ReminderFrequency)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ONCE">Once</SelectItem>
                              <SelectItem value="DAILY">Daily</SelectItem>
                              <SelectItem value="WEEKLY">Weekly</SelectItem>
                              <SelectItem value="MONTHLY">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {validationError && (
                <p className="px-6 pb-2 text-sm text-destructive">
                  {validationError}
                </p>
              )}

              <DialogFooter className="sticky bottom-0 border-t bg-background pt-4">
                {isEditMode && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setIsDeleteModalOpen(true)}
                    disabled={isPending}
                  >
                    Delete
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={Boolean(
                    isPending ??
                    (reminderEnabled && !reminderDateTime) ??
                    (reminderEnabled &&
                      reminderDateTime &&
                      reminderDateTime < new Date())
                  )}
                >
                  {(isPending ?? false)
                    ? isEditMode
                      ? "Saving..."
                      : "Creating..."
                    : isEditMode
                      ? "Save Changes"
                      : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        noteTitle={task?.name ?? ""}
        isDeleting={isDeleting ?? false}
      />
    </>
  );
}
