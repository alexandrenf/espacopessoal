import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { DATABASE_URL, FIREBASE_ADMIN_PROJECT_ID } from "../config/env.ts";
import { getAccessToken } from "../utils/firebase.ts";

export async function processScheduledNotifications() {
  const db = new Client(DATABASE_URL);
  
  try {
    await db.connect();
    
    const now = new Date();
    console.log('Processing scheduled notifications at:', now);

    // Find pending notifications that are due
    const result = await db.queryArray`
      SELECT id, title, body, url, "fcmToken"
      FROM "ScheduledNotification"
      WHERE "scheduledFor" <= ${now}
      AND sent = false
      LIMIT 100
    `;

    const pendingNotifications = result.rows.map(row => ({
      id: row[0],
      title: row[1],
      body: row[2],
      url: row[3],
      fcm_token: row[4], // We keep this as fcm_token for compatibility with the existing code
    }));
    
    console.log(`Found ${pendingNotifications.length} pending notifications`);

    const results = await Promise.allSettled(
      pendingNotifications.map(async (notification) => {
        try {
          // Send the notification via Firebase
          const message = {
            notification: {
              title: notification.title,
              body: notification.body,
            },
            data: {
              url: notification.url ?? '/',
            },
            token: notification.fcm_token,
          };

          await fetch(`https://fcm.googleapis.com/v1/projects/${FIREBASE_ADMIN_PROJECT_ID}/messages:send`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${await getAccessToken()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
          });

          // Mark notification as sent
          await db.queryArray`
            UPDATE "ScheduledNotification"
            SET sent = true
            WHERE id = ${notification.id}
          `;

          return { success: true, id: notification.id };
        } catch (error) {
          console.error(
            `Failed to send scheduled notification ${notification.id}:`,
            error
          );
          return { success: false, id: notification.id, error };
        }
      })
    );

    const successful = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.filter(
      (r) => r.status === 'rejected' || !r.value.success
    ).length;

    console.log(`Processed ${successful} notifications successfully, ${failed} failed`);

    return {
      total: pendingNotifications.length,
      successful,
      failed,
    };
  } catch (error) {
    console.error('Failed to process scheduled notifications:', error);
    throw error;
  } finally {
    await db.end();
  }
}

export async function cleanupOldNotifications() {
  const db = new Client(DATABASE_URL);
  
  try {
    await db.connect();
    
    // Calculate the timestamp for 30 minutes ago
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    // Delete old sent notifications
    const result = await db.queryArray`
      DELETE FROM "ScheduledNotification"
      WHERE sent = true
      AND "updatedAt" <= ${thirtyMinutesAgo}
      RETURNING id
    `;

    return {
      deleted: result.rows.length
    };
  } catch (error) {
    console.error('Failed to cleanup old notifications:', error);
    throw error;
  } finally {
    await db.end();
  }
}
