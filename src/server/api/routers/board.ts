import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const MAX_BOARDS = 50; // Prevent unlimited boards

export const boardRouter = createTRPCRouter({
  getBoards: protectedProcedure
    .input(z.object({
      cursor: z.string().nullish(),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const { cursor, limit } = input;
      
      // Fetch boards with tasks in a single query
      const boards = await ctx.db.board.findMany({
        where: { userId: ctx.session.user.id },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { order: 'asc' },
        include: {
          tasks: {
            orderBy: { order: 'asc' },
            // Only fetch essential task data initially
            select: {
              id: true,
              name: true,
              status: true,
              order: true,
              dueDate: true,
              reminderEnabled: true,
            },
          },
          _count: {
            select: { tasks: true }
          }
        },
      });

      const hasMore = boards.length > limit;
      const nextCursor = hasMore && boards[limit - 1]?.id;

      return {
        boards: boards.slice(0, limit),
        nextCursor,
      };
    }),

  createBoard: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      color: z.string().regex(/^#[0-9A-F]{6}$/i),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check board limit
      const boardCount = await ctx.db.board.count({
        where: { userId: ctx.session.user.id }
      });

      if (boardCount >= MAX_BOARDS) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Maximum board limit reached',
        });
      }

      // Get highest order
      const lastBoard = await ctx.db.board.findFirst({
        where: { userId: ctx.session.user.id },
        orderBy: { order: 'desc' },
        select: { order: true },
      });

      return ctx.db.board.create({
        data: {
          name: input.name,
          color: input.color,
          order: (lastBoard?.order ?? -1) + 1,
          userId: ctx.session.user.id,
        },
      });
    }),

  deleteBoard: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const board = await ctx.db.board.findFirst({
        where: {
          id: input,
          userId: ctx.session.user.id,
        },
      });

      if (!board) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Board not found or you don't have permission to delete it",
        });
      }

      return ctx.db.board.delete({
        where: { id: input },
      });
    }),
});
