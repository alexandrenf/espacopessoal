import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a scheduled notification
 */
export const createScheduledNotification = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    scheduledFor: v.number(),
    fcmToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate title and body
    if (args.title.length < 1 || args.title.length > 200) {
      throw new Error(
        "Notification title must be between 1 and 200 characters",
      );
    }

    if (args.body.length < 1 || args.body.length > 500) {
      throw new Error("Notification body must be between 1 and 500 characters");
    }

    // Ensure scheduled time is in the future
    if (args.scheduledFor <= Date.now()) {
      throw new Error("Scheduled time must be in the future");
    }

    // Validate FCM token format (basic validation)
    if (!args.fcmToken || args.fcmToken.length < 10) {
      throw new Error("Invalid FCM token");
    }

    const now = Date.now();
    const notificationId = await ctx.db.insert("scheduledNotifications", {
      userId: args.userId,
      title: args.title,
      body: args.body,
      url: args.url,
      scheduledFor: args.scheduledFor,
      fcmToken: args.fcmToken,
      sent: false,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(notificationId);
  },
});

/**
 * Get scheduled notifications for the current user
 */
export const getScheduledNotifications = query({
  args: {
    userId: v.id("users"),
    cursor: v.optional(v.id("scheduledNotifications")),
    limit: v.optional(v.number()),
    includeSent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const includeSent = args.includeSent ?? false;

    let query = ctx.db
      .query("scheduledNotifications")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .order("desc");

    if (!includeSent) {
      query = query.filter((q) => q.eq(q.field("sent"), false));
    }

    const notifications = await query.paginate({
      cursor: args.cursor ?? null,
      numItems: limit,
    });

    return {
      notifications: notifications.page,
      isDone: notifications.isDone,
      continueCursor: notifications.continueCursor,
    };
  },
});

/**
 * Get pending notifications (scheduled but not sent)
 */
export const getPendingNotifications = query({
  args: {
    userId: v.id("users"),
    beforeTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const timestamp = args.beforeTimestamp ?? Date.now();

    const notifications = await ctx.db
      .query("scheduledNotifications")
      .withIndex("by_pending", (q) =>
        q.eq("sent", false).lte("scheduledFor", timestamp),
      )
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    return notifications;
  },
});

/**
 * Mark a notification as sent
 */
export const markNotificationAsSent = mutation({
  args: {
    userId: v.id("users"),
    notificationId: v.id("scheduledNotifications"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    // Validate user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (notification.userId !== args.userId) {
      throw new Error("You don't have permission to update this notification");
    }

    await ctx.db.patch(args.notificationId, {
      sent: true,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.notificationId);
  },
});

/**
 * Update a scheduled notification
 */
export const updateScheduledNotification = mutation({
  args: {
    userId: v.id("users"),
    notificationId: v.id("scheduledNotifications"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    url: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
    fcmToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    // Validate user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (notification.userId !== args.userId) {
      throw new Error("You don't have permission to update this notification");
    }

    if (notification.sent) {
      throw new Error(
        "Cannot update a notification that has already been sent",
      );
    }

    const updates: {
      updatedAt: number;
      title?: string;
      body?: string;
      url?: string;
      scheduledFor?: number;
      fcmToken?: string;
    } = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      if (args.title.length < 1 || args.title.length > 200) {
        throw new Error(
          "Notification title must be between 1 and 200 characters",
        );
      }
      updates.title = args.title;
    }

    if (args.body !== undefined) {
      if (args.body.length < 1 || args.body.length > 500) {
        throw new Error(
          "Notification body must be between 1 and 500 characters",
        );
      }
      updates.body = args.body;
    }

    if (args.url !== undefined) {
      updates.url = args.url;
    }

    if (args.scheduledFor !== undefined) {
      if (args.scheduledFor <= Date.now()) {
        throw new Error("Scheduled time must be in the future");
      }
      updates.scheduledFor = args.scheduledFor;
    }

    if (args.fcmToken !== undefined) {
      if (!args.fcmToken || args.fcmToken.length < 10) {
        throw new Error("Invalid FCM token");
      }
      updates.fcmToken = args.fcmToken;
    }

    await ctx.db.patch(args.notificationId, updates);
    return await ctx.db.get(args.notificationId);
  },
});

/**
 * Delete a scheduled notification
 */
export const deleteScheduledNotification = mutation({
  args: {
    userId: v.id("users"),
    notificationId: v.id("scheduledNotifications"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    // Validate user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (notification.userId !== args.userId) {
      throw new Error("You don't have permission to delete this notification");
    }

    await ctx.db.delete(args.notificationId);
    return { success: true };
  },
});

/**
 * Get notification by ID
 */
export const getNotification = query({
  args: {
    userId: v.id("users"),
    notificationId: v.id("scheduledNotifications"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    // Validate user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (notification.userId !== args.userId) {
      throw new Error("You don't have permission to view this notification");
    }

    return notification;
  },
});

/**
 * Create task reminder notification
 */
export const createTaskReminderNotification = mutation({
  args: {
    userId: v.id("users"),
    taskId: v.id("tasks"),
    scheduledFor: v.number(),
    fcmToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get task details
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.userId !== args.userId) {
      throw new Error(
        "You don't have permission to create reminders for this task",
      );
    }

    // Get board details for context
    const board = await ctx.db.get(task.boardId);
    const boardName = board?.name ?? "Unknown Board";

    const title = `Task Reminder: ${task.name}`;
    const body = `Don't forget about "${task.name}" in ${boardName}`;
    const url = `/boards/${task.boardId}?taskId=${args.taskId}`;

    return await ctx.db.insert("scheduledNotifications", {
      userId: args.userId,
      title,
      body,
      url,
      scheduledFor: args.scheduledFor,
      fcmToken: args.fcmToken,
      sent: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get all pending notifications across all users (for system-level processing)
 * This is for background job processing
 */
export const getAllPendingNotifications = query({
  args: {
    beforeTimestamp: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const timestamp = args.beforeTimestamp ?? Date.now();
    const limit = args.limit ?? 100;

    const notifications = await ctx.db
      .query("scheduledNotifications")
      .withIndex("by_pending", (q) =>
        q.eq("sent", false).lte("scheduledFor", timestamp),
      )
      .take(limit);

    return notifications;
  },
});

/**
 * Batch mark notifications as sent (for system-level processing)
 */
export const batchMarkNotificationsAsSent = mutation({
  args: {
    notificationIds: v.array(v.id("scheduledNotifications")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await Promise.all(
      args.notificationIds.map(async (notificationId) => {
        await ctx.db.patch(notificationId, {
          sent: true,
          updatedAt: now,
        });
      }),
    );

    return { success: true, updatedCount: args.notificationIds.length };
  },
});
