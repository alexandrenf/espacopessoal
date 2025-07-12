import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const SESSION_COOKIE_PREFIX = "nb_session_";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

interface SessionData {
  token: string;
  expiresAt: number;
}

interface SessionRequestBody {
  url: string;
  sessionToken: string;
  expiresAt: number;
}

// GET: Get session token for a specific notebook URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const sessionCookieName = `${SESSION_COOKIE_PREFIX}${encodeURIComponent(url)}`;
    const sessionCookie = cookieStore.get(sessionCookieName);

    if (!sessionCookie?.value) {
      return NextResponse.json({ hasSession: false });
    }

    try {
      const sessionData = JSON.parse(sessionCookie.value) as SessionData;

      // Check if session is expired
      if (sessionData.expiresAt && sessionData.expiresAt <= Date.now()) {
        // Session is expired, remove the cookie
        const response = NextResponse.json({
          hasSession: false,
          expired: true,
        });
        response.cookies.delete(sessionCookieName);
        return response;
      }

      return NextResponse.json({
        hasSession: true,
        token: sessionData.token,
        expiresAt: sessionData.expiresAt,
      });
    } catch {
      // Invalid cookie data, remove it
      const response = NextResponse.json({ hasSession: false, invalid: true });
      response.cookies.delete(sessionCookieName);
      return response;
    }
  } catch (error) {
    console.error("Error getting session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST: Store session token for a specific notebook URL
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SessionRequestBody;
    const { url, sessionToken, expiresAt } = body;

    if (!url || !sessionToken || !expiresAt) {
      return NextResponse.json(
        { error: "url, sessionToken, and expiresAt are required" },
        { status: 400 },
      );
    }

    const sessionData: SessionData = {
      token: sessionToken,
      expiresAt: expiresAt,
    };

    const sessionCookieName = `${SESSION_COOKIE_PREFIX}${encodeURIComponent(url)}`;
    const response = NextResponse.json({ success: true });

    // Calculate maxAge in seconds (convert from milliseconds)
    const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));

    response.cookies.set(sessionCookieName, JSON.stringify(sessionData), {
      ...COOKIE_OPTIONS,
      maxAge,
    });

    return response;
  } catch (error) {
    console.error("Error storing session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE: Remove session token for a specific notebook URL
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 },
      );
    }

    const sessionCookieName = `${SESSION_COOKIE_PREFIX}${encodeURIComponent(url)}`;
    const response = NextResponse.json({ success: true });
    response.cookies.delete(sessionCookieName);

    return response;
  } catch (error) {
    console.error("Error removing session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
