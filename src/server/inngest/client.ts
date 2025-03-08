import { Inngest } from 'inngest';

// Create a client with your app's name
export const inngest = new Inngest({
  id: 'espaco-pessoal', // Use id instead of name
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
