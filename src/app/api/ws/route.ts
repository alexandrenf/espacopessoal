import { NextResponse } from "next/server";

export async function GET(): Promise<Response> {
  // Note: WebSocket upgrades cannot be handled directly in Next.js App Router API routes
  // This endpoint serves as a fallback for HTTP requests to the WebSocket endpoint

  try {
    // Set up proxy for WebSocket upgrade handling if the server supports it
    // This is more of a placeholder since true WebSocket handling needs to be at the server level
    return NextResponse.json({
      message: "WebSocket endpoint available",
      wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? "ws://127.0.0.1:6002",
    });
  } catch (error) {
    console.error("WebSocket setup failed:", error);
    return NextResponse.json(
      {
        error: "WebSocket setup failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
