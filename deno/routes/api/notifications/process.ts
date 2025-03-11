import { Handlers } from "$fresh/server.ts";
import { processScheduledNotifications } from "../../../services/notifications.ts";
import { API_KEY } from "../../../config/env.ts";

export const handler: Handlers = {
  async OPTIONS(req) {
    // Handle CORS preflight requests
    const headers = new Headers({
      "Access-Control-Allow-Origin": Deno.env.get("NODE_ENV") === "production"
        ? "https://dev.espacopessoal.com"
        : "http://localhost:3000",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Content-Type": "application/json",
    });

    return new Response(null, { headers });
  },

  async POST(req) {
    const headers = new Headers({
      "Access-Control-Allow-Origin": Deno.env.get("NODE_ENV") === "production"
        ? "https://dev.espacopessoal.com"
        : "http://localhost:3000",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Content-Type": "application/json",
    });

    try {
      // Verify API key
      const authHeader = req.headers.get("Authorization");
      if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers }
        );
      }

      // Process notifications
      const result = await processScheduledNotifications();

      return new Response(
        JSON.stringify({
          success: true,
          processed: result.processed,
          failed: result.failed,
          timestamp: new Date().toISOString(),
        }),
        { 
          status: 200,
          headers,
        }
      );

    } catch (error) {
      console.error("Error processing notifications:", error);

      // Return appropriate error response
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          timestamp: new Date().toISOString(),
        }),
        { 
          status: 500,
          headers,
        }
      );
    }
  },

  async GET(req) {
    const headers = new Headers({
      "Access-Control-Allow-Origin": Deno.env.get("NODE_ENV") === "production"
        ? "https://dev.espacopessoal.com"
        : "http://localhost:3000",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Content-Type": "application/json",
    });

    // Simple health check endpoint
    return new Response(
      JSON.stringify({ 
        status: "healthy",
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 200,
        headers,
      }
    );
  }
};
