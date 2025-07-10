import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { api } from "../../../../convex/_generated/api";
import { TRPCError } from "@trpc/server";
import { Id } from "../../../../convex/_generated/dataModel";

export const tasksConvexRouter = createTRPCRouter({
  getTasks: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(50).default(20),
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
        const { boardId, cursor, limit } = input;

        const result = await ctx.convex.query(api.tasks.getTasks, {
          boardId: boardId as Id<"boards">,
          userId: user._id,
          cursor: cursor ? (cursor as Id<"tasks">) : undefined,
          limit,
        });

        return {
          tasks: result.tasks,
          nextCursor: result.isDone ? null : result.continueCursor,
        };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Board not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message:
                "Board not found or you don't have permission to view it",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch tasks",
        });
      }
    }),

  createTask: protectedProcedure
    .input(
      z
        .object({
          boardId: z.string(),
          name: z.string().min(1).max(200),
          description: z.string().max(2000).optional(),
          dueDate: z.date().optional(),
          reminderEnabled: z.boolean().default(false),
          reminderDateTime: z.string().optional(),
          reminderFrequency: z
            .enum(["ONCE", "DAILY", "WEEKLY", "MONTHLY"])
            .optional(),
        })
        .refine(
          (data) => {
            // If reminder is enabled, both datetime and frequency are required
            if (data.reminderEnabled) {
              if (!data.reminderDateTime) {
                return false;
              }
              if (!data.reminderFrequency) {
                return false;
              }
              // Validate date format
              const reminderDate = new Date(data.reminderDateTime);
              if (isNaN(reminderDate.getTime())) {
                return false;
              }
              // Ensure reminder is in the future
              if (reminderDate <= new Date()) {
                return false;
              }
            }
            return true;
          },
          {
            message:
              "When reminder is enabled, both valid reminder date/time (in the future) and frequency are required",
            path: ["reminderDateTime"],
          },
        ),
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
        // Convert dates to timestamps
        const dueDate = input.dueDate ? input.dueDate.getTime() : undefined;
        const reminderDateTime = input.reminderDateTime
          ? new Date(input.reminderDateTime).getTime()
          : undefined;

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

  getTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
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
        const task = await ctx.convex.query(api.tasks.getTask, {
          taskId: input.taskId as Id<"tasks">,
          userId: user._id,
        });

        return task;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Task not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Task not found",
            });
          }
          if (error.message.includes("don't have permission")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You don't have permission to view this task",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch task",
        });
      }
    }),

  updateTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(2000).optional(),
        status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
        dueDate: z
          .string()
          .optional()
          .refine((val) => !val || !isNaN(Date.parse(val)), {
            message: "Invalid date format for dueDate",
          }),
        reminderEnabled: z.boolean().optional(),
        reminderDateTime: z
          .string()
          .optional()
          .refine((val) => !val || !isNaN(Date.parse(val)), {
            message: "Invalid date format for reminderDateTime",
          })
          .refine(
            (val) => {
              if (!val) return true;
              const reminderDate = new Date(val);
              return reminderDate > new Date();
            },
            { message: "Reminder date must be in the future" },
          ),
        reminderFrequency: z
          .enum(["ONCE", "DAILY", "WEEKLY", "MONTHLY"])
          .optional(),
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
        // Convert date strings to timestamps
        const dueDate = input.dueDate
          ? new Date(input.dueDate).getTime()
          : undefined;
        const reminderDateTime = input.reminderDateTime
          ? new Date(input.reminderDateTime).getTime()
          : undefined;

        const task = await ctx.convex.mutation(api.tasks.updateTask, {
          taskId: input.taskId as Id<"tasks">,
          userId: user._id,
          name: input.name,
          description: input.description,
          status: input.status,
          dueDate,
          reminderEnabled: input.reminderEnabled,
          reminderDateTime,
          reminderFrequency: input.reminderFrequency,
        });

        return task;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Task not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Task not found",
            });
          }
          if (error.message.includes("don't have permission")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You don't have permission to update this task",
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
            error instanceof Error ? error.message : "Failed to update task",
        });
      }
    }),

  toggleComplete: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        boardId: z.string(),
        completed: z.boolean(),
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
        const task = await ctx.convex.mutation(api.tasks.toggleComplete, {
          taskId: input.taskId as Id<"tasks">,
          userId: user._id,
          completed: input.completed,
        });

        return task;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Task not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Task not found",
            });
          }
          if (error.message.includes("don't have permission")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You don't have permission to update this task",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to toggle task completion",
        });
      }
    }),

  deleteTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        boardId: z.string(),
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
        await ctx.convex.mutation(api.tasks.deleteTask, {
          taskId: input.taskId as Id<"tasks">,
          userId: user._id,
        });

        return { success: true };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Task not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message:
                "Task not found or you don't have permission to delete it",
            });
          }
          if (error.message.includes("don't have permission")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You don't have permission to delete this task",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to delete task",
        });
      }
    }),

  reorderTasks: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
        taskIds: z.array(z.string()),
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
        await ctx.convex.mutation(api.tasks.reorderTasks, {
          boardId: input.boardId as Id<"boards">,
          userId: user._id,
          taskIds: input.taskIds as Id<"tasks">[],
        });

        return { success: true };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("don't have permission")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You don't have permission to reorder these tasks",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to reorder tasks",
        });
      }
    }),

  getTasksByDueDate: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
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
        const tasks = await ctx.convex.query(api.tasks.getTasksByDueDate, {
          userId: user._id,
          startDate: input.startDate.getTime(),
          endDate: input.endDate.getTime(),
        });

        return tasks;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch tasks by due date",
        });
      }
    }),

  getTasksWithReminders: protectedProcedure
    .input(z.object({}))
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
        const tasks = await ctx.convex.query(
          api.tasks.getTasksWithReminders,
          {
            userId: user._id,
          },
        );

        return tasks;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch tasks with reminders",
        });
      }
    }),
});
