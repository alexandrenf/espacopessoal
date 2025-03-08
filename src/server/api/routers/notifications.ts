import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import admin from 'firebase-admin';

// Initialize Firebase Admin if it hasn't been initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const notificationsRouter = createTRPCRouter({
  saveToken: protectedProcedure
    .input(z.object({ 
      token: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Save the FCM token to the user's record
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { fcmToken: input.token },
      });
      return { success: true };
    }),

  sendNotification: protectedProcedure
    .input(z.object({
      userId: z.string(),
      title: z.string(),
      body: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get user's FCM token
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

      try {
        const response = await admin.messaging().send({
          notification: {
            title: input.title,
            body: input.body,
          },
          token: user.fcmToken,
        });

        return { success: true, messageId: response };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send notification",
          cause: error,
        });
      }
    }),
});