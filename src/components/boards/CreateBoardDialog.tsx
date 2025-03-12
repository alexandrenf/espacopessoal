"use client";

import { useState } from "react";
import type { RouterOutputs, RouterInputs } from "~/trpc/react";
import { ChromePicker } from "react-color";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";
import type { InfiniteData } from "@tanstack/react-query";
import type { TRPCClientErrorLike } from "@trpc/client";

interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Board = RouterOutputs["board"]["getBoards"]["boards"][number];
type CreateBoardInput = RouterInputs["board"]["createBoard"];
type BoardsResponse = RouterOutputs["board"]["getBoards"];

export function CreateBoardDialog({ open, onOpenChange }: CreateBoardDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#4F46E5");
  const utils = api.useUtils();

  const { mutate: createBoard, isPending } = api.board.createBoard.useMutation({
    onMutate: async (newBoard: CreateBoardInput) => {
      await utils.board.getBoards.cancel();

      const prevData = utils.board.getBoards.getInfiniteData({ limit: 10 });

      utils.board.getBoards.setInfiniteData(
        { limit: 10 },
        (old: InfiniteData<BoardsResponse, string | null> | undefined) => {
          if (!old) return { pages: [], pageParams: [] as (string | null)[] };

          return {
            ...old,
            pages: old.pages.map((page, index) => {
              if (index === 0) {
                const optimisticBoard: Board = {
                  id: `temp-${Date.now()}`,
                  name: newBoard.name,
                  color: newBoard.color,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  userId: "", // Will be replaced with actual value on server
                  order: 0,
                  tasks: [],
                  _count: { tasks: 0 },
                };
                
                return {
                  ...page,
                  boards: [optimisticBoard, ...page.boards],
                };
              }
              return page;
            }),
            pageParams: old.pageParams,
          };
        }
      );

      onOpenChange(false);
      return { prevData };
    },
    onError: (
      error,
      _variables,
      context
    ) => {
      if (context?.prevData) {
        utils.board.getBoards.setInfiniteData(
          { limit: 10 },
          () => context.prevData
        );
      }
    },
    onSettled: () => {
      void utils.board.getBoards.invalidate();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Board</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter board name"
            />
          </div>
          <div className="grid gap-2">
            <Label>Color</Label>
            <ChromePicker
              color={color}
              onChange={(color) => setColor(color.hex)}
              className="w-full"
            />
          </div>
          <Button
            onClick={() => createBoard({ name, color })}
            disabled={isPending || !name}
          >
            Create Board
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}