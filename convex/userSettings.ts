import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get user settings by user ID
// Update tour status for a user
export const updateTourStatus = mutation({
  args: {
    userId: v.id("users"),
    tourCompleted: v.optional(v.boolean()),
    tourSkipped: v.optional(v.boolean()),
    tourCompletionDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, ...tourData } = args;
    const now = Date.now();

    // Check if settings already exist
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (existingSettings) {
      // Update existing settings
      const updates: {
        updatedAt: number;
        tourCompleted?: boolean;
        tourSkipped?: boolean;
        tourCompletionDate?: number;
      } = {
        updatedAt: now,
      };

      if (tourData.tourCompleted !== undefined) {
        updates.tourCompleted = tourData.tourCompleted;
      }
      if (tourData.tourSkipped !== undefined) {
        updates.tourSkipped = tourData.tourSkipped;
      }
      if (tourData.tourCompletionDate !== undefined) {
        updates.tourCompletionDate = tourData.tourCompletionDate;
      }

      await ctx.db.patch(existingSettings._id, updates);
      return await ctx.db.get(existingSettings._id);
    } else {
      // Create new settings with tour data
      return await ctx.db.insert("userSettings", {
        userId,
        notePadUrl: "",
        privateOrPublicUrl: true,
        password: undefined,
        fcmToken: undefined,
        tourCompleted: tourData.tourCompleted ?? false,
        tourSkipped: tourData.tourSkipped ?? false,
        tourCompletionDate: tourData.tourCompletionDate,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Get tour status for a user
export const getTourStatus = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    return {
      tourCompleted: settings?.tourCompleted ?? false,
      tourSkipped: settings?.tourSkipped ?? false,
      tourCompletionDate: settings?.tourCompletionDate,
    };
  },
});

export const getByUserId = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("userSettings")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
  },
});

// Create or update user settings
export const upsert = mutation({
  args: {
    userId: v.id("users"),
    notePadUrl: v.optional(v.string()),
    privateOrPublicUrl: v.optional(v.boolean()),
    password: v.optional(v.string()),
    fcmToken: v.optional(v.string()),
    tourCompleted: v.optional(v.boolean()),
    tourSkipped: v.optional(v.boolean()),
    tourCompletionDate: v.optional(v.number()),
    tourCompleted: v.optional(v.boolean()),
    tourSkipped: v.optional(v.boolean()),
    tourCompletionDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, ...settingsData } = args;
    const now = Date.now();

    // Check if settings already exist
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (existingSettings) {
      // Update existing settings
      const updates: {
        updatedAt: number;
        notePadUrl?: string;
        privateOrPublicUrl?: boolean;
        password?: string;
        fcmToken?: string;
      tourCompleted?: boolean;
      tourSkipped?: boolean;
      tourCompletionDate?: number;
        tourCompleted?: boolean;
        tourSkipped?: boolean;
        tourCompletionDate?: number;
      } = { updatedAt: now };

      if (settingsData.notePadUrl !== undefined)
        updates.notePadUrl = settingsData.notePadUrl;
      if (settingsData.privateOrPublicUrl !== undefined)
        updates.privateOrPublicUrl = settingsData.privateOrPublicUrl;
      if (settingsData.password !== undefined)
        updates.password = settingsData.password;
      if (settingsData.fcmToken !== undefined)
    if (settingsData.tourCompleted !== undefined)
      updates.tourCompleted = settingsData.tourCompleted;
    if (settingsData.tourSkipped !== undefined)
      updates.tourSkipped = settingsData.tourSkipped;
    if (settingsData.tourCompletionDate !== undefined)
      updates.tourCompletionDate = settingsData.tourCompletionDate;
      if (settingsData.tourCompleted !== undefined)
        updates.tourCompleted = settingsData.tourCompleted;
      if (settingsData.tourSkipped !== undefined)
        updates.tourSkipped = settingsData.tourSkipped;
      if (settingsData.tourCompletionDate !== undefined)
        updates.tourCompletionDate = settingsData.tourCompletionDate;
        updates.fcmToken = settingsData.fcmToken;

      await ctx.db.patch(existingSettings._id, updates);
      return await ctx.db.get(existingSettings._id);
    } else {
      // Create new settings
      return await ctx.db.insert("userSettings", {
        userId,
        notePadUrl: settingsData.notePadUrl ?? "",
        privateOrPublicUrl: settingsData.privateOrPublicUrl ?? true,
        password: settingsData.password,
        fcmToken: settingsData.fcmToken,
        tourCompleted: settingsData.tourCompleted ?? false,
        tourSkipped: settingsData.tourSkipped ?? false,
        tourCompletionDate: settingsData.tourCompletionDate,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Update user settings
export const update = mutation({
  args: {
    userId: v.id("users"),
    notePadUrl: v.optional(v.string()),
    privateOrPublicUrl: v.optional(v.boolean()),
    password: v.optional(v.string()),
    fcmToken: v.optional(v.string()),
    tourCompleted: v.optional(v.boolean()),
    tourSkipped: v.optional(v.boolean()),
    tourCompletionDate: v.optional(v.number()),
    tourCompleted: v.optional(v.boolean()),
    tourSkipped: v.optional(v.boolean()),
    tourCompletionDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, ...settingsData } = args;

    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!existingSettings) {
      throw new ConvexError("User settings not found");
    }

    const updates: {
      updatedAt: number;
      notePadUrl?: string;
      privateOrPublicUrl?: boolean;
      password?: string;
      fcmToken?: string;
      tourCompleted?: boolean;
      tourSkipped?: boolean;
      tourCompletionDate?: number;
        tourCompleted?: boolean;
        tourSkipped?: boolean;
        tourCompletionDate?: number;
    } = { updatedAt: Date.now() };

    if (settingsData.notePadUrl !== undefined)
      updates.notePadUrl = settingsData.notePadUrl;
    if (settingsData.privateOrPublicUrl !== undefined)
      updates.privateOrPublicUrl = settingsData.privateOrPublicUrl;
    if (settingsData.password !== undefined)
      updates.password = settingsData.password;
    if (settingsData.fcmToken !== undefined)
    if (settingsData.tourCompleted !== undefined)
      updates.tourCompleted = settingsData.tourCompleted;
    if (settingsData.tourSkipped !== undefined)
      updates.tourSkipped = settingsData.tourSkipped;
    if (settingsData.tourCompletionDate !== undefined)
      updates.tourCompletionDate = settingsData.tourCompletionDate;
      if (settingsData.tourCompleted !== undefined)
        updates.tourCompleted = settingsData.tourCompleted;
      if (settingsData.tourSkipped !== undefined)
        updates.tourSkipped = settingsData.tourSkipped;
      if (settingsData.tourCompletionDate !== undefined)
        updates.tourCompletionDate = settingsData.tourCompletionDate;
      updates.fcmToken = settingsData.fcmToken;

    await ctx.db.patch(existingSettings._id, updates);
    return await ctx.db.get(existingSettings._id);
  },
});

// Check if notepad URL is available (case-insensitive)
export const isNotePadUrlAvailable = query({
  args: {
    notePadUrl: v.string(),
    excludeUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, { notePadUrl, excludeUserId }) => {
    const lowerUrl = notePadUrl.toLowerCase();

    // Find all user settings to check for case-insensitive conflicts
    const allSettings = await ctx.db.query("userSettings").collect();

    const conflict = allSettings.find(
      (settings) =>
        settings.notePadUrl?.toLowerCase() === lowerUrl &&
        (!excludeUserId || settings.userId !== excludeUserId),
    );

    return !conflict;
  },
});

// Get user settings and health by user ID
export const getUserSettingsAndHealth = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    // Get user data
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Get user settings
    const userSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    return {
      settings: {
        notePadUrl: userSettings?.notePadUrl ?? "",
        privateOrPublicUrl: userSettings?.privateOrPublicUrl ?? true,
        password: userSettings?.password ?? null,
      },
      health: {
        isHealthy: !!(user.name && user.email && userSettings?.notePadUrl),
      },
    };
  },
});
