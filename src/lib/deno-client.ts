import { env } from "~/env";

export class DenoClient {
  private static baseUrl = env.DENO_API_URL;
  private static apiKey = env.DENO_API_KEY;

  static async processNotifications() {
    const response = await fetch(`${this.baseUrl}/api/notifications/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to process notifications: ${response.statusText}`);
    }

    return response.json() as Promise<unknown>;
  }

  static async healthCheck() {
    const response = await fetch(`${this.baseUrl}/health`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    return response.ok;
  }
}
