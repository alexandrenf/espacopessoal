import { PrismaClient } from "@prisma/client";
import admin from "firebase-admin";

const prisma = new PrismaClient();

export async function processScheduledNotifications() {
  const now = new Date();
  console.log("Processing scheduled notifications at:", now);

  try {
    const pendingNotifications = await prisma.scheduledNotification.findMany({
      where: {
        scheduledFor: {
          lte: now,
        },
        sent: false,
      },
    });

    console.log(`Found ${pendingNotifications.length} pending notifications`);

    const results = await Promise.allSettled(
      pendingNotifications.map(async (notification) => {
        try {
          await admin.messaging().send({
            notification: {
              title: notification.title,
              body: notification.body,
            },
            data: {
              url: notification.url ?? "/",
            },
            token: notification.fcmToken,
          });

          await prisma.scheduledNotification.update({
            where: { id: notification.id },
            data: { sent: true },
          });

          return { success: true, id: notification.id };
        } catch (error) {
          console.error(
            `Failed to send scheduled notification ${notification.id}:`,
            error,
          );
          return { success: false, id: notification.id, error };
        }
      }),
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    ).length;
    const failed = results.filter(
      (r) => r.status === "rejected" || !r.value.success,
    ).length;

    console.log(
      `Processed ${successful} notifications successfully, ${failed} failed`,
    );

    return {
      total: pendingNotifications.length,
      successful,
      failed,
    };
  } catch (error) {
    console.error("Failed to process scheduled notifications:", error);
    throw error;
  }
}
