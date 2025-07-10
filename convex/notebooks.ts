import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { type Id } from "./_generated/dataModel";

// Production-ready logging utility
const isDevelopment = process.env.LOG_LEVEL === "development";
const logger = {
  log: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.log(`[notebooks] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[notebooks] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(`[notebooks] ${message}`, ...args);
    }
  },
  debug: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.log(`[notebooks:debug] ${message}`, ...args);
    }
  },
};

// For backward compatibility during migration
const DEFAULT_USER_ID = "demo-user";

// Validate notebook URL format
const validateNotebookUrl = (url: string): boolean => {
  // URL must be 3-50 characters, alphanumeric, hyphens, and underscores only
  const urlPattern = /^[a-zA-Z0-9_-]{3,50}$/;
  return urlPattern.test(url);
};

// Create a new notebook
export const create = mutation({
  args: {
    url: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    isPrivate: v.optional(v.boolean()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = args.userId ?? DEFAULT_USER_ID;
    const now = Date.now();
    const isPrivate = args.isPrivate ?? false;

    // Validate URL format
    if (!validateNotebookUrl(args.url)) {
      throw new ConvexError(
        "Invalid notebook URL. Must be 3-50 characters, alphanumeric, hyphens, and underscores only.",
      );
    }

    // Check if URL is already taken by this user
    const existingNotebook = await ctx.db
      .query("notebooks")
      .withIndex("by_owner_and_url", (q) =>
        q.eq("ownerId", userId as Id<"users">).eq("url", args.url),
      )
      .first();

    if (existingNotebook) {
      throw new ConvexError(
        "A notebook with this URL already exists in your account.",
      );
    }

    // If password is provided, ensure notebook is private
    if (args.password && !isPrivate) {
      throw new ConvexError("Password can only be set for private notebooks.");
    }

    try {
      return await ctx.db.insert("notebooks", {
        url: args.url,
        title: args.title,
        description: args.description,
        ownerId: userId as Id<"users">,
        isPrivate,
        password: args.password,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      logger.error("Notebook creation failed:", error);
      throw new ConvexError("Failed to create notebook");
    }
  },
});

// Get notebook by URL
export const getByUrl = query({
  args: {
    url: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Validate URL format
    if (!validateNotebookUrl(args.url)) {
      throw new ConvexError("Invalid notebook URL format");
    }

    const notebook = await ctx.db
      .query("notebooks")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();

    if (!notebook) {
      throw new ConvexError("Notebook not found");
    }

    // Check if user has access to this notebook
    const userId = args.userId ?? DEFAULT_USER_ID;
    const isOwner = notebook.ownerId === userId;

    // If notebook is private and user is not the owner, deny access
    if (notebook.isPrivate && !isOwner) {
      throw new ConvexError("This notebook is private");
    }

    return {
      ...notebook,
      isOwner,
    };
  },
});

// Get notebooks by owner
export const getByOwner = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = args.userId ?? DEFAULT_USER_ID;

    return await ctx.db
      .query("notebooks")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", userId as Id<"users">))
      .order("desc")
      .collect();
  },
});

// Update notebook
export const update = mutation({
  args: {
    id: v.id("notebooks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
    password: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const notebook = await ctx.db.get(args.id);

    if (!notebook) {
      throw new ConvexError("Notebook not found");
    }

    // Verify ownership
    if (notebook.ownerId !== args.userId) {
      throw new ConvexError(
        "You don't have permission to update this notebook",
      );
    }

    // Validate password logic
    if (args.password && args.isPrivate === false) {
      throw new ConvexError("Password can only be set for private notebooks");
    }

    const updateData: {
      updatedAt: number;
      title?: string;
      description?: string;
      isPrivate?: boolean;
      password?: string;
    } = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updateData.title = args.title;
    if (args.description !== undefined)
      updateData.description = args.description;
    if (args.isPrivate !== undefined) updateData.isPrivate = args.isPrivate;
    if (args.password !== undefined) updateData.password = args.password;

    // If making notebook public, remove password
    if (args.isPrivate === false) {
      updateData.password = undefined;
    }

    return await ctx.db.patch(args.id, updateData);
  },
});

// Delete notebook
export const remove = mutation({
  args: {
    id: v.id("notebooks"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const notebook = await ctx.db.get(args.id);

    if (!notebook) {
      throw new ConvexError("Notebook not found");
    }

    // Verify ownership
    if (notebook.ownerId !== args.userId) {
      throw new ConvexError(
        "You don't have permission to delete this notebook",
      );
    }

    // Check if notebook has documents
    const documentsInNotebook = await ctx.db
      .query("documents")
      .withIndex("by_notebook_id", (q) => q.eq("notebookId", args.id))
      .first();

    if (documentsInNotebook) {
      throw new ConvexError(
        "Cannot delete notebook with documents. Please move or delete all documents first.",
      );
    }

    return await ctx.db.delete(args.id);
  },
});

// Get notebook by ID (for internal use)
export const getById = query({
  args: {
    id: v.id("notebooks"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const notebook = await ctx.db.get(args.id);

    if (!notebook) {
      throw new ConvexError("Notebook not found");
    }

    // Verify ownership or access
    const isOwner = notebook.ownerId === args.userId;

    if (notebook.isPrivate && !isOwner) {
      throw new ConvexError(
        "You don't have permission to access this notebook",
      );
    }

    return {
      ...notebook,
      isOwner,
    };
  },
});

// Check if notebook URL is available
export const checkUrlAvailability = query({
  args: {
    url: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Validate URL format
    if (!validateNotebookUrl(args.url)) {
      return {
        available: false,
        reason:
          "Invalid URL format. Must be 3-50 characters, alphanumeric, hyphens, and underscores only.",
      };
    }

    const userId = args.userId ?? DEFAULT_USER_ID;

    // Check if URL is already taken by this user
    const existingNotebook = await ctx.db
      .query("notebooks")
      .withIndex("by_owner_and_url", (q) =>
        q.eq("ownerId", userId as Id<"users">).eq("url", args.url),
      )
      .first();

    if (existingNotebook) {
      return {
        available: false,
        reason: "This URL is already used by one of your notebooks.",
      };
    }

    return {
      available: true,
      reason: null,
    };
  },
});

// Get or create default notebook for user
export const getOrCreateDefault = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // First, try to find existing default notebook
    const existingNotebook = await ctx.db
      .query("notebooks")
      .withIndex("by_owner_and_url", (q) =>
        q.eq("ownerId", args.userId).eq("url", "main"),
      )
      .first();

    if (existingNotebook) {
      return existingNotebook;
    }

    // Check if "main" URL is available
    const mainNotebook = await ctx.db
      .query("notebooks")
      .withIndex("by_owner_and_url", (q) =>
        q.eq("ownerId", args.userId).eq("url", "main"),
      )
      .first();

    const defaultUrl = mainNotebook ? `main-${Date.now()}` : "main";

    // Create default notebook
    return await ctx.db.insert("notebooks", {
      url: defaultUrl,
      title: "My Notebook",
      description: "Your personal notebook for organizing thoughts and ideas",
      ownerId: args.userId,
      isPrivate: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Validate notebook password
export const validatePassword = mutation({
  args: {
    url: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const notebook = await ctx.db
      .query("notebooks")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();

    if (!notebook) {
      throw new ConvexError("Notebook not found");
    }

    if (!notebook.isPrivate) {
      throw new ConvexError("This notebook is not password protected");
    }

    if (!notebook.password) {
      throw new ConvexError("This notebook does not have a password set");
    }

    const isValid = notebook.password === args.password;

    if (!isValid) {
      throw new ConvexError("Invalid password");
    }

    return {
      valid: true,
      notebook: {
        ...notebook,
        password: undefined, // Don't return password in response
      },
    };
  },
});

// Get notebook metadata for access checking (without content access)
export const getMetadataByUrl = query({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate URL format
    if (!validateNotebookUrl(args.url)) {
      throw new ConvexError("Invalid notebook URL format");
    }

    const notebook = await ctx.db
      .query("notebooks")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();

    if (!notebook) {
      throw new ConvexError("Notebook not found");
    }

    // Return metadata without sensitive content
    return {
      _id: notebook._id,
      title: notebook.title,
      description: notebook.description,
      url: notebook.url,
      isPrivate: notebook.isPrivate,
      hasPassword: !!notebook.password,
      createdAt: notebook.createdAt,
      updatedAt: notebook.updatedAt,
      ownerId: notebook.ownerId,
    };
  },
});

// Get notebook with access check after password validation
export const getByUrlWithPassword = query({
  args: {
    url: v.string(),
    userId: v.optional(v.id("users")),
    hasValidPassword: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Validate URL format
    if (!validateNotebookUrl(args.url)) {
      throw new ConvexError("Invalid notebook URL format");
    }

    const notebook = await ctx.db
      .query("notebooks")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();

    if (!notebook) {
      throw new ConvexError("Notebook not found");
    }

    // Check if user has access to this notebook
    const userId = args.userId ?? DEFAULT_USER_ID;
    const isOwner = notebook.ownerId === userId;

    // If notebook is private and user is not the owner
    if (notebook.isPrivate && !isOwner) {
      // If it has a password and password was validated, allow access
      if (notebook.password && args.hasValidPassword) {
        return {
          ...notebook,
          isOwner: false,
          password: undefined, // Don't return password
        };
      }
      // Otherwise deny access
      throw new ConvexError("Access denied");
    }

    return {
      ...notebook,
      isOwner,
      password: undefined, // Don't return password in response
    };
  },
});
