"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { BoardCard, BoardCardSkeleton } from "./BoardCard";
import { CreateBoardDialog } from "./CreateBoardDialog";
import type { RouterOutputs } from "~/trpc/react";

type BoardsResponse = RouterOutputs["board"]["getBoards"];

export function BoardList() {
  const { data, hasNextPage, fetchNextPage, isFetching } =
    api.board.getBoards.useInfiniteQuery(
      { limit: 10 },
      {
        getNextPageParam: (lastPage: BoardsResponse) => {
          if (lastPage.nextCursor === false) return null;
          return lastPage.nextCursor ?? null;
        },
      },
    );

  const containerRef = useRef<HTMLDivElement>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Handle infinite scroll
  const handleScroll = () => {
    if (containerRef.current && hasNextPage && !isFetching) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (scrollHeight - (scrollTop + clientHeight) < 200) {
        void fetchNextPage();
      }
    }
  };

  const boards = data?.pages.flatMap((page) => page.boards) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Your Boards</h2>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Board
        </Button>
      </div>

      <div
        ref={containerRef}
        className="grid min-h-[calc(100vh-12rem)] grid-cols-1 gap-4 overflow-auto p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        onScroll={handleScroll}
      >
        <AnimatePresence>
          {boards.map((board, index) => (
            <motion.div
              key={board.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <BoardCard board={board} />
            </motion.div>
          ))}
        </AnimatePresence>

        {isFetching && (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <BoardCardSkeleton key={i} />
            ))}
          </>
        )}
      </div>

      <CreateBoardDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
