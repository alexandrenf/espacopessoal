import { api } from "~/trpc/react";
import { motion } from "framer-motion";
import { Settings, MoreVertical } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { RouterOutputs } from "~/trpc/react";

type Board = RouterOutputs["board"]["getBoards"]["boards"][number];

interface BoardCardProps {
  board: Board;
}

export function BoardCard({ board }: BoardCardProps) {
  const utils = api.useUtils();
  const { mutate: deleteBoard } = api.board.deleteBoard.useMutation({
    onMutate: async (deletedBoardId) => {
      // Cancel outgoing fetches
      await utils.board.getBoards.cancel();

      // Get current data
      const prevData = utils.board.getBoards.getInfiniteData();

      // Optimistically remove the board
      utils.board.getBoards.setInfiniteData(
        { limit: 10 },
        (old) => {
          if (!old) return { pages: [], pageParams: [] };
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              boards: page.boards.filter((b) => b.id !== deletedBoardId),
            })),
          };
        }
      );

      return { prevData };
    },
    onError: (err, newBoard, context) => {
      // Restore previous data on error
      if (context?.prevData) {
        utils.board.getBoards.setInfiniteData(
          { limit: 10 },
          context.prevData
        );
      }
    },
  });

  return (
    <Card
      className="relative flex h-40 w-64 flex-col justify-between p-4"
      style={{ backgroundColor: board.color + "10" }}
    >
      <div className="absolute right-2 top-2">
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

      <div>
        <h3 className="font-semibold">{board.name}</h3>
        <p className="text-sm text-muted-foreground">
          {board._count.tasks} tasks
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" size="sm">
          View Tasks
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

export function BoardCardSkeleton() {
  return (
    <Card className="h-40 w-64 p-4 animate-pulse">
      <div className="h-4 w-24 bg-muted rounded" />
      <div className="mt-2 h-3 w-16 bg-muted rounded" />
      <div className="mt-auto flex justify-between">
        <div className="h-8 w-20 bg-muted rounded" />
        <div className="h-8 w-8 bg-muted rounded" />
      </div>
    </Card>
  );
}