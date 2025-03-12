import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Set DATABASE_URL and NEXTAUTH_URL based on NODE_ENV before env validation

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.NODE_ENV === "production"
    ? process.env.NEXTAUTH_URL_PRODUCTION
    : process.env.NEXTAUTH_URL_DEVELOPMENT;
}

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */ 
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    AUTH_DISCORD_ID: z.string(),
    AUTH_DISCORD_SECRET: z.string(),
    DATABASE_URL: z.string().url(),
    NEXTAUTH_URL_DEVELOPMENT: z.string().url(),
    NEXTAUTH_URL_PRODUCTION: z.string().url(),
    NEXTAUTH_URL: z.string().url(),
    EMAIL_SERVER: z.string().url(),
    EMAIL_FROM: z.string().email(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    FIREBASE_ADMIN_PROJECT_ID: z.string(),
    FIREBASE_ADMIN_CLIENT_EMAIL: z.string(),
    FIREBASE_ADMIN_PRIVATE_KEY: z.string(),
    FIREBASE_FCM_VAPID_KEY: z.string(),
    DENO_API_KEY: z.string(),
    DENO_API_URL: z.string().url(),
  },


  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_DISCORD_ID: process.env.AUTH_DISCORD_ID,
    AUTH_DISCORD_SECRET: process.env.AUTH_DISCORD_SECRET,
    NEXTAUTH_URL_DEVELOPMENT: process.env.NEXTAUTH_URL_DEVELOPMENT,
    NEXTAUTH_URL_PRODUCTION: process.env.NEXTAUTH_URL_PRODUCTION,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV,
    EMAIL_SERVER: process.env.EMAIL_SERVER,
    EMAIL_FROM: process.env.EMAIL_FROM,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
    FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    FIREBASE_FCM_VAPID_KEY: process.env.FIREBASE_FCM_VAPID_KEY,
    DENO_API_KEY: process.env.DENO_API_KEY,
    DENO_API_URL: process.env.DENO_API_URL,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
