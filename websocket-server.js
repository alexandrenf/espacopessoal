import { HocuspocusServer } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { configuration } from './convex/_generated/configuration.js';

const server = new HocuspocusServer({
  port: process.env.WEBSOCKET_PORT || 6001,
  extensions: [
    new Database({
      // Use a simple in-memory storage for now
      // In production, this should connect to a proper database
      async fetch() {
        return null;
      },
      async store() {
        return;
      },
    }),
  ],
  onAuthenticate: async (data) => {
    // For now, allow all connections
    // In production, implement proper authentication
    return {
      user: {
        id: data.requestParameters.get('userId') || 'anonymous',
        name: data.requestParameters.get('userName') || 'Anonymous User',
      },
    };
  },
  onConnect: () => {
    console.log('✅ User connected to collaborative editing');
  },
  onDisconnect: () => {
    console.log('❌ User disconnected from collaborative editing');
  },
  onStateless: () => {
    console.log('📡 Stateless message received');
  },
});

console.log('🚀 WebSocket server starting on port 6001...');
console.log('🔗 Clients can connect to: ws://127.0.0.1:6001');

process.on('SIGINT', () => {
  console.log('🛑 Gracefully shutting down WebSocket server...');
  server.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Gracefully shutting down WebSocket server...');
  server.destroy();
  process.exit(0);
}); 