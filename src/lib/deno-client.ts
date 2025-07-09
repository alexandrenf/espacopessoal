import { env } from "~/env";

interface NotificationProcessResult {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  timestamp: string;
  error?: string;
  message?: string;
}

export class DenoClient {
  private static baseUrl = env.DENO_API_URL;
  private static apiKey = env.DENO_API_KEY;

  static async processNotifications(): Promise<NotificationProcessResult> {
    const startTime = Date.now();
    console.log("[DenoClient] Starting notification processing request");

    try {
      const response = await fetch(
        `${this.baseUrl}/api/notifications/process`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = (await response.json()) as NotificationProcessResult;
      const duration = Date.now() - startTime;

      if (!response.ok) {
        console.error("[DenoClient] Notification processing failed:", {
          status: response.status,
          statusText: response.statusText,
          data,
          duration: `${duration}ms`,
        });
        throw new Error(
          data.message ??
            `Failed to process notifications: ${response.statusText}`,
        );
      }

      console.log("[DenoClient] Notification processing completed:", {
        requestId: response.headers.get("X-Request-ID"),
        status: response.status,
        data,
        duration: `${duration}ms`,
      });

      return data;
    } catch (error) {
      console.error(
        "[DenoClient] Error during notification processing:",
        error,
      );
      throw error;
    }
  }

  static async healthCheck() {
    console.log("[DenoClient] Starting health check");
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      const duration = Date.now() - startTime;
      console.log("[DenoClient] Health check completed:", {
        status: response.status,
        ok: response.ok,
        duration: `${duration}ms`,
      });

      return response.ok;
    } catch (error) {
      console.error("[DenoClient] Health check failed:", error);
      return false;
    }
  }
}
