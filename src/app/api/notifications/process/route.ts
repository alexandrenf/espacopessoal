import { NextResponse } from "next/server";
import { DenoClient } from "~/lib/deno-client";

export async function POST() {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  console.log(`[API] ${requestId} - Starting notification processing request`);

  try {
    const result = await DenoClient.processNotifications();
    const duration = Date.now() - startTime;

    console.log(`[API] ${requestId} - Notification processing completed:`, {
      duration: `${duration}ms`,
      result,
    });

    return NextResponse.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[API] ${requestId} - Failed to process notifications:`, {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process notifications",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
