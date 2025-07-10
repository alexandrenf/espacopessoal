import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Production-ready logging utility
const logger = {
  log: (message: string, ...args: unknown[]) => {
    console.log(`[migration] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[migration] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[migration] ${message}`, ...args);
  },
};

// Get all users who have documents but no notebooks
export const getUsersNeedingMigration = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get all documents
    const documents = await ctx.db.query("documents").collect();

    // Get all notebooks
    const notebooks = await ctx.db.query("notebooks").collect();

    // Create sets for efficient lookup
    const userIdsWithDocuments = new Set(documents.map((doc) => doc.ownerId));
    const userIdsWithNotebooks = new Set(
      notebooks.map((notebook) => notebook.ownerId),
    );

    // Find users with documents but no notebooks
    const usersNeedingMigration = Array.from(userIdsWithDocuments).filter(
      (userId) => !userIdsWithNotebooks.has(userId),
    );

    logger.log(`Found ${usersNeedingMigration.length} users needing migration`);

    return {
      usersNeedingMigration,
      totalDocuments: documents.length,
      totalNotebooks: notebooks.length,
      documentsWithoutNotebooks: documents.filter((doc) => !doc.notebookId)
        .length,
    };
  },
});

// Create default notebook for a user
export const createDefaultNotebook = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if user already has a "main" notebook
    const existingNotebook = await ctx.db
      .query("notebooks")
      .withIndex("by_owner_and_url", (q) =>
        q.eq("ownerId", args.userId).eq("url", "main"),
      )
      .first();

    if (existingNotebook) {
      logger.warn(`User ${args.userId} already has a main notebook`);
      return existingNotebook._id;
    }

    // Create default notebook
    const notebookId = await ctx.db.insert("notebooks", {
      url: "main",
      title: "My Notebook",
      description: "Your personal notebook for organizing thoughts and ideas",
      ownerId: args.userId,
      isPrivate: false,
      createdAt: now,
      updatedAt: now,
    });

    logger.log(
      `Created default notebook for user ${args.userId}: ${notebookId}`,
    );
    return notebookId;
  },
});

// Migrate documents for a specific user
export const migrateUserDocuments = internalMutation({
  args: {
    userId: v.id("users"),
    notebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    // Get all documents for this user that don't have a notebook
    const documentsToMigrate = await ctx.db
      .query("documents")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", args.userId))
      .filter((q) => q.eq(q.field("notebookId"), undefined))
      .collect();

    logger.log(
      `Found ${documentsToMigrate.length} documents to migrate for user ${args.userId}`,
    );

    // Update each document with the notebook ID
    const updatePromises = documentsToMigrate.map((doc) =>
      ctx.db.patch(doc._id, {
        notebookId: args.notebookId,
        updatedAt: Date.now(),
      }),
    );

    await Promise.all(updatePromises);

    logger.log(
      `Migrated ${documentsToMigrate.length} documents for user ${args.userId}`,
    );

    return {
      migratedCount: documentsToMigrate.length,
      documentIds: documentsToMigrate.map((doc) => doc._id),
    };
  },
});

// Full migration process - simplified version
export const runFullMigration = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;

    logger.log(`Starting full migration ${dryRun ? "(DRY RUN)" : ""}`);

    // Get all documents
    const documents = await ctx.db.query("documents").collect();

    // Get all notebooks
    const notebooks = await ctx.db.query("notebooks").collect();

    // Create sets for efficient lookup
    const userIdsWithDocuments = new Set(documents.map((doc) => doc.ownerId));
    const userIdsWithNotebooks = new Set(
      notebooks.map((notebook) => notebook.ownerId),
    );

    // Find users with documents but no notebooks
    const usersNeedingMigration = Array.from(userIdsWithDocuments).filter(
      (userId) => !userIdsWithNotebooks.has(userId),
    );

    logger.log(`Found ${usersNeedingMigration.length} users needing migration`);

    if (usersNeedingMigration.length === 0) {
      logger.log("No users need migration");
      return {
        success: true,
        message: "No users need migration",
        usersNeedingMigration: [],
      };
    }

    if (dryRun) {
      logger.log("DRY RUN - Would migrate:", usersNeedingMigration);
      return {
        success: true,
        message: "DRY RUN completed - no changes made",
        wouldMigrate: usersNeedingMigration,
      };
    }

    // Process each user
    const migrationResults: Array<{
      userId: string;
      notebookId?: Id<"notebooks">;
      migratedCount?: number;
      error?: string;
    }> = [];

    for (const userId of usersNeedingMigration) {
      try {
        logger.log(`Processing user: ${userId}`);

        // Create default notebook
        const now = Date.now();
        const notebookId = await ctx.db.insert("notebooks", {
          url: "main",
          title: "My Notebook",
          description:
            "Your personal notebook for organizing thoughts and ideas",
          ownerId: userId,
          isPrivate: false,
          createdAt: now,
          updatedAt: now,
        });

        // Get documents to migrate
        const documentsToMigrate = documents.filter(
          (doc) => doc.ownerId === userId && !doc.notebookId,
        );

        // Update documents with notebook ID
        await Promise.all(
          documentsToMigrate.map((doc) =>
            ctx.db.patch(doc._id, {
              notebookId,
              updatedAt: now,
            }),
          ),
        );

        migrationResults.push({
          userId,
          notebookId,
          migratedCount: documentsToMigrate.length,
        });

        logger.log(
          `Completed migration for user ${userId}: ${documentsToMigrate.length} documents`,
        );
      } catch (error) {
        logger.error(`Failed to migrate user ${userId}:`, error);
        migrationResults.push({
          userId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = migrationResults.filter((r) => !r.error).length;
    const errorCount = migrationResults.filter((r) => r.error).length;

    logger.log(
      `Migration completed: ${successCount} successful, ${errorCount} errors`,
    );

    return {
      success: errorCount === 0,
      message: `Migration completed: ${successCount} successful, ${errorCount} errors`,
      migrationResults,
    };
  },
});

// Validate migration results
export const validateMigration = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Check for documents without notebooks
    const documentsWithoutNotebooks = await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("notebookId"), undefined))
      .collect();

    // Check for orphaned documents (notebook doesn't exist)
    const allDocuments = await ctx.db.query("documents").collect();
    const allNotebooks = await ctx.db.query("notebooks").collect();

    const notebookIds = new Set(allNotebooks.map((n) => n._id));
    const orphanedDocuments = allDocuments.filter(
      (doc) => doc.notebookId && !notebookIds.has(doc.notebookId),
    );

    // Check for users without notebooks
    const userIdsWithDocuments = new Set(
      allDocuments.map((doc) => doc.ownerId),
    );
    const userIdsWithNotebooks = new Set(
      allNotebooks.map((notebook) => notebook.ownerId),
    );
    const usersWithoutNotebooks = Array.from(userIdsWithDocuments).filter(
      (userId) => !userIdsWithNotebooks.has(userId),
    );

    const isValid =
      documentsWithoutNotebooks.length === 0 &&
      orphanedDocuments.length === 0 &&
      usersWithoutNotebooks.length === 0;

    logger.log(`Migration validation: ${isValid ? "VALID" : "INVALID"}`);

    return {
      isValid,
      documentsWithoutNotebooks: documentsWithoutNotebooks.length,
      orphanedDocuments: orphanedDocuments.length,
      usersWithoutNotebooks: usersWithoutNotebooks.length,
      totalDocuments: allDocuments.length,
      totalNotebooks: allNotebooks.length,
      issues: {
        documentsWithoutNotebooks: documentsWithoutNotebooks.map((doc) => ({
          id: doc._id,
          title: doc.title,
          ownerId: doc.ownerId,
        })),
        orphanedDocuments: orphanedDocuments.map((doc) => ({
          id: doc._id,
          title: doc.title,
          notebookId: doc.notebookId,
        })),
        usersWithoutNotebooks,
      },
    };
  },
});

// Rollback migration (emergency use only)
export const rollbackMigration = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;

    logger.warn(`Starting migration rollback ${dryRun ? "(DRY RUN)" : ""}`);

    // Get all documents with notebook associations
    const documentsWithNotebooks = await ctx.db
      .query("documents")
      .filter((q) => q.neq(q.field("notebookId"), undefined))
      .collect();

    logger.warn(
      `Found ${documentsWithNotebooks.length} documents with notebook associations`,
    );

    if (dryRun) {
      logger.warn(
        "DRY RUN - Would remove notebook associations from documents",
      );
      return {
        success: true,
        message: "DRY RUN - Would remove notebook associations",
        documentsAffected: documentsWithNotebooks.length,
      };
    }

    // Remove notebook associations from documents
    const updatePromises = documentsWithNotebooks.map((doc) =>
      ctx.db.patch(doc._id, {
        notebookId: undefined,
        updatedAt: Date.now(),
      }),
    );

    await Promise.all(updatePromises);

    logger.warn(
      `Removed notebook associations from ${documentsWithNotebooks.length} documents`,
    );

    return {
      success: true,
      message: `Rollback completed - removed notebook associations from ${documentsWithNotebooks.length} documents`,
      documentsAffected: documentsWithNotebooks.length,
    };
  },
});
