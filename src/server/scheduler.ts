import { PrismaClient } from '@prisma/client';
import admin from 'firebase-admin';

const prisma = new PrismaClient();

export async function processScheduledNotifications() {
  const now = new Date();

  const pendingNotifications = await prisma.scheduledNotification.findMany({
    where: {
      scheduledFor: {
        lte: now,
      },
      sent: false,
    },
  });

  for (const notification of pendingNotifications) {
    try {
      await admin.messaging().send({
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          url: notification.url ?? '/',
        },
        token: notification.fcmToken,
      });

      await prisma.scheduledNotification.update({
        where: { id: notification.id },
        data: { sent: true },
      });

    } catch (error) {
      console.error(`Failed to send scheduled notification ${notification.id}:`, error);
    }
  }
}