import { api } from "~/trpc/react";
import { MoreVertical, Plus } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ScrollArea } from "~/components/ui/scroll-area";
import type { RouterOutputs } from "~/trpc/react";
import { useState } from "react";
import { TaskDialog } from "../tasks/TaskDialog";
import { cn } from "~/lib/utils";
import { DeleteConfirmationModal } from "~/app/components/DeleteConfirmationModal";
import { format } from "date-fns";

type Board = RouterOutputs["boards"]["getBoards"]["boards"][number];

interface BoardCardProps {
  board: Board;
}

export function BoardCard({ board }: BoardCardProps) {
  const utils = api.useUtils();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { mutate: deleteBoard, isPending: isDeleting } =
    api.boards.deleteBoard.useMutation({
      onMutate: async (deletedBoardId) => {
        // Cancel any outgoing refetches
        await utils.boards.getBoards.cancel();

        // Snapshot the previous value
        const previousBoards = utils.boards.getBoards.getInfiniteData({
          limit: 10,
        });

        // Optimistically update the cache
        utils.boards.getBoards.setInfiniteData(
          { limit: 10 }, // Must match the query params used in BoardList
          (old) => {
            if (!old) return { pages: [], pageParams: [] };
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                boards: page.boards.filter(
                  (board) => board._id !== deletedBoardId,
                ),
              })),
            };
          },
        );

        // Return context for potential rollback
        return { previousBoards };
      },
      onError: (_err, _deletedBoardId, context) => {
        // Restore previous data if mutation fails
        if (context?.previousBoards) {
          utils.boards.getBoards.setInfiniteData(
            { limit: 10 },
            context.previousBoards,
          );
        }
      },
      onSettled: () => {
        // Invalidate and refetch after mutation settles
        void utils.boards.getBoards.invalidate();
      },
    });

  const handleDeleteConfirm = () => {
    deleteBoard(board._id);
    setIsDeleteModalOpen(false);
  };

  return (
    <>
      <Card className="relative flex h-[480px] w-[300px] flex-col p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: board.color }}
            />
            <h3 className="font-semibold">{board.name}</h3>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setIsDeleteModalOpen(true)}>
                Excluir Quadro
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ScrollArea className="flex-grow">
          <div className="space-y-2">
            {board.tasks.map((task) => (
              <Card
                key={task._id}
                className="cursor-pointer p-3 transition-colors hover:bg-accent"
                onClick={() => setSelectedTaskId(task._id)}
                tabIndex={0}
                role="button"
                aria-label={`Ver tarefa: ${task.name}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault(); // Prevent page scroll on space
                    setSelectedTaskId(task._id);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "font-medium",
                      task.status === "DONE" &&
                        "text-muted-foreground line-through",
                    )}
                  >
                    {task.name}
                  </span>
                  <div
                    className={cn(
                      "rounded px-2 py-1 text-xs",
                      task.status === "TODO" && "bg-yellow-100 text-yellow-800",
                      task.status === "IN_PROGRESS" &&
                        "bg-blue-100 text-blue-800",
                      task.status === "DONE" && "bg-green-100 text-green-800",
                    )}
                  >
                    {statusLabels[task.status] || task.status}
                  </div>
                </div>
                {task.dueDate && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Prazo:{" "}
                    {task.dueDate
                      ? format(new Date(task.dueDate), "MMM d, yyyy")
                      : "Sem prazo"}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>

        <Button
          variant="ghost"
          className="mt-4 w-full border-2 border-dashed"
          onClick={() => setIsCreateTaskOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Tarefa
        </Button>

        <TaskDialog
          boardId={board._id}
          taskId={selectedTaskId ?? undefined}
          open={isCreateTaskOpen || !!selectedTaskId}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateTaskOpen(false);
              setSelectedTaskId(null);
            }
          }}
        />

        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          noteTitle={board.name}
          isDeleting={isDeleting}
        />
      </Card>
    </>
  );
}

export function BoardCardSkeleton() {
  return (
    <Card className="h-[480px] w-[300px] animate-pulse p-4">
      <div className="mb-4 h-6 w-2/3 rounded bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded bg-muted" />
        ))}
      </div>
    </Card>
  );
}
