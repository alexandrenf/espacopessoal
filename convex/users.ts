import { ConvexError, v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";

// Shared email validation utility function
const validateEmail = (email: string): void => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ConvexError("Invalid email format");
  }
};

// Get user by ID
export const getById = query({
  args: {
    id: v.id("users"),
  },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Get user by email
export const getByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

// Get user by external provider ID
export const getByExternalId = query({
  args: {
    externalId: v.string(),
    provider: v.string(),
  },
  handler: async (ctx, { externalId, provider }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) =>
        q.eq("externalId", externalId).eq("provider", provider),
      )
      .first();
  },
});

// Create a new user
export const create = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.string(),
    image: v.optional(v.string()),
    externalId: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate email format
    validateEmail(args.email);

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new ConvexError("User with this email already exists");
    }

    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      image: args.image,
      externalId: args.externalId,
      provider: args.provider,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update user
export const update = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) {
      throw new ConvexError("User not found!");
    }

    // If email is being updated, validate format and check for duplicates
    if (args.email !== undefined) {
      validateEmail(args.email);

      // Check if any other user has this email
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email!))
        .first();

      if (existingUser && existingUser._id !== args.id) {
        throw new ConvexError("Email already in use by another user");
      }
    }

    const updates: Partial<typeof user> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.email !== undefined) updates.email = args.email;
    if (args.image !== undefined) updates.image = args.image;

    return await ctx.db.patch(args.id, updates);
  },
});

// Internal functions for NextAuth integration
export const createInternal = internalMutation({
  args: {
    name: v.optional(v.string()),
    email: v.string(),
    image: v.optional(v.string()),
    externalId: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate email format
    validateEmail(args.email);

    // Check for existing user with the same email to prevent duplicates
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new ConvexError(`User with email ${args.email} already exists`);
    }

    const now = Date.now();

    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      image: args.image,
      externalId: args.externalId,
      provider: args.provider,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateInternal = internalMutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerified: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: {
      updatedAt: number;
      name?: string;
      email?: string;
      image?: string;
      emailVerified?: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.email !== undefined) updates.email = args.email;
    if (args.image !== undefined) updates.image = args.image;
    if (args.emailVerified !== undefined)
      updates.emailVerified = args.emailVerified;

    return await ctx.db.patch(args.id, updates);
  },
});

export const getByEmailInternal = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

export const getByExternalIdInternal = internalQuery({
  args: {
    externalId: v.string(),
    provider: v.string(),
  },
  handler: async (ctx, { externalId, provider }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) =>
        q.eq("externalId", externalId).eq("provider", provider),
      )
      .first();
  },
});

// Session management
export const createSession = internalMutation({
  args: {
    userId: v.id("users"),
    sessionToken: v.string(),
    expires: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if session with this token already exists
    const existingSession = await ctx.db
      .query("sessions")
      .withIndex("by_session_token", (q) =>
        q.eq("sessionToken", args.sessionToken),
      )
      .first();

    if (existingSession) {
      throw new ConvexError(`Session with token already exists`);
    }

    return await ctx.db.insert("sessions", {
      userId: args.userId,
      sessionToken: args.sessionToken,
      expires: args.expires,
      createdAt: now,
    });
  },
});

export const getSession = internalQuery({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", sessionToken))
      .first();

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expires < Date.now()) {
      return null;
    }

    // Get the associated user
    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    return {
      session,
      user,
    };
  },
});

export const deleteSession = internalMutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", sessionToken))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

export const updateSession = internalMutation({
  args: {
    sessionToken: v.string(),
    expires: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_token", (q) =>
        q.eq("sessionToken", args.sessionToken),
      )
      .first();

    if (session) {
      await ctx.db.patch(session._id, {
        expires: args.expires,
      });
    }
  },
});

// Sync NextAuth user with Convex users table
export const syncNextAuthUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    externalId: v.string(), // NextAuth user.id
    provider: v.string(), // "nextauth"
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if user already exists by email or externalId
    const existingByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    const existingByExternalId = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) =>
        q.eq("externalId", args.externalId).eq("provider", "nextauth"),
      )
      .first();

    const existing = existingByEmail ?? existingByExternalId;

    if (existing) {
      // Update existing user
      await ctx.db.patch(existing._id, {
        name: args.name,
        image: args.image,
        externalId: args.externalId,
        provider: "nextauth",
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new user
      return await ctx.db.insert("users", {
        email: args.email,
        name: args.name,
        image: args.image,
        externalId: args.externalId,
        provider: "nextauth",
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Get Convex user by NextAuth external ID
export const getByNextAuthId = query({
  args: {
    nextAuthId: v.string(),
  },
  handler: async (ctx, { nextAuthId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) =>
        q.eq("externalId", nextAuthId).eq("provider", "nextauth"),
      )
      .first();
  },
});

// Get account by provider and provider account ID
export const getAccountByProvider = query({
  args: {
    provider: v.string(),
    providerAccountId: v.string(),
  },
  handler: async (ctx, { provider, providerAccountId }) => {
    return await ctx.db
      .query("accounts")
      .withIndex("by_provider_account", (q) =>
        q.eq("provider", provider).eq("providerAccountId", providerAccountId),
      )
      .first();
  },
});

// Create account for OAuth provider
export const createAccount = mutation({
  args: {
    userId: v.id("users"),
    provider: v.string(),
    providerAccountId: v.string(),
    type: v.string(),
    access_token: v.optional(v.string()),
    refresh_token: v.optional(v.string()),
    expires_at: v.optional(v.number()),
    token_type: v.optional(v.string()),
    scope: v.optional(v.string()),
    id_token: v.optional(v.string()),
    session_state: v.optional(v.string()),
    refresh_token_expires_in: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("accounts", args);
  },
});

// Delete account
export const deleteAccount = mutation({
  args: {
    provider: v.string(),
    providerAccountId: v.string(),
  },
  handler: async (ctx, { provider, providerAccountId }) => {
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_provider_account", (q) =>
        q.eq("provider", provider).eq("providerAccountId", providerAccountId),
      )
      .first();

    if (account) {
      await ctx.db.delete(account._id);
    }
  },
});

// Create session for NextAuth
export const createAuthSession = mutation({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
    expires: v.number(),
  },
  handler: async (ctx, { sessionToken, userId, expires }) => {
    return await ctx.db.insert("sessions", {
      sessionToken,
      userId,
      expires,
      createdAt: Date.now(),
    });
  },
});

// Get session by token
export const getSessionByToken = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, { sessionToken }) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", sessionToken))
      .first();
  },
});

// Update session for NextAuth
export const updateAuthSession = mutation({
  args: {
    sessionToken: v.string(),
    expires: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, expires }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", sessionToken))
      .first();

    if (!session) {
      throw new ConvexError("Session not found");
    }

    if (expires !== undefined) {
      await ctx.db.patch(session._id, { expires });
    }

    return await ctx.db.get(session._id);
  },
});

// Delete session for NextAuth
export const deleteAuthSession = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", sessionToken))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});

// Create verification token
export const createVerificationToken = mutation({
  args: {
    identifier: v.string(),
    token: v.string(),
    expires: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("verificationTokens", args);
  },
});

// Use verification token
export const useVerificationToken = mutation({
  args: {
    identifier: v.string(),
    token: v.string(),
  },
  handler: async (ctx, { identifier, token }) => {
    const verificationToken = await ctx.db
      .query("verificationTokens")
      .withIndex("by_identifier_token", (q) =>
        q.eq("identifier", identifier).eq("token", token),
      )
      .first();

    if (!verificationToken) {
      return null;
    }

    // Delete the token after use
    await ctx.db.delete(verificationToken._id);

    return verificationToken;
  },
});

// NextAuth-specific functions
export const createForAuth = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.string(),
    image: v.optional(v.string()),
    emailVerified: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate email format
    validateEmail(args.email);

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new ConvexError("User with this email already exists");
    }

    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      image: args.image,
      emailVerified: args.emailVerified,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateForAuth = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerified: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) {
      throw new ConvexError("User not found!");
    }

    // If email is being updated, validate format and check for duplicates
    if (args.email !== undefined) {
      validateEmail(args.email);

      // Check if any other user has this email
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email!))
        .first();

      if (existingUser && existingUser._id !== args.id) {
        throw new ConvexError("Email already in use by another user");
      }
    }

    const updates: Partial<typeof user> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.email !== undefined) updates.email = args.email;
    if (args.image !== undefined) updates.image = args.image;
    if (args.emailVerified !== undefined)
      updates.emailVerified = args.emailVerified;

    await ctx.db.patch(args.id, updates);
    return await ctx.db.get(args.id);
  },
});

// Check user health - returns whether user has all required data
export const checkUserHealth = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Check if user has all required fields
    const isHealthy = !!(user.name && user.email);

    return { isHealthy };
  },
});

// Get user profile
export const getUserProfile = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      image: user.image,
      emailVerified: user.emailVerified,
    };
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Validate name
    if (!args.name || args.name.trim().length === 0) {
      throw new ConvexError("Name cannot be empty");
    }
    if (args.name.length > 50) {
      throw new ConvexError("Name is too long");
    }
    if (!/^[a-zA-Z0-9\s._'-]+$/.test(args.name)) {
      throw new ConvexError("Name contains invalid characters");
    }

    // Validate email
    validateEmail(args.email);

    // Check if email is already in use by another user
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser && existingUser._id !== args.userId) {
      throw new ConvexError("Email already in use by another user");
    }

    // Validate image URL if provided
    let imageUrl = args.image;
    if (imageUrl) {
      try {
        new URL(imageUrl);
        imageUrl = imageUrl.trim();
      } catch {
        imageUrl = undefined;
      }
    }

    await ctx.db.patch(args.userId, {
      name: args.name.trim(),
      email: args.email.trim(),
      image: imageUrl,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.userId);
  },
});

// Change user name only
export const changeName = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Validate name
    if (!args.name || args.name.trim().length === 0) {
      throw new ConvexError("Name cannot be empty");
    }
    if (args.name.length > 50) {
      throw new ConvexError("Name is too long");
    }
    if (!/^[a-zA-Z0-9\s._'-]+$/.test(args.name)) {
      throw new ConvexError("Name contains invalid characters");
    }

    await ctx.db.patch(args.userId, {
      name: args.name.trim(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.userId);
  },
});

// Generate upload URL for profile image
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Create profile picture record
export const createProfilePicture = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
    filename: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Deactivate any existing profile pictures for this user
    const existingPictures = await ctx.db
      .query("profilePictures")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("isActive", true),
      )
      .collect();

    for (const picture of existingPictures) {
      await ctx.db.patch(picture._id, { isActive: false });
    }

    // Create new profile picture record
    const profilePictureId = await ctx.db.insert("profilePictures", {
      userId: args.userId,
      storageId: args.storageId,
      filename: args.filename,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      isActive: true,
      uploadedAt: now,
      lastAccessedAt: now,
    });

    return profilePictureId;
  },
});

// Get user's active profile picture
export const getActiveProfilePicture = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profilePictures")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("isActive", true),
      )
      .first();
  },
});

// Get profile picture by storage ID
export const getProfilePictureByStorageId = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profilePictures")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .first();
  },
});

// Get storage URL for a file ID
export const getStorageUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Update profile picture access time
export const updateProfilePictureAccess = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const profilePicture = await ctx.db
      .query("profilePictures")
      .withIndex("by_storage_id", (q) => q.eq("storageId", args.storageId))
      .first();

    if (profilePicture) {
      await ctx.db.patch(profilePicture._id, {
        lastAccessedAt: Date.now(),
      });
    }
  },
});

// Update user profile image with uploaded file
export const updateProfileImage = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
    filename: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Create profile picture record (this will deactivate old ones)
    await ctx.db.insert("profilePictures", {
      userId: args.userId,
      storageId: args.storageId,
      filename: args.filename,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      isActive: true,
      uploadedAt: Date.now(),
      lastAccessedAt: Date.now(),
    });

    // Deactivate any existing profile pictures for this user
    const existingPictures = await ctx.db
      .query("profilePictures")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("isActive", true),
      )
      .collect();

    for (const picture of existingPictures) {
      if (picture.storageId !== args.storageId) {
        await ctx.db.patch(picture._id, { isActive: false });
      }
    }

    // Update user with server-side image URL instead of Convex URL
    const serverImageUrl = `/api/profile-image/${args.storageId}`;
    await ctx.db.patch(args.userId, {
      image: serverImageUrl,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.userId);
  },
});

// Get user accounts for auth provider image refetch
export const getUserAccounts = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();

    return accounts.map((account) => ({
      provider: account.provider,
      providerAccountId: account.providerAccountId,
    }));
  },
});

// Internal function to cleanup unused profile pictures (run by cron job)
export const cleanupUnusedProfilePictures = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    // Find inactive profile pictures that haven't been accessed in 30 days
    const oldProfilePictures = await ctx.db
      .query("profilePictures")
      .withIndex("by_last_accessed")
      .filter((q) =>
        q.and(
          q.eq(q.field("isActive"), false),
          q.lt(q.field("lastAccessedAt"), thirtyDaysAgo),
        ),
      )
      .collect();

    let deletedCount = 0;
    let failedCount = 0;

    // Delete old profile pictures and their storage files
    for (const picture of oldProfilePictures) {
      try {
        // Delete the file from Convex storage
        await ctx.storage.delete(picture.storageId);

        // Remove the database record
        await ctx.db.delete(picture._id);

        deletedCount++;
      } catch (error) {
        console.error(
          `Failed to delete profile picture ${picture._id}:`,
          error,
        );
        failedCount++;
      }
    }

    console.log(
      `Profile picture cleanup completed: ${deletedCount} deleted, ${failedCount} failed`,
    );

    return {
      deletedCount,
      failedCount,
      totalProcessed: oldProfilePictures.length,
    };
  },
});
