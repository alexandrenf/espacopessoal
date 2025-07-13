import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { type Id, type Doc } from "./_generated/dataModel";
import { nanoid } from "nanoid";

// Production-ready logging utility
// Use LOG_LEVEL environment variable instead of NODE_ENV since NODE_ENV is always 'development' in Convex sandbox
const isDevelopment = process.env.LOG_LEVEL === "development";
const logger = {
  log: (message: string, ...args: unknown[]) => {
    // Only log in development, remove for production
    if (isDevelopment) {
      console.log(`[documents] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    // Always log errors, but only in structured way for production monitoring
    console.error(`[documents] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(`[documents] ${message}`, ...args);
    }
  },
  // Remove debug logging in production
  debug: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.log(`[documents:debug] ${message}`, ...args);
    }
  },
};

// For backward compatibility during migration
// TODO: Create tracking issue to phase out DEFAULT_USER_ID in favor of native Convex user IDs
const DEFAULT_USER_ID = "demo-user";

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    initialContent: v.optional(v.string()),
    notebookId: v.optional(v.id("notebooks")), // Reference to parent notebook
    parentId: v.optional(v.id("documents")), // Parent folder
    isFolder: v.optional(v.boolean()), // Whether this is a folder
    isHome: v.optional(v.boolean()), // Whether this is the home document
    userId: v.id("users"), // User ID for authentication
  },
  handler: async (ctx, args) => {
    // Validate user ID
    if (!args.userId) {
      throw new ConvexError(
        "User ID is required to create documents. Please log in and try again.",
      );
    }

    const userId = args.userId;
    const now = Date.now();
    const isFolder = args.isFolder ?? false;

    // Use atomic transaction to prevent race conditions
    // All operations (parent validation, order calculation, insertion) happen atomically
    try {
      // Validate notebook if provided
      if (args.notebookId) {
        const notebook = await ctx.db.get(args.notebookId);
        if (!notebook || notebook.ownerId !== userId) {
          throw new ConvexError("Notebook not found or access denied");
        }
      }

      // Get the next order number for the parent - optimized approach
      let order = 0;
      if (args.parentId) {
        // Verify parent exists and is a folder
        const parent = await ctx.db.get(args.parentId);
        if (!parent?.isFolder) {
          throw new ConvexError("Parent must be a folder");
        }

        // Verify parent belongs to the same notebook
        if (args.notebookId && parent.notebookId !== args.notebookId) {
          throw new ConvexError("Parent must be in the same notebook");
        }

        // Get the highest order in the parent folder - optimized with limit
        const lastSibling = await ctx.db
          .query("documents")
          .withIndex("by_parent_and_order", (q) =>
            q.eq("parentId", args.parentId),
          )
          .order("desc")
          .first();
        order = (lastSibling?.order ?? -1) + 1;
      } else {
        // Get the highest order in the root level for this notebook - optimized with limit
        let query = ctx.db
          .query("documents")
          .withIndex("by_parent_and_order", (q) => q.eq("parentId", undefined))
          .filter((q) => q.eq(q.field("ownerId"), userId));

        // Filter by notebook if provided
        if (args.notebookId) {
          query = query.filter((q) =>
            q.eq(q.field("notebookId"), args.notebookId),
          );
        }

        const lastSibling = await query.order("desc").first();
        order = (lastSibling?.order ?? -1) + 1;
      }

      // Insert the document atomically within the same transaction
      return await ctx.db.insert("documents", {
        title: args.title ?? (isFolder ? "New Folder" : "Untitled Document"),
        ownerId: userId,
        notebookId: args.notebookId,
        initialContent: isFolder ? undefined : (args.initialContent ?? ""),
        roomId: undefined, // Will be set to document ID after creation
        createdAt: now,
        updatedAt: now,
        parentId: args.parentId,
        order,
        isFolder,
        isHome: args.isHome ?? false,
      });
    } catch (error) {
      logger.error("Document creation failed:", error);
      throw error instanceof ConvexError
        ? error
        : new ConvexError("Document creation failed");
    }
  },
});

// Create document in public notebook (allows anyone to create documents)
export const createInPublicNotebook = mutation({
  args: {
    title: v.optional(v.string()),
    initialContent: v.optional(v.string()),
    notebookId: v.id("notebooks"), // Required for public notebook
    parentId: v.optional(v.id("documents")), // Parent folder
    isFolder: v.optional(v.boolean()), // Whether this is a folder
    userId: v.optional(v.id("users")), // Optional - can be null for anonymous users
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const isFolder = args.isFolder ?? false;

    // Validate that the notebook exists and is public
    const notebook = await ctx.db.get(args.notebookId);
    if (!notebook) {
      throw new ConvexError("Notebook not found");
    }
    if (notebook.isPrivate) {
      throw new ConvexError("Cannot create documents in private notebooks");
    }

    // Use notebook owner as the document owner for public notebooks
    const ownerId = notebook.ownerId;

    try {
      // Validate parent folder if provided
      if (args.parentId) {
        const parent = await ctx.db.get(args.parentId);
        if (!parent?.isFolder) {
          throw new ConvexError("Parent must be a folder");
        }

        // Verify parent belongs to the same notebook
        if (parent.notebookId !== args.notebookId) {
          throw new ConvexError("Parent must be in the same notebook");
        }

        // Get the highest order in the parent folder
        const lastSibling = await ctx.db
          .query("documents")
          .withIndex("by_parent_and_order", (q) =>
            q.eq("parentId", args.parentId),
          )
          .order("desc")
          .first();
        const order = (lastSibling?.order ?? -1) + 1;

        // Insert the document
        return await ctx.db.insert("documents", {
          title: args.title ?? (isFolder ? "New Folder" : "Untitled Document"),
          ownerId,
          notebookId: args.notebookId,
          initialContent: isFolder ? undefined : (args.initialContent ?? ""),
          roomId: undefined, // Will be set to document ID after creation
          createdAt: now,
          updatedAt: now,
          parentId: args.parentId,
          order,
          isFolder,
          isHome: false,
        });
      } else {
        // Get the highest order in the root level for this notebook
        const lastSibling = await ctx.db
          .query("documents")
          .withIndex("by_parent_and_order", (q) => q.eq("parentId", undefined))
          .filter((q) => q.eq(q.field("notebookId"), args.notebookId))
          .order("desc")
          .first();
        const order = (lastSibling?.order ?? -1) + 1;

        // Insert the document
        return await ctx.db.insert("documents", {
          title: args.title ?? (isFolder ? "New Folder" : "Untitled Document"),
          ownerId,
          notebookId: args.notebookId,
          initialContent: isFolder ? undefined : (args.initialContent ?? ""),
          roomId: undefined, // Will be set to document ID after creation
          createdAt: now,
          updatedAt: now,
          parentId: args.parentId,
          order,
          isFolder,
          isHome: false,
        });
      }
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError(
        `Failed to create document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});

export const get = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    notebookId: v.optional(v.id("notebooks")), // Filter by notebook
    userId: v.id("users"), // User ID for authentication
  },
  handler: async (ctx, { paginationOpts, search, notebookId, userId }) => {
    // Validate user ID
    if (!userId) {
      throw new ConvexError("User ID is required for authentication");
    }

    const ownerId = userId;

    if (search) {
      let searchQuery = ctx.db
        .query("documents")
        .withSearchIndex("search_title", (q) =>
          q.search("title", search).eq("ownerId", ownerId),
        );

      // Filter by notebook if provided
      if (notebookId) {
        searchQuery = searchQuery.filter((q) =>
          q.eq(q.field("notebookId"), notebookId),
        );
      }

      return await searchQuery.paginate(paginationOpts);
    }

    let query = ctx.db
      .query("documents")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", ownerId));

    // Filter by notebook if provided
    if (notebookId) {
      query = query.filter((q) => q.eq(q.field("notebookId"), notebookId));
    }

    return await query.order("desc").paginate(paginationOpts);
  },
});

// New query to get hierarchical documents
export const getHierarchical = query({
  args: {
    parentId: v.optional(v.id("documents")),
    notebookId: v.optional(v.id("notebooks")), // Filter by notebook
    userId: v.optional(v.id("users")), // User ID for authentication (optional for public content)
    hasValidPassword: v.optional(v.boolean()), // Whether user has provided valid password for private notebook
  },
  handler: async (ctx, { parentId, notebookId, userId, hasValidPassword }) => {
    // If no userId provided, check access based on notebook privacy and password validation
    if (!userId) {
      if (!notebookId) {
        throw new ConvexError("User ID or notebook ID is required");
      }

      // Check if the notebook is public or user has valid password
      const notebook = await ctx.db.get(notebookId);
      if (!notebook) {
        throw new ConvexError("Notebook not found");
      }

      // Allow access if notebook is public OR if it's private but user has valid password
      if (notebook.isPrivate && !hasValidPassword) {
        throw new ConvexError("Access denied to private notebook");
      }

      console.log("Document access check:", {
        notebookId: notebook._id,
        isPrivate: notebook.isPrivate,
        hasPassword: !!notebook.password,
        hasValidPassword,
        userId,
        accessGranted: !notebook.isPrivate || hasValidPassword,
      });

      // Return documents in accessible notebook
      const query = ctx.db
        .query("documents")
        .withIndex("by_parent_id", (q) => q.eq("parentId", parentId))
        .filter((q) => q.eq(q.field("notebookId"), notebookId));

      return await query.order("asc").collect();
    }

    // For authenticated users, check ownership
    const ownerId = userId;

    let query = ctx.db
      .query("documents")
      .withIndex("by_parent_id", (q) => q.eq("parentId", parentId))
      .filter((q) => q.eq(q.field("ownerId"), ownerId));

    // Filter by notebook if provided
    if (notebookId) {
      query = query.filter((q) => q.eq(q.field("notebookId"), notebookId));
    }

    return await query.order("asc").collect();
  },
});

// Get all documents in a flat structure for the tree with pagination
export const getAllForTree = query({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    notebookId: v.optional(v.id("notebooks")), // Filter by notebook
    userId: v.id("users"), // User ID for authentication
  },
  handler: async (ctx, { cursor, limit, notebookId, userId }) => {
    // Validate user ID
    if (!userId) {
      throw new ConvexError("User ID is required for authentication");
    }

    const ownerId = userId;
    const documentLimit = limit ?? 100; // Reduced default limit for better performance

    let query = ctx.db
      .query("documents")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", ownerId))
      .order("asc");

    if (cursor) {
      query = query.filter((q) => q.gt(q.field("_id"), cursor));
    }

    // Filter by notebook if provided
    if (notebookId) {
      query = query.filter((q) => q.eq(q.field("notebookId"), notebookId));
    }

    const documents = await query.take(documentLimit);

    return {
      documents,
      nextCursor:
        documents.length === documentLimit
          ? (documents[documents.length - 1]?._id ?? null)
          : null,
      hasMore: documents.length === documentLimit,
    };
  },
});

// Get all documents for tree (fallback for components not ready for pagination)
export const getAllForTreeLegacy = query({
  args: {
    limit: v.optional(v.number()),
    notebookId: v.optional(v.id("notebooks")), // Filter by notebook
    userId: v.optional(v.id("users")), // User ID for authentication (optional for public access)
    hasValidPassword: v.optional(v.boolean()), // Whether user has provided valid password for private notebook
    sessionToken: v.optional(v.string()), // Session token for private notebook access
  },
  handler: async (ctx, { limit, notebookId, userId, hasValidPassword, sessionToken }) => {
    const documentLimit = limit ?? 100; // Reduced from 1000 to 100

    // TODO: Implement proper sessionToken validation for private notebook access
    // For now, sessionToken is accepted but not used - relying on hasValidPassword flag

    // If no userId provided, only return documents in public notebooks or password-protected notebooks
    if (!userId) {
      if (!notebookId) {
        throw new ConvexError("User ID or notebook ID is required");
      }

      // Check if the notebook is public or user has valid password
      const notebook = await ctx.db.get(notebookId);
      if (!notebook) {
        throw new ConvexError("Notebook not found");
      }

      // Allow access if notebook is public OR if it's private but user has valid password
      if (notebook.isPrivate && !hasValidPassword) {
        throw new ConvexError("Access denied to private notebook");
      }

      // Return documents in accessible notebook
      const query = ctx.db
        .query("documents")
        .withIndex("by_notebook_id", (q) => q.eq("notebookId", notebookId))
        .order("asc");

      return await query.take(documentLimit);
    }

    // If userId is provided, check if user is the owner of the notebook (if notebookId is provided)
    if (notebookId) {
      const notebook = await ctx.db.get(notebookId);
      if (!notebook) {
        throw new ConvexError("Notebook not found");
      }
      const isOwner = notebook.ownerId === userId;
      const isPublicNotebook = !notebook.isPrivate;
      if (!isOwner && !isPublicNotebook) {
        throw new ConvexError("Access denied to private notebook");
      }
      // Return all documents in the notebook
      const query = ctx.db
        .query("documents")
        .withIndex("by_notebook_id", (q) => q.eq("notebookId", notebookId))
        .order("asc");
      return await query.take(documentLimit);
    }

    // If no notebookId, return all documents owned by the user
    const ownerId = userId;
    const query = ctx.db
      .query("documents")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", ownerId))
      .order("asc");
    return await query.take(documentLimit);
  },
});

export const getById = query({
  args: {
    id: v.id("documents"),
    userId: v.optional(v.id("users")), // Made optional for public document access
    notebookId: v.optional(v.id("notebooks")), // Validate notebook access
  },
  handler: async (ctx, { id, userId, notebookId }) => {
    const document = await ctx.db.get(id);
    if (!document) {
      throw new ConvexError("Document not found!");
    }

    // If document has a notebook, check if it's public
    if (document.notebookId) {
      const notebook = await ctx.db.get(document.notebookId);
      if (!notebook) {
        throw new ConvexError("Document's notebook not found");
      }

      // Check if user has access to the notebook
      const isOwner = userId && notebook.ownerId === userId;
      const isPublicNotebook = !notebook.isPrivate;

      if (!isOwner && !isPublicNotebook) {
        throw new ConvexError(
          "You don't have permission to access this document",
        );
      }
    } else {
      // For documents without notebooks, require ownership
      if (!userId || document.ownerId !== userId) {
        throw new ConvexError(
          "You don't have permission to access this document",
        );
      }
    }

    // Validate notebook access if provided
    if (notebookId && document.notebookId !== notebookId) {
      throw new ConvexError(
        "Document does not belong to the specified notebook",
      );
    }

    return document;
  },
});

export const updateById = mutation({
  args: {
    id: v.id("documents"),
    title: v.string(),
    userId: v.id("users"), // Made required for security
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      throw new ConvexError("User ID is required to update documents");
    }

    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new ConvexError("Document not found!");
    }

    // Verify ownership - only document owner can update
    if (document.ownerId !== args.userId) {
      throw new ConvexError(
        "You don't have permission to update this document",
      );
    }

    return await ctx.db.patch(args.id, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

// Update document title in public notebook (allows anyone to edit)
export const updateInPublicNotebook = mutation({
  args: {
    id: v.id("documents"),
    title: v.string(),
    notebookId: v.id("notebooks"), // Required to verify it's a public notebook
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new ConvexError("Document not found!");
    }

    // Verify the document belongs to the specified notebook
    if (document.notebookId !== args.notebookId) {
      throw new ConvexError(
        "Document does not belong to the specified notebook",
      );
    }

    // Validate that the notebook exists and is public
    const notebook = await ctx.db.get(args.notebookId);
    if (!notebook) {
      throw new ConvexError("Notebook not found");
    }
    if (notebook.isPrivate) {
      throw new ConvexError("Cannot edit documents in private notebooks");
    }

    return await ctx.db.patch(args.id, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

// Delete document in public notebook (allows anyone to delete)
export const deleteInPublicNotebook = mutation({
  args: {
    id: v.id("documents"),
    notebookId: v.id("notebooks"), // Required to verify it's a public notebook
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new ConvexError("Document not found!");
    }

    // Verify the document belongs to the specified notebook
    if (document.notebookId !== args.notebookId) {
      throw new ConvexError(
        "Document does not belong to the specified notebook",
      );
    }

    // Validate that the notebook exists and is public
    const notebook = await ctx.db.get(args.notebookId);
    if (!notebook) {
      throw new ConvexError("Notebook not found");
    }
    if (notebook.isPrivate) {
      throw new ConvexError("Cannot delete documents in private notebooks");
    }

    // If this is a folder, check if it has children
    if (document.isFolder) {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_parent_id", (q) => q.eq("parentId", args.id))
        .first();

      if (children) {
        throw new ConvexError(
          "Cannot delete folder that contains documents. Please delete or move the contents first.",
        );
      }
    }

    return await ctx.db.delete(args.id);
  },
});

// Update document structure in public notebook (allows anyone to reorganize)
export const updateStructureInPublicNotebook = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("documents"),
        parentId: v.optional(v.id("documents")),
        order: v.number(),
      }),
    ),
    notebookId: v.id("notebooks"), // Required to verify it's a public notebook
  },
  handler: async (ctx, { updates, notebookId }) => {
    // Validate that the notebook exists and is public
    const notebook = await ctx.db.get(notebookId);
    if (!notebook) {
      throw new ConvexError("Notebook not found");
    }
    if (notebook.isPrivate) {
      throw new ConvexError("Cannot reorganize documents in private notebooks");
    }

    // Limit batch size to prevent timeouts
    const MAX_BATCH_SIZE = 50;
    if (updates.length > MAX_BATCH_SIZE) {
      throw new ConvexError(
        `Too many updates in batch. Maximum ${MAX_BATCH_SIZE} allowed.`,
      );
    }

    try {
      // First pass: Validate all documents belong to the notebook
      const documentIds = updates.map((update) => update.id);
      const documents = await Promise.all(
        documentIds.map((id) => ctx.db.get(id)),
      );

      // Validate all documents
      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        const update = updates[i];

        if (!document || !update) {
          throw new ConvexError(
            `Document ${update?.id ?? "unknown"} not found`,
          );
        }

        if (document.notebookId !== notebookId) {
          throw new ConvexError(
            `Document ${update.id} does not belong to the specified notebook`,
          );
        }
      }

      // Validate parent folders
      const parentIds = updates
        .filter((update) => update.parentId)
        .map((update) => update.parentId!);

      if (parentIds.length > 0) {
        const parents = await Promise.all(
          parentIds.map((id) => ctx.db.get(id)),
        );

        for (const parent of parents) {
          if (!parent?.isFolder || parent.notebookId !== notebookId) {
            throw new ConvexError(
              "All parent folders must exist and belong to the same notebook",
            );
          }
        }
      }

      // Apply all updates in parallel batches
      const batchSize = 10;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);

        await Promise.all(
          batch.map((update) =>
            ctx.db.patch(update.id, {
              parentId: update.parentId,
              order: update.order,
              updatedAt: Date.now(),
            }),
          ),
        );
      }
    } catch (error) {
      throw error instanceof ConvexError
        ? error
        : new ConvexError(
            `Structure update failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
    }
  },
});

// Optimized update document structure with batched operations
export const updateStructure = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("documents"),
        parentId: v.optional(v.id("documents")),
        order: v.number(),
      }),
    ),
    userId: v.id("users"), // Made required for security
  },
  handler: async (ctx, { updates, userId }) => {
    // Verify all documents exist and belong to the user
    if (!userId) {
      throw new ConvexError(
        "User ID is required for document structure updates",
      );
    }

    // Limit batch size to prevent timeouts
    const MAX_BATCH_SIZE = 50;
    if (updates.length > MAX_BATCH_SIZE) {
      throw new ConvexError(
        `Too many updates in batch. Maximum ${MAX_BATCH_SIZE} allowed.`,
      );
    }

    // Store original states for rollback mechanism
    const originalStates = new Map<
      string,
      { parentId: Id<"documents"> | undefined; order: number }
    >();
    const documentsToUpdate = new Map<string, Doc<"documents">>();

    try {
      // First pass: Batch fetch all documents to validate
      const documentIds = updates.map((update) => update.id);
      const documents = await Promise.all(
        documentIds.map((id) => ctx.db.get(id)),
      );

      // Validate all documents and store original states
      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        const update = updates[i];

        if (!document || !update || document.ownerId !== userId) {
          throw new ConvexError(
            `Document ${update?.id ?? "unknown"} not found or access denied`,
          );
        }

        // Store original state for potential rollback
        originalStates.set(update.id, {
          parentId: document.parentId,
          order: document.order || 0,
        });

        documentsToUpdate.set(update.id, document);
      }

      // Validate parent folders in batch
      const parentIds = updates
        .filter((update) => update.parentId)
        .map((update) => update.parentId!);

      if (parentIds.length > 0) {
        const parents = await Promise.all(
          parentIds.map((id) => ctx.db.get(id)),
        );

        for (let i = 0; i < parents.length; i++) {
          const parent = parents[i];
          const parentId = parentIds[i];

          if (!parent || !parent.isFolder || parent.ownerId !== userId) {
            throw new ConvexError(
              `Parent folder ${parentId} not found or not a folder`,
            );
          }
        }
      }

      // Second pass: Apply all updates in parallel batches
      const batchSize = 10;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);

        await Promise.all(
          batch.map((update) =>
            ctx.db.patch(update.id, {
              parentId: update.parentId,
              order: update.order,
              updatedAt: Date.now(),
            }),
          ),
        );
      }
    } catch (error) {
      // Rollback: Restore all documents to their original states
      logger.error("Error in updateStructure, rolling back changes:", error);

      // Rollback in batches to avoid overwhelming the database
      const rollbackBatches = [];
      const rollbackEntries = Array.from(originalStates.entries());

      for (let i = 0; i < rollbackEntries.length; i += 10) {
        const batch = rollbackEntries.slice(i, i + 10);

        const rollbackPromise = Promise.all(
          batch.map(([documentId, originalState]) =>
            ctx.db
              .patch(documentId as Id<"documents">, {
                parentId: originalState.parentId,
                order: originalState.order,
                updatedAt: Date.now(),
              })
              .catch((rollbackError) => {
                logger.error(
                  `Failed to rollback document ${documentId}:`,
                  rollbackError,
                );
              }),
          ),
        );

        rollbackBatches.push(rollbackPromise);
      }

      // Wait for all rollback operations to complete
      await Promise.all(rollbackBatches);

      // Re-throw the original error to maintain consistency
      throw error instanceof ConvexError
        ? error
        : new ConvexError(
            `Structure update failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
    }
  },
});

export const removeById = mutation({
  args: {
    id: v.id("documents"),
    userId: v.id("users"), // Made required for security
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      throw new ConvexError("User ID is required to delete documents");
    }

    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new ConvexError("Document not found!");
    }

    // Verify ownership - only document owner can delete
    if (document.ownerId !== args.userId) {
      throw new ConvexError(
        "You don't have permission to delete this document",
      );
    }

    // If it's a folder, check if it has children
    if (document.isFolder) {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_parent_id", (q) => q.eq("parentId", args.id))
        .collect();

      if (children.length > 0) {
        throw new ConvexError(
          "Cannot delete folder with items inside. Please move or delete all items first.",
        );
      }
    }

    return await ctx.db.delete(args.id);
  },
});

export const getByIds = query({
  args: {
    ids: v.array(v.id("documents")),
    userId: v.id("users"), // Made required for security
  },
  handler: async (ctx, { ids, userId }) => {
    const documents = [];
    for (const id of ids) {
      const document = await ctx.db.get(id);
      if (document) {
        // Security check: only return documents owned by the requesting user
        if (document.ownerId === userId) {
          documents.push({ id: document._id, name: document.title });
        } else {
          // User doesn't own this document, return "not found" to prevent information leakage
          documents.push({ id, name: "Document not found" });
        }
      } else {
        documents.push({ id, name: "Document not found" });
      }
    }
    return documents;
  },
});

// Update document content after real-time editing
export const updateContent = mutation({
  args: {
    id: v.id("documents"),
    content: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new ConvexError("Document not found!");
    }

    // Verify ownership - only document owner can update content
    if (!args.userId) {
      throw new ConvexError("User ID is required to update document content");
    }

    if (document.ownerId !== args.userId) {
      throw new ConvexError(
        "You don't have permission to update this document",
      );
    }

    return await ctx.db.patch(args.id, {
      initialContent: args.content,
      updatedAt: Date.now(),
    });
  },
});

// Internal functions for HTTP actions
export const updateContentInternal = internalMutation({
  args: {
    id: v.string(), // Accept string ID from HTTP action
    content: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    logger.debug(`Attempting to update document with ID: ${args.id}`);

    // Check if this is a server update (trusted source)
    const isServerUpdate =
      args.userId === "hocus-pocus-server" ||
      (process.env.SERVER_USER_ID &&
        args.userId === process.env.SERVER_USER_ID);

    // Validate that the ID looks like a Convex ID
    if (!args.id || typeof args.id !== "string" || args.id.length < 20) {
      throw new ConvexError(`Invalid document ID format: ${args.id}`);
    }

    // Additional validation for Convex ID format - check for base64url pattern
    // Base64url uses A-Z, a-z, 0-9, hyphens (-), and underscores (_)
    const convexIdPattern = /^[A-Za-z0-9_-]{20,}$/;
    if (!convexIdPattern.test(args.id)) {
      throw new ConvexError(
        `Invalid document ID format: ${args.id} - must be a valid Convex ID`,
      );
    }

    try {
      // Convert string ID to Convex ID
      const documentId = args.id as Id<"documents">;
      const document = await ctx.db.get(documentId);

      if (!document) {
        logger.debug(
          `Document not found with ID: ${args.id} - checking by roomId`,
        );

        // Check if there's a document with this ID in roomId field instead
        const docByRoomId = await ctx.db
          .query("documents")
          .filter((q) => q.eq(q.field("roomId"), args.id))
          .first();
        if (docByRoomId) {
          // Verify ownership before updating existing document (skip for server updates)
          if (
            !isServerUpdate &&
            (!args.userId || docByRoomId.ownerId !== args.userId)
          ) {
            throw new ConvexError(
              "You don't have permission to update this document",
            );
          }

          logger.debug(
            `Found document by roomId: ${docByRoomId.title} (${docByRoomId._id}), updating it`,
          );
          const result = await ctx.db.patch(docByRoomId._id, {
            initialContent: args.content,
            updatedAt: Date.now(),
          });
          return result;
        }

        // Document not found - return error instead of auto-creating
        // Auto-creation has been removed to prevent security vulnerabilities
        // where users could create documents by requesting random IDs
        throw new ConvexError(`Document ${args.id} not found`);
      }

      // Verify ownership before updating existing document (skip for server updates)
      if (
        !isServerUpdate &&
        (!args.userId || document.ownerId !== args.userId)
      ) {
        throw new ConvexError(
          "You don't have permission to update this document",
        );
      }

      logger.debug(
        `Successfully found document: ${document.title} ${isServerUpdate ? "(server update)" : ""}`,
      );

      const result = await ctx.db.patch(documentId, {
        initialContent: args.content,
        updatedAt: Date.now(),
      });

      return result;
    } catch (error) {
      logger.error("Error in updateContentInternal:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError(
        `Failed to update document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});

export const getByIdInternal = internalQuery({
  args: {
    id: v.string(), // Accept string ID from HTTP action
  },
  handler: async (ctx, args) => {
    logger.debug(`Attempting to get document with ID: ${args.id}`);

    // Validate that the ID looks like a Convex ID
    if (!args.id || typeof args.id !== "string" || args.id.length < 20) {
      throw new ConvexError(`Invalid document ID format: ${args.id}`);
    }

    // Additional validation for Convex ID format - check for base64url pattern
    // Base64url uses A-Z, a-z, 0-9, hyphens (-), and underscores (_)
    const convexIdPattern = /^[A-Za-z0-9_-]{20,}$/;
    if (!convexIdPattern.test(args.id)) {
      throw new ConvexError(
        `Invalid document ID format: ${args.id} - must be a valid Convex ID`,
      );
    }

    try {
      // Convert string ID to Convex ID
      const documentId = args.id as Id<"documents">;

      const document = await ctx.db.get(documentId);

      if (!document) {
        logger.debug(
          `Document not found with ID: ${args.id} - checking by roomId`,
        );
        // Check if there's a document with this ID in roomId field instead
        const docByRoomId = await ctx.db
          .query("documents")
          .filter((q) => q.eq(q.field("roomId"), args.id))
          .first();
        if (docByRoomId) {
          logger.debug(
            `Found document by roomId: ${docByRoomId.title} (${docByRoomId._id})`,
          );
          return docByRoomId;
        }
        return null;
      }

      logger.debug(`Successfully found document: ${document.title}`);
      return document;
    } catch (error) {
      logger.error("Error in getByIdInternal:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError(
        `Failed to get document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});

// Create a shareable link for a document
export const createSharedDocument = mutation({
  args: {
    documentId: v.id("documents"),
    userId: v.id("users"), // Updated to proper Convex user ID
  },
  handler: async (ctx, args) => {
    // Validate input
    if (!args.documentId || !args.userId) {
      throw new ConvexError(
        "Invalid input: documentId and userId are required",
      );
    }

    // Check if document exists and user owns it
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new ConvexError("Document not found");
    }

    if (document.ownerId !== args.userId) {
      throw new ConvexError("You don't have permission to share this document");
    }

    // Check if document is a folder
    if (document.isFolder) {
      throw new ConvexError(
        "Cannot share folders, only documents can be shared",
      );
    }

    // Check if a shared document already exists for this document
    const existingSharedDoc = await ctx.db
      .query("sharedDocuments")
      .withIndex("by_document_id", (q) => q.eq("documentId", args.documentId))
      .first();

    if (existingSharedDoc) {
      logger.debug(
        `Shared document already exists for ${args.documentId}, returning existing`,
      );
      return existingSharedDoc;
    }

    // Optimized unique URL generation with better collision handling
    const generateUniqueUrl = async (): Promise<string> => {
      const maxRetries = 5; // Reduced retries as collisions are extremely rare
      let retryCount = 0;

      while (retryCount < maxRetries) {
        // Generate secure 12-character URL using nanoid
        const url = nanoid(12);

        // Check for existing URL - this is extremely rare with 12-char nanoid
        const existing = await ctx.db
          .query("sharedDocuments")
          .withIndex("by_url", (q) => q.eq("url", url))
          .first();

        if (!existing) {
          return url;
        }

        retryCount++;
        logger.warn(
          `URL collision detected (extremely rare), retry ${retryCount}/${maxRetries}`,
        );

        // Continue retry without delay (collisions are extremely rare with 12-char nanoid)
      }

      // If we still can't generate a unique URL after max retries, throw error
      throw new ConvexError(
        "Failed to generate unique URL after maximum retries",
      );
    };

    const uniqueUrl = await generateUniqueUrl();
    const now = Date.now();

    return await ctx.db.insert("sharedDocuments", {
      url: uniqueUrl,
      documentId: args.documentId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get shared document by URL (public access)
export const getSharedDocument = query({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate URL format
    if (!args.url || typeof args.url !== "string" || args.url.length < 8) {
      throw new ConvexError("Invalid shared document URL format");
    }

    // Sanitize URL to prevent injection attacks
    const sanitizedUrl = args.url.replace(/[^a-zA-Z0-9_-]/g, "");
    if (sanitizedUrl !== args.url) {
      throw new ConvexError("Invalid characters in shared document URL");
    }

    const sharedDoc = await ctx.db
      .query("sharedDocuments")
      .withIndex("by_url", (q) => q.eq("url", sanitizedUrl))
      .first();

    if (!sharedDoc) {
      throw new ConvexError("Shared document not found");
    }

    const document = await ctx.db.get(sharedDoc.documentId);
    if (!document) {
      // Log orphaned shared document for cleanup
      logger.warn(
        `Orphaned shared document found: ${sharedDoc._id} (URL: ${sharedDoc.url})`,
      );
      throw new ConvexError("Document not found");
    }

    // Don't share folders
    if (document.isFolder) {
      throw new ConvexError("Cannot access shared folders");
    }

    // Since ownerId is a string (not a Convex ID), we cannot look up user details
    // TODO: Implement proper user management with string ID to Convex user mapping
    return {
      ...sharedDoc,
      document: {
        ...document,
        owner: {
          // For now, just use the ownerId as a display name
          name:
            document.ownerId !== "demo-user" ? "Document Owner" : "Demo User",
          email: null,
        },
      },
    };
  },
});

// Get sharing info for a document by document ID
export const getSharedDocumentByDocumentId = query({
  args: {
    documentId: v.id("documents"),
    userId: v.optional(v.id("users")), // Updated to proper Convex user ID
  },
  handler: async (ctx, args) => {
    // Check if document exists
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new ConvexError("Document not found");
    }

    // Check if user owns the document
    const isOwner = document.ownerId === args.userId;

    // Get shared document if it exists
    const sharedDoc = await ctx.db
      .query("sharedDocuments")
      .withIndex("by_document_id", (q) => q.eq("documentId", args.documentId))
      .first();

    return {
      isOwner,
      sharedDocument: sharedDoc,
      document,
    };
  },
});

// Delete shared document
export const deleteSharedDocument = mutation({
  args: {
    url: v.string(),
    userId: v.id("users"), // Updated to proper Convex user ID
  },
  handler: async (ctx, args) => {
    // Validate input
    if (!args.url || !args.userId) {
      throw new ConvexError("Invalid input: url and userId are required");
    }

    // Validate URL format
    if (typeof args.url !== "string" || args.url.length < 8) {
      throw new ConvexError("Invalid shared document URL format");
    }

    // Sanitize URL to prevent injection attacks
    const sanitizedUrl = args.url.replace(/[^a-zA-Z0-9_-]/g, "");
    if (sanitizedUrl !== args.url) {
      throw new ConvexError("Invalid characters in shared document URL");
    }

    const sharedDoc = await ctx.db
      .query("sharedDocuments")
      .withIndex("by_url", (q) => q.eq("url", sanitizedUrl))
      .first();

    if (!sharedDoc) {
      throw new ConvexError("Shared document not found");
    }

    const document = await ctx.db.get(sharedDoc.documentId);
    if (!document) {
      // If document doesn't exist, clean up the shared document anyway
      await ctx.db.delete(sharedDoc._id);
      throw new ConvexError("Document not found");
    }

    if (document.ownerId !== args.userId) {
      throw new ConvexError(
        "You don't have permission to delete this shared document",
      );
    }

    return await ctx.db.delete(sharedDoc._id);
  },
});

// Get or create a user's home document within a notebook
export const getOrCreateHomeDocument = mutation({
  args: {
    userId: v.id("users"), // Updated to proper Convex user ID
    notebookId: v.optional(v.id("notebooks")), // Notebook to create home document in
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate notebook if provided
    if (args.notebookId) {
      const notebook = await ctx.db.get(args.notebookId);
      if (!notebook || notebook.ownerId !== args.userId) {
        throw new ConvexError("Notebook not found or access denied");
      }
    }

    // First, try to find an existing home document using the isHome field
    let homeQuery = ctx.db
      .query("documents")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", args.userId))
      .filter((q) => q.eq(q.field("isHome"), true));

    // Filter by notebook if provided
    if (args.notebookId) {
      homeQuery = homeQuery.filter((q) =>
        q.eq(q.field("notebookId"), args.notebookId),
      );
    }

    const homeDocument = await homeQuery.first();

    if (homeDocument) {
      return homeDocument._id;
    }

    // If no home document exists, create one
    const documentId = await ctx.db.insert("documents", {
      title: "My Notebook",
      ownerId: args.userId,
      notebookId: args.notebookId,
      createdAt: now,
      updatedAt: now,
      parentId: undefined,
      order: 0,
      isFolder: false,
      isHome: true, // Mark as home document
      initialContent:
        "<h1>Welcome to Your Notebook!</h1><p>Start writing your thoughts, ideas, and notes here. This is your personal space to organize everything important to you.</p><p></p><p><strong>Features you can use:</strong></p><ul><li>Real-time collaborative editing</li><li>Rich text formatting</li><li>Spell checking and dictionary replacements</li><li>Document sharing</li><li>Folder organization</li></ul><p></p><p>Happy writing! ✨</p>",
    });

    return documentId;
  },
});

// Get user's recent documents for quick access
export const getRecentDocuments = query({
  args: {
    userId: v.id("users"), // Updated to proper Convex user ID
    limit: v.optional(v.number()),
    notebookId: v.optional(v.id("notebooks")), // Filter by notebook
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;

    let query = ctx.db
      .query("documents")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", args.userId))
      .filter((q) => q.eq(q.field("isFolder"), false))
      .order("desc");

    // Filter by notebook if provided
    if (args.notebookId) {
      query = query.filter((q) => q.eq(q.field("notebookId"), args.notebookId));
    }

    return await query.take(limit);
  },
});

// Migration function to fix documents with DEFAULT_USER_ID
export const migrateDefaultUserDocuments = mutation({
  args: {
    userId: v.id("users"), // The actual user ID to migrate documents to
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      throw new ConvexError("User ID is required for migration");
    }

    // Find documents owned by DEFAULT_USER_ID
    const defaultUserDocuments = await ctx.db
      .query("documents")
      .withIndex("by_owner_id", (q) =>
        q.eq("ownerId", DEFAULT_USER_ID as Id<"users">),
      )
      .collect();

    logger.log(
      `Found ${defaultUserDocuments.length} documents owned by DEFAULT_USER_ID`,
    );

    let migratedCount = 0;

    for (const document of defaultUserDocuments) {
      try {
        // Update the document to have the correct owner
        await ctx.db.patch(document._id, {
          ownerId: args.userId,
          updatedAt: Date.now(),
        });
        migratedCount++;
        logger.debug(
          `Migrated document ${document._id} to user ${args.userId}`,
        );
      } catch (error) {
        logger.error(`Failed to migrate document ${document._id}:`, error);
      }
    }

    logger.log(
      `Successfully migrated ${migratedCount} documents to user ${args.userId}`,
    );

    return {
      totalFound: defaultUserDocuments.length,
      migratedCount,
      success: true,
    };
  },
});

// Query to check if user has documents that need migration
export const checkForMigrationNeeded = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Count documents owned by DEFAULT_USER_ID
    const defaultUserDocuments = await ctx.db
      .query("documents")
      .withIndex("by_owner_id", (q) =>
        q.eq("ownerId", DEFAULT_USER_ID as Id<"users">),
      )
      .collect();

    // Count documents owned by the actual user
    const userDocuments = await ctx.db
      .query("documents")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", args.userId))
      .collect();

    return {
      defaultUserDocumentsCount: defaultUserDocuments.length,
      userDocumentsCount: userDocuments.length,
      migrationNeeded: defaultUserDocuments.length > 0,
    };
  },
});

// Internal mutation to update Y.js binary state for perfect formatting preservation
export const updateYjsStateInternal = internalMutation({
  args: {
    id: v.string(), // Accept string ID from HTTP action
    yjsState: v.bytes(), // Y.js binary state
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    logger.debug(
      `Attempting to update Y.js state for document with ID: ${args.id}`,
    );

    // Check if this is a server update (trusted source)
    const isServerUpdate =
      args.userId === "hocus-pocus-server" ||
      (process.env.SERVER_USER_ID &&
        args.userId === process.env.SERVER_USER_ID);

    // Validate that the ID looks like a Convex ID
    if (!args.id || typeof args.id !== "string" || args.id.length < 20) {
      throw new ConvexError(`Invalid document ID format: ${args.id}`);
    }

    // Additional validation for Convex ID format
    const convexIdPattern = /^[A-Za-z0-9_-]{20,}$/;
    if (!convexIdPattern.test(args.id)) {
      throw new ConvexError(`Invalid document ID format: ${args.id}`);
    }

    try {
      // Convert string ID to Convex ID
      const documentId = args.id as Id<"documents">;

      // Get the document to verify it exists
      const document = await ctx.db.get(documentId);
      if (!document) {
        throw new ConvexError("Document not found");
      }

      // For server updates, skip ownership validation
      if (!isServerUpdate && args.userId) {
        const userIdTyped = args.userId as Id<"users">;
        if (document.ownerId !== userIdTyped) {
          throw new ConvexError(
            "You don't have permission to update this document",
          );
        }
      }

      // Update the document with Y.js binary state
      await ctx.db.patch(documentId, {
        yjsState: args.yjsState,
        updatedAt: Date.now(),
      });

      logger.debug(`Successfully updated Y.js state for document ${args.id}`);
      return { success: true };
    } catch (error) {
      logger.error("Error in updateYjsStateInternal:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError(
        `Failed to update Y.js state: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});

// Internal query to get Y.js binary state
export const getYjsStateInternal = internalQuery({
  args: {
    id: v.string(), // Accept string ID from HTTP action
  },
  handler: async (ctx, args) => {
    logger.debug(
      `Attempting to get Y.js state for document with ID: ${args.id}`,
    );

    // Validate that the ID looks like a Convex ID
    if (!args.id || typeof args.id !== "string" || args.id.length < 20) {
      throw new ConvexError(`Invalid document ID format: ${args.id}`);
    }

    // Additional validation for Convex ID format
    const convexIdPattern = /^[A-Za-z0-9_-]{20,}$/;
    if (!convexIdPattern.test(args.id)) {
      throw new ConvexError(`Invalid document ID format: ${args.id}`);
    }

    try {
      // Convert string ID to Convex ID
      const documentId = args.id as Id<"documents">;

      // Get the document
      const document = await ctx.db.get(documentId);
      if (!document) {
        logger.debug(`Document ${args.id} not found`);
        return null;
      }

      // Return the document with Y.js state
      return {
        _id: document._id,
        title: document.title,
        yjsState: document.yjsState,
        updatedAt: document.updatedAt,
      };
    } catch (error) {
      logger.error("Error in getYjsStateInternal:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError(
        `Failed to get Y.js state: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});
