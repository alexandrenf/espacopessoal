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
  const [reminderFrequency, setReminderFrequency] =
    useState<ReminderFrequency>("ONCE");

  const utils = api.useUtils();

  const { mutate: createTask, isPending } = api.tasks.createTask.useMutation({
    onSuccess: async () => {
      try {
        await utils.boards.getBoards.invalidate();
        onOpenChange(false);
        resetForm();
      } catch (err) {
        // Type-safe error handling
        const errorMessage =
          err instanceof Error ? err.message : "Failed to invalidate boards";
        console.error("Failed to invalidate boards:", errorMessage);
      }
    },
    onError: (error: unknown) => {
      // Type-safe error handling
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
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
      dueDate: dueDate,
      reminderEnabled,
      reminderDateTime: reminderDateTime
        ? reminderDateTime.toISOString()
        : undefined,
      ...(reminderEnabled ? { reminderFrequency } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Nova Tarefa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid w-full gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Tarefa</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Digite o nome da tarefa"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Adicione a descrição da tarefa"
                className="h-24"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Data de Vencimento</Label>
              <DateTimePicker
                value={dueDate}
                onChange={(date?: Date) => setDueDate(date)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="reminder">Habilitar Lembrete</Label>
              <Switch
                id="reminder"
                checked={reminderEnabled}
                onCheckedChange={(checked: boolean) =>
                  setReminderEnabled(checked)
                }
              />
            </div>

            {reminderEnabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reminderDateTime">
                    Data e Hora do Lembrete
                  </Label>
                  <DateTimePicker
                    value={reminderDateTime}
                    onChange={(date?: Date) => setReminderDateTime(date)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reminderFrequency">Repetir</Label>
                  <Select
                    value={reminderFrequency}
                    onValueChange={(value: string) =>
                      setReminderFrequency(value as ReminderFrequency)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a frequência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONCE">Uma vez</SelectItem>
                      <SelectItem value="DAILY">Diariamente</SelectItem>
                      <SelectItem value="WEEKLY">Semanalmente</SelectItem>
                      <SelectItem value="MONTHLY">Mensalmente</SelectItem>
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
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Criando..." : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
