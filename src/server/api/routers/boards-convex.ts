import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { api } from "../../../../convex/_generated/api";
import { TRPCError } from "@trpc/server";
import { Id } from "../../../../convex/_generated/dataModel";

const MAX_BOARDS = 50; // Prevent unlimited boards

export const boardsConvexRouter = createTRPCRouter({
  getBoards: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      // Get user from session
      const userEmail = ctx.session?.user?.email;
      if (!userEmail) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      // Get user ID from Convex
      const user = await ctx.convex.query(api.users.getByEmail, {
        email: userEmail,
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in database",
        });
      }

      try {
        const { cursor, limit } = input;

        const result = await ctx.convex.query(api.boards.getBoards, {
          userId: user._id,
          cursor: cursor ? (cursor as Id<"boards">) : undefined,
          limit,
        });

        return {
          boards: result.boards,
          nextCursor: result.isDone ? null : result.continueCursor,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch boards",
        });
      }
    }),

  createBoard: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        color: z.string().regex(/^#[0-9A-F]{6}$/i),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      // Get user from session
      const userEmail = ctx.session?.user?.email;
      if (!userEmail) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      // Get user ID from Convex
      const user = await ctx.convex.query(api.users.getByEmail, {
        email: userEmail,
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in database",
        });
      }

      try {
        const board = await ctx.convex.mutation(api.boards.createBoard, {
          name: input.name,
          color: input.color,
          userId: user._id,
        });

        return board;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Maximum board limit")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Maximum board limit reached",
            });
          }
          if (error.message.includes("Invalid color format")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid color format. Use hex format (#RRGGBB)",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create board",
        });
      }
    }),

  updateBoard: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
        name: z.string().min(1).max(100).optional(),
        color: z
          .string()
          .regex(/^#[0-9A-F]{6}$/i)
          .optional(),
        order: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get user from session
      const userEmail = ctx.session?.user?.email;
      if (!userEmail) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      // Get user ID from Convex
      const user = await ctx.convex.query(api.users.getByEmail, {
        email: userEmail,
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in database",
        });
      }

      try {
        const board = await ctx.convex.mutation(api.boards.updateBoard, {
          boardId: input.boardId as Id<"boards">,
          userId: user._id,
          name: input.name,
          color: input.color,
          order: input.order,
        });

        return board;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Board not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Board not found",
            });
          }
          if (error.message.includes("don't have permission")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You don't have permission to update this board",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to update board",
        });
      }
    }),

  deleteBoard: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      // Get user from session
      const userEmail = ctx.session?.user?.email;
      if (!userEmail) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      // Get user ID from Convex
      const user = await ctx.convex.query(api.users.getByEmail, {
        email: userEmail,
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in database",
        });
      }

      try {
        await ctx.convex.mutation(api.boards.deleteBoard, {
          boardId: input as Id<"boards">,
          userId: user._id,
        });

        return { success: true };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Board not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Board not found",
            });
          }
          if (error.message.includes("don't have permission")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You don't have permission to delete this board",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to delete board",
        });
      }
    }),

  getBoard: protectedProcedure
    .input(z.object({ boardId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      // Get user from session
      const userEmail = ctx.session?.user?.email;
      if (!userEmail) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      // Get user ID from Convex
      const user = await ctx.convex.query(api.users.getByEmail, {
        email: userEmail,
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in database",
        });
      }

      try {
        const board = await ctx.convex.query(api.boards.getBoard, {
          boardId: input.boardId as Id<"boards">,
          userId: user._id,
        });

        return board;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Board not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Board not found",
            });
          }
          if (error.message.includes("don't have permission")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You don't have permission to view this board",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch board",
        });
      }
    }),

  reorderBoards: protectedProcedure
    .input(
      z.object({
        boardIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      // Get user from session
      const userEmail = ctx.session?.user?.email;
      if (!userEmail) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      // Get user ID from Convex
      const user = await ctx.convex.query(api.users.getByEmail, {
        email: userEmail,
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found in database",
        });
      }

      try {
        await ctx.convex.mutation(api.boards.reorderBoards, {
          boardIds: input.boardIds as Id<"boards">[],
          userId: user._id,
        });

        return { success: true };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("don't have permission")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You don't have permission to reorder these boards",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to reorder boards",
        });
      }
    }),

  // Create task directly from board router (for convenience)
  createTask: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
        name: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        dueDate: z.string().optional(),
        reminderEnabled: z.boolean().optional(),
        reminderDateTime: z.string().optional(),
        reminderFrequency: z
          .enum(["ONCE", "DAILY", "WEEKLY", "MONTHLY"])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Parse date strings to timestamps
        const dueDate = input.dueDate
          ? new Date(input.dueDate).getTime()
          : undefined;
        const reminderDateTime = input.reminderDateTime
          ? new Date(input.reminderDateTime).getTime()
          : undefined;

        // Get user from session
        const userEmail = ctx.session?.user?.email;
        if (!userEmail) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        // Get user ID from Convex
        const user = await ctx.convex.query(api.users.getByEmail, {
          email: userEmail,
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found in database",
          });
        }

        const task = await ctx.convex.mutation(api.tasks.createTask, {
          boardId: input.boardId as Id<"boards">,
          userId: user._id,
          name: input.name,
          description: input.description,
          dueDate,
          reminderEnabled: input.reminderEnabled,
          reminderDateTime,
          reminderFrequency: input.reminderFrequency,
        });

        return task;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Board not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Board not found or you do not own it.",
            });
          }
          if (error.message.includes("reminder")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: error.message,
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create task",
        });
      }
    }),
});
