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

// Define the types inline since the module is missing
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type ReminderFrequency = "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY";

interface TaskDialogProps {
  taskId: string;
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDialog({
  taskId,
  boardId,
  open,
  onOpenChange,
}: TaskDialogProps) {
  const utils = api.useUtils();
  
  const { data: task } = api.task.getTask.useQuery(
    { taskId },
    { 
      enabled: Boolean(taskId),
      networkMode: 'always',
    }
  );
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDateTime, setReminderDateTime] = useState<Date | undefined>();
  const [reminderFrequency, setReminderFrequency] = useState<ReminderFrequency>("ONCE");

  // Update form state when task data is loaded
  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description ?? "");
      setStatus(task.status);
      setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
      setReminderEnabled(Boolean(task.reminderEnabled));
      setReminderDateTime(task.reminderDateTime ? new Date(task.reminderDateTime) : undefined);
      setReminderFrequency(task.reminderFrequency ?? "ONCE");
    }
  }, [task]);

  const { mutate: updateTask, isPending: isUpdating } = api.task.updateTask.useMutation({
    onSuccess: async () => {
      try {
        // Use the board router instead of task router since that's what exists
        await utils.board.getBoards.invalidate();
        onOpenChange(false);
      } catch (error) {
        if (error instanceof Error) {
          console.error("Failed to invalidate cache:", error.message);
        } else {
          console.error("Failed to invalidate cache:", String(error));
        }
      }
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        console.error("Failed to update task:", error.message);
      } else {
        console.error("Failed to update task:", String(error));
      }
    }
  });

  const { mutate: deleteTask, isPending: isDeleting } = api.task.deleteTask.useMutation({
    onSuccess: async () => {
      try {
        await utils.board.getBoards.invalidate();
        onOpenChange(false);
      } catch (error) {
        console.error("Failed to invalidate cache:", error);
      }
    },
    onError: (error) => {
      console.error("Failed to delete task:", error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !boardId) return;
    
    updateTask({
      taskId,
      boardId,
      name,
      description,
      status,
      dueDate: dueDate?.toISOString(),
      reminderEnabled,
      reminderDateTime: reminderDateTime?.toISOString(),
      reminderFrequency: reminderEnabled ? reminderFrequency : undefined,
    });
  };

  // Show loading state or return null if task is not loaded
  if (!task) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
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

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <DateTimePicker
                value={dueDate}
                onChange={setDueDate}
              />
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
                    <Label htmlFor="reminderDateTime">Reminder Date & Time</Label>
                    <DateTimePicker
                      value={reminderDateTime}
                      onChange={setReminderDateTime}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reminderFrequency">Repeat</Label>
                    <Select
                      value={reminderFrequency}
                      onValueChange={(value) => setReminderFrequency(value as ReminderFrequency)}
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

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteTask({ taskId, boardId })}
              disabled={isDeleting}
            >
              Delete
            </Button>
            <Button type="submit" disabled={isUpdating}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}