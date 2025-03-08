import { Inngest } from 'inngest';
import { env } from '~/env';

export const inngest = new Inngest({
  id: 'espaco-pessoal',
  eventKey: env.INNGEST_EVENT_KEY,
  signingKey: env.INNGEST_SIGNING_KEY,
  // Add these additional configurations
  baseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://api.inngest.com' 
    : 'http://localhost:8288',
  isProduction: process.env.NODE_ENV === 'production',
});
