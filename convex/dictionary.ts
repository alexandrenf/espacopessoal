import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { type Id } from "./_generated/dataModel";

// Get user's dictionary entries
export const getDictionary = query({
  args: {
    userId: v.id("users"),
    cursor: v.optional(v.id("dictionary")),
    limit: v.optional(v.number()),
    includePublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const limit = args.limit ?? 20;
    const includePublic = args.includePublic ?? false;

    let query = ctx.db
      .query("dictionary")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", user._id))
      .order("desc");

    if (includePublic) {
      // Also include public entries from other users
      const publicEntries = await ctx.db
        .query("dictionary")
        .withIndex("by_public", (q) => q.eq("isPublic", true))
        .collect();

      const userEntries = await query.collect();
      const allEntries = [...userEntries, ...publicEntries];

      // Remove duplicates and sort
      const uniqueEntries = allEntries.filter(
        (entry, index, self) =>
          index ===
          self.findIndex(
            (e) => e.from === entry.from && e.ownerId === entry.ownerId,
          ),
      );

      return {
        entries: uniqueEntries.slice(0, limit),
        isDone: uniqueEntries.length <= limit,
        continueCursor:
          uniqueEntries.length > limit ? uniqueEntries[limit - 1]?._id : null,
      };
    }

    const entries = await query.paginate({
      cursor: args.cursor ?? null,
      numItems: limit,
    });

    return {
      entries: entries.page,
      isDone: entries.isDone,
      continueCursor: entries.continueCursor,
    };
  },
});

// Get public dictionary entries
export const getPublicDictionary = query({
  args: {
    cursor: v.optional(v.id("dictionary")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const entries = await ctx.db
      .query("dictionary")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .order("desc")
      .paginate({
        cursor: args.cursor ?? null,
        numItems: limit,
      });

    return {
      entries: entries.page,
      isDone: entries.isDone,
      continueCursor: entries.continueCursor,
    };
  },
});

// Create a new dictionary entry
export const createDictionaryEntry = mutation({
  args: {
    userId: v.id("users"),
    from: v.string(),
    to: v.string(),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Validate input
    if (args.from.length < 1 || args.from.length > 200) {
      throw new Error("'From' text must be between 1 and 200 characters");
    }
    if (args.to.length < 1 || args.to.length > 200) {
      throw new Error("'To' text must be between 1 and 200 characters");
    }

    const now = Date.now();

    // Check if entry already exists for this user
    const existing = await ctx.db
      .query("dictionary")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", user._id))
      .filter((q) => q.eq(q.field("from"), args.from))
      .first();

    if (existing) {
      throw new Error("Entry already exists with this 'from' text");
    }

    const entryId = await ctx.db.insert("dictionary", {
      from: args.from,
      to: args.to,
      ownerId: user._id,
      isPublic: args.isPublic ?? false,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(entryId);
  },
});

// Update a dictionary entry
export const updateDictionaryEntry = mutation({
  args: {
    userId: v.id("users"),
    entryId: v.id("dictionary"),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new Error("Entry not found");
    }

    // Check ownership
    if (entry.ownerId !== user._id) {
      throw new Error("You don't have permission to update this entry");
    }

    // If updating 'from' text, check for duplicates
    if (args.from && args.from !== entry.from) {
      // Validate length
      if (args.from.length < 1 || args.from.length > 200) {
        throw new Error("'From' text must be between 1 and 200 characters");
      }

      const existing = await ctx.db
        .query("dictionary")
        .withIndex("by_owner_id", (q) => q.eq("ownerId", user._id))
        .filter((q) => q.eq(q.field("from"), args.from))
        .first();

      if (existing) {
        throw new Error("Entry already exists with this 'from' text");
      }
    }

    // Validate 'to' text if provided
    if (args.to && (args.to.length < 1 || args.to.length > 200)) {
      throw new Error("'To' text must be between 1 and 200 characters");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.from !== undefined) updates.from = args.from;
    if (args.to !== undefined) updates.to = args.to;
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;

    await ctx.db.patch(args.entryId, updates);
    return await ctx.db.get(args.entryId);
  },
});

// Delete a dictionary entry
export const deleteDictionaryEntry = mutation({
  args: {
    userId: v.id("users"),
    entryId: v.id("dictionary"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new Error("Entry not found");
    }

    // Check ownership
    if (entry.ownerId !== user._id) {
      throw new Error("You don't have permission to delete this entry");
    }

    await ctx.db.delete(args.entryId);
    return { success: true };
  },
});

// Get dictionary entry by ID
export const getDictionaryEntry = query({
  args: {
    userId: v.id("users"),
    entryId: v.id("dictionary"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const entry = await ctx.db.get(args.entryId);
    if (!entry) {
      throw new Error("Entry not found");
    }

    // Check ownership or if it's public
    if (entry.ownerId !== user._id && !entry.isPublic) {
      throw new Error("You don't have permission to view this entry");
    }

    return entry;
  },
});

// Search dictionary entries
export const searchDictionary = query({
  args: {
    userId: v.id("users"),
    query: v.string(),
    includePublic: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const limit = args.limit ?? 20;
    const includePublic = args.includePublic ?? false;

    const searchQuery = args.query.toLowerCase();

    // Get user's entries - search using exact match (Convex doesn't support toLowerCase in queries)
    const userEntries = await ctx.db
      .query("dictionary")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", user._id))
      .filter((q) =>
        q.or(
          q.eq(q.field("from"), searchQuery),
          q.eq(q.field("to"), searchQuery),
        ),
      )
      .take(limit);

    if (!includePublic) {
      return userEntries;
    }

    // Also search public entries
    const publicEntries = await ctx.db
      .query("dictionary")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .filter((q) =>
        q.and(
          q.neq(q.field("ownerId"), user._id), // Exclude user's own entries
          q.or(
            q.eq(q.field("from"), searchQuery),
            q.eq(q.field("to"), searchQuery),
          ),
        ),
      )
      .take(limit - userEntries.length);

    return [...userEntries, ...publicEntries];
  },
});

// Bulk create dictionary entries
export const bulkCreateDictionaryEntries = mutation({
  args: {
    userId: v.id("users"),
    entries: v.array(
      v.object({
        from: v.string(),
        to: v.string(),
        isPublic: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (args.entries.length === 0) {
      throw new Error("No entries provided");
    }

    if (args.entries.length > 100) {
      throw new Error("Cannot create more than 100 entries at once");
    }

    const now = Date.now();
    const results = [];

    for (const entry of args.entries) {
      // Validate entry
      if (entry.from.length < 1 || entry.from.length > 200) {
        throw new Error(`Invalid 'from' text: ${entry.from}`);
      }
      if (entry.to.length < 1 || entry.to.length > 200) {
        throw new Error(`Invalid 'to' text: ${entry.to}`);
      }

      // Check for existing entry
      const existing = await ctx.db
        .query("dictionary")
        .withIndex("by_owner_id", (q) => q.eq("ownerId", user._id))
        .filter((q) => q.eq(q.field("from"), entry.from))
        .first();

      if (existing) {
        results.push({
          from: entry.from,
          status: "skipped",
          reason: "already exists",
        });
        continue;
      }

      try {
        const entryId = await ctx.db.insert("dictionary", {
          from: entry.from,
          to: entry.to,
          ownerId: user._id,
          isPublic: entry.isPublic ?? false,
          createdAt: now,
          updatedAt: now,
        });

        results.push({ from: entry.from, status: "created", id: entryId });
      } catch (error) {
        results.push({
          from: entry.from,
          status: "error",
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      total: args.entries.length,
      created: results.filter((r) => r.status === "created").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    };
  },
});

// Export dictionary
export const exportDictionary = query({
  args: {
    userId: v.id("users"),
    format: v.union(v.literal("json"), v.literal("csv")),
    includePublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const includePublic = args.includePublic ?? false;

    // Get user's entries
    const userEntries = await ctx.db
      .query("dictionary")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", user._id))
      .collect();

    let allEntries = userEntries;

    if (includePublic) {
      // Also include public entries
      const publicEntries = await ctx.db
        .query("dictionary")
        .withIndex("by_public", (q) => q.eq("isPublic", true))
        .filter((q) => q.neq(q.field("ownerId"), user._id))
        .collect();

      allEntries = [...userEntries, ...publicEntries];
    }

    if (args.format === "json") {
      return {
        format: "json",
        data: JSON.stringify(allEntries, null, 2),
      };
    } else {
      // CSV format
      const csvHeader = "from,to,isPublic,createdAt,updatedAt";
      const csvRows = allEntries.map(
        (entry) =>
          `"${entry.from.replace(/"/g, '""')}","${entry.to.replace(/"/g, '""')}",${entry.isPublic},${entry.createdAt},${entry.updatedAt}`,
      );

      return {
        format: "csv",
        data: [csvHeader, ...csvRows].join("\n"),
      };
    }
  },
});

// Import dictionary
export const importDictionary = mutation({
  args: {
    userId: v.id("users"),
    data: v.string(),
    format: v.union(v.literal("json"), v.literal("csv")),
    overwrite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const overwrite = args.overwrite ?? false;
    let entries: Array<{ from: string; to: string; isPublic?: boolean }> = [];

    try {
      if (args.format === "json") {
        const parsedData = JSON.parse(args.data);
        if (!Array.isArray(parsedData)) {
          throw new Error("JSON data must be an array");
        }
        entries = parsedData;
      } else {
        // CSV format
        const lines = args.data.trim().split("\n");
        const header = lines[0];

        if (!header || !header.includes("from") || !header.includes("to")) {
          throw new Error("CSV must have 'from' and 'to' columns");
        }

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          const values = line.split(",");

          if (values.length >= 2) {
            entries.push({
              from: values[0]?.replace(/"/g, "") || "",
              to: values[1]?.replace(/"/g, "") || "",
              isPublic: values[2] === "true",
            });
          }
        }
      }
    } catch (error) {
      throw new Error("Invalid format: " + (error instanceof Error ? error.message : "Unknown error"));
    }

    if (entries.length === 0) {
      throw new Error("No valid entries found in import data");
    }

    if (entries.length > 1000) {
      throw new Error("Cannot import more than 1000 entries at once");
    }

    const now = Date.now();
    const results = [];

    for (const entry of entries) {
      // Validate entry
      if (!entry.from || !entry.to) {
        results.push({
          from: entry.from,
          status: "error",
          reason: "missing from or to",
        });
        continue;
      }

      // Check for existing entry
      const existing = await ctx.db
        .query("dictionary")
        .withIndex("by_owner_id", (q) => q.eq("ownerId", user._id))
        .filter((q) => q.eq(q.field("from"), entry.from))
        .first();

      if (existing && !overwrite) {
        results.push({
          from: entry.from,
          status: "skipped",
          reason: "already exists",
        });
        continue;
      }

      try {
        if (existing && overwrite) {
          // Update existing entry
          await ctx.db.patch(existing._id, {
            to: entry.to,
            isPublic: entry.isPublic ?? false,
            updatedAt: now,
          });
          results.push({
            from: entry.from,
            status: "updated",
            id: existing._id,
          });
        } else {
          // Create new entry
          const entryId = await ctx.db.insert("dictionary", {
            from: entry.from,
            to: entry.to,
            ownerId: user._id,
            isPublic: entry.isPublic ?? false,
            createdAt: now,
            updatedAt: now,
          });
          results.push({ from: entry.from, status: "created", id: entryId });
        }
      } catch (error) {
        results.push({
          from: entry.from,
          status: "error",
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      total: entries.length,
      created: results.filter((r) => r.status === "created").length,
      updated: results.filter((r) => r.status === "updated").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    };
  },
});
