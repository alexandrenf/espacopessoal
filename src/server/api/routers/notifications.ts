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
    throw error;
  }
}

export const notificationsRouter = createTRPCRouter({
  saveToken: protectedProcedure
    .input(z.object({ 
      token: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: { fcmToken: input.token },
        });
        console.log('Token saved for user:', ctx.session.user.id);
        return { success: true };
      } catch (error) {
        console.error('Error saving token:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save notification token",
          cause: error,
        });
      }
    }),

  sendNotification: protectedProcedure
    .input(z.object({
      userId: z.string(),
      title: z.string(),
      body: z.string(),
      url: z.string().optional(), // Add optional URL field
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await ctx.db.user.findUnique({
          where: { id: input.userId },
          select: { fcmToken: true },
        });

        if (!user?.fcmToken) {
          console.error('No FCM token found for user:', input.userId);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User has no notification token",
          });
        }

        const message = {
          notification: {
            title: input.title,
            body: input.body,
          },
          data: {
            url: input.url ?? '/', // Add the target URL in the notification data
          },
          token: user.fcmToken,
        };

        console.log('Sending notification:', message);
        const response = await admin.messaging().send(message);
        console.log('Notification sent successfully:', response);

        return { success: true, messageId: response };
      } catch (error) {
        console.error('Error sending notification:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send notification",
          cause: error,
        });
      }
    }),
});
