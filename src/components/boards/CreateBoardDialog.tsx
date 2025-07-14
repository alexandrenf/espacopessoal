"use client";

import { useState } from "react";
import type { RouterInputs } from "~/trpc/react";
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
import { cn } from "~/lib/utils";

interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CreateBoardInput = RouterInputs["boards"]["createBoard"];

const PASTEL_COLORS = [
  { hex: "#FFB3BA", name: "Rosa Pastel" },
  { hex: "#BAFFC9", name: "Verde Pastel" },
  { hex: "#BAE1FF", name: "Azul Pastel" },
  { hex: "#FFFFBA", name: "Amarelo Pastel" },
  { hex: "#FFD1DC", name: "Rosa Claro" },
  { hex: "#E0FFE0", name: "Verde Claro" },
  { hex: "#B5D8EB", name: "Azul Claro" },
  { hex: "#FFE4B5", name: "Laranja Pastel" },
  { hex: "#D8BFD8", name: "Roxo Pastel" },
  { hex: "#F0F8FF", name: "Azul Claro do Céu" },
];

export function CreateBoardDialog({
  open,
  onOpenChange,
}: CreateBoardDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PASTEL_COLORS[0]?.hex ?? "#FFB3BA");
  const utils = api.useUtils();

  const { mutate: createBoard, isPending } = api.boards.createBoard.useMutation(
    {
      onMutate: async (_newBoard: CreateBoardInput) => {
        await utils.boards.getBoards.cancel();
        const prevData = utils.boards.getBoards.getInfiniteData({ limit: 10 });
        onOpenChange(false);
        return { prevData };
      },
      onError: (_error: unknown, _variables: unknown, context: unknown) => {
        if (context && typeof context === "object" && "prevData" in context) {
          utils.boards.getBoards.setInfiniteData(
            { limit: 10 },
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
            () => (context as any).prevData,
          );
        }
      },
      onSettled: () => {
        void utils.boards.getBoards.invalidate();
      },
    },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Quadro</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite o nome do quadro"
            />
          </div>
          <div className="grid gap-2">
            <Label>Cor</Label>
            <div className="grid grid-cols-5 gap-2">
              {PASTEL_COLORS.map((pastelColor) => (
                <button
                  key={pastelColor.hex}
                  type="button"
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-all",
                    color === pastelColor.hex
                      ? "scale-110 border-gray-900"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{ backgroundColor: pastelColor.hex }}
                  onClick={() => setColor(pastelColor.hex)}
                  title={pastelColor.name}
                />
              ))}
            </div>
          </div>
          <Button
            onClick={() => createBoard({ name, color })}
            disabled={isPending || !name}
          >
            Criar Quadro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
