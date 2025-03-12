import { useState } from "react";
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

interface CreateTaskDialogProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ReminderFrequency = "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY";

export function CreateTaskDialog({
  boardId,
  open,
  onOpenChange,
}: CreateTaskDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDateTime, setReminderDateTime] = useState<Date | undefined>();
  const [reminderFrequency, setReminderFrequency] = useState<ReminderFrequency>("ONCE");

  const utils = api.useUtils();
  
  const { mutate: createTask, isPending } = api.board.createTask.useMutation({
    onSuccess: async () => {
      try {
        await utils.board.getBoards.invalidate();
        onOpenChange(false);
        resetForm();
      } catch (err) {
        // Type-safe error handling
        const errorMessage = err instanceof Error 
          ? err.message 
          : "Failed to invalidate boards";
        console.error("Failed to invalidate boards:", errorMessage);
      }
    },
    onError: (error: unknown) => {
      // Type-safe error handling
      const errorMessage = error instanceof Error 
        ? error.message 
        : "An unexpected error occurred";
      console.error("Failed to create task:", errorMessage);
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setDueDate(undefined);
    setReminderEnabled(false);
    setReminderDateTime(undefined);
    setReminderFrequency("ONCE");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void createTask({
      boardId,
      name,
      description,
      dueDate: dueDate ? dueDate.toISOString() : undefined,
      reminderEnabled,
      reminderDateTime: reminderDateTime ? reminderDateTime.toISOString() : undefined,
      ...(reminderEnabled ? { reminderFrequency } : {})
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
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
              <Label htmlFor="dueDate">Due Date</Label>
              <DateTimePicker
                value={dueDate}
                onChange={(date?: Date) => setDueDate(date)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="reminder">Enable Reminder</Label>
              <Switch
                id="reminder"
                checked={reminderEnabled}
                onCheckedChange={(checked: boolean) => setReminderEnabled(checked)}
              />
            </div>

            {reminderEnabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reminderDateTime">Reminder Date & Time</Label>
                  <DateTimePicker
                    value={reminderDateTime}
                    onChange={(date?: Date) => setReminderDateTime(date)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reminderFrequency">Repeat</Label>
                  <Select
                    value={reminderFrequency}
                    onValueChange={(value: string) => setReminderFrequency(value as ReminderFrequency)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONCE">Once</SelectItem>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}