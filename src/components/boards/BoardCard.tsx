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
import { format, isValid, parseISO } from "date-fns";

type Board = RouterOutputs["board"]["getBoards"]["boards"][number];

interface BoardCardProps {
  board: Board;
}

export function BoardCard({ board }: BoardCardProps) {
  const utils = api.useUtils();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { mutate: deleteBoard, isPending: isDeleting } = api.board.deleteBoard.useMutation({
    onMutate: async (deletedBoardId) => {
      // Cancel any outgoing refetches
      await utils.board.getBoards.cancel();
      
      // Snapshot the previous value
      const previousBoards = utils.board.getBoards.getInfiniteData({ limit: 10 });
      
      // Optimistically update the cache
      utils.board.getBoards.setInfiniteData(
        { limit: 10 }, // Must match the query params used in BoardList
        (old) => {
          if (!old) return { pages: [], pageParams: [] };
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              boards: page.boards.filter(board => board.id !== deletedBoardId)
            }))
          };
        }
      );
      
      // Return context for potential rollback
      return { previousBoards };
    },
    onError: (_err, _deletedBoardId, context) => {
      // Restore previous data if mutation fails
      if (context?.previousBoards) {
        utils.board.getBoards.setInfiniteData({ limit: 10 }, context.previousBoards);
      }
    },
    onSettled: () => {
      // Invalidate and refetch after mutation settles
      void utils.board.getBoards.invalidate();
    }
  });

  const handleDeleteConfirm = () => {
    deleteBoard(board.id);
    setIsDeleteModalOpen(false);
  };

  const formatDueDate = (dateString: string) => {
    const date = parseISO(dateString);
    return isValid(date) ? format(date, 'MMM d, yyyy') : 'Invalid date';
  };

  return (
    <>
      <Card className="relative flex flex-col w-[300px] h-[480px] p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
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
                Delete Board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ScrollArea className="flex-grow">
          <div className="space-y-2">
            {board.tasks.map((task) => (
              <Card 
                key={task.id} 
                className="p-3 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setSelectedTaskId(task.id)}
                tabIndex={0}
                role="button"
                aria-label={`View task: ${task.name}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault(); // Prevent page scroll on space
                    setSelectedTaskId(task.id);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "font-medium",
                    task.status === "DONE" && "line-through text-muted-foreground"
                  )}>
                    {task.name}
                  </span>
                  <div 
                    className={cn(
                      "px-2 py-1 rounded text-xs",
                      task.status === "TODO" && "bg-yellow-100 text-yellow-800",
                      task.status === "IN_PROGRESS" && "bg-blue-100 text-blue-800",
                      task.status === "DONE" && "bg-green-100 text-green-800"
                    )}
                  >
                    {task.status}
                  </div>
                </div>
                {task.dueDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Due: {task.dueDate ? format(task.dueDate, 'MMM d, yyyy') : 'No due date'}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>

        <Button 
          variant="ghost" 
          className="w-full mt-4 border-2 border-dashed"
          onClick={() => setIsCreateTaskOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>

        <TaskDialog
          boardId={board.id}
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
    <Card className="w-[300px] h-[480px] p-4 animate-pulse">
      <div className="h-6 bg-muted rounded w-2/3 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded" />
        ))}
      </div>
    </Card>
  );
}