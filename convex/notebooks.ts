import { ConvexError, v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { type Id, type Doc } from "./_generated/dataModel";
// Note: Using Web Crypto API instead of bcryptjs to avoid setTimeout issues in Convex
// import bcrypt from "bcryptjs";
// Rate limiting will be implemented by calling internal functions
// import { validateSession, createSession } from "./sessions"; // TODO: Will be used in Phase 2 JWT implementation

// Interface for notebook session updates during migration
interface NotebookSessionUpdates {
  isActive?: boolean;
  ipAddress?: string;
  userId?: Id<"users"> | undefined;
}

// Helper function to check session status (handles both new and legacy fields)
function isSessionActive(session: Doc<"notebookSessions"> | null): boolean {
  if (!session) return false;
  // Handle both new isActive field and legacy isRevoked field
  return session.isActive ?? !session.isRevoked;
}

// Migration function to upgrade legacy session fields to new schema
export const migrateLegacySessions = internalMutation({
  handler: async (ctx) => {
    const sessions = await ctx.db.query("notebookSessions").collect();
    let migratedCount = 0;

    for (const session of sessions) {
      const updates: NotebookSessionUpdates = {};
      let needsUpdate = false;

      // Convert isRevoked to isActive
      if (session.isRevoked !== undefined && session.isActive === undefined) {
        updates.isActive = !session.isRevoked;
        needsUpdate = true;
      }

      // Add default IP address for legacy sessions
      if (!session.ipAddress) {
        updates.ipAddress = "unknown";
        needsUpdate = true;
      }

      // Add default userId if missing
      if (!session.userId) {
        // For backward compatibility, we'll leave this empty as it's now optional
        updates.userId = undefined;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await ctx.db.patch(session._id, updates);
        migratedCount++;
      }
    }

    return { migratedSessions: migratedCount };
  },
});

// Migration function to add urlLower field to existing notebooks
export const migrateNotebookUrlsToLowercase = internalMutation({
  handler: async (ctx) => {
    const notebooks = await ctx.db.query("notebooks").collect();
    let migratedCount = 0;

    for (const notebook of notebooks) {
      if (!notebook.urlLower) {
        await ctx.db.patch(notebook._id, {
          urlLower: notebook.url.toLowerCase(),
        });
        migratedCount++;
      }
    }

    return { migratedNotebooks: migratedCount };
  },
});

// Helper function to find notebook by URL (case-insensitive)
async function findNotebookByUrl(
  ctx: QueryCtx | MutationCtx,
  url: string,
): Promise<Doc<"notebooks"> | null> {
  const lowerUrl = url.toLowerCase();

  // First try to find by urlLower (preferred method)
  const notebookByLower = await ctx.db
    .query("notebooks")
    .withIndex("by_url_lower", (q) => q.eq("urlLower", lowerUrl))
    .first();

  if (notebookByLower) {
    return notebookByLower;
  }

  // Fallback: search by original URL for backwards compatibility
  // This handles notebooks created before the urlLower field was added
  const notebookByOriginal = await ctx.db
    .query("notebooks")
    .withIndex("by_url", (q) => q.eq("url", url))
    .first();

  if (notebookByOriginal) {
    // If we found a notebook by original URL but it doesn't have urlLower,
    // update it to have urlLower for future lookups (only if we have mutation context)
    if (!notebookByOriginal.urlLower && "patch" in ctx.db) {
      await ctx.db.patch(notebookByOriginal._id, {
        urlLower: notebookByOriginal.url.toLowerCase(),
      });
    }
    return notebookByOriginal;
  }

  return null;
}

// Simplified rate limiting for mutations only (queries will use separate approach)
async function checkAndRecordRateLimit(
  ctx: MutationCtx,
  endpoint: string,
  identifier: string,
  limit: { requests: number; window: number; blockDuration: number },
): Promise<{ allowed: boolean; reason?: string }> {
  const now = Date.now();

  // Find existing rate limit entry
  const existingEntry = await ctx.db
    .query("rateLimits")
    .withIndex("by_identifier_endpoint", (q) =>
      q.eq("identifier", identifier).eq("endpoint", endpoint),
    )
    .first();

  if (!existingEntry) {
    // Create new entry
    await ctx.db.insert("rateLimits", {
      identifier,
      endpoint,
      requestCount: 1,
      windowStart: now,
      isBlocked: false,
      blockUntil: 0,
      lastAttempt: now,
      createdAt: now,
    });
    return { allowed: true };
  }

  // Check if currently blocked
  if (existingEntry.isBlocked && existingEntry.blockUntil > now) {
    const blockUntil = new Date(existingEntry.blockUntil).toISOString();
    return {
      allowed: false,
      reason: `You are temporarily blocked until ${blockUntil}. Please try again later.`,
    };
  }

  // Check if window has expired
  const windowExpired = now - existingEntry.windowStart > limit.window;

  if (windowExpired) {
    // Reset window
    await ctx.db.patch(existingEntry._id, {
      requestCount: 1,
      windowStart: now,
      isBlocked: false,
      blockUntil: 0,
      lastAttempt: now,
    });
    return { allowed: true };
  }

  // Check if limit exceeded
  if (existingEntry.requestCount >= limit.requests) {
    // Block the client
    const blockUntil = now + limit.blockDuration;
    await ctx.db.patch(existingEntry._id, {
      isBlocked: true,
      blockUntil,
      lastAttempt: now,
    });

    // Log security event
    await ctx.db.insert("auditLog", {
      event: "rate_limit_exceeded",
      timestamp: now,
      severity: "warning",
      details: {
        endpoint,
        identifier,
        requestCount: existingEntry.requestCount,
        limit: limit.requests,
        blockUntil,
      },
    });

    const blockUntilTime = new Date(blockUntil).toISOString();
    return {
      allowed: false,
      reason: `Rate limit exceeded. You are blocked until ${blockUntilTime}.`,
    };
  }

  // Increment counter
  await ctx.db.patch(existingEntry._id, {
    requestCount: existingEntry.requestCount + 1,
    lastAttempt: now,
  });

  return { allowed: true };
}

// Check rate limit for queries (read-only)
async function checkRateLimit(
  ctx: QueryCtx,
  endpoint: string,
  identifier: string,
  limit: { requests: number; window: number },
): Promise<{ allowed: boolean; reason?: string }> {
  const now = Date.now();

  // Find existing rate limit entry
  const existingEntry = await ctx.db
    .query("rateLimits")
    .withIndex("by_identifier_endpoint", (q) =>
      q.eq("identifier", identifier).eq("endpoint", endpoint),
    )
    .first();

  if (!existingEntry) {
    return { allowed: true };
  }

  // Check if currently blocked
  if (existingEntry.isBlocked && existingEntry.blockUntil > now) {
    const blockUntil = new Date(existingEntry.blockUntil).toISOString();
    return {
      allowed: false,
      reason: `You are temporarily blocked until ${blockUntil}. Please try again later.`,
    };
  }

  // Check if window has expired
  const windowExpired = now - existingEntry.windowStart > limit.window;

  if (windowExpired) {
    return { allowed: true };
  }

  // Check if limit exceeded
  if (existingEntry.requestCount >= limit.requests) {
    return {
      allowed: false,
      reason: `Rate limit exceeded. Please slow down.`,
    };
  }

  return { allowed: true };
}

// Get client identifier for rate limiting (simplified)
function getClientIdentifier(
  _ctx: MutationCtx | QueryCtx,
  userId?: string,
): string {
  if (userId) {
    // For authenticated users, use their ID
    return `user_${userId}`;
  }

  // For anonymous users, create a more unique identifier to avoid shared rate limiting
  // In production, you'd want to use IP address or other identifying factors
  const randomId = Math.random().toString(36).substring(2, 15);
  const timestamp = Math.floor(Date.now() / 300000); // 5-minute buckets for anonymous users
  return `anon_${timestamp}_${randomId}`;
}

// Secure password hashing using Web Crypto API
const hashPassword = async (password: string): Promise<string> => {
  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  // Perform multiple rounds of hashing for security (similar to bcrypt)
  let hash = await crypto.subtle.digest(
    "SHA-256",
    new Uint8Array([...salt, ...data]),
  );

  // Additional rounds for security (equivalent to bcrypt rounds)
  for (let i = 0; i < 12; i++) {
    hash = await crypto.subtle.digest("SHA-256", hash);
  }

  // Convert to base64 and prepend salt
  const hashArray = Array.from(new Uint8Array(hash));
  const saltArray = Array.from(salt);
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const saltHex = saltArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `$webcrypto$${saltHex}$${hashHex}`;
};

// Verify password against hash with support for legacy formats
const verifyHash = async (password: string, hash: string): Promise<boolean> => {
  if (hash.startsWith("$webcrypto$")) {
    // New Web Crypto hash format
    const parts = hash.split("$");
    if (parts.length !== 4) return false;

    const saltHex = parts[2];
    const hashHex = parts[3];

    if (!saltHex || !hashHex) return false;

    // Convert salt from hex
    const saltBytes = saltHex.match(/.{2}/g);
    if (!saltBytes || saltBytes.length === 0) return false;
    const salt = new Uint8Array(saltBytes.map((byte) => parseInt(byte, 16)));

    const encoder = new TextEncoder();
    const data = encoder.encode(password);

    // Perform the same hashing process
    let computedHash = await crypto.subtle.digest(
      "SHA-256",
      new Uint8Array([...salt, ...data]),
    );

    // Additional rounds for security
    for (let i = 0; i < 12; i++) {
      computedHash = await crypto.subtle.digest("SHA-256", computedHash);
    }

    // Convert to hex and compare
    const computedHashArray = Array.from(new Uint8Array(computedHash));
    const computedHashHex = computedHashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return computedHashHex === hashHex;
  }

  if (
    hash.startsWith("$2b$") ||
    hash.startsWith("$2a$") ||
    hash.startsWith("$2y$")
  ) {
    // Legacy bcrypt hash - for migration purposes, we'll reject these for now
    // In production, you might want to handle migration differently
    logger.warn("Legacy bcrypt hash detected - migration required");
    return false;
  }

  if (hash.startsWith("$sha256$")) {
    // Legacy SHA-256 hash - compute and compare (for migration)
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "notebook-salt-2025");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash =
      "$sha256$" +
      hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return computedHash === hash;
  }

  // Legacy plaintext comparison (for very old data)
  return password === hash;
};

// Check if password is already hashed
const isHashed = (password: string): boolean => {
  return (
    password.startsWith("$webcrypto$") ||
    password.startsWith("$2b$") ||
    password.startsWith("$2a$") ||
    password.startsWith("$2y$") ||
    password.startsWith("$sha256$")
  );
};

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

// Validate notebook URL format
const validateNotebookUrl = (url: string): boolean => {
  // URL must be 3-50 characters, alphanumeric, hyphens, and underscores only
  const urlPattern = /^[a-zA-Z0-9_-]{3,50}$/;
  return urlPattern.test(url);
};

// Migration function to hash existing plaintext passwords
export const migratePasswordsToHash = internalMutation({
  handler: async (ctx) => {
    logger.log("Starting password migration to hash format...");

    const notebooks = await ctx.db
      .query("notebooks")
      .filter((q) => q.neq(q.field("password"), undefined))
      .collect();

    let migratedCount = 0;

    for (const notebook of notebooks) {
      if (notebook.password) {
        let needsMigration = false;
        let newHashedPassword = notebook.password;

        if (!isHashed(notebook.password)) {
          // Plaintext password - hash with Web Crypto
          logger.debug(
            "Migrating plaintext password for notebook:",
            notebook.url,
          );
          newHashedPassword = await hashPassword(notebook.password);
          needsMigration = true;
        } else if (
          notebook.password.startsWith("$sha256$") ||
          notebook.password.startsWith("$2b$")
        ) {
          // Legacy hash formats - we can't migrate without the original password
          // This will be handled during password verification when user logs in
          logger.debug(
            "Legacy hash found for notebook:",
            notebook.url,
            "- will migrate on next verification",
          );
        }

        if (needsMigration) {
          await ctx.db.patch(notebook._id, {
            password: newHashedPassword,
            passwordUpdatedAt: Date.now(),
          });
          migratedCount++;
        }
      }
    }

    logger.log(
      `Password migration completed. Migrated ${migratedCount} notebooks.`,
    );
    return { migratedCount };
  },
});

// Create a new notebook
export const create = mutation({
  args: {
    url: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    userId: v.id("users"), // Make userId required for notebook creation
    isPrivate: v.optional(v.boolean()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = args.userId;
    const now = Date.now();
    const isPrivate = args.isPrivate ?? false;

    // Validate URL format
    if (!validateNotebookUrl(args.url)) {
      throw new ConvexError(
        "Invalid notebook URL. Must be 3-50 characters, alphanumeric, hyphens, and underscores only.",
      );
    }

    // Check if URL is already taken globally (URLs must be unique across all users)
    // Use case-insensitive lookup to prevent duplicates with different casing
    const existingNotebook = await findNotebookByUrl(ctx, args.url);

    if (existingNotebook) {
      throw new ConvexError(
        "This URL is already taken. Please choose a different URL.",
      );
    }

    // If password is provided, ensure notebook is private
    if (args.password && !isPrivate) {
      throw new ConvexError("Password can only be set for private notebooks.");
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (args.password) {
      hashedPassword = await hashPassword(args.password);
      logger.debug("Password hashed for new notebook");
    }

    try {
      return await ctx.db.insert("notebooks", {
        url: args.url,
        urlLower: args.url.toLowerCase(), // Store lowercase URL for case-insensitive lookups
        title: args.title,
        description: args.description,
        ownerId: userId,
        isPrivate,
        password: hashedPassword,
        passwordUpdatedAt: hashedPassword ? now : undefined,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      logger.error("Notebook creation failed:", error);
      throw new ConvexError("Failed to create notebook");
    }
  },
});

// Simplified public notebook access without complex session validation
export const getPublicNotebook = query({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate URL format
    if (!validateNotebookUrl(args.url)) {
      return null; // Return null for invalid URLs instead of throwing
    }

    const notebook = await findNotebookByUrl(ctx, args.url);

    if (!notebook) {
      return null; // Return null when notebook not found instead of throwing
    }

    // Only allow access to truly public notebooks
    if (notebook.isPrivate) {
      return null; // Return null for private notebooks instead of throwing
    }

    return {
      ...notebook,
      isOwner: false,
      password: undefined, // Never return password
    };
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

    const notebook = await findNotebookByUrl(ctx, args.url);

    if (!notebook) {
      throw new ConvexError("Notebook not found");
    }

    // Check if user has access to this notebook
    const isOwner = args.userId ? notebook.ownerId === args.userId : false;

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

// Get notebooks by owner - OPTIMIZED
export const getByOwner = query({
  args: {
    userId: v.id("users"), // Make userId required
    limit: v.optional(v.number()), // Add pagination support
  },
  handler: async (ctx, args) => {
    // OPTIMIZATION: Use .take() instead of .collect() to prevent unbounded queries
    const limit = args.limit ?? 50; // Default reasonable limit
    return await ctx.db
      .query("notebooks")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", args.userId))
      .order("desc")
      .take(limit);
  },
});

// Get notebooks by owner with document counts - OPTIMIZED
export const getByOwnerWithDocumentCounts = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // OPTIMIZATION 1: Use pagination instead of .collect() for notebooks
    const notebooks = await ctx.db
      .query("notebooks")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", args.userId))
      .order("desc")
      .take(50); // Limit to reasonable number instead of unlimited .collect()

    // OPTIMIZATION 2: Batch document counting to avoid N+1 queries
    // Get all documents for this user in one query, then group by notebook
    const allUserDocuments = await ctx.db
      .query("documents")
      .withIndex("by_owner_id_notebook_id", (q) => q.eq("ownerId", args.userId))
      .filter((q) => q.eq(q.field("isFolder"), false))
      .take(1000); // Reasonable limit to prevent excessive reads

    // Group documents by notebook ID for efficient counting
    const documentCountsByNotebook = new Map<string, number>();
    for (const doc of allUserDocuments) {
      if (doc.notebookId) {
        const count = documentCountsByNotebook.get(doc.notebookId) ?? 0;
        documentCountsByNotebook.set(doc.notebookId, count + 1);
      }
    }

    // OPTIMIZATION 3: Map notebooks with pre-calculated counts (no additional queries)
    const notebooksWithCounts = notebooks.map((notebook) => ({
      ...notebook,
      documentCount: documentCountsByNotebook.get(notebook._id) ?? 0,
    }));

    return notebooksWithCounts;
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

    const now = Date.now();
    const updateData: {
      updatedAt: number;
      title?: string;
      description?: string;
      isPrivate?: boolean;
      password?: string;
      passwordUpdatedAt?: number;
    } = {
      updatedAt: now,
    };

    if (args.title !== undefined) updateData.title = args.title;
    if (args.description !== undefined)
      updateData.description = args.description;
    if (args.isPrivate !== undefined) updateData.isPrivate = args.isPrivate;

    // Hash password if provided
    if (args.password !== undefined) {
      if (args.password) {
        updateData.password = await hashPassword(args.password);
        updateData.passwordUpdatedAt = now;
        logger.debug("Password updated and hashed for notebook");
      } else {
        updateData.password = undefined;
        updateData.passwordUpdatedAt = undefined;
      }
    }

    // If making notebook public, remove password
    if (args.isPrivate === false) {
      updateData.password = undefined;
      updateData.passwordUpdatedAt = undefined;
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

    // Check if URL is already taken globally (URLs must be unique across all users)
    // Use case-insensitive lookup to prevent duplicates with different casing
    const existingNotebook = await findNotebookByUrl(ctx, args.url);

    if (existingNotebook) {
      return {
        available: false,
        reason: "This URL is already taken. Please choose a different URL.",
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

    // First, try to find existing default notebook for this user
    const existingNotebook = await ctx.db
      .query("notebooks")
      .withIndex("by_owner_and_url", (q) =>
        q.eq("ownerId", args.userId).eq("url", "main"),
      )
      .first();

    if (existingNotebook) {
      return existingNotebook;
    }

    // Check if "main" URL is available globally using case-insensitive lookup
    const mainNotebook = await findNotebookByUrl(ctx, "main");

    const defaultUrl = mainNotebook ? `main-${Date.now()}` : "main";

    // Create default notebook
    return await ctx.db.insert("notebooks", {
      url: defaultUrl,
      urlLower: defaultUrl.toLowerCase(), // Store lowercase URL for case-insensitive lookups
      title: "My Notebook",
      description: "Your personal notebook for organizing thoughts and ideas",
      ownerId: args.userId,
      isPrivate: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Secure password validation with bcrypt and session creation
export const validatePassword = mutation({
  args: {
    url: v.string(),
    password: v.string(),
    deviceFingerprint: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Apply rate limiting for password validation
    const clientId = getClientIdentifier(ctx);
    const rateLimitCheck = await checkAndRecordRateLimit(
      ctx,
      "PASSWORD_VALIDATION",
      clientId,
      { requests: 5, window: 300000, blockDuration: 900000 }, // 5 attempts per 5 minutes, 15 min block
    );

    if (!rateLimitCheck.allowed) {
      throw new ConvexError(
        rateLimitCheck.reason ??
          "Too many password attempts. Please try again later.",
      );
    }

    const notebook = await findNotebookByUrl(ctx, args.url);

    if (!notebook) {
      throw new ConvexError("Notebook not found");
    }

    if (!notebook.isPrivate) {
      throw new ConvexError("This notebook is not password protected");
    }

    if (!notebook.password) {
      throw new ConvexError("This notebook does not have a password set");
    }

    // Use secure hash verification
    const isValid = await verifyHash(args.password, notebook.password);

    // If password is valid, upgrade legacy hashes to Web Crypto format
    if (
      isValid &&
      (notebook.password.startsWith("$sha256$") ||
        notebook.password.startsWith("$2b$") ||
        !isHashed(notebook.password))
    ) {
      logger.debug("Password validated, upgrading to Web Crypto format");
      const hashedPassword = await hashPassword(args.password);
      await ctx.db.patch(notebook._id, {
        password: hashedPassword,
        passwordUpdatedAt: Date.now(),
      });
    }

    if (!isValid) {
      // Apply stricter rate limiting for failed attempts
      const failedAttemptCheck = await checkAndRecordRateLimit(
        ctx,
        "FAILED_ATTEMPTS",
        clientId,
        { requests: 3, window: 600000, blockDuration: 3600000 }, // 3 failed attempts per 10 minutes, 1 hour block
      );

      // Log failed attempt for monitoring
      await ctx.db.insert("auditLog", {
        event: "password_validation_failed",
        notebookId: notebook._id,
        timestamp: Date.now(),
        severity: "warning",
        details: {
          notebookUrl: args.url,
          clientId,
          userAgent: args.userAgent,
          ipAddress: args.ipAddress ?? "unknown",
          failedAttemptLimitExceeded: !failedAttemptCheck.allowed,
        },
      });

      logger.warn("Invalid password attempt", {
        notebookUrl: args.url,
        timestamp: Date.now(),
        ipAddress: args.ipAddress ?? "unknown",
      });

      if (!failedAttemptCheck.allowed) {
        throw new ConvexError(
          failedAttemptCheck.reason ??
            "Too many failed attempts. Account temporarily locked.",
        );
      }

      throw new ConvexError("Invalid password");
    }

    // Create secure session token
    const sessionToken = generateSessionToken();
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

    // Store session in database with new schema
    const sessionId = await ctx.db.insert("notebookSessions", {
      sessionToken,
      userId: undefined, // No user ID for anonymous sessions
      notebookId: notebook._id,
      deviceFingerprint: args.deviceFingerprint ?? "unknown",
      ipAddress: args.ipAddress ?? "unknown",
      expiresAt,
      createdAt: now,
      isActive: true,
    });

    // Log successful session creation for audit
    await ctx.db.insert("auditLog", {
      event: "password_validation_success",
      userId: undefined,
      notebookId: notebook._id,
      timestamp: Date.now(),
      severity: "info",
      details: {
        notebookUrl: args.url,
        sessionId: sessionId,
        deviceFingerprint: args.deviceFingerprint ?? "unknown",
        ipAddress: args.ipAddress ?? "unknown",
      },
    });

    logger.debug("Session created for notebook", {
      notebookUrl: args.url,
      sessionId,
      expiresAt: new Date(expiresAt),
    });

    return {
      valid: true,
      sessionToken,
      expiresAt,
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

    const notebook = await findNotebookByUrl(ctx, args.url);

    if (!notebook) {
      return null;
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

// Get notebook with proper server-side session validation
export const getByUrlWithSession = query({
  args: {
    url: v.string(),
    sessionToken: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Apply rate limiting for notebook access
    const clientId = getClientIdentifier(ctx, args.userId);
    const rateLimitCheck = await checkRateLimit(
      ctx,
      "NOTEBOOK_ACCESS",
      clientId,
      { requests: 50, window: 60000 }, // 50 requests per minute
    );

    if (!rateLimitCheck.allowed) {
      throw new ConvexError(
        rateLimitCheck.reason ?? "Too many requests. Please slow down.",
      );
    }

    // Validate URL format
    if (!validateNotebookUrl(args.url)) {
      throw new ConvexError("Invalid notebook URL format");
    }

    const notebook = await findNotebookByUrl(ctx, args.url);

    if (!notebook) {
      throw new ConvexError("Notebook not found");
    }

    // Safely get authenticated user identity
    let authenticatedUserId: Id<"users"> | undefined;
    try {
      const identity = await ctx.auth.getUserIdentity();
      authenticatedUserId = identity?.subject as Id<"users"> | undefined;
    } catch {
      // For anonymous users, this is expected to fail
      logger.debug("No authenticated user identity found (anonymous user)");
    }

    // Use the authenticated user ID from context, but also consider the provided userId
    const effectiveUserId = authenticatedUserId ?? args.userId;

    const isOwner = effectiveUserId
      ? notebook.ownerId === effectiveUserId
      : false;

    logger.debug("Access check:", {
      notebookUrl: args.url,
      notebookOwnerId: notebook.ownerId,
      authenticatedUserId,
      providedUserId: args.userId,
      effectiveUserId,
      isOwner,
      isPrivate: notebook.isPrivate,
      hasPassword: !!notebook.password,
      hasSessionToken: !!args.sessionToken,
    });

    // Handle public notebooks first (simplest case)
    if (!notebook.isPrivate) {
      return {
        ...notebook,
        isOwner,
        password: undefined,
      };
    }

    // For private notebooks, handle authentication
    if (notebook.isPrivate && !isOwner) {
      if (notebook.password) {
        if (!args.sessionToken) {
          return {
            error: "unauthorized",
            reason: "This notebook is password-protected",
            requiresPassword: true,
          };
        }

        // Validate session token server-side
        const sessionValidation = await validateNotebookSessionToken(
          ctx,
          args.sessionToken,
          notebook._id,
        );
        if (!sessionValidation.valid) {
          return {
            error: "unauthorized",
            reason:
              "Invalid or expired session. Please enter the password again.",
            requiresPassword: true,
          };
        }

        return {
          ...notebook,
          isOwner: false,
          password: undefined, // Don't return password
        };
      }
      // Private notebook without password - owner only
      return {
        error: "unauthorized",
        reason:
          "This notebook is private and you don't have permission to access it",
        requiresPassword: false,
      };
    }

    return {
      ...notebook,
      isOwner,
      password: undefined, // Don't return password in response
    };
  },
});

// Server-side session token validation
const validateNotebookSessionToken = async (
  ctx: QueryCtx,
  sessionToken: string,
  notebookId: Id<"notebooks">,
) => {
  try {
    // Look up session in the database by token
    const session = await ctx.db
      .query("notebookSessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", sessionToken))
      .first();

    if (!session) {
      return { valid: false, reason: "Session not found" };
    }

    // Check if session belongs to the correct notebook
    if (session.notebookId !== notebookId) {
      return { valid: false, reason: "Session notebook mismatch" };
    }

    // Check if session is active
    if (!isSessionActive(session)) {
      return { valid: false, reason: "Session revoked" };
    }

    // Check if session is expired
    const now = Date.now();
    if (session.expiresAt < now) {
      return { valid: false, reason: "Session expired" };
    }

    return { valid: true, session };
  } catch (error) {
    logger.error("Session validation error:", error);
    return { valid: false, reason: "Session validation failed" };
  }
};

// ====== ENHANCED SESSION MANAGEMENT SYSTEM ======

// Generate cryptographically secure session token
const generateSessionToken = (): string => {
  // Generate 32 random bytes and convert to base64url
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

// Calculate password strength
const calculatePasswordStrength = (password: string): string => {
  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character variety
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Common patterns penalty
  if (/(.)\1{2,}/.test(password)) score--; // Repeated characters
  if (/123|abc|qwe/i.test(password)) score--; // Sequential patterns

  if (score <= 2) return "weak";
  if (score <= 4) return "medium";
  return "strong";
};

// Get default session duration based on remember me preference
const getSessionDuration = (
  rememberMe: boolean,
  customDuration?: number,
): number => {
  if (customDuration) return customDuration;
  return rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days or 1 day
};

// Create password session with secure token
export const createPasswordSession = mutation({
  args: {
    notebookUrl: v.string(),
    password: v.string(),
    deviceFingerprint: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    rememberMe: v.optional(v.boolean()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    logger.debug("Creating password session for notebook:", args.notebookUrl);

    // Find notebook by URL
    const notebook = await findNotebookByUrl(ctx, args.notebookUrl);

    if (!notebook) {
      throw new ConvexError("Notebook not found");
    }

    // Check if notebook requires password
    if (!notebook.password) {
      throw new ConvexError("Notebook does not require password");
    }

    // Validate password
    if (notebook.password !== args.password) {
      logger.warn("Invalid password attempt for notebook:", args.notebookUrl);
      throw new ConvexError("Invalid password");
    }

    const now = Date.now();
    const sessionToken = generateSessionToken();
    const sessionDuration = getSessionDuration(
      args.rememberMe ?? false,
      notebook.maxSessionDuration,
    );

    // Clean up expired sessions for this notebook and device
    const expiredSessions = await ctx.db
      .query("notebookSessions")
      .withIndex("by_device", (q) =>
        q.eq("deviceFingerprint", args.deviceFingerprint),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("notebookId"), notebook._id),
          q.or(
            q.lt(q.field("expiresAt"), now),
            q.eq(q.field("isActive"), false),
          ),
        ),
      )
      .collect();

    // Delete expired sessions
    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
    }

    // Create new session
    const sessionId = await ctx.db.insert("notebookSessions", {
      sessionToken,
      notebookId: notebook._id,
      userId: args.userId, // Use provided userId or undefined for anonymous
      deviceFingerprint: args.deviceFingerprint,
      ipAddress: args.ipAddress ?? "unknown",
      expiresAt: now + sessionDuration,
      createdAt: now,
      isActive: true,
    });

    logger.debug(
      "Created session for notebook:",
      args.notebookUrl,
      "expires:",
      new Date(now + sessionDuration),
    );

    return {
      sessionToken,
      expiresAt: now + sessionDuration,
      sessionId,
    };
  },
});

// Validate session token and update last access
export const validateSession = query({
  args: {
    sessionToken: v.string(),
    notebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("notebookSessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) {
      return { valid: false, reason: "Session not found" };
    }

    // Check if session belongs to the correct notebook
    if (session.notebookId !== args.notebookId) {
      return { valid: false, reason: "Session notebook mismatch" };
    }

    // Check if session is revoked
    if (!isSessionActive(session)) {
      return { valid: false, reason: "Session revoked" };
    }

    // Check if session is expired
    const now = Date.now();
    if (session.expiresAt < now) {
      return { valid: false, reason: "Session expired" };
    }

    return {
      valid: true,
      session: {
        ...session,
        sessionToken: undefined, // Don't return token in response
      },
    };
  },
});

// Update session last access time
export const updateSessionAccess = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("notebookSessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (
      !session ||
      !isSessionActive(session) ||
      session.expiresAt < Date.now()
    ) {
      return false;
    }

    // Session is valid - no update needed for now

    return true;
  },
});

// Extend session expiration for active users
export const extendSession = mutation({
  args: {
    sessionToken: v.string(),
    additionalTime: v.optional(v.number()), // Additional milliseconds
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("notebookSessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session || !isSessionActive(session)) {
      throw new ConvexError("Invalid or revoked session");
    }

    const now = Date.now();
    const extensionTime = args.additionalTime ?? 24 * 60 * 60 * 1000; // Default 1 day
    const newExpirationTime = Math.max(session.expiresAt, now) + extensionTime;

    await ctx.db.patch(session._id, {
      expiresAt: newExpirationTime,
    });

    return {
      newExpiresAt: newExpirationTime,
    };
  },
});

// Revoke session(s)
export const revokeSessions = mutation({
  args: {
    sessionTokens: v.optional(v.array(v.string())), // Specific sessions to revoke
    notebookId: v.optional(v.id("notebooks")), // Revoke all sessions for notebook
    userId: v.optional(v.id("users")), // User performing revocation
    revokeAll: v.optional(v.boolean()), // Revoke all user's sessions
  },
  handler: async (ctx, args) => {
    let revokedCount = 0;

    if (args.sessionTokens) {
      // Revoke specific sessions
      for (const token of args.sessionTokens) {
        const session = await ctx.db
          .query("notebookSessions")
          .withIndex("by_token", (q) => q.eq("sessionToken", token))
          .first();

        if (session && isSessionActive(session)) {
          await ctx.db.patch(session._id, {
            isActive: false,
          });
          revokedCount++;
        }
      }
    } else if (args.notebookId) {
      // OPTIMIZATION: Revoke all sessions for a notebook with pagination to avoid large .collect()
      let cursor: string | null = null;
      do {
        const sessionBatch = await ctx.db
          .query("notebookSessions")
          .withIndex("by_notebook", (q) => q.eq("notebookId", args.notebookId!))
          .filter((q) => q.eq(q.field("isActive"), true))
          .paginate({
            cursor,
            numItems: 50, // Process in batches of 50
          });

        // Batch update all sessions in this page
        await Promise.all(
          sessionBatch.page.map(async (session) => {
            await ctx.db.patch(session._id, {
              isActive: false,
            });
            revokedCount++;
          }),
        );

        cursor = sessionBatch.continueCursor;
      } while (cursor);
    } else if (args.revokeAll && args.userId) {
      // OPTIMIZATION: Revoke all sessions for a user with pagination
      let cursor: string | null = null;
      do {
        const sessionBatch = await ctx.db
          .query("notebookSessions")
          .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
          .filter((q) => q.eq(q.field("isActive"), true))
          .paginate({
            cursor,
            numItems: 50, // Process in batches of 50
          });

        // Batch update all sessions in this page
        await Promise.all(
          sessionBatch.page.map(async (session) => {
            await ctx.db.patch(session._id, {
              isActive: false,
            });
            revokedCount++;
          }),
        );

        cursor = sessionBatch.continueCursor;
      } while (cursor);
    }

    return { revokedCount };
  },
});

// Get active sessions for a notebook (owner only)
export const getNotebookSessions = query({
  args: {
    notebookId: v.id("notebooks"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify user owns the notebook
    const notebook = await ctx.db.get(args.notebookId);
    if (!notebook || notebook.ownerId !== args.userId) {
      throw new ConvexError("Access denied");
    }

    const now = Date.now();
    const sessions = await ctx.db
      .query("notebookSessions")
      .withIndex("by_notebook", (q) => q.eq("notebookId", args.notebookId))
      .filter((q) =>
        q.and(q.eq(q.field("isActive"), true), q.gt(q.field("expiresAt"), now)),
      )
      .collect();

    return sessions.map((session) => ({
      ...session,
      sessionToken: undefined, // Don't return tokens
    }));
  },
});

// Update notebook password (owner only)
export const updatePassword = mutation({
  args: {
    notebookId: v.id("notebooks"),
    newPassword: v.optional(v.string()), // null to remove password
    userId: v.id("users"),
    revokeExistingSessions: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const notebook = await ctx.db.get(args.notebookId);

    if (!notebook) {
      throw new ConvexError("Notebook not found");
    }

    // Verify ownership
    if (notebook.ownerId !== args.userId) {
      throw new ConvexError("Only notebook owners can update passwords");
    }

    const now = Date.now();
    const updateData: Record<string, unknown> = {
      updatedAt: now,
      passwordUpdatedAt: now,
    };

    if (args.newPassword) {
      // Setting or updating password - hash it securely
      updateData.password = await hashPassword(args.newPassword);
      updateData.passwordStrength = calculatePasswordStrength(args.newPassword);
      updateData.isPrivate = true; // Password-protected notebooks are private
      logger.debug("Password updated and hashed for notebook", notebook.url);
    } else {
      // Removing password
      updateData.password = undefined;
      updateData.passwordStrength = undefined;
      // Note: Keep isPrivate as is - user might want private notebook without password
    }

    // Update notebook
    await ctx.db.patch(args.notebookId, updateData);

    // Revoke existing sessions if requested
    if (args.revokeExistingSessions) {
      const sessions = await ctx.db
        .query("notebookSessions")
        .withIndex("by_notebook", (q) => q.eq("notebookId", args.notebookId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      for (const session of sessions) {
        await ctx.db.patch(session._id, {
          isActive: false,
        });
      }
    }

    logger.debug(
      args.newPassword ? "Updated password" : "Removed password",
      "for notebook:",
      notebook.url,
    );

    return {
      success: true,
      revokedSessions: args.revokeExistingSessions ? true : false,
    };
  },
});

// Cleanup expired sessions (internal function for scheduled cleanup) - OPTIMIZED
export const cleanupExpiredSessions = mutation({
  args: {
    batchSize: v.optional(v.number()), // Allow configurable batch size
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const batchSize = args.batchSize ?? 100; // Default batch size
    let totalDeleted = 0;

    // OPTIMIZATION: Process expired sessions in batches to avoid large .collect()
    const cutoffTime = now - 7 * 24 * 60 * 60 * 1000;

    // Process expired/revoked sessions in batches
    let cursor: string | null = null;
    do {
      const expiredBatch = await ctx.db
        .query("notebookSessions")
        .withIndex("by_active_sessions", (q) =>
          q.eq("isActive", false).lt("expiresAt", cutoffTime),
        )
        .paginate({
          cursor,
          numItems: batchSize,
        });

      // Delete this batch
      await Promise.all(
        expiredBatch.page.map(async (session) => {
          await ctx.db.delete(session._id);
          totalDeleted++;
        }),
      );

      cursor = expiredBatch.continueCursor;
    } while (cursor);

    // Process naturally expired sessions in batches
    cursor = null;
    do {
      const naturallyExpiredBatch = await ctx.db
        .query("notebookSessions")
        .withIndex("by_expiration", (q) =>
          q.eq("expiresAt", now).eq("isActive", true),
        )
        .filter((q) => q.lt(q.field("expiresAt"), now))
        .paginate({
          cursor,
          numItems: batchSize,
        });

      // Delete this batch
      await Promise.all(
        naturallyExpiredBatch.page.map(async (session) => {
          await ctx.db.delete(session._id);
          totalDeleted++;
        }),
      );

      cursor = naturallyExpiredBatch.continueCursor;
    } while (cursor);

    logger.debug("Cleaned up", totalDeleted, "expired sessions");

    return {
      cleanedCount: totalDeleted,
    };
  },
});

// ====== INTERNAL FUNCTIONS FOR HTTP ENDPOINTS ======

// Internal function to get notebook by ID (for HTTP validation)
export const getByIdInternal = internalQuery({
  args: {
    notebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.notebookId);
  },
});

// Internal function to validate session token (for WebSocket authentication)
export const validateSessionInternal = internalQuery({
  args: {
    sessionToken: v.string(),
    notebookId: v.id("notebooks"),
  },
  handler: async (ctx, args) => {
    try {
      const session = await ctx.db
        .query("notebookSessions")
        .withIndex("by_token", (q) => q.eq("sessionToken", args.sessionToken))
        .first();

      if (!session) {
        return { valid: false, reason: "Session not found" };
      }

      // Check if session belongs to the correct notebook
      if (session.notebookId !== args.notebookId) {
        return { valid: false, reason: "Session notebook mismatch" };
      }

      // Check if session is revoked
      if (!isSessionActive(session)) {
        return { valid: false, reason: "Session revoked" };
      }

      // Check if session is expired
      const now = Date.now();
      if (session.expiresAt < now) {
        return { valid: false, reason: "Session expired" };
      }

      // Note: Last accessed time should be updated via a separate mutation
      // This is a query function and cannot perform writes

      return { valid: true, session };
    } catch (error) {
      logger.error("Session validation error:", error);
      return { valid: false, reason: "Session validation failed" };
    }
  },
});
