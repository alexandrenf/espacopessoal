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

  // Notebooks for organizing documents
  notebooks: defineTable({
    url: v.string(), // Custom URL for notebook access (3-50 characters)
    urlLower: v.optional(v.string()), // Lowercase version for case-insensitive lookups
    title: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    isPrivate: v.boolean(), // Whether the notebook is private
    password: v.optional(v.string()), // Optional password for private notebooks
    passwordStrength: v.optional(v.string()), // "weak", "medium", "strong"
    passwordUpdatedAt: v.optional(v.number()), // When password was last changed
    requirePasswordChange: v.optional(v.boolean()), // Force password update
    maxSessionDuration: v.optional(v.number()), // Custom session length in milliseconds
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_url", ["url"])
    .index("by_url_lower", ["urlLower"]) // New index for case-insensitive lookups
    .index("by_owner_and_url", ["ownerId", "url"]),

  // JWT-based notebook session management for password-protected access
  notebookSessions: defineTable({
    sessionToken: v.string(), // Session token for validation
    userId: v.optional(v.id("users")), // Required for JWT sessions (optional for backward compatibility)
    notebookId: v.id("notebooks"),
    deviceFingerprint: v.string(), // Browser/device identification
    ipAddress: v.optional(v.string()), // IP address for security tracking (optional for backward compatibility)
    expiresAt: v.number(), // Session expiration timestamp
    createdAt: v.number(),
    isActive: v.optional(v.boolean()), // Session active status (optional for backward compatibility)
    // Legacy fields for backward compatibility
    isRevoked: v.optional(v.boolean()), // Legacy field
    lastAccessedAt: v.optional(v.number()), // Legacy field
    userAgent: v.optional(v.string()), // Legacy field
  })
    .index("by_token", ["sessionToken"])
    .index("by_notebook", ["notebookId"])
    .index("by_user_id", ["userId"])
    .index("by_device", ["deviceFingerprint"])
    .index("by_expiration", ["expiresAt", "isActive"])
    .index("by_notebook_user", ["notebookId", "userId"])
    .index("by_active_sessions", ["isActive", "expiresAt"]),

  // Security audit log for comprehensive monitoring
  auditLog: defineTable({
    event: v.string(), // Event type (e.g., "session_created", "password_validation_failed")
    userId: v.optional(v.string()), // User ID (string for compatibility)
    notebookId: v.optional(v.id("notebooks")), // Related notebook
    documentId: v.optional(v.id("documents")), // Related document
    sessionId: v.optional(v.string()), // Related session ID
    ipAddress: v.optional(v.string()), // Client IP address
    userAgent: v.optional(v.string()), // Client user agent
    deviceFingerprint: v.optional(v.string()), // Device fingerprint
    timestamp: v.number(), // Event timestamp
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("error"),
      v.literal("critical"),
    ),
    details: v.any(), // Additional event-specific data
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_user_id", ["userId"])
    .index("by_event", ["event"])
    .index("by_severity", ["severity"])
    .index("by_notebook_id", ["notebookId"])
    .index("by_session_id", ["sessionId"])
    .index("by_event_timestamp", ["event", "timestamp"])
    .index("by_user_timestamp", ["userId", "timestamp"])
    .index("by_severity_timestamp", ["severity", "timestamp"]),

  // Rate limiting entries for API protection
  rateLimits: defineTable({
    identifier: v.string(), // IP address or IP:userId combination
    endpoint: v.string(), // Rate limit endpoint type
    requestCount: v.number(), // Current request count in window
    windowStart: v.number(), // Window start timestamp
    isBlocked: v.boolean(), // Whether client is currently blocked
    blockUntil: v.number(), // Timestamp when block expires
    lastAttempt: v.number(), // Last request timestamp
    createdAt: v.number(), // Entry creation timestamp
  })
    .index("by_identifier_endpoint", ["identifier", "endpoint"])
    .index("by_endpoint", ["endpoint"])
    .index("by_blocked", ["isBlocked", "blockUntil"])
    .index("by_last_attempt", ["lastAttempt"])
    .index("by_window_start", ["windowStart"])
    .index("by_cleanup", ["lastAttempt", "isBlocked"]),

  documents: defineTable({
    title: v.string(),
    initialContent: v.optional(v.string()),
    yjsState: v.optional(v.bytes()), // Y.js binary state for perfect formatting preservation
    ownerId: v.id("users"),
    notebookId: v.optional(v.id("notebooks")), // Reference to parent notebook
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
    .index("by_notebook_id", ["notebookId"]) // New index for notebook-scoped queries
    .index("by_organization_id", ["organizationId"])
    .index("by_parent_id", ["parentId"]) // New index for hierarchical queries
    .index("by_parent_and_order", ["parentId", "order"]) // New index for ordered queries
    .index("by_owner_id_notebook_id", ["ownerId", "notebookId"]) // Optimized for user's notebook documents
    .index("by_parent_id_owner_id", ["parentId", "ownerId"]) // Optimized for user's folder contents
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["ownerId", "notebookId", "organizationId"],
    }),

  documentPermissions: defineTable({
    documentId: v.id("documents"),
    userId: v.id("users"),
    role: v.union(v.literal("viewer"), v.literal("editor")),
  })
    .index("by_document_id", ["documentId"])
    .index("by_user_id", ["userId"])
    .index("by_document_and_user", ["documentId", "userId"]),

  // Dictionary for spell check and text replacement
  dictionary: defineTable({
    from: v.string(),
    to: v.string(),
    ownerId: v.id("users"),
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

  // Profile pictures management
  profilePictures: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"), // Convex storage ID
    filename: v.string(), // Original filename for reference
    fileSize: v.number(), // File size in bytes
    mimeType: v.string(), // MIME type (should be image/webp)
    isActive: v.boolean(), // Whether this is the current profile picture
    uploadedAt: v.number(),
    lastAccessedAt: v.number(), // For tracking unused files
  })
    .index("by_user_id", ["userId"])
    .index("by_storage_id", ["storageId"])
    .index("by_active", ["isActive"])
    .index("by_last_accessed", ["lastAccessedAt"])
    .index("by_user_active", ["userId", "isActive"]),

  // NextAuth.js OAuth accounts
  accounts: defineTable({
    userId: v.id("users"),
    provider: v.string(), // "google", "discord", etc.
    providerAccountId: v.string(),
    type: v.string(), // "oauth", "email", etc.
    access_token: v.optional(v.string()),
    refresh_token: v.optional(v.string()),
    expires_at: v.optional(v.number()),
    token_type: v.optional(v.string()),
    scope: v.optional(v.string()),
    id_token: v.optional(v.string()),
    session_state: v.optional(v.string()),
    refresh_token_expires_in: v.optional(v.number()),
  })
    .index("by_user_id", ["userId"])
    .index("by_provider_account", ["provider", "providerAccountId"]),

  // Verification tokens for email auth
  verificationTokens: defineTable({
    identifier: v.string(), // email address
    token: v.string(),
    expires: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_identifier_token", ["identifier", "token"]),

  // Magic codes for 6-digit authentication
  magicCodes: defineTable({
    email: v.string(),
    code: v.string(), // 6-digit code
    expiresAt: v.number(),
    attempts: v.number(), // Track failed attempts
    isUsed: v.boolean(), // Prevent code reuse
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_code", ["code"])
    .index("by_expires", ["expiresAt"])
    .index("by_email_code", ["email", "code"]),

  // User settings and configuration
  userSettings: defineTable({
    userId: v.id("users"),
    notePadUrl: v.optional(v.string()), // Legacy notepad URL
    notePadUrlLower: v.optional(v.string()), // Lowercase version for optimized indexing
    privateOrPublicUrl: v.optional(v.boolean()), // Private if true
    password: v.optional(v.string()), // Password for private notepad
    fcmToken: v.optional(v.string()), // Firebase Cloud Messaging token
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_notepad_url", ["notePadUrl"])
    .index("by_notepad_url_lower", ["notePadUrlLower"]),

  // Task management boards
  boards: defineTable({
    name: v.string(),
    color: v.string(),
    order: v.number(),
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_order", ["userId", "order"]),

  // Individual tasks
  tasks: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("TODO"),
      v.literal("IN_PROGRESS"),
      v.literal("DONE"),
    ),
    order: v.number(),
    dueDate: v.optional(v.number()),
    boardId: v.id("boards"),
    userId: v.id("users"),
    reminderEnabled: v.boolean(),
    reminderDateTime: v.optional(v.number()),
    reminderFrequency: v.optional(
      v.union(
        v.literal("ONCE"),
        v.literal("DAILY"),
        v.literal("WEEKLY"),
        v.literal("MONTHLY"),
      ),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_board_id", ["boardId"])
    .index("by_due_date", ["dueDate"])
    .index("by_board_order", ["boardId", "order"]),

  // Scheduled notifications
  scheduledNotifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    scheduledFor: v.number(),
    fcmToken: v.string(),
    sent: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_scheduled_for", ["scheduledFor", "sent"])
    .index("by_pending", ["sent", "scheduledFor"])
    .index("by_user_id_sent", ["userId", "sent"]), // Optimized for user's notification queries

  // Legacy notepad system (for backward compatibility during migration)
  legacyNotepads: defineTable({
    content: v.optional(v.string()),
    createdById: v.string(), // Keep as string for Prisma compatibility
    parentId: v.optional(v.id("legacyNotepads")),
    isFolder: v.boolean(),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_created_by", ["createdById"])
    .index("by_parent_id", ["parentId"])
    .index("by_parent_order", ["parentId", "order"]),

  // Legacy shared notes
  legacySharedNotes: defineTable({
    url: v.string(),
    noteId: v.id("legacyNotepads"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_url", ["url"])
    .index("by_note_id", ["noteId"]),
});
