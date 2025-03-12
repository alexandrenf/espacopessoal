import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const taskRouter = createTRPCRouter({
  getTasks: protectedProcedure
    .input(z.object({
      boardId: z.string(),
      cursor: z.string().nullish(),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { boardId, cursor, limit } = input;
      
      // Fetch tasks with optimized query
      const tasks = await ctx.db.task.findMany({
        where: { 
          boardId,
          userId: ctx.session.user.id,
        },
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { order: 'asc' },
        // Only fetch needed fields
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          order: true,
          dueDate: true,
          reminderEnabled: true,
          reminderDateTime: true,
          reminderFrequency: true,
        },
      });

      const hasMore = tasks.length > limit;
      const nextCursor = hasMore && tasks.length > 0 ? tasks[limit - 1]?.id : undefined;

      return {
        tasks: tasks.slice(0, limit),
        nextCursor,
      };
    }),

  createTask: protectedProcedure
    .input(z.object({
      boardId: z.string(),
      name: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      dueDate: z.date().optional(),
      reminderEnabled: z.boolean().default(false),
      reminderDateTime: z.date().optional(),
      reminderFrequency: z.enum(['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify board ownership in the same query
      const lastTask = await ctx.db.task.findFirst({
        where: { 
          boardId: input.boardId,
          userId: ctx.session.user.id,
        },
        orderBy: { order: 'desc' },
        select: { order: true },
      });

      return ctx.db.task.create({
        data: {
          ...input,
          order: (lastTask?.order ?? -1) + 1,
          userId: ctx.session.user.id,
        },
      });
    }),
});