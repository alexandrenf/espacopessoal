import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  documents: defineTable({
    title: v.string(),
    initialContent: v.optional(v.string()),
    ownerId: v.string(), // Will be a simple string identifier for now
    organizationId: v.optional(v.string()),
    roomId: v.optional(v.string()), // For HocusPocus room association
    createdAt: v.number(),
    updatedAt: v.number(),
    // New fields for folder support
    parentId: v.optional(v.id("documents")), // Reference to parent folder
    order: v.number(), // For sorting within the same level
    isFolder: v.boolean(), // true for folders, false for documents
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_organization_id", ["organizationId"])
    .index("by_parent_id", ["parentId"]) // New index for hierarchical queries
    .index("by_parent_and_order", ["parentId", "order"]) // New index for ordered queries
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["ownerId", "organizationId"],
    }),
    
  documentPermissions: defineTable({
    documentId: v.id("documents"),
    userId: v.string(),
    role: v.union(v.literal("viewer"), v.literal("editor")),
  })
    .index("by_document_id", ["documentId"])
    .index("by_user_id", ["userId"])
    .index("by_document_and_user", ["documentId", "userId"]),
}); 