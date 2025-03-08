import { inngest } from './client';
import { processScheduledNotifications } from '../scheduler';

// Create the scheduled function
export const processNotifications = inngest.createFunction(
  { name: 'Process Scheduled Notifications' },
  { cron: '0 * * * *' }, // Run every hour
  async ({ event, step }) => {
    await step.run('Process notifications', async () => {
      try {
        await processScheduledNotifications();
        return { success: true };
      } catch (error) {
        console.error('Failed to process scheduled notifications:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
  }
);