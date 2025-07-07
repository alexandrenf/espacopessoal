import { ConvexError, v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { type Id } from "./_generated/dataModel";

// Get user by ID
export const getById = query({
  args: { 
    id: v.id("users"),
  },
  handler: async (ctx, { id }) => {
    const user = await ctx.db.get(id);
    if (!user) {
      throw new ConvexError("User not found!");
    }
    return user;
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
        q.eq("externalId", externalId).eq("provider", provider)
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
    if (args.emailVerified !== undefined) updates.emailVerified = args.emailVerified;
    
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
        q.eq("externalId", externalId).eq("provider", provider)
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
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();
    
    if (session) {
      await ctx.db.patch(session._id, {
        expires: args.expires,
      });
    }
  },
}); 