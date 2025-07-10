import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all tasks for a specific board
 */
export const getTasks = query({
  args: {
    boardId: v.id("boards"),
    userId: v.id("users"),
    cursor: v.optional(v.id("tasks")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify board belongs to user
    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== user._id) {
      throw new Error(
        "Board not found or you don't have permission to view it",
      );
    }

    const limit = args.limit ?? 20;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_board_order", (q) => q.eq("boardId", args.boardId))
      .order("asc")
      .paginate({
        cursor: args.cursor ?? null,
        numItems: limit,
      });

    return {
      tasks: tasks.page,
      isDone: tasks.isDone,
      continueCursor: tasks.continueCursor,
    };
  },
});

/**
 * Create a new task
 */
export const createTask = mutation({
  args: {
    boardId: v.id("boards"),
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    reminderEnabled: v.optional(v.boolean()),
    reminderDateTime: v.optional(v.number()),
    reminderFrequency: v.optional(
      v.union(
        v.literal("ONCE"),
        v.literal("DAILY"),
        v.literal("WEEKLY"),
        v.literal("MONTHLY"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify board belongs to user
    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== user._id) {
      throw new Error(
        "Board not found or you don't have permission to add tasks to it",
      );
    }

    // Validate task name
    if (args.name.length < 1 || args.name.length > 200) {
      throw new Error("Task name must be between 1 and 200 characters");
    }

    // Validate description length
    if (args.description && args.description.length > 2000) {
      throw new Error("Task description cannot exceed 2000 characters");
    }

    // Validate reminder settings
    const reminderEnabled = args.reminderEnabled ?? false;
    if (reminderEnabled) {
      if (!args.reminderDateTime || !args.reminderFrequency) {
        throw new Error(
          "When reminder is enabled, both reminder date/time and frequency are required",
        );
      }

      // Ensure reminder is in the future
      if (args.reminderDateTime <= Date.now()) {
        throw new Error("Reminder date must be in the future");
      }
    }

    // Get the last task order for positioning
    const lastTask = await ctx.db
      .query("tasks")
      .withIndex("by_board_order", (q) => q.eq("boardId", args.boardId))
      .order("desc")
      .first();

    const newOrder = (lastTask?.order ?? -1) + 1;

    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      boardId: args.boardId,
      userId: user._id,
      name: args.name,
      description: args.description,
      status: "TODO",
      order: newOrder,
      dueDate: args.dueDate,
      reminderEnabled,
      reminderDateTime: args.reminderDateTime,
      reminderFrequency: args.reminderFrequency,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(taskId);
  },
});

/**
 * Get a specific task by ID
 */
export const getTask = query({
  args: {
    taskId: v.id("tasks"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.userId !== user._id) {
      throw new Error("You don't have permission to view this task");
    }

    return task;
  },
});

/**
 * Update a task
 */
export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("TODO"), v.literal("IN_PROGRESS"), v.literal("DONE")),
    ),
    dueDate: v.optional(v.number()),
    reminderEnabled: v.optional(v.boolean()),
    reminderDateTime: v.optional(v.number()),
    reminderFrequency: v.optional(
      v.union(
        v.literal("ONCE"),
        v.literal("DAILY"),
        v.literal("WEEKLY"),
        v.literal("MONTHLY"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.userId !== user._id) {
      throw new Error("You don't have permission to update this task");
    }

    const updates: Partial<{
      name?: string;
      description?: string;
      status?: "TODO" | "IN_PROGRESS" | "DONE";
      dueDate?: number;
      reminderEnabled?: boolean;
      reminderDateTime?: number;
      reminderFrequency?: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY";
      updatedAt: number;
    }> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      if (args.name.length < 1 || args.name.length > 200) {
        throw new Error("Task name must be between 1 and 200 characters");
      }
      updates.name = args.name;
    }

    if (args.description !== undefined) {
      if (args.description.length > 2000) {
        throw new Error("Task description cannot exceed 2000 characters");
      }
      updates.description = args.description;
    }

    if (args.status !== undefined) {
      updates.status = args.status;
    }

    if (args.dueDate !== undefined) {
      updates.dueDate = args.dueDate;
    }

    if (args.reminderEnabled !== undefined) {
      updates.reminderEnabled = args.reminderEnabled;

      // Validate reminder settings
      if (args.reminderEnabled) {
        const reminderDateTime = args.reminderDateTime ?? task.reminderDateTime;
        const reminderFrequency =
          args.reminderFrequency ?? task.reminderFrequency;

        if (!reminderDateTime || !reminderFrequency) {
          throw new Error(
            "When reminder is enabled, both reminder date/time and frequency are required",
          );
        }

        if (reminderDateTime <= Date.now()) {
          throw new Error("Reminder date must be in the future");
        }
      }
    }

    if (args.reminderDateTime !== undefined) {
      if (args.reminderDateTime <= Date.now()) {
        throw new Error("Reminder date must be in the future");
      }
      updates.reminderDateTime = args.reminderDateTime;
    }

    if (args.reminderFrequency !== undefined) {
      updates.reminderFrequency = args.reminderFrequency;
    }

    await ctx.db.patch(args.taskId, updates);
    return await ctx.db.get(args.taskId);
  },
});

/**
 * Toggle task completion status
 */
export const toggleComplete = mutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.id("users"),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.userId !== user._id) {
      throw new Error("You don't have permission to update this task");
    }

    const newStatus = args.completed ? "DONE" : "TODO";
    await ctx.db.patch(args.taskId, {
      status: newStatus,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.taskId);
  },
});

/**
 * Delete a task
 */
export const deleteTask = mutation({
  args: {
    taskId: v.id("tasks"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.userId !== user._id) {
      throw new Error("You don't have permission to delete this task");
    }

    await ctx.db.delete(args.taskId);
    return { success: true };
  },
});

/**
 * Reorder tasks within a board
 */
export const reorderTasks = mutation({
  args: {
    boardId: v.id("boards"),
    userId: v.id("users"),
    taskIds: v.array(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify board belongs to user
    const board = await ctx.db.get(args.boardId);
    if (!board || board.userId !== user._id) {
      throw new Error(
        "Board not found or you don't have permission to reorder tasks",
      );
    }

    // Verify all tasks belong to the user and the board
    await Promise.all(
      args.taskIds.map(async (taskId) => {
        const task = await ctx.db.get(taskId);
        if (
          !task ||
          task.userId !== user._id ||
          task.boardId !== args.boardId
        ) {
          throw new Error("You don't have permission to reorder these tasks");
        }
        return task;
      }),
    );

    // Update order for each task
    await Promise.all(
      args.taskIds.map(async (taskId, index) => {
        await ctx.db.patch(taskId, {
          order: index,
          updatedAt: Date.now(),
        });
      }),
    );

    return { success: true };
  },
});

/**
 * Get tasks by due date (for reminder system)
 */
export const getTasksByDueDate = query({
  args: {
    userId: v.id("users"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_due_date", (q) =>
        q.gte("dueDate", args.startDate).lte("dueDate", args.endDate),
      )
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    return tasks;
  },
});

/**
 * Get tasks with active reminders
 */
export const getTasksWithReminders = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("reminderEnabled"), true))
      .collect();

    return tasks;
  },
});
