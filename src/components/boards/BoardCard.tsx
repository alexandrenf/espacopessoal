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
import { CreateTaskDialog } from "~/components/tasks/CreateTaskDialog";
import { TaskDialog } from "../tasks/TaskDialog";
import { cn } from "~/lib/utils";

type Board = RouterOutputs["board"]["getBoards"]["boards"][number];

interface BoardCardProps {
  board: Board;
}

export function BoardCard({ board }: BoardCardProps) {
  const utils = api.useUtils();
  const { mutate: deleteBoard } = api.board.deleteBoard.useMutation({
    onMutate: async (_deletedBoardId) => {
      await utils.board.getBoards.cancel();
      // Store previous data for potential rollback
      utils.board.getBoards.getInfiniteData();
      // ... rest of delete mutation logic
    }
  });

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  return (
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
            <DropdownMenuItem onClick={() => deleteBoard(board.id)}>
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
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  "font-medium",
                  task.status === "DONE" && "line-through text-muted-foreground"
                )}>
                  {task.name}
                </span>
                <div 
                  className={`px-2 py-1 rounded text-xs ${
                    task.status === 'TODO' ? 'bg-yellow-100 text-yellow-800' :
                    task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}
                >
                  {task.status}
                </div>
              </div>
              {task.dueDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Due: {new Date(task.dueDate).toLocaleDateString()}
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

      <CreateTaskDialog
        boardId={board.id}
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
      />

      {selectedTaskId && (
        <TaskDialog
          taskId={selectedTaskId}
          boardId={board.id}
          open={!!selectedTaskId}
          onOpenChange={(open) => !open && setSelectedTaskId(null)}
        />
      )}
    </Card>
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