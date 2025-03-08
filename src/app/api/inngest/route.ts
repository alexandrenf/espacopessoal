import { serve } from 'inngest/next';
import { inngest } from '~/server/inngest/client';
import { processNotifications } from '~/server/inngest/notifications';

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processNotifications],
});