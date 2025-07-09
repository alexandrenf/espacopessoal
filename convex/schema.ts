import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table for authentication
  users: defineTable({
    name: v.optional(v.string()),
    email: v.string(),
    image: v.optional(v.string()),
    emailVerified: v.optional(v.number()),
    // External provider IDs
    externalId: v.optional(v.string()), // For OAuth providers
    provider: v.optional(v.string()), // google, discord, email, etc.
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_external_id", ["externalId", "provider"]),

  // Session management for NextAuth integration
  sessions: defineTable({
    userId: v.id("users"),
    sessionToken: v.string(),
    expires: v.number(),
    createdAt: v.number(),
  })
    .index("by_session_token", ["sessionToken"])
    .index("by_user_id", ["userId"]),

  documents: defineTable({
    title: v.string(),
    initialContent: v.optional(v.string()),
    ownerId: v.string(), // TODO: Change to v.id("users") after auth migration
    organizationId: v.optional(v.string()),
    roomId: v.optional(v.string()), // For HocusPocus room association
    createdAt: v.number(),
    updatedAt: v.number(),
    // New fields for folder support
    parentId: v.optional(v.id("documents")), // Reference to parent folder
    order: v.number(), // For sorting within the same level
    isFolder: v.boolean(), // true for folders, false for documents
    isHome: v.optional(v.boolean()), // true for user's home document
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
    userId: v.string(), // TODO: Change to v.id("users") after auth migration
    role: v.union(v.literal("viewer"), v.literal("editor")),
  })
    .index("by_document_id", ["documentId"])
    .index("by_user_id", ["userId"])
    .index("by_document_and_user", ["documentId", "userId"]),

  // Dictionary for spell check and text replacement
  dictionary: defineTable({
    from: v.string(),
    to: v.string(),
    ownerId: v.string(), // TODO: Change to v.id("users") after auth migration
    isPublic: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_from", ["from"])
    .index("by_public", ["isPublic"]),

  // Shared documents for public links
  sharedDocuments: defineTable({
    url: v.string(), // Unique 12-character URL (generated with nanoid)
    documentId: v.id("documents"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_url", ["url"])
    .index("by_document_id", ["documentId"]),
}); 