import { load } from "https://deno.land/std@0.208.0/dotenv/mod.ts";

// Load environment variables from .env file
await load({ export: true });

// Import and run the main application
import "./main.ts";
