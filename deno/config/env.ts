/// <reference lib="deno.ns" />
import { load } from "https://deno.land/std@0.208.0/dotenv/mod.ts";
import { Deno } from "https://deno.land/x/deno_types/mod.ts";

// Load environment variables from .env file
await load({ export: true });

export const DATABASE_URL = Deno.env.get("DATABASE_URL")!;
export const API_KEY = Deno.env.get("API_KEY")!;
export const FIREBASE_ADMIN_PROJECT_ID = Deno.env.get("FIREBASE_ADMIN_PROJECT_ID")!;
export const FIREBASE_ADMIN_CLIENT_EMAIL = Deno.env.get("FIREBASE_ADMIN_CLIENT_EMAIL")!;
export const FIREBASE_ADMIN_PRIVATE_KEY = Deno.env.get("FIREBASE_ADMIN_PRIVATE_KEY")!;

// Initialize Firebase Admin
import { initializeApp, cert, getApps } from "https://deno.land/x/firebase_admin/mod.ts";

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}
