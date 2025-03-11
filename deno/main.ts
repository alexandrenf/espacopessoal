import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { initializeApp, cert, getApps } from "https://deno.land/x/firebase_admin/mod.ts";
import { processScheduledNotifications } from "./services/notifications.ts";
import { getAccessToken } from "./utils/firebase.ts";
import { API_KEY } from "./config/env.ts";

serve(async (req) => {
  // Add CORS headers
  const headers = new Headers({
    "Access-Control-Allow-Origin": process.env.NODE_ENV === "production" 
      ? "https://dev.espacopessoal.com" 
      : "http://localhost:3000",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Content-Type": "application/json",
  });

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  const url = new URL(req.url);
  
  // Health check endpoint
  if (url.pathname === "/health") {
    return new Response("OK", { status: 200, headers });
  }

  // Basic authentication check
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${API_KEY}`) {
    return new Response("Unauthorized", { status: 401, headers });
  }

  const result = await processScheduledNotifications();
  
  return new Response(JSON.stringify(result), {
    headers,
    status: 200,
  });
});
