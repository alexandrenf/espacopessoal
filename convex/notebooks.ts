import { ConvexError, v } from "convex/values";
import { mutation, query, internalMutation, internalQuery, type QueryCtx } from "./_generated/server";
import { type Id } from "./_generated/dataModel";
import bcrypt from "bcryptjs";

// Secure password hashing using bcrypt
const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12; // Higher salt rounds for better security
  return await bcrypt.hash(password, saltRounds);
};

// Verify password against hash with support for legacy formats
const verifyHash = async (password: string, hash: string): Promise<boolean> => {
  if (hash.startsWith('$2b$') || hash.startsWith('$2a$') || hash.startsWith('$2y$')) {
    // bcrypt hash - use bcrypt.compare for secure verification
    return await bcrypt.compare(password, hash);
  }

  if (hash.startsWith('$sha256$')) {
    // Legacy SHA-256 hash - compute and compare (for migration)
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'notebook-salt-2025');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = '$sha256$' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return computedHash === hash;
  }

  // Legacy plaintext comparison (for very old data)
  return password === hash;
};

// Check if password is already hashed
const isHashed = (password: string): boolean => {
  return password.startsWith('$2b$') ||
         password.startsWith('$2a$') ||
         password.startsWith('$2y$') ||
         password.startsWith('$sha256$');
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

// For backward compatibility during migration
const DEFAULT_USER_ID = "demo-user";

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
      .filter(q => q.neq(q.field("password"), undefined))
      .collect();
    
    let migratedCount = 0;
    
    for (const notebook of notebooks) {
      if (notebook.password) {
        let needsMigration = false;
        let newHashedPassword = notebook.password;

        if (!isHashed(notebook.password)) {
          // Plaintext password - hash with bcrypt
          logger.debug("Migrating plaintext password for notebook:", notebook.url);
          newHashedPassword = await hashPassword(notebook.password);
          needsMigration = true;
        } else if (notebook.password.startsWith('$sha256$')) {
          // SHA-256 hash - we can't migrate without the original password
          // This will be handled during password verification when user logs in
          logger.debug("SHA-256 hash found for notebook:", notebook.url, "- will migrate on next verification");
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
    
    logger.log(`Password migration completed. Migrated ${migratedCount} notebooks.`);
    return { migratedCount };
  },
});

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

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (args.password) {
      hashedPassword = await hashPassword(args.password);
      logger.debug("Password hashed for new notebook");
    }

    try {
      return await ctx.db.insert("notebooks", {
        url: args.url,
        title: args.title,
        description: args.description,
        ownerId: userId as Id<"users">,
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

    // Use secure hash verification
    const isValid = await verifyHash(args.password, notebook.password);
    
    // If password is valid, upgrade legacy hashes to bcrypt
    if (isValid && (notebook.password.startsWith('$sha256$') || !isHashed(notebook.password))) {
      logger.debug("Password validated, upgrading to bcrypt format");
      const hashedPassword = await hashPassword(args.password);
      await ctx.db.patch(notebook._id, {
        password: hashedPassword,
        passwordUpdatedAt: Date.now(),
      });
    }

    if (!isValid) {
      // Log failed attempt for monitoring
      logger.warn("Invalid password attempt", {
        notebookUrl: args.url,
        timestamp: Date.now(),
        userAgent: args.userAgent,
        ipAddress: args.ipAddress,
      });
      throw new ConvexError("Invalid password");
    }

    // Create secure session token
    const sessionToken = generateSessionToken();
    const now = Date.now();
    const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

    // Store session in database
    const sessionId = await ctx.db.insert("notebookSessions", {
      sessionToken,
      notebookId: notebook._id,
      deviceFingerprint: args.deviceFingerprint ?? 'unknown',
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
      expiresAt,
      createdAt: now,
      lastAccessedAt: now,
      isRevoked: false,
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

// Get notebook with proper server-side session validation
export const getByUrlWithSession = query({
  args: {
    url: v.string(),
    sessionToken: v.optional(v.string()),
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

    const identity = await ctx.auth.getUserIdentity();
    const authenticatedUserId = identity?.subject as Id<"users"> | undefined;

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

    // If notebook is private and user is not the owner
    if (notebook.isPrivate && !isOwner) {
      // If it has a password, validate session token server-side
      if (notebook.password) {
        if (!args.sessionToken) {
          throw new ConvexError("Session token required for private notebook access");
        }
        
        // Validate session token server-side
        const sessionValidation = await validateSessionToken(ctx, args.sessionToken, notebook._id);
        if (!sessionValidation.valid) {
          throw new ConvexError(`Access denied: ${sessionValidation.reason}`);
        }
        
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

// Server-side session token validation
const validateSessionToken = async (ctx: QueryCtx, sessionToken: string, notebookId: Id<"notebooks">) => {
  try {
    // Look up session in the database
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

    // Check if session is revoked
    if (session.isRevoked) {
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
    const notebook = await ctx.db
      .query("notebooks")
      .withIndex("by_url", (q) => q.eq("url", args.notebookUrl))
      .first();

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
            q.eq(q.field("isRevoked"), true),
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
      userId: args.userId,
      deviceFingerprint: args.deviceFingerprint,
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
      expiresAt: now + sessionDuration,
      createdAt: now,
      lastAccessedAt: now,
      isRevoked: false,
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
    if (session.isRevoked) {
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

    if (!session || session.isRevoked || session.expiresAt < Date.now()) {
      return false;
    }

    await ctx.db.patch(session._id, {
      lastAccessedAt: Date.now(),
    });

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

    if (!session || session.isRevoked) {
      throw new ConvexError("Invalid or revoked session");
    }

    const now = Date.now();
    const extensionTime = args.additionalTime ?? 24 * 60 * 60 * 1000; // Default 1 day
    const newExpirationTime = Math.max(session.expiresAt, now) + extensionTime;

    await ctx.db.patch(session._id, {
      expiresAt: newExpirationTime,
      lastAccessedAt: now,
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
    const now = Date.now();
    let revokedCount = 0;

    if (args.sessionTokens) {
      // Revoke specific sessions
      for (const token of args.sessionTokens) {
        const session = await ctx.db
          .query("notebookSessions")
          .withIndex("by_token", (q) => q.eq("sessionToken", token))
          .first();

        if (session && !session.isRevoked) {
          await ctx.db.patch(session._id, {
            isRevoked: true,
            revokedAt: now,
            revokedBy: args.userId,
          });
          revokedCount++;
        }
      }
    } else if (args.notebookId) {
      // Revoke all sessions for a notebook
      const sessions = await ctx.db
        .query("notebookSessions")
        .withIndex("by_notebook", (q) => q.eq("notebookId", args.notebookId!))
        .filter((q) => q.eq(q.field("isRevoked"), false))
        .collect();

      for (const session of sessions) {
        await ctx.db.patch(session._id, {
          isRevoked: true,
          revokedAt: now,
          revokedBy: args.userId,
        });
        revokedCount++;
      }
    } else if (args.revokeAll && args.userId) {
      // Revoke all sessions for a user
      const sessions = await ctx.db
        .query("notebookSessions")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("isRevoked"), false))
        .collect();

      for (const session of sessions) {
        await ctx.db.patch(session._id, {
          isRevoked: true,
          revokedAt: now,
          revokedBy: args.userId,
        });
        revokedCount++;
      }
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
        q.and(
          q.eq(q.field("isRevoked"), false),
          q.gt(q.field("expiresAt"), now),
        ),
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
        .filter((q) => q.eq(q.field("isRevoked"), false))
        .collect();

      for (const session of sessions) {
        await ctx.db.patch(session._id, {
          isRevoked: true,
          revokedAt: now,
          revokedBy: args.userId,
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

// Cleanup expired sessions (internal function for scheduled cleanup)
export const cleanupExpiredSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all expired or revoked sessions older than 7 days
    const cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
    const expiredSessions = await ctx.db
      .query("notebookSessions")
      .withIndex("by_active_sessions", (q) =>
        q.eq("isRevoked", true).lt("expiresAt", cutoffTime),
      )
      .collect();

    // Also find sessions that are expired but not revoked
    const naturallyExpiredSessions = await ctx.db
      .query("notebookSessions")
      .withIndex("by_expiration", (q) =>
        q.eq("expiresAt", now).eq("isRevoked", false),
      )
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    const allExpiredSessions = [
      ...expiredSessions,
      ...naturallyExpiredSessions,
    ];

    // Delete expired sessions
    for (const session of allExpiredSessions) {
      await ctx.db.delete(session._id);
    }

    logger.debug("Cleaned up", allExpiredSessions.length, "expired sessions");

    return {
      cleanedCount: allExpiredSessions.length,
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
      if (session.isRevoked) {
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
