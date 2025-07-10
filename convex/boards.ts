import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all boards for the current user
 */
export const getBoards = query({
  args: {
    userId: v.id("users"),
    cursor: v.optional(v.id("boards")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const limit = args.limit ?? 10;
    const queryArgs: any = {
      userId: user._id,
    };

    if (args.cursor) {
      queryArgs.cursor = args.cursor;
    }

    const boards = await ctx.db
      .query("boards")
      .withIndex("by_user_order", (q) => q.eq("userId", user._id))
      .order("asc")
      .paginate({
        cursor: args.cursor ?? null,
        numItems: limit,
      });

    // Get tasks for each board
    const boardsWithTasks = await Promise.all(
      boards.page.map(async (board) => {
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_board_order", (q) => q.eq("boardId", board._id))
          .order("asc")
          .collect();

        return {
          ...board,
          tasks,
          _count: {
            tasks: tasks.length,
          },
        };
      }),
    );

    return {
      boards: boardsWithTasks,
      isDone: boards.isDone,
      continueCursor: boards.continueCursor,
    };
  },
});

/**
 * Create a new board
 */
export const createBoard = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Validate color format (hex color)
    const hexColorRegex = /^#[0-9A-F]{6}$/i;
    if (!hexColorRegex.test(args.color)) {
      throw new Error("Invalid color format. Use hex format (#RRGGBB)");
    }

    // Validate name length
    if (args.name.length < 1 || args.name.length > 100) {
      throw new Error("Board name must be between 1 and 100 characters");
    }

    // Check board limit (50 boards max)
    const boardCount = await ctx.db
      .query("boards")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    if (boardCount.length >= 50) {
      throw new Error("Maximum board limit reached (50 boards)");
    }

    // Get highest order for new board position
    const lastBoard = await ctx.db
      .query("boards")
      .withIndex("by_user_order", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    const newOrder = (lastBoard?.order ?? -1) + 1;

    const now = Date.now();
    const boardId = await ctx.db.insert("boards", {
      name: args.name,
      color: args.color,
      order: newOrder,
      userId: user._id,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(boardId);
  },
});

/**
 * Update a board
 */
export const updateBoard = mutation({
  args: {
    boardId: v.id("boards"),
    userId: v.id("users"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    if (board.userId !== user._id) {
      throw new Error("You don't have permission to update this board");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      if (args.name.length < 1 || args.name.length > 100) {
        throw new Error("Board name must be between 1 and 100 characters");
      }
      updates.name = args.name;
    }

    if (args.color !== undefined) {
      const hexColorRegex = /^#[0-9A-F]{6}$/i;
      if (!hexColorRegex.test(args.color)) {
        throw new Error("Invalid color format. Use hex format (#RRGGBB)");
      }
      updates.color = args.color;
    }

    if (args.order !== undefined) {
      updates.order = args.order;
    }

    await ctx.db.patch(args.boardId, updates);
    return await ctx.db.get(args.boardId);
  },
});

/**
 * Delete a board and all its tasks
 */
export const deleteBoard = mutation({
  args: {
    boardId: v.id("boards"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    if (board.userId !== user._id) {
      throw new Error("You don't have permission to delete this board");
    }

    // Delete all tasks in this board first
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_board_id", (q) => q.eq("boardId", args.boardId))
      .collect();

    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    // Delete the board
    await ctx.db.delete(args.boardId);
    return { success: true };
  },
});

/**
 * Get a specific board by ID
 */
export const getBoard = query({
  args: {
    boardId: v.id("boards"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    if (board.userId !== user._id) {
      throw new Error("You don't have permission to view this board");
    }

    return board;
  },
});

/**
 * Reorder boards
 */
export const reorderBoards = mutation({
  args: {
    boardIds: v.array(v.id("boards")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify all boards belong to the user
    const boards = await Promise.all(
      args.boardIds.map(async (boardId) => {
        const board = await ctx.db.get(boardId);
        if (!board || board.userId !== user._id) {
          throw new Error("You don't have permission to reorder these boards");
        }
        return board;
      }),
    );

    // Update order for each board
    await Promise.all(
      args.boardIds.map(async (boardId, index) => {
        await ctx.db.patch(boardId, {
          order: index,
          updatedAt: Date.now(),
        });
      }),
    );

    return { success: true };
  },
});
