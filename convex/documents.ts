import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { type Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Production-ready logging utility
// Use LOG_LEVEL environment variable instead of NODE_ENV since NODE_ENV is always 'development' in Convex sandbox
const isDevelopment = process.env.LOG_LEVEL === 'development';
const logger = {
  log: (message: string, ...args: unknown[]) => {
    // Only log in development, remove for production
    if (isDevelopment) {
      console.log(`[documents] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    // Always log errors, but only in structured way for production monitoring
    console.error(`[documents] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(`[documents] ${message}`, ...args);
    }
  },
  // Remove debug logging in production
  debug: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.log(`[documents:debug] ${message}`, ...args);
    }
  }
};

// For backward compatibility during migration
// TODO: Create tracking issue to phase out DEFAULT_USER_ID in favor of native Convex user IDs
const DEFAULT_USER_ID = "demo-user";

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    initialContent: v.optional(v.string()),
    userId: v.optional(v.string()), // TODO: Change to v.id("users") after auth migration
    parentId: v.optional(v.id("documents")), // Parent folder
    isFolder: v.optional(v.boolean()), // Whether this is a folder
    isHome: v.optional(v.boolean()), // Whether this is the home document
  },
  handler: async (ctx, args) => {
    const userId = args.userId ?? DEFAULT_USER_ID;
    const now = Date.now();
    const isFolder = args.isFolder ?? false;
    
    // Use retry mechanism to handle race conditions in order calculation
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        // Get the next order number for the parent
        let order = 0;
        if (args.parentId) {
          // Verify parent exists and is a folder
          const parent = await ctx.db.get(args.parentId);
          if (!parent?.isFolder) {
            throw new ConvexError("Parent must be a folder");
          }
          
          // Get the highest order in the parent folder
          const siblings = await ctx.db
            .query("documents")
            .withIndex("by_parent_id", (q) => q.eq("parentId", args.parentId))
            .collect();
          const maxOrder = siblings.reduce((max, doc) => Math.max(max, doc.order || 0), -1);
          order = maxOrder + 1;
        } else {
          // Get the highest order in the root level
          const siblings = await ctx.db
            .query("documents")
            .withIndex("by_parent_id", (q) => q.eq("parentId", undefined))
            .filter((q) => q.eq(q.field("ownerId"), userId))
            .collect();
          const maxOrder = siblings.reduce((max, doc) => Math.max(max, doc.order || 0), -1);
          order = maxOrder + 1;
        }
        
        // Insert the document
        return await ctx.db.insert("documents", {
          title: args.title ?? (isFolder ? "New Folder" : "Untitled Document"),
          ownerId: userId,
          initialContent: isFolder ? undefined : (args.initialContent ?? ""),
          roomId: undefined, // Will be set to document ID after creation
          createdAt: now,
          updatedAt: now,
          parentId: args.parentId,
          order,
          isFolder,
          isHome: args.isHome ?? false,
        });
        
      } catch (error) {
        retryCount++;
        logger.warn(`Document creation retry ${retryCount}/${maxRetries} due to:`, error);
        
        if (retryCount >= maxRetries) {
          logger.error("Document creation failed after maximum retries:", error);
          throw error;
        }
        
        // Add small delay before retry to reduce collision probability
        await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
      }
    }
    
    throw new ConvexError("Document creation failed after maximum retries");
  },
});



export const get = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { paginationOpts, search, userId }) => {
    const ownerId = userId ?? DEFAULT_USER_ID;
    
    if (search) {
      return await ctx.db
        .query("documents")
        .withSearchIndex("search_title", (q) =>
          q.search("title", search).eq("ownerId", ownerId)
        )
        .paginate(paginationOpts);
    }
    
    return await ctx.db
      .query("documents")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", ownerId))
      .order("desc")
      .paginate(paginationOpts);
  },
});

// New query to get hierarchical documents
export const getHierarchical = query({
  args: {
    userId: v.optional(v.string()),
    parentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, { userId, parentId }) => {
    const ownerId = userId ?? DEFAULT_USER_ID;
    
    return await ctx.db
      .query("documents")
      .withIndex("by_parent_id", (q) => q.eq("parentId", parentId))
      .filter((q) => q.eq(q.field("ownerId"), ownerId))
      .order("asc")
      .collect();
  },
});

// Get all documents in a flat structure for the tree
export const getAllForTree = query({
  args: {
    userId: v.optional(v.string()),
    limit: v.optional(v.number()), // Add limit to prevent performance issues
  },
  handler: async (ctx, { userId, limit }) => {
    const ownerId = userId ?? DEFAULT_USER_ID;
    const documentLimit = limit ?? 1000; // Default limit of 1000 documents
    
    return await ctx.db
      .query("documents")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", ownerId))
      .order("asc")
      .take(documentLimit);
  },
});

export const getById = query({
  args: { 
    id: v.id("documents"),
    userId: v.string(), // Made required for security
  },
  handler: async (ctx, { id, userId }) => {
    if (!userId) {
      throw new ConvexError("User ID is required to access documents");
    }
    
    const document = await ctx.db.get(id);
    if (!document) {
      throw new ConvexError("Document not found!");
    }
    
    // Verify ownership - only document owner can access
    if (document.ownerId !== userId) {
      throw new ConvexError("You don't have permission to access this document");
    }
    
    return document;
  },
});

export const updateById = mutation({
  args: {
    id: v.id("documents"),
    title: v.string(),
    userId: v.string(), // Made required for security
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      throw new ConvexError("User ID is required to update documents");
    }
    
    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new ConvexError("Document not found!");
    }
    
    // Verify ownership - only document owner can update
    if (document.ownerId !== args.userId) {
      throw new ConvexError("You don't have permission to update this document");
    }
    
    return await ctx.db.patch(args.id, { 
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

// Update document structure (for drag and drop)
export const updateStructure = mutation({
  args: {
    updates: v.array(v.object({
      id: v.id("documents"),
      parentId: v.optional(v.id("documents")),
      order: v.number(),
    })),
    userId: v.string(), // Made required for security
  },
  handler: async (ctx, { updates, userId }) => {
    // Verify all documents exist and belong to the user
    if (!userId) {
      throw new ConvexError("User ID is required for document structure updates");
    }
    
    for (const update of updates) {
      const document = await ctx.db.get(update.id);
      if (!document || document.ownerId !== userId) {
        throw new ConvexError(`Document ${update.id} not found or access denied`);
      }
      
      // If parentId is specified, verify it's a folder and user owns it
      if (update.parentId) {
        const parent = await ctx.db.get(update.parentId);
        if (!parent || !parent.isFolder || parent.ownerId !== userId) {
          throw new ConvexError(`Parent folder ${update.parentId} not found or not a folder`);
        }
      }
      
      await ctx.db.patch(update.id, {
        parentId: update.parentId,
        order: update.order,
        updatedAt: Date.now(),
      });
    }
  },
});

export const removeById = mutation({
  args: {
    id: v.id("documents"),
    userId: v.string(), // Made required for security
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      throw new ConvexError("User ID is required to delete documents");
    }
    
    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new ConvexError("Document not found!");
    }
    
    // Verify ownership - only document owner can delete
    if (document.ownerId !== args.userId) {
      throw new ConvexError("You don't have permission to delete this document");
    }
    
    // If it's a folder, check if it has children
    if (document.isFolder) {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_parent_id", (q) => q.eq("parentId", args.id))
        .collect();
      
      if (children.length > 0) {
        throw new ConvexError("Cannot delete folder with items inside. Please move or delete all items first.");
      }
    }
    
    return await ctx.db.delete(args.id);
  },
});

export const getByIds = query({
  args: { 
    ids: v.array(v.id("documents")),
    userId: v.string(), // Made required for security
  },
  handler: async (ctx, { ids, userId }) => {
    const documents = [];
    for (const id of ids) {
      const document = await ctx.db.get(id);
      if (document) {
        // Security check: only return documents owned by the requesting user
        if (document.ownerId === userId) {
          documents.push({ id: document._id, name: document.title });
        } else {
          // User doesn't own this document, return "not found" to prevent information leakage
          documents.push({ id, name: "Document not found" });
        }
      } else {
        documents.push({ id, name: "Document not found" });
      }
    }
    return documents;
  },
});

// Update document content after real-time editing
export const updateContent = mutation({
  args: {
    id: v.id("documents"),
    content: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new ConvexError("Document not found!");
    }
    
    // Verify ownership - only document owner can update content
    if (!args.userId) {
      throw new ConvexError("User ID is required to update document content");
    }
    
    if (document.ownerId !== args.userId) {
      throw new ConvexError("You don't have permission to update this document");
    }
    
    return await ctx.db.patch(args.id, { 
      initialContent: args.content,
      updatedAt: Date.now(),
    });
  },
});

// Internal functions for HTTP actions
export const updateContentInternal = internalMutation({
  args: {
    id: v.string(), // Accept string ID from HTTP action
    content: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    logger.debug(`Attempting to update document with ID: ${args.id}`);
    
    // Check if this is a server update (trusted source)
    const isServerUpdate = args.userId === 'hocus-pocus-server' || 
                          (process.env.SERVER_USER_ID && args.userId === process.env.SERVER_USER_ID);
    
    // Validate that the ID looks like a Convex ID
    if (!args.id || typeof args.id !== 'string' || args.id.length < 20) {
      throw new ConvexError(`Invalid document ID format: ${args.id}`);
    }
    
    // Additional validation for Convex ID format - check for base64url pattern
    // Base64url uses A-Z, a-z, 0-9, hyphens (-), and underscores (_)
    const convexIdPattern = /^[A-Za-z0-9_-]{20,}$/;
    if (!convexIdPattern.test(args.id)) {
      throw new ConvexError(`Invalid document ID format: ${args.id} - must be a valid Convex ID`);
    }
    
    try {
      // Convert string ID to Convex ID
      const documentId = args.id as Id<"documents">;
      const document = await ctx.db.get(documentId);
      
      if (!document) {
        logger.debug(`Document not found with ID: ${args.id} - checking by roomId`);
        
        // Check if there's a document with this ID in roomId field instead
        const docByRoomId = await ctx.db.query("documents").filter(q => q.eq(q.field("roomId"), args.id)).first();
        if (docByRoomId) {
          // Verify ownership before updating existing document (skip for server updates)
          if (!isServerUpdate && (!args.userId || docByRoomId.ownerId !== args.userId)) {
            throw new ConvexError("You don't have permission to update this document");
          }
          
          logger.debug(`Found document by roomId: ${docByRoomId.title} (${docByRoomId._id}), updating it`);
          const result = await ctx.db.patch(docByRoomId._id, { 
            initialContent: args.content,
            updatedAt: Date.now(),
          });
          return result;
        }
        
        // For server updates, don't create new documents - just return error
        if (isServerUpdate) {
          throw new ConvexError(`Document ${args.id} not found - server cannot create new documents`);
        }
        
        // Strengthen auto-creation validation - require explicit authorization
        if (!args.userId) {
          throw new ConvexError(`Document ${args.id} not found and no user ID provided for authorization`);
        }
        
        // Require valid user authorization - validate userId format and reject unauthorized users
        if (args.userId === "demo-user") {
          throw new ConvexError(`Document ${args.id} not found and demo-user is not authorized to create new documents`);
        }
        
        // Implement proper user validation - verify user exists in database
        if (typeof args.userId !== 'string' || args.userId.trim().length === 0) {
          throw new ConvexError(`Document ${args.id} not found and invalid user ID provided`);
        }
        
        // Validate that the user exists in the users table by checking NextAuth external ID
        const validUser = await ctx.db
          .query("users")
          .withIndex("by_external_id", (q) => 
            q.eq("externalId", args.userId).eq("provider", "nextauth")
          )
          .first();
        
        if (!validUser) {
          throw new ConvexError(`Document ${args.id} not found and user ${args.userId} is not authorized or does not exist`);
        }
        
        // Create a basic document record only for authorized users
        try {
          const now = Date.now();
          const newDocumentId = await ctx.db.insert("documents", {
            title: "Untitled Document (Auto-created)",
            ownerId: args.userId,
            initialContent: args.content,
            roomId: args.id,
            createdAt: now,
            updatedAt: now,
            parentId: undefined,
            order: 0,
            isFolder: false,
          });
          
          logger.debug(`Created new document with ID: ${newDocumentId} for authorized user: ${args.userId}`);
          return newDocumentId;
        } catch (createError) {
          logger.error(`Failed to create new document:`, createError);
          throw new ConvexError(`Document ${args.id} not found and could not create replacement`);
        }
      }
      
      // Verify ownership before updating existing document (skip for server updates)
      if (!isServerUpdate && (!args.userId || document.ownerId !== args.userId)) {
        throw new ConvexError("You don't have permission to update this document");
      }
      
      logger.debug(`Successfully found document: ${document.title} ${isServerUpdate ? '(server update)' : ''}`);
      
      const result = await ctx.db.patch(documentId, { 
        initialContent: args.content,
        updatedAt: Date.now(),
      });
      
      return result;
    } catch (error) {
      logger.error("Error in updateContentInternal:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError(`Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

export const getByIdInternal = internalQuery({
  args: { 
    id: v.string(), // Accept string ID from HTTP action
  },
  handler: async (ctx, args) => {
    logger.debug(`Attempting to get document with ID: ${args.id}`);
    
    // Validate that the ID looks like a Convex ID
    if (!args.id || typeof args.id !== 'string' || args.id.length < 20) {
      throw new ConvexError(`Invalid document ID format: ${args.id}`);
    }
    
    // Additional validation for Convex ID format - check for base64url pattern
    // Base64url uses A-Z, a-z, 0-9, hyphens (-), and underscores (_)
    const convexIdPattern = /^[A-Za-z0-9_-]{20,}$/;
    if (!convexIdPattern.test(args.id)) {
      throw new ConvexError(`Invalid document ID format: ${args.id} - must be a valid Convex ID`);
    }
    
    try {
      // Convert string ID to Convex ID
      const documentId = args.id as Id<"documents">;
      
      const document = await ctx.db.get(documentId);
      
      if (!document) {
        logger.debug(`Document not found with ID: ${args.id} - checking by roomId`);
        // Check if there's a document with this ID in roomId field instead
        const docByRoomId = await ctx.db.query("documents").filter(q => q.eq(q.field("roomId"), args.id)).first();
        if (docByRoomId) {
          logger.debug(`Found document by roomId: ${docByRoomId.title} (${docByRoomId._id})`);
          return docByRoomId;
        }
        return null;
      }
      
      logger.debug(`Successfully found document: ${document.title}`);
      return document;
    } catch (error) {
      logger.error("Error in getByIdInternal:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError(`Failed to get document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
}); 

// Create a shareable link for a document
export const createSharedDocument = mutation({
  args: {
    documentId: v.id("documents"),
    userId: v.string(), // TODO: Change to v.id("users") after auth migration complete
  },
  handler: async (ctx, args) => {
    // Check if document exists and user owns it
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new ConvexError("Document not found");
    }
    
    if (document.ownerId !== args.userId) {
      throw new ConvexError("You don't have permission to share this document");
    }
    
    // Generate unique URL with retry limit to prevent infinite loops
    const generateUniqueUrl = async (): Promise<string> => {
      const maxRetries = 10;
      let retryCount = 0;
      
      while (retryCount < maxRetries) {
        // Generate 12-character URL-safe string for better collision resistance
        const url = Math.random().toString(36).substring(2, 14);
        const existing = await ctx.db
          .query("sharedDocuments")
          .withIndex("by_url", (q) => q.eq("url", url))
          .first();
        if (!existing) return url;
        
        retryCount++;
        logger.warn(`URL collision detected, retry ${retryCount}/${maxRetries}`);
      }
      
      // If we still can't generate a unique URL, use timestamp-based fallback
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      const fallbackUrl = `${timestamp}${random}`.substring(0, 12);
      
      logger.error(`Failed to generate unique URL after ${maxRetries} attempts, using fallback: ${fallbackUrl}`);
      return fallbackUrl;
    };
    
    const uniqueUrl = await generateUniqueUrl();
    const now = Date.now();
    
    return await ctx.db.insert("sharedDocuments", {
      url: uniqueUrl,
      documentId: args.documentId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get shared document by URL (public access)
export const getSharedDocument = query({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const sharedDoc = await ctx.db
      .query("sharedDocuments")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();
      
    if (!sharedDoc) {
      throw new ConvexError("Shared document not found");
    }
    
    const document = await ctx.db.get(sharedDoc.documentId);
    if (!document) {
      throw new ConvexError("Document not found");
    }
    
    // Since ownerId is a string (not a Convex ID), we cannot look up user details
    // TODO: Implement proper user management with string ID to Convex user mapping
    return {
      ...sharedDoc,
      document: {
        ...document,
        owner: {
          // For now, just use the ownerId as a display name
          name: document.ownerId !== "demo-user" ? "Document Owner" : "Demo User",
          email: null,
        },
      },
    };
  },
});

// Get sharing info for a document by document ID
export const getSharedDocumentByDocumentId = query({
  args: {
    documentId: v.id("documents"),
    userId: v.optional(v.string()), // TODO: Change to v.id("users") after auth migration
  },
  handler: async (ctx, args) => {
    // Check if document exists
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new ConvexError("Document not found");
    }
    
    // Check if user owns the document
    const isOwner = document.ownerId === args.userId;
    
    // Get shared document if it exists
    const sharedDoc = await ctx.db
      .query("sharedDocuments")
      .withIndex("by_document_id", (q) => q.eq("documentId", args.documentId))
      .first();
    
    return {
      isOwner,
      sharedDocument: sharedDoc,
      document,
    };
  },
});

// Delete shared document
export const deleteSharedDocument = mutation({
  args: {
    url: v.string(),
    userId: v.string(), // TODO: Change to v.id("users") after auth migration
  },
  handler: async (ctx, args) => {
    const sharedDoc = await ctx.db
      .query("sharedDocuments")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .first();
      
    if (!sharedDoc) {
      throw new ConvexError("Shared document not found");
    }
    
    const document = await ctx.db.get(sharedDoc.documentId);
    if (!document) {
      throw new ConvexError("Document not found");
    }
    
    if (document.ownerId !== args.userId) {
      throw new ConvexError("You don't have permission to delete this shared document");
    }
    
    return await ctx.db.delete(sharedDoc._id);
  },
}); 

// Get or create a user's home document
export const getOrCreateHomeDocument = mutation({
  args: {
    userId: v.string(), // TODO: Change to v.id("users") after auth migration complete
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // First, try to find an existing home document using the isHome field
    const homeDocument = await ctx.db
      .query("documents")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", args.userId))
      .filter((q) => q.eq(q.field("isHome"), true))
      .first();
    
    if (homeDocument) {
      return homeDocument._id;
    }
    
    // If no home document exists, create one
    const documentId = await ctx.db.insert("documents", {
      title: "My Notebook",
      ownerId: args.userId,
      createdAt: now,
      updatedAt: now,
      parentId: undefined,
      order: 0,
      isFolder: false,
      isHome: true, // Mark as home document
      initialContent: '<h1>Welcome to Your Notebook!</h1><p>Start writing your thoughts, ideas, and notes here. This is your personal space to organize everything important to you.</p><p></p><p><strong>Features you can use:</strong></p><ul><li>Real-time collaborative editing</li><li>Rich text formatting</li><li>Spell checking and dictionary replacements</li><li>Document sharing</li><li>Folder organization</li></ul><p></p><p>Happy writing! ✨</p>',
    });
    
    return documentId;
  },
});

// Get user's recent documents for quick access
export const getRecentDocuments = query({
  args: {
    userId: v.string(), // TODO: Change to v.id("users") after auth migration
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;
    
    return await ctx.db
      .query("documents")
      .withIndex("by_owner_id", (q) => q.eq("ownerId", args.userId))
      .filter((q) => q.eq(q.field("isFolder"), false))
      .order("desc")
      .take(limit);
  },
}); 