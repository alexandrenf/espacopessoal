#!/usr/bin/env tsx

/**
 * Migration script to transfer all data from Prisma/PostgreSQL to Convex
 *
 * This script:
 * 1. Connects to the existing Prisma database
 * 2. Extracts all data from relevant tables
 * 3. Transforms the data to match Convex schema requirements
 * 4. Calls Convex migration functions to insert the data
 * 5. Validates the migration was successful
 *
 * Usage:
 *   bun run scripts/migrate-to-convex.ts [--dry-run] [--tables table1,table2]
 */

import { PrismaClient } from "@prisma/client";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Initialize clients
const prisma = new PrismaClient();
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Command line argument parsing
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const tablesArg = args.find((arg) => arg.startsWith("--tables="));
const selectedTables = tablesArg
  ? tablesArg.split("=")[1]?.split(",")
  : undefined;

// Logging utility
const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  success: (message: string, ...args: unknown[]) => {
    console.log(`[SUCCESS] ${message}`, ...args);
  },
};

// Type definitions for extracted data
interface ExtractedData {
  users: Array<{
    id: string;
    name?: string;
    email?: string;
    emailVerified?: string;
    image?: string;
    fcmToken?: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
  accounts: Array<{
    id: string;
    userId: string;
    type: string;
    provider: string;
    providerAccountId: string;
    refresh_token?: string;
    access_token?: string;
    expires_at?: number;
    token_type?: string;
    scope?: string;
    id_token?: string;
    session_state?: string;
    refresh_token_expires_in?: number;
  }>;
  userSettings: Array<{
    id: string;
    notePadUrl: string;
    privateOrPublicUrl?: boolean;
    password?: string;
    ownedById: string;
  }>;
  boards: Array<{
    id: string;
    name: string;
    color: string;
    order: number;
    userId: string;
    createdAt: string;
    updatedAt: string;
  }>;
  tasks: Array<{
    id: string;
    name: string;
    description?: string;
    status: "TODO" | "IN_PROGRESS" | "DONE";
    order: number;
    dueDate?: string;
    boardId: string;
    userId: string;
    reminderEnabled: boolean;
    reminderDateTime?: string;
    reminderFrequency?: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY";
    createdAt: string;
    updatedAt: string;
  }>;
  scheduledNotifications: Array<{
    id: string;
    userId: string;
    title: string;
    body: string;
    url?: string;
    scheduledFor: string;
    fcmToken: string;
    sent: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  replaceDictionaries: Array<{
    id: string;
    from: string;
    to: string;
    createdAt: string;
    updatedAt: string;
    ownedById: string;
  }>;
  legacyNotepads: Array<{
    id: number;
    content?: string;
    createdAt: string;
    updatedAt: string;
    createdById: string;
    parentId?: number;
    isFolder: boolean;
    order: number;
  }>;
  legacySharedNotes: Array<{
    id: string;
    url: string;
    createdAt: string;
    updatedAt: string;
    noteId: number;
  }>;
}

// Data extraction functions
async function extractUsers(): Promise<ExtractedData["users"]> {
  logger.info("Extracting users from Prisma...");

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      fcmToken: true,
    },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name ?? undefined,
    email: user.email ?? undefined,
    emailVerified: user.emailVerified?.toISOString(),
    image: user.image ?? undefined,
    fcmToken: user.fcmToken ?? undefined,
    // Use current time since Prisma User model doesn't have these fields
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

async function extractAccounts(): Promise<ExtractedData["accounts"]> {
  logger.info("Extracting accounts from Prisma...");

  const accounts = await prisma.account.findMany();

  return accounts.map((account) => ({
    id: account.id,
    userId: account.userId,
    type: account.type,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    refresh_token: account.refresh_token ?? undefined,
    access_token: account.access_token ?? undefined,
    expires_at: account.expires_at ?? undefined,
    token_type: account.token_type ?? undefined,
    scope: account.scope ?? undefined,
    id_token: account.id_token ?? undefined,
    session_state: account.session_state ?? undefined,
    refresh_token_expires_in: account.refresh_token_expires_in ?? undefined,
  }));
}

async function extractUserSettings(): Promise<ExtractedData["userSettings"]> {
  logger.info("Extracting user settings from Prisma...");

  const userSettings = await prisma.userThings.findMany({
    select: {
      id: true,
      notePadUrl: true,
      privateOrPublicUrl: true,
      password: true,
      ownedById: true,
    },
  });

  return userSettings.map((settings) => ({
    id: settings.id,
    notePadUrl: settings.notePadUrl,
    privateOrPublicUrl: settings.privateOrPublicUrl ?? undefined,
    password: settings.password ?? undefined,
    ownedById: settings.ownedById,
  }));
}

async function extractBoards(): Promise<ExtractedData["boards"]> {
  logger.info("Extracting boards from Prisma...");

  const boards = await prisma.board.findMany({
    orderBy: { order: "asc" },
  });

  return boards.map((board) => ({
    id: board.id,
    name: board.name,
    color: board.color,
    order: board.order,
    userId: board.userId,
    createdAt: board.createdAt.toISOString(),
    updatedAt: board.updatedAt.toISOString(),
  }));
}

async function extractTasks(): Promise<ExtractedData["tasks"]> {
  logger.info("Extracting tasks from Prisma...");

  const tasks = await prisma.task.findMany({
    orderBy: [{ boardId: "asc" }, { order: "asc" }],
  });

  return tasks.map((task) => ({
    id: task.id,
    name: task.name,
    description: task.description ?? undefined,
    status: task.status as "TODO" | "IN_PROGRESS" | "DONE",
    order: task.order,
    dueDate: task.dueDate?.toISOString(),
    boardId: task.boardId,
    userId: task.userId,
    reminderEnabled: task.reminderEnabled,
    reminderDateTime: task.reminderDateTime?.toISOString(),
    reminderFrequency: task.reminderFrequency as
      | "ONCE"
      | "DAILY"
      | "WEEKLY"
      | "MONTHLY"
      | undefined,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }));
}

async function extractScheduledNotifications(): Promise<
  ExtractedData["scheduledNotifications"]
> {
  logger.info("Extracting scheduled notifications from Prisma...");

  const notifications = await prisma.scheduledNotification.findMany({
    orderBy: { scheduledFor: "asc" },
  });

  return notifications.map((notification) => ({
    id: notification.id,
    userId: notification.userId,
    title: notification.title,
    body: notification.body,
    url: notification.url ?? undefined,
    scheduledFor: notification.scheduledFor.toISOString(),
    fcmToken: notification.fcmToken,
    sent: notification.sent,
    createdAt: notification.createdAt.toISOString(),
    updatedAt: notification.updatedAt.toISOString(),
  }));
}

async function extractReplaceDictionaries(): Promise<
  ExtractedData["replaceDictionaries"]
> {
  logger.info("Extracting replace dictionaries from Prisma...");

  const dictionaries = await prisma.replaceDictionary.findMany();

  return dictionaries.map((dict) => ({
    id: dict.id,
    from: dict.from,
    to: dict.to,
    createdAt: dict.createdAt.toISOString(),
    updatedAt: dict.updatedAt.toISOString(),
    ownedById: dict.ownedById,
  }));
}

async function extractLegacyNotepads(): Promise<
  ExtractedData["legacyNotepads"]
> {
  logger.info("Extracting legacy notepads from Prisma...");

  const notepads = await prisma.notepad.findMany({
    orderBy: [{ parentId: "asc" }, { order: "asc" }],
  });

  return notepads.map((notepad) => ({
    id: notepad.id,
    content: notepad.content ?? undefined,
    createdAt: notepad.createdAt.toISOString(),
    updatedAt: notepad.updatedAt.toISOString(),
    createdById: notepad.createdById,
    parentId: notepad.parentId ?? undefined,
    isFolder: notepad.isFolder,
    order: notepad.order,
  }));
}

async function extractLegacySharedNotes(): Promise<
  ExtractedData["legacySharedNotes"]
> {
  logger.info("Extracting legacy shared notes from Prisma...");

  const sharedNotes = await prisma.sharedNote.findMany();

  return sharedNotes.map((note) => ({
    id: note.id,
    url: note.url,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    noteId: note.noteId,
  }));
}

// Main extraction function
async function extractAllData(): Promise<ExtractedData> {
  logger.info("Starting data extraction from Prisma...");

  const shouldInclude = (tableName: string) => {
    return !selectedTables || selectedTables.includes(tableName);
  };

  const data: ExtractedData = {
    users: shouldInclude("users") ? await extractUsers() : [],
    accounts: shouldInclude("accounts") ? await extractAccounts() : [],
    userSettings: shouldInclude("userSettings")
      ? await extractUserSettings()
      : [],
    boards: shouldInclude("boards") ? await extractBoards() : [],
    tasks: shouldInclude("tasks") ? await extractTasks() : [],
    scheduledNotifications: shouldInclude("scheduledNotifications")
      ? await extractScheduledNotifications()
      : [],
    replaceDictionaries: shouldInclude("replaceDictionaries")
      ? await extractReplaceDictionaries()
      : [],
    legacyNotepads: shouldInclude("legacyNotepads")
      ? await extractLegacyNotepads()
      : [],
    legacySharedNotes: shouldInclude("legacySharedNotes")
      ? await extractLegacySharedNotes()
      : [],
  };

  logger.success("Data extraction completed!");
  logger.info("Extraction summary:", {
    users: data.users.length,
    accounts: data.accounts.length,
    userSettings: data.userSettings.length,
    boards: data.boards.length,
    tasks: data.tasks.length,
    scheduledNotifications: data.scheduledNotifications.length,
    replaceDictionaries: data.replaceDictionaries.length,
    legacyNotepads: data.legacyNotepads.length,
    legacySharedNotes: data.legacySharedNotes.length,
  });

  return data;
}

// Migration execution function
async function runMigration(data: ExtractedData) {
  logger.info(`Starting migration to Convex (dryRun: ${isDryRun})...`);

  try {
    const result = await convex.mutation(
      api.migrations.runMigrationFromScript,
      {
        dryRun: isDryRun,
        includeData: data,
      },
    );

    if (isDryRun) {
      logger.success("Dry run completed successfully!");
      logger.info("Migration would process:", result.stats);
    } else {
      logger.success("Migration completed successfully!");
      logger.info("Migration results:", result.migrationResults);

      // Validate the migration
      const validation = await convex.query(api.migrations.validateMigration);
      logger.info("Post-migration validation:", validation);
    }

    return result;
  } catch (error) {
    logger.error("Migration failed:", error);
    throw error;
  }
}

// Main execution function
async function main() {
  try {
    logger.info("=".repeat(50));
    logger.info("PRISMA TO CONVEX MIGRATION SCRIPT");
    logger.info("=".repeat(50));

    if (isDryRun) {
      logger.warn("DRY RUN MODE - No data will be actually migrated");
    }

    if (selectedTables) {
      logger.info("Only migrating tables:", selectedTables);
    }

    // Step 1: Test database connections
    logger.info("Testing database connections...");
    await prisma.$connect();
    logger.success("Prisma connection established");

    // Test Convex connection by running a simple query
    try {
      await convex.query(api.migrations.validateMigration);
      logger.success("Convex connection established");
    } catch (error) {
      logger.error("Convex connection failed:", error);
      throw new Error(
        "Could not connect to Convex. Please check your NEXT_PUBLIC_CONVEX_URL environment variable.",
      );
    }

    // Step 2: Extract data from Prisma
    const extractedData = await extractAllData();

    // Step 3: Run migration
    const migrationResult = await runMigration(extractedData);

    logger.info("=".repeat(50));
    logger.success("MIGRATION SCRIPT COMPLETED SUCCESSFULLY!");
    logger.info("=".repeat(50));

    if (!isDryRun) {
      logger.info("Next steps:");
      logger.info("1. Test your application with Convex data");
      logger.info("2. Update authentication system to use Convex");
      logger.info("3. Remove Prisma dependencies when ready");
      logger.info("4. Update environment variables");
    }
  } catch (error) {
    logger.error("Migration script failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  logger.warn("Received SIGINT, shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.warn("Received SIGTERM, shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error("Unhandled error:", error);
    process.exit(1);
  });
}
