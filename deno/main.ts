import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { processScheduledNotifications, cleanupOldNotifications } from "./services/notifications.ts";
import { API_KEY } from "./config/env.ts";
import { handler as spellcheckHandler } from "./routes/api/spellcheck/index.ts";

// Process notifications every 5 minutes and cleanup old ones using Deno.cron
Deno.cron("process-notifications", "*/5 * * * *", async () => {
  console.log(`[${new Date().toISOString()}] Starting scheduled notification processing (cron)`);
  try {
    const result = await processScheduledNotifications();
    console.log(`[${new Date().toISOString()}] Cron notification processing completed:`, {
      success: result.success,
      total: result.total,
      successful: result.successful,
      failed: result.failed
    });

    // Cleanup old notifications
    const cleanupResult = await cleanupOldNotifications();
    console.log(`[${new Date().toISOString()}] Cleaned up ${cleanupResult.deleted} old notifications`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in cron notification processor:`, error);
  }
});

// Regular HTTP server for manual triggers and health checks
serve(async (req) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  const url = new URL(req.url);
  
  console.log(`[${new Date().toISOString()}] ${requestId} - Incoming ${req.method} request to ${url.pathname}`);

  const headers = new Headers({
    "Access-Control-Allow-Origin": Deno.env.get("NODE_ENV") === "production" 
      ? "https://dev.espacopessoal.com" 
      : "http://localhost:3000",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Content-Type": "application/json",
    "X-Request-ID": requestId
  });

  if (req.method === "OPTIONS") {
    console.log(`[${new Date().toISOString()}] ${requestId} - Handling OPTIONS request`);
    return new Response(null, { headers });
  }

  if (url.pathname === "/health") {
    console.log(`[${new Date().toISOString()}] ${requestId} - Health check request`);
    return new Response("OK", { status: 200, headers });
  }

  // Handle spellcheck requests
  if (url.pathname === "/api/spellcheck") {
    console.log(`[${new Date().toISOString()}] ${requestId} - Forwarding to spellcheck handler`);
    return spellcheckHandler(req);
  }

  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${API_KEY}`) {
    console.warn(`[${new Date().toISOString()}] ${requestId} - Unauthorized request attempt`);
    return new Response("Unauthorized", { status: 401, headers });
  }

  console.log(`[${new Date().toISOString()}] ${requestId} - Starting manual notification processing`);
  const result = await processScheduledNotifications();
  const duration = Date.now() - startTime;
  
  console.log(`[${new Date().toISOString()}] ${requestId} - Manual notification processing completed:`, {
    duration: `${duration}ms`,
    success: result.success,
    total: result.total,
    successful: result.successful,
    failed: result.failed
  });
  
  return new Response(JSON.stringify(result), {
    headers,
    status: 200,
  });
});
