import { inngest } from './client';
import { processScheduledNotifications } from '../scheduler';

export const processNotifications = inngest.createFunction(
  { 
    id: 'process-scheduled-notifications',
    retries: 3 // Add retries for reliability
  },
  { 
    cron: '0 * * * *' // Run every hour
  },
  async ({ event, step }) => {
    return await step.run('Process notifications', async () => {
      try {
        console.log('Starting scheduled notification processing');
        await processScheduledNotifications();
        console.log('Successfully processed scheduled notifications');
        return { 
          success: true,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error('Failed to process scheduled notifications:', error);
        // Rethrow the error to trigger retries
        throw error;
      }
    });
  }
);
