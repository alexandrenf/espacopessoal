import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { type Id } from "./_generated/dataModel";

// Get user's dictionary entries
export const getDictionary = query({
  args: { 
    userId: v.string(), // Made required for security
  },
  handler: async (ctx, { userId }) => {
    if (!userId) {
      throw new ConvexError("User ID is required to access dictionary");
    }
    
    return await ctx.db
      .query("dictionary")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", userId))
      .collect();
  },
});

// Get public dictionary entries for a specific user (for shared notes)
export const getPublicDictionary = query({
  args: { 
    createdById: v.string(), // Owner of the note being viewed
  },
  handler: async (ctx, { createdById }) => {
    return await ctx.db
      .query("dictionary")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", createdById))
      .filter((q) => q.eq(q.field("isPublic"), true))
      .collect();
  },
});

// Create a new dictionary entry
export const create = mutation({
  args: {
    from: v.string(),
    to: v.string(),
    userId: v.string(), // Made required for security
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      throw new ConvexError("User ID is required to create dictionary entries");
    }
    
    const now = Date.now();
    
    // Check if entry already exists for this user
    const existing = await ctx.db
      .query("dictionary")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", args.userId))
      .filter((q) => q.eq(q.field("from"), args.from))
      .first();
    
    if (existing) {
      throw new ConvexError("Dictionary entry with this 'from' text already exists");
    }
    
    return await ctx.db.insert("dictionary", {
      from: args.from,
      to: args.to,
      ownerId: args.userId,
      isPublic: args.isPublic ?? false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a dictionary entry
export const update = mutation({
  args: {
    id: v.id("dictionary"),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    userId: v.string(), // Made required for security
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      throw new ConvexError("User ID is required to update dictionary entries");
    }
    
    const entry = await ctx.db.get(args.id);
    if (!entry) {
      throw new ConvexError("Dictionary entry not found!");
    }
    
    // Check ownership
    if (entry.ownerId !== args.userId) {
      throw new ConvexError("You don't have permission to update this entry");
    }
    
    // If updating 'from' text, check for duplicates
    if (args.from && args.from !== entry.from) {
      const existing = await ctx.db
        .query("dictionary")
        .withIndex("by_owner_id", (q) => q.eq("ownerId", args.userId))
        .filter((q) => q.eq(q.field("from"), args.from))
        .first();
      
      if (existing) {
        throw new ConvexError("Dictionary entry with this 'from' text already exists");
      }
    }
    
    const updates: {
      updatedAt: number;
      from?: string;
      to?: string;
      isPublic?: boolean;
    } = {
      updatedAt: Date.now(),
    };
    
    if (args.from !== undefined) updates.from = args.from;
    if (args.to !== undefined) updates.to = args.to;
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;
    
    return await ctx.db.patch(args.id, updates);
  },
});

// Delete a dictionary entry
export const remove = mutation({
  args: {
    id: v.id("dictionary"),
    userId: v.string(), // Made required for security
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      throw new ConvexError("User ID is required to delete dictionary entries");
    }
    
    const entry = await ctx.db.get(args.id);
    if (!entry) {
      throw new ConvexError("Dictionary entry not found!");
    }
    
    // Check ownership
    if (entry.ownerId !== args.userId) {
      throw new ConvexError("You don't have permission to delete this entry");
    }
    
    return await ctx.db.delete(args.id);
  },
});

// Get dictionary entry by 'from' text (for replacement lookup)
export const getByFromText = query({
  args: { 
    from: v.string(),
    userId: v.string(), // Made required for security
  },
  handler: async (ctx, { from, userId }) => {
    if (!userId) {
      throw new ConvexError("User ID is required to access dictionary");
    }
    
    return await ctx.db
      .query("dictionary")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", userId))
      .filter((q) => q.eq(q.field("from"), from))
      .first();
  },
}); 