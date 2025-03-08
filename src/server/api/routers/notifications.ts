import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import admin from 'firebase-admin';

// Initialize Firebase Admin if it hasn't been initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Unknown error during Firebase Admin initialization');
  }
}

export const notificationsRouter = createTRPCRouter({
  saveToken: protectedProcedure
    .input(z.object({
      token: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Save the token to the database
        const result = await ctx.db.user.update({
          where: {
            id: ctx.session.user.id,
          },
          data: {
            fcmToken: input.token,
          },
        });
        
        return { success: true, userId: result.id };
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save notification token",
        });
      }
    }),
  sendNotification: protectedProcedure
    .input(z.object({
      userId: z.string(),
      title: z.string(),
      body: z.string(),
      url: z.string().optional(),
      scheduledFor: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await ctx.db.user.findUnique({
          where: { id: input.userId },
          select: { fcmToken: true },
        });

        if (!user?.fcmToken) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User has no notification token",
          });
        }

        const messagePayload: admin.messaging.Message = {
          notification: {
            title: input.title,
            body: input.body,
          },
          data: {
            url: input.url ?? '/',
          },
          token: user.fcmToken,
        };

        if (input.scheduledFor) {
          const delay = input.scheduledFor.getTime() - Date.now();
          
          if (delay <= 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Scheduled time must be in the future",
            });
          }

          // Store the scheduled notification in the database
          const scheduledNotification = await ctx.db.scheduledNotification.create({
            data: {
              userId: input.userId,
              title: input.title,
              body: input.body,
              url: input.url,
              scheduledFor: input.scheduledFor,
              fcmToken: user.fcmToken,
            },
          });

          return { 
            success: true, 
            messageId: scheduledNotification.id,
            scheduled: true 
          };
        }

        // Send immediate notification
        const response = await admin.messaging().send(messagePayload);
        return { 
          success: true, 
          messageId: response,
          scheduled: false 
        };

      } catch (error) {
        console.error('Error handling notification:', error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to handle notification",
          cause: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }),
});
