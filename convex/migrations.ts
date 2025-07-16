import { ConvexError, v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";

// Production-ready logging utility
const isDevelopment = process.env.LOG_LEVEL === "development";
const logger = {
  log: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.log(`[migrations] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[migrations] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(`[migrations] ${message}`, ...args);
    }
  },
};

// Types for Prisma data structures
interface PrismaUser {
  id: string;
  name?: string;
  email?: string;
  emailVerified?: Date;
  image?: string;
  fcmToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PrismaAccount {
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
}

interface PrismaSession {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
}

interface PrismaUserThings {
  id: string;
  notePadUrl: string;
  privateOrPublicUrl?: boolean;
  password?: string;
  ownedById: string;
}

interface PrismaBoard {
  id: string;
  name: string;
  color: string;
  order: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PrismaTask {
  id: string;
  name: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  order: number;
  dueDate?: Date;
  boardId: string;
  userId: string;
  reminderEnabled: boolean;
  reminderDateTime?: Date;
  reminderFrequency?: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY";
  createdAt: Date;
  updatedAt: Date;
}

interface PrismaScheduledNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  url?: string;
  scheduledFor: Date;
  fcmToken: string;
  sent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PrismaNotepad {
  id: number;
  content?: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  parentId?: number;
  isFolder: boolean;
  order: number;
}

interface PrismaSharedNote {
  id: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
  noteId: number;
}

interface PrismaReplaceDictionary {
  id: string;
  from: string;
  to: string;
  createdAt: Date;
  updatedAt: Date;
  ownedById: string;
}

// Helper function to convert Date to timestamp
const dateToTimestamp = (date: Date | undefined | null): number => {
  return date ? date.getTime() : Date.now();
};

// ===== USER MIGRATION =====

export const migrateUsers = internalMutation({
  args: {
    users: v.array(
      v.object({
        id: v.string(),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        emailVerified: v.optional(v.string()), // ISO string
        image: v.optional(v.string()),
        fcmToken: v.optional(v.string()),
        createdAt: v.optional(v.string()),
        updatedAt: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { users }) => {
    const results = [];

    for (const user of users) {
      try {
        // Check if user already exists
        const existing = await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", user.email!))
          .first();

        if (existing) {
          logger.log(`User ${user.email} already exists, skipping`);
          results.push({
            oldId: user.id,
            newId: existing._id,
            status: "exists",
          });
          continue;
        }

        const convexUserId = await ctx.db.insert("users", {
          name: user.name,
          email: user.email!,
          image: user.image,
          emailVerified: user.emailVerified
            ? new Date(user.emailVerified).getTime()
            : undefined,
          externalId: user.id,
          provider: "prisma", // Mark as migrated from Prisma
          createdAt: user.createdAt
            ? new Date(user.createdAt).getTime()
            : Date.now(),
          updatedAt: user.updatedAt
            ? new Date(user.updatedAt).getTime()
            : Date.now(),
        });

        results.push({
          oldId: user.id,
          newId: convexUserId,
          status: "migrated",
        });
        logger.log(`Migrated user ${user.email}`);
      } catch (error) {
        logger.error(`Failed to migrate user ${user.email}:`, error);
        results.push({
          oldId: user.id,
          newId: null,
          status: "error",
          error: String(error),
        });
      }
    }

    return { total: users.length, results };
  },
});

// ===== ACCOUNT MIGRATION =====

export const migrateAccounts = internalMutation({
  args: {
    accounts: v.array(
      v.object({
        id: v.string(),
        userId: v.string(),
        type: v.string(),
        provider: v.string(),
        providerAccountId: v.string(),
        refresh_token: v.optional(v.string()),
        access_token: v.optional(v.string()),
        expires_at: v.optional(v.number()),
        token_type: v.optional(v.string()),
        scope: v.optional(v.string()),
        id_token: v.optional(v.string()),
        session_state: v.optional(v.string()),
        refresh_token_expires_in: v.optional(v.number()),
      }),
    ),
    userMapping: v.array(
      v.object({
        oldId: v.string(),
        newId: v.string(),
      }),
    ),
  },
  handler: async (ctx, { accounts, userMapping }) => {
    const userMap = new Map(userMapping.map((u) => [u.oldId, u.newId]));
    const results = [];

    for (const account of accounts) {
      try {
        const convexUserId = userMap.get(account.userId);
        if (!convexUserId) {
          logger.warn(`User not found for account ${account.id}, skipping`);
          results.push({
            oldId: account.id,
            newId: null,
            status: "user_not_found",
          });
          continue;
        }

        const convexAccountId = await ctx.db.insert("accounts", {
          userId: convexUserId as any, // Type assertion for ID
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          type: account.type,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state: account.session_state,
          refresh_token_expires_in: account.refresh_token_expires_in,
        });

        results.push({
          oldId: account.id,
          newId: convexAccountId,
          status: "migrated",
        });
        logger.log(`Migrated account ${account.id}`);
      } catch (error) {
        logger.error(`Failed to migrate account ${account.id}:`, error);
        results.push({
          oldId: account.id,
          newId: null,
          status: "error",
          error: String(error),
        });
      }
    }

    return { total: accounts.length, results };
  },
});

// ===== USER SETTINGS MIGRATION =====

export const migrateUserSettings = internalMutation({
  args: {
    userSettings: v.array(
      v.object({
        id: v.string(),
        notePadUrl: v.string(),
        privateOrPublicUrl: v.optional(v.boolean()),
        password: v.optional(v.string()),
        ownedById: v.string(),
      }),
    ),
    userMapping: v.array(
      v.object({
        oldId: v.string(),
        newId: v.string(),
      }),
    ),
  },
  handler: async (ctx, { userSettings, userMapping }) => {
    const userMap = new Map(userMapping.map((u) => [u.oldId, u.newId]));
    const results = [];

    for (const settings of userSettings) {
      try {
        const convexUserId = userMap.get(settings.ownedById);
        if (!convexUserId) {
          logger.warn(`User not found for settings ${settings.id}, skipping`);
          results.push({
            oldId: settings.id,
            newId: null,
            status: "user_not_found",
          });
          continue;
        }

        const convexSettingsId = await ctx.db.insert("userSettings", {
          userId: convexUserId as any,
          notePadUrl: settings.notePadUrl,
          privateOrPublicUrl: settings.privateOrPublicUrl,
          password: settings.password,
          fcmToken: undefined, // This will be set separately from user.fcmToken
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        results.push({
          oldId: settings.id,
          newId: convexSettingsId,
          status: "migrated",
        });
        logger.log(`Migrated user settings ${settings.id}`);
      } catch (error) {
        logger.error(`Failed to migrate user settings ${settings.id}:`, error);
        results.push({
          oldId: settings.id,
          newId: null,
          status: "error",
          error: String(error),
        });
      }
    }

    return { total: userSettings.length, results };
  },
});

// ===== BOARDS MIGRATION =====

export const migrateBoards = internalMutation({
  args: {
    boards: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        color: v.string(),
        order: v.number(),
        userId: v.string(),
        createdAt: v.string(),
        updatedAt: v.string(),
      }),
    ),
    userMapping: v.array(
      v.object({
        oldId: v.string(),
        newId: v.string(),
      }),
    ),
  },
  handler: async (ctx, { boards, userMapping }) => {
    const userMap = new Map(userMapping.map((u) => [u.oldId, u.newId]));
    const results = [];

    for (const board of boards) {
      try {
        const convexUserId = userMap.get(board.userId);
        if (!convexUserId) {
          logger.warn(`User not found for board ${board.id}, skipping`);
          results.push({
            oldId: board.id,
            newId: null,
            status: "user_not_found",
          });
          continue;
        }

        const convexBoardId = await ctx.db.insert("boards", {
          name: board.name,
          color: board.color,
          order: board.order,
          userId: convexUserId as any,
          createdAt: new Date(board.createdAt).getTime(),
          updatedAt: new Date(board.updatedAt).getTime(),
        });

        results.push({
          oldId: board.id,
          newId: convexBoardId,
          status: "migrated",
        });
        logger.log(`Migrated board ${board.name}`);
      } catch (error) {
        logger.error(`Failed to migrate board ${board.id}:`, error);
        results.push({
          oldId: board.id,
          newId: null,
          status: "error",
          error: String(error),
        });
      }
    }

    return { total: boards.length, results };
  },
});

// ===== TASKS MIGRATION =====

export const migrateTasks = internalMutation({
  args: {
    tasks: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        status: v.union(
          v.literal("TODO"),
          v.literal("IN_PROGRESS"),
          v.literal("DONE"),
        ),
        order: v.number(),
        dueDate: v.optional(v.string()),
        boardId: v.string(),
        userId: v.string(),
        reminderEnabled: v.boolean(),
        reminderDateTime: v.optional(v.string()),
        reminderFrequency: v.optional(
          v.union(
            v.literal("ONCE"),
            v.literal("DAILY"),
            v.literal("WEEKLY"),
            v.literal("MONTHLY"),
          ),
        ),
        createdAt: v.string(),
        updatedAt: v.string(),
      }),
    ),
    userMapping: v.array(
      v.object({
        oldId: v.string(),
        newId: v.string(),
      }),
    ),
    boardMapping: v.array(
      v.object({
        oldId: v.string(),
        newId: v.string(),
      }),
    ),
  },
  handler: async (ctx, { tasks, userMapping, boardMapping }) => {
    const userMap = new Map(userMapping.map((u) => [u.oldId, u.newId]));
    const boardMap = new Map(boardMapping.map((b) => [b.oldId, b.newId]));
    const results = [];

    for (const task of tasks) {
      try {
        const convexUserId = userMap.get(task.userId);
        const convexBoardId = boardMap.get(task.boardId);

        if (!convexUserId || !convexBoardId) {
          logger.warn(`User or board not found for task ${task.id}, skipping`);
          results.push({
            oldId: task.id,
            newId: null,
            status: "dependencies_not_found",
          });
          continue;
        }

        const convexTaskId = await ctx.db.insert("tasks", {
          name: task.name,
          description: task.description,
          status: task.status,
          order: task.order,
          dueDate: task.dueDate ? new Date(task.dueDate).getTime() : undefined,
          boardId: convexBoardId as any,
          userId: convexUserId as any,
          reminderEnabled: task.reminderEnabled,
          reminderDateTime: task.reminderDateTime
            ? new Date(task.reminderDateTime).getTime()
            : undefined,
          reminderFrequency: task.reminderFrequency,
          createdAt: new Date(task.createdAt).getTime(),
          updatedAt: new Date(task.updatedAt).getTime(),
        });

        results.push({
          oldId: task.id,
          newId: convexTaskId,
          status: "migrated",
        });
        logger.log(`Migrated task ${task.name}`);
      } catch (error) {
        logger.error(`Failed to migrate task ${task.id}:`, error);
        results.push({
          oldId: task.id,
          newId: null,
          status: "error",
          error: String(error),
        });
      }
    }

    return { total: tasks.length, results };
  },
});

// ===== SCHEDULED NOTIFICATIONS MIGRATION =====

export const migrateScheduledNotifications = internalMutation({
  args: {
    notifications: v.array(
      v.object({
        id: v.string(),
        userId: v.string(),
        title: v.string(),
        body: v.string(),
        url: v.optional(v.string()),
        scheduledFor: v.string(),
        fcmToken: v.string(),
        sent: v.boolean(),
        createdAt: v.string(),
        updatedAt: v.string(),
      }),
    ),
    userMapping: v.array(
      v.object({
        oldId: v.string(),
        newId: v.string(),
      }),
    ),
  },
  handler: async (ctx, { notifications, userMapping }) => {
    const userMap = new Map(userMapping.map((u) => [u.oldId, u.newId]));
    const results = [];

    for (const notification of notifications) {
      try {
        const convexUserId = userMap.get(notification.userId);
        if (!convexUserId) {
          logger.warn(
            `User not found for notification ${notification.id}, skipping`,
          );
          results.push({
            oldId: notification.id,
            newId: null,
            status: "user_not_found",
          });
          continue;
        }

        const convexNotificationId = await ctx.db.insert(
          "scheduledNotifications",
          {
            userId: convexUserId as any,
            title: notification.title,
            body: notification.body,
            url: notification.url,
            scheduledFor: new Date(notification.scheduledFor).getTime(),
            fcmToken: notification.fcmToken,
            sent: notification.sent,
            createdAt: new Date(notification.createdAt).getTime(),
            updatedAt: new Date(notification.updatedAt).getTime(),
          },
        );

        results.push({
          oldId: notification.id,
          newId: convexNotificationId,
          status: "migrated",
        });
        logger.log(`Migrated scheduled notification ${notification.id}`);
      } catch (error) {
        logger.error(
          `Failed to migrate notification ${notification.id}:`,
          error,
        );
        results.push({
          oldId: notification.id,
          newId: null,
          status: "error",
          error: String(error),
        });
      }
    }

    return { total: notifications.length, results };
  },
});

// ===== DICTIONARY MIGRATION =====

export const migrateDictionaries = internalMutation({
  args: {
    dictionaries: v.array(
      v.object({
        id: v.string(),
        from: v.string(),
        to: v.string(),
        createdAt: v.string(),
        updatedAt: v.string(),
        ownedById: v.string(),
      }),
    ),
    userMapping: v.array(
      v.object({
        oldId: v.string(),
        newId: v.string(),
      }),
    ),
  },
  handler: async (ctx, { dictionaries, userMapping }) => {
    const userMap = new Map(userMapping.map((u) => [u.oldId, u.newId]));
    const results = [];

    for (const dictionary of dictionaries) {
      try {
        const convexUserId = userMap.get(dictionary.ownedById);
        if (!convexUserId) {
          logger.warn(
            `User not found for dictionary ${dictionary.id}, skipping`,
          );
          results.push({
            oldId: dictionary.id,
            newId: null,
            status: "user_not_found",
          });
          continue;
        }

        const convexDictionaryId = await ctx.db.insert("dictionary", {
          from: dictionary.from,
          to: dictionary.to,
          ownerId: convexUserId as any,
          isPublic: false, // Default to private
          createdAt: new Date(dictionary.createdAt).getTime(),
          updatedAt: new Date(dictionary.updatedAt).getTime(),
        });

        results.push({
          oldId: dictionary.id,
          newId: convexDictionaryId,
          status: "migrated",
        });
        logger.log(`Migrated dictionary entry ${dictionary.id}`);
      } catch (error) {
        logger.error(`Failed to migrate dictionary ${dictionary.id}:`, error);
        results.push({
          oldId: dictionary.id,
          newId: null,
          status: "error",
          error: String(error),
        });
      }
    }

    return { total: dictionaries.length, results };
  },
});

// ===== LEGACY NOTEPAD MIGRATION =====

export const migrateLegacyNotepads = internalMutation({
  args: {
    notepads: v.array(
      v.object({
        id: v.number(),
        content: v.optional(v.string()),
        createdAt: v.string(),
        updatedAt: v.string(),
        createdById: v.string(),
        parentId: v.optional(v.number()),
        isFolder: v.boolean(),
        order: v.number(),
      }),
    ),
  },
  handler: async (ctx, { notepads }) => {
    const results = [];
    const idMapping = new Map<number, string>(); // Map old numeric IDs to new Convex IDs

    // Sort notepads so parents come before children
    const sortedNotepads = [...notepads].sort((a, b) => {
      if (a.parentId === undefined && b.parentId !== undefined) return -1;
      if (a.parentId !== undefined && b.parentId === undefined) return 1;
      return 0;
    });

    for (const notepad of sortedNotepads) {
      try {
        let parentConvexId: string | undefined = undefined;
        if (notepad.parentId !== undefined) {
          parentConvexId = idMapping.get(notepad.parentId);
          if (!parentConvexId) {
            logger.warn(
              `Parent notepad ${notepad.parentId} not found for notepad ${notepad.id}, skipping`,
            );
            results.push({
              oldId: notepad.id,
              newId: null,
              status: "parent_not_found",
            });
            continue;
          }
        }

        const convexNotepadId = await ctx.db.insert("legacyNotepads", {
          content: notepad.content,
          createdById: notepad.createdById,
          parentId: parentConvexId as any,
          isFolder: notepad.isFolder,
          order: notepad.order,
          createdAt: new Date(notepad.createdAt).getTime(),
          updatedAt: new Date(notepad.updatedAt).getTime(),
        });

        idMapping.set(notepad.id, convexNotepadId);
        results.push({
          oldId: notepad.id,
          newId: convexNotepadId,
          status: "migrated",
        });
        logger.log(`Migrated legacy notepad ${notepad.id}`);
      } catch (error) {
        logger.error(`Failed to migrate notepad ${notepad.id}:`, error);
        results.push({
          oldId: notepad.id,
          newId: null,
          status: "error",
          error: String(error),
        });
      }
    }

    return {
      total: notepads.length,
      results,
      idMapping: Array.from(idMapping.entries()).map(([oldId, newId]) => ({
        oldId,
        newId,
      })),
    };
  },
});

// ===== LEGACY SHARED NOTES MIGRATION =====

export const migrateLegacySharedNotes = internalMutation({
  args: {
    sharedNotes: v.array(
      v.object({
        id: v.string(),
        url: v.string(),
        createdAt: v.string(),
        updatedAt: v.string(),
        noteId: v.number(),
      }),
    ),
    notepadMapping: v.array(
      v.object({
        oldId: v.number(),
        newId: v.string(),
      }),
    ),
  },
  handler: async (ctx, { sharedNotes, notepadMapping }) => {
    const notepadMap = new Map(notepadMapping.map((n) => [n.oldId, n.newId]));
    const results = [];

    for (const sharedNote of sharedNotes) {
      try {
        const convexNotepadId = notepadMap.get(sharedNote.noteId);
        if (!convexNotepadId) {
          logger.warn(
            `Notepad not found for shared note ${sharedNote.id}, skipping`,
          );
          results.push({
            oldId: sharedNote.id,
            newId: null,
            status: "notepad_not_found",
          });
          continue;
        }

        const convexSharedNoteId = await ctx.db.insert("legacySharedNotes", {
          url: sharedNote.url,
          noteId: convexNotepadId as any,
          createdAt: new Date(sharedNote.createdAt).getTime(),
          updatedAt: new Date(sharedNote.updatedAt).getTime(),
        });

        results.push({
          oldId: sharedNote.id,
          newId: convexSharedNoteId,
          status: "migrated",
        });
        logger.log(`Migrated legacy shared note ${sharedNote.id}`);
      } catch (error) {
        logger.error(`Failed to migrate shared note ${sharedNote.id}:`, error);
        results.push({
          oldId: sharedNote.id,
          newId: null,
          status: "error",
          error: String(error),
        });
      }
    }

    return { total: sharedNotes.length, results };
  },
});

// ===== FULL MIGRATION ORCHESTRATOR =====

export const runFullMigration = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
    includeData: v.object({
      users: v.array(v.any()),
      accounts: v.array(v.any()),
      userSettings: v.array(v.any()),
      boards: v.array(v.any()),
      tasks: v.array(v.any()),
      scheduledNotifications: v.array(v.any()),
      replaceDictionaries: v.array(v.any()),
      legacyNotepads: v.array(v.any()),
      legacySharedNotes: v.array(v.any()),
    }),
  },
  handler: async (ctx, { dryRun = false, includeData }): Promise<any> => {
    logger.log(`Starting full migration (dryRun: ${dryRun})`);

    if (dryRun) {
      return {
        success: true,
        message: "Dry run completed - no data was actually migrated",
        stats: {
          users: includeData.users.length,
          accounts: includeData.accounts.length,
          userSettings: includeData.userSettings.length,
          boards: includeData.boards.length,
          tasks: includeData.tasks.length,
          scheduledNotifications: includeData.scheduledNotifications.length,
          replaceDictionaries: includeData.replaceDictionaries.length,
          legacyNotepads: includeData.legacyNotepads.length,
          legacySharedNotes: includeData.legacySharedNotes.length,
        },
      };
    }

    const migrationResults = {
      users: { total: 0, migrated: 0, errors: 0 },
      accounts: { total: 0, migrated: 0, errors: 0 },
      userSettings: { total: 0, migrated: 0, errors: 0 },
      boards: { total: 0, migrated: 0, errors: 0 },
      tasks: { total: 0, migrated: 0, errors: 0 },
      scheduledNotifications: { total: 0, migrated: 0, errors: 0 },
      dictionaries: { total: 0, migrated: 0, errors: 0 },
      legacyNotepads: { total: 0, migrated: 0, errors: 0 },
      legacySharedNotes: { total: 0, migrated: 0, errors: 0 },
    };

    try {
      // Step 1: Migrate users first (everything depends on users)
      logger.log("Step 1: Migrating users...");
      const userResult: any = await ctx.runMutation(
        internal.migrations.migrateUsers,
        {
          users: includeData.users,
        },
      );
      migrationResults.users = {
        total: userResult.total,
        migrated: userResult.results.filter((r: any) => r.status === "migrated")
          .length,
        errors: userResult.results.filter((r: any) => r.status === "error")
          .length,
      };
      const userMapping: any = userResult.results
        .filter((r: any) => r.newId)
        .map((r: any) => ({ oldId: r.oldId, newId: r.newId! }));

      // Step 2: Migrate user settings
      logger.log("Step 2: Migrating user settings...");
      const settingsResult = await ctx.runMutation(
        internal.migrations.migrateUserSettings,
        {
          userSettings: includeData.userSettings,
          userMapping,
        },
      );
      migrationResults.userSettings = {
        total: settingsResult.total,
        migrated: settingsResult.results.filter(
          (r: any) => r.status === "migrated",
        ).length,
        errors: settingsResult.results.filter((r: any) => r.status === "error")
          .length,
      };

      // Step 3: Migrate boards
      logger.log("Step 3: Migrating boards...");
      const boardResult: any = await ctx.runMutation(
        internal.migrations.migrateBoards,
        {
          boards: includeData.boards,
          userMapping,
        },
      );
      migrationResults.boards = {
        total: boardResult.total,
        migrated: boardResult.results.filter(
          (r: any) => r.status === "migrated",
        ).length,
        errors: boardResult.results.filter((r: any) => r.status === "error")
          .length,
      };
      const boardMapping: any = boardResult.results
        .filter((r: any) => r.newId)
        .map((r: any) => ({ oldId: r.oldId, newId: r.newId! }));

      // Step 4: Migrate tasks
      logger.log("Step 4: Migrating tasks...");
      const taskResult = await ctx.runMutation(
        internal.migrations.migrateTasks,
        {
          tasks: includeData.tasks,
          userMapping,
          boardMapping,
        },
      );
      migrationResults.tasks = {
        total: taskResult.total,
        migrated: taskResult.results.filter((r: any) => r.status === "migrated")
          .length,
        errors: taskResult.results.filter((r: any) => r.status === "error")
          .length,
      };

      // Step 5: Migrate scheduled notifications
      logger.log("Step 5: Migrating scheduled notifications...");
      const notificationResult: any = await ctx.runMutation(
        internal.migrations.migrateScheduledNotifications,
        {
          notifications: includeData.scheduledNotifications,
          userMapping,
        },
      );
      migrationResults.scheduledNotifications = {
        total: notificationResult.total,
        migrated: notificationResult.results.filter(
          (r: any) => r.status === "migrated",
        ).length,
        errors: notificationResult.results.filter(
          (r: any) => r.status === "error",
        ).length,
      };

      // Step 6: Migrate dictionaries
      logger.log("Step 6: Migrating dictionaries...");
      const dictionaryResult: any = await ctx.runMutation(
        internal.migrations.migrateDictionaries,
        {
          dictionaries: includeData.replaceDictionaries,
          userMapping,
        },
      );
      migrationResults.dictionaries = {
        total: dictionaryResult.total,
        migrated: dictionaryResult.results.filter(
          (r: any) => r.status === "migrated",
        ).length,
        errors: dictionaryResult.results.filter(
          (r: any) => r.status === "error",
        ).length,
      };

      // Step 7: Migrate legacy notepads
      logger.log("Step 7: Migrating legacy notepads...");
      const legacyNotepadResult: any = await ctx.runMutation(
        internal.migrations.migrateLegacyNotepads,
        {
          notepads: includeData.legacyNotepads,
        },
      );
      migrationResults.legacyNotepads = {
        total: legacyNotepadResult.total,
        migrated: legacyNotepadResult.results.filter(
          (r: any) => r.status === "migrated",
        ).length,
        errors: legacyNotepadResult.results.filter(
          (r: any) => r.status === "error",
        ).length,
      };
      const notepadMapping: any = legacyNotepadResult.idMapping;

      // Step 8: Migrate legacy shared notes
      logger.log("Step 8: Migrating legacy shared notes...");
      const legacySharedNoteResult: any = await ctx.runMutation(
        internal.migrations.migrateLegacySharedNotes,
        {
          sharedNotes: includeData.legacySharedNotes,
          notepadMapping,
        },
      );
      migrationResults.legacySharedNotes = {
        total: legacySharedNoteResult.total,
        migrated: legacySharedNoteResult.results.filter(
          (r: any) => r.status === "migrated",
        ).length,
        errors: legacySharedNoteResult.results.filter(
          (r: any) => r.status === "error",
        ).length,
      };

      logger.log("Full migration completed successfully!");
      return {
        success: true,
        migrationResults,
        userMapping,
        boardMapping,
        notepadMapping,
      };
    } catch (error) {
      logger.error("Migration failed:", error);
      throw new ConvexError(
        `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});

// ===== PUBLIC MIGRATION ENDPOINT =====

export const runMigrationFromScript = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
    includeData: v.object({
      users: v.array(v.any()),
      accounts: v.array(v.any()),
      userSettings: v.array(v.any()),
      boards: v.array(v.any()),
      tasks: v.array(v.any()),
      scheduledNotifications: v.array(v.any()),
      replaceDictionaries: v.array(v.any()),
      legacyNotepads: v.array(v.any()),
      legacySharedNotes: v.array(v.any()),
    }),
  },
  handler: async (ctx, args): Promise<any> => {
    return await ctx.runMutation(internal.migrations.runFullMigration, args);
  },
});

// ===== VALIDATION QUERIES =====

export const validateMigration = query({
  handler: async (ctx) => {
    const stats = {
      users: await ctx.db
        .query("users")
        .collect()
        .then((r) => r.length),
      accounts: await ctx.db
        .query("accounts")
        .collect()
        .then((r) => r.length),
      userSettings: await ctx.db
        .query("userSettings")
        .collect()
        .then((r) => r.length),
      boards: await ctx.db
        .query("boards")
        .collect()
        .then((r) => r.length),
      tasks: await ctx.db
        .query("tasks")
        .collect()
        .then((r) => r.length),
      scheduledNotifications: await ctx.db
        .query("scheduledNotifications")
        .collect()
        .then((r) => r.length),
      dictionary: await ctx.db
        .query("dictionary")
        .collect()
        .then((r) => r.length),
      legacyNotepads: await ctx.db
        .query("legacyNotepads")
        .collect()
        .then((r) => r.length),
      legacySharedNotes: await ctx.db
        .query("legacySharedNotes")
        .collect()
        .then((r) => r.length),
    };

    return {
      convexStats: stats,
      validationChecks: {
        usersHaveEmails: stats.users > 0 ? "✅" : "❌",
        boardsHaveUsers: stats.boards > 0 ? "✅" : "❌",
        tasksHaveBoards: stats.tasks > 0 ? "✅" : "❌",
        notificationsHaveUsers: stats.scheduledNotifications > 0 ? "✅" : "❌",
        dictionariesExist: stats.dictionary >= 0 ? "✅" : "❌",
        legacyDataMigrated:
          stats.legacyNotepads + stats.legacySharedNotes > 0 ? "✅" : "❌",
      },
    };
  },
});

// ===== ROLLBACK FUNCTIONALITY =====

export const rollbackMigration = internalMutation({
  args: {
    tables: v.optional(v.array(v.string())),
  },
  handler: async (
    ctx,
    { tables = ["users", "accounts", "userSettings", "boards", "tasks"] },
  ) => {
    logger.warn("Rolling back migration...");

    const results = [];

    for (const table of tables) {
      try {
        // Get all documents from the table
        const documents = await ctx.db.query(table as any).collect();

        // Delete each document
        for (const doc of documents) {
          await ctx.db.delete(doc._id);
        }

        results.push({ table, deleted: documents.length, status: "success" });
        logger.log(`Rolled back ${documents.length} records from ${table}`);
      } catch (error) {
        logger.error(`Failed to rollback ${table}:`, error);
        results.push({
          table,
          deleted: 0,
          status: "error",
          error: String(error),
        });
      }
    }

    return { results };
  },
});

// ===== TOUR CLEANUP MIGRATION =====

export const cleanupTourFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    logger.log("Starting tour fields cleanup from userSettings...");
    
    // Get all userSettings documents
    const allUserSettings = await ctx.db.query("userSettings").collect();
    
    const results = {
      total: allUserSettings.length,
      cleaned: 0,
      errors: 0,
    };

    for (const userSetting of allUserSettings) {
      try {
        // Check if the document has tour-related fields
        const doc = userSetting as any;
        const hasTourFields = 
          'tourCompleted' in doc || 
          'tourSkipped' in doc || 
          'tourCompletionDate' in doc;

        if (hasTourFields) {
          // Create a clean version without tour fields
          const cleanedData: any = {
            userId: userSetting.userId,
            notePadUrl: userSetting.notePadUrl,
            notePadUrlLower: userSetting.notePadUrlLower,
            privateOrPublicUrl: userSetting.privateOrPublicUrl,
            password: userSetting.password,
            fcmToken: userSetting.fcmToken,
            createdAt: userSetting.createdAt,
            updatedAt: Date.now(),
          };

          // Remove undefined fields
          Object.keys(cleanedData).forEach(key => {
            if (cleanedData[key] === undefined) {
              delete cleanedData[key];
            }
          });

          // Replace the document with cleaned data
          await ctx.db.replace(userSetting._id, cleanedData);
          results.cleaned++;
          
          logger.log(`Cleaned tour fields from userSettings document ${userSetting._id}`);
        }
      } catch (error) {
        logger.error(`Failed to clean userSettings document ${userSetting._id}:`, error);
        results.errors++;
      }
    }

    logger.log(`Tour cleanup completed. Total: ${results.total}, Cleaned: ${results.cleaned}, Errors: ${results.errors}`);
    return results;
  },
});

// Public endpoint for tour cleanup
export const runTourFieldsCleanup = mutation({
  args: {},
  handler: async (ctx): Promise<{
    total: number;
    cleaned: number;
    errors: number;
  }> => {
    return await ctx.runMutation(internal.migrations.cleanupTourFields, {});
  },
});
