/// <reference lib="deno.ns" />
import { load } from "std/dotenv/mod.ts";
import { 
  initializeApp, 
  cert, 
  getApps 
} from "npm:firebase-admin@11.11.1/app";

// Load environment variables from .env file
await load({ export: true });

export const DATABASE_URL = Deno.env.get("DATABASE_URL")!;
export const API_KEY = Deno.env.get("API_KEY")!;
export const FIREBASE_ADMIN_PROJECT_ID = Deno.env.get("FIREBASE_ADMIN_PROJECT_ID")!;
export const FIREBASE_ADMIN_CLIENT_EMAIL = Deno.env.get("FIREBASE_ADMIN_CLIENT_EMAIL")!;
export const FIREBASE_ADMIN_PRIVATE_KEY = Deno.env.get("FIREBASE_ADMIN_PRIVATE_KEY")!;

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}
