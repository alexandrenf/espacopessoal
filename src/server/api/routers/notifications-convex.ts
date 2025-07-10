import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { api } from "../../../../convex/_generated/api";
import { TRPCError } from "@trpc/server";
import type { Id } from "../../../../convex/_generated/dataModel";

export const notificationsConvexRouter = createTRPCRouter({
  getScheduledNotifications: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(50).default(20),
        includesSent: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        const { cursor, limit, includesSent } = input;

        const result = await ctx.convex.query(
          api.scheduledNotifications.getScheduledNotifications,
          {
            userId: ctx.session.user.id as Id<"users">,
            cursor: cursor
              ? (cursor as Id<"scheduledNotifications">)
              : undefined,
            limit,
            includesSent,
          },
        );

        return {
          notifications: result.notifications,
          nextCursor: result.isDone ? null : result.continueCursor,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch scheduled notifications",
        });
      }
    }),

  createScheduledNotification: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        body: z.string().min(1).max(500),
        url: z.string().optional(),
        scheduledFor: z.date(),
        fcmToken: z.string().min(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        const notification = await ctx.convex.mutation(
          api.scheduledNotifications.createScheduledNotification,
          {
            userId: ctx.session.user.id as Id<"users">,
            title: input.title,
            body: input.body,
            url: input.url,
            scheduledFor: input.scheduledFor.getTime(),
            fcmToken: input.fcmToken,
          },
        );

        return notification;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Scheduled time must be in the future")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Scheduled time must be in the future",
            });
          }
          if (error.message.includes("Invalid FCM token")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid FCM token",
            });
          }
          if (
            error.message.includes("title must be") ||
            error.message.includes("body must be")
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: error.message,
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create scheduled notification",
        });
      }
    }),

  updateScheduledNotification: protectedProcedure
    .input(
      z.object({
        notificationId: z.string(),
        title: z.string().min(1).max(200).optional(),
        body: z.string().min(1).max(500).optional(),
        url: z.string().optional(),
        scheduledFor: z.date().optional(),
        fcmToken: z.string().min(10).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        const notification = await ctx.convex.mutation(
          api.scheduledNotifications.updateScheduledNotification,
          {
            userId: ctx.session.user.id as Id<"users">,
            notificationId:
              input.notificationId as Id<"scheduledNotifications">,
            title: input.title,
            body: input.body,
            url: input.url,
            scheduledFor: input.scheduledFor
              ? input.scheduledFor.getTime()
              : undefined,
            fcmToken: input.fcmToken,
          },
        );

        return notification;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Notification not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Notification not found",
            });
          }
          if (error.message.includes("don't have permission")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You don't have permission to update this notification",
            });
          }
          if (error.message.includes("already been sent")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Cannot update a notification that has already been sent",
            });
          }
          if (error.message.includes("Scheduled time must be in the future")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Scheduled time must be in the future",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update scheduled notification",
        });
      }
    }),

  deleteScheduledNotification: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        await ctx.convex.mutation(
          api.scheduledNotifications.deleteScheduledNotification,
          {
            userId: ctx.session.user.id as Id<"users">,
            notificationId: input as Id<"scheduledNotifications">,
          },
        );

        return { success: true };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Notification not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Notification not found",
            });
          }
          if (error.message.includes("don't have permission")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You don't have permission to delete this notification",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to delete scheduled notification",
        });
      }
    }),

  getNotification: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        const notification = await ctx.convex.query(
          api.scheduledNotifications.getNotification,
          {
            userId: ctx.session.user.id as Id<"users">,
            notificationId:
              input.notificationId as Id<"scheduledNotifications">,
          },
        );

        return notification;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Notification not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Notification not found",
            });
          }
          if (error.message.includes("don't have permission")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You don't have permission to view this notification",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch notification",
        });
      }
    }),

  getPendingNotifications: protectedProcedure
    .input(
      z.object({
        beforeTimestamp: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        const notifications = await ctx.convex.query(
          api.scheduledNotifications.getPendingNotifications,
          {
            userId: ctx.session.user.id as Id<"users">,
            beforeTimestamp: input.beforeTimestamp
              ? input.beforeTimestamp.getTime()
              : undefined,
          },
        );

        return notifications;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch pending notifications",
        });
      }
    }),

  markNotificationAsSent: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        const notification = await ctx.convex.mutation(
          api.scheduledNotifications.markNotificationAsSent,
          {
            userId: ctx.session.user.id as Id<"users">,
            notificationId:
              input.notificationId as Id<"scheduledNotifications">,
          },
        );

        return notification;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Notification not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Notification not found",
            });
          }
          if (error.message.includes("don't have permission")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You don't have permission to update this notification",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to mark notification as sent",
        });
      }
    }),

  createTaskReminderNotification: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        scheduledFor: z.date(),
        fcmToken: z.string().min(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        const notificationId = await ctx.convex.mutation(
          api.scheduledNotifications.createTaskReminderNotification,
          {
            userId: ctx.session.user.id as Id<"users">,
            taskId: input.taskId as Id<"tasks">,
            scheduledFor: input.scheduledFor.getTime(),
            fcmToken: input.fcmToken,
          },
        );

        return { notificationId };
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
              message:
                "You don't have permission to create reminders for this task",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create task reminder notification",
        });
      }
    }),

  // Admin/system functions (for background processing)
  getAllPendingNotifications: protectedProcedure
    .input(
      z.object({
        beforeTimestamp: z.date().optional(),
        limit: z.number().min(1).max(100).default(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        const notifications = await ctx.convex.query(
          api.scheduledNotifications.getAllPendingNotifications,
          {
            beforeTimestamp: input.beforeTimestamp
              ? input.beforeTimestamp.getTime()
              : undefined,
            limit: input.limit,
          },
        );

        return notifications;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch all pending notifications",
        });
      }
    }),

  batchMarkNotificationsAsSent: protectedProcedure
    .input(
      z.object({
        notificationIds: z.array(z.string()).min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        const result = await ctx.convex.mutation(
          api.scheduledNotifications.batchMarkNotificationsAsSent,
          {
            notificationIds:
              input.notificationIds as Id<"scheduledNotifications">[],
          },
        );

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to batch mark notifications as sent",
        });
      }
    }),

  // User management functions
  updateUserFcmToken: protectedProcedure
    .input(
      z.object({
        fcmToken: z.string().min(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        // Update user's FCM token in user settings
        const result = await ctx.convex.mutation(
          api.userSettings.update,
          {
            userId: ctx.session.user.id as Id<"users">,
            fcmToken: input.fcmToken,
          },
        );

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update FCM token",
        });
      }
    }),
});
