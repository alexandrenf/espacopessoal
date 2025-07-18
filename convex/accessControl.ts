/**
 * Access Control Middleware for Espaço Pessoal
 * Centralized authorization system for secure resource access
 */

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Helper function to check session status (handles both new and legacy fields)
function isSessionActive(
  session: { isActive?: boolean; isRevoked?: boolean } | null | undefined,
): boolean {
  if (!session) return false;
  // Handle both new isActive field and legacy isRevoked field
  return session.isActive ?? !session.isRevoked;
}

/**
 * Permission levels for resources
 */
export type PermissionLevel = "none" | "read" | "write" | "admin" | "owner";

/**
 * Resource types that can be protected
 */
export type ResourceType = "notebook" | "document" | "user" | "system";

/**
 * Access control result
 */
interface AccessResult {
  granted: boolean;
  permission: PermissionLevel;
  reason?: string;
  userId?: string;
  resourceId?: string;
}

/**
 * Session data structure from authentication providers
 */
interface SessionData {
  email?: string;
  name?: string;
  image?: string;
  provider?: string;
}

/**
 * Session validation result
 */
interface SessionValidation {
  valid: boolean;
  userId?: string;
  sessionData?: SessionData;
  reason?: string;
}

/**
 * Validate user session and extract user information
 */
async function validateUserSession(
  ctx: QueryCtx | MutationCtx,
): Promise<SessionValidation> {
  try {
    // Check NextAuth session
    const identity = await ctx.auth.getUserIdentity();

    if (identity) {
      // User is authenticated via NextAuth
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
        .first();

      if (user) {
        return {
          valid: true,
          userId: user._id,
          sessionData: { email: identity.email, name: identity.name },
        };
      }
    }

    return {
      valid: false,
      reason: "No valid authentication session found",
    };
  } catch {
    return {
      valid: false,
      reason: "Session validation failed",
    };
  }
}

/**
 * Check if user has permission to access a notebook
 */
async function checkNotebookAccess(
  ctx: QueryCtx | MutationCtx,
  notebookId: Id<"notebooks">,
  userId?: string,
  sessionToken?: string,
): Promise<AccessResult> {
  try {
    const notebook = await ctx.db.get(notebookId);

    if (!notebook) {
      return {
        granted: false,
        permission: "none",
        reason: "Notebook not found",
      };
    }

    // Owner has full access
    if (userId && notebook.ownerId === userId) {
      return {
        granted: true,
        permission: "owner",
        userId,
        resourceId: notebookId,
      };
    }

    // Public notebook access
    if (!notebook.isPrivate) {
      return {
        granted: true,
        permission: userId ? "write" : "read",
        userId,
        resourceId: notebookId,
      };
    }

    // Private notebook requires session token or ownership
    if (notebook.isPrivate) {
      if (!sessionToken) {
        return {
          granted: false,
          permission: "none",
          reason: "Private notebook requires authentication",
          resourceId: notebookId,
        };
      }

      // Validate session token for private notebook
      const session = await ctx.db
        .query("notebookSessions")
        .withIndex("by_token", (q) => q.eq("sessionToken", sessionToken))
        .first();

      if (
        !session ||
        !isSessionActive(session) ||
        session.expiresAt < Date.now()
      ) {
        return {
          granted: false,
          permission: "none",
          reason: "Invalid or expired session token",
          resourceId: notebookId,
        };
      }

      if (session.notebookId !== notebookId) {
        return {
          granted: false,
          permission: "none",
          reason: "Session token not valid for this notebook",
          resourceId: notebookId,
        };
      }

      return {
        granted: true,
        permission: "write",
        userId: session.userId,
        resourceId: notebookId,
      };
    }

    return {
      granted: false,
      permission: "none",
      reason: "Access denied",
      resourceId: notebookId,
    };
  } catch {
    return {
      granted: false,
      permission: "none",
      reason: "Access check failed",
      resourceId: notebookId,
    };
  }
}

/**
 * Check if user has permission to access a document
 */
async function checkDocumentAccess(
  ctx: QueryCtx | MutationCtx,
  documentId: Id<"documents">,
  userId?: string,
  sessionToken?: string,
): Promise<AccessResult> {
  try {
    const document = await ctx.db.get(documentId);

    if (!document) {
      return {
        granted: false,
        permission: "none",
        reason: "Document not found",
      };
    }

    // Owner has full access
    if (userId && document.ownerId === userId) {
      return {
        granted: true,
        permission: "owner",
        userId,
        resourceId: documentId,
      };
    }

    // Check notebook-level access if document belongs to a notebook
    if (document.notebookId) {
      const notebookAccess = await checkNotebookAccess(
        ctx,
        document.notebookId,
        userId,
        sessionToken,
      );

      if (notebookAccess.granted) {
        return {
          granted: true,
          permission: notebookAccess.permission === "owner" ? "owner" : "write",
          userId,
          resourceId: documentId,
        };
      }

      return {
        granted: false,
        permission: "none",
        reason: notebookAccess.reason ?? "No access to parent notebook",
        resourceId: documentId,
      };
    }

    // Document not in notebook - check direct permissions
    const permission = await ctx.db
      .query("documentPermissions")
      .withIndex("by_document_and_user", (q) =>
        q.eq("documentId", documentId).eq("userId", userId as Id<"users">),
      )
      .first();

    if (permission) {
      return {
        granted: true,
        permission: permission.role as PermissionLevel,
        userId,
        resourceId: documentId,
      };
    }

    return {
      granted: false,
      permission: "none",
      reason: "No permission to access this document",
      resourceId: documentId,
    };
  } catch {
    return {
      granted: false,
      permission: "none",
      reason: "Access check failed",
      resourceId: documentId,
    };
  }
}

/**
 * Arguments interface for access control middleware
 */
interface AccessControlArgs {
  notebookId?: Id<"notebooks"> | string;
  documentId?: Id<"documents"> | string;
  id?: string;
  url?: string;
  sessionToken?: string;
  userId?: Id<"users"> | string;
}

/**
 * Type guard to check if args conform to AccessControlArgs
 */
function isAccessControlArgs(args: unknown): args is AccessControlArgs {
  return typeof args === "object" && args !== null;
}

/**
 * Access control middleware wrapper for Convex functions
 */
export function withAccessControl(
  resourceType: ResourceType,
  requiredPermission: PermissionLevel = "read",
) {
  return function <
    TCtx extends QueryCtx | MutationCtx,
    TArgs extends Record<string, unknown>,
    TReturn,
  >(
    handler: (ctx: TCtx, args: TArgs) => TReturn,
  ): (ctx: TCtx, args: TArgs) => Promise<TReturn> {
    return async (ctx: TCtx, args: TArgs) => {
      // Validate user session
      const sessionValidation = await validateUserSession(ctx);

      // Type-safe argument extraction
      if (!isAccessControlArgs(args)) {
        throw new ConvexError("Invalid arguments structure");
      }

      // Log access attempt
      await logAccessAttempt(ctx, {
        resourceType,
        requiredPermission,
        userId: sessionValidation.userId,
        resourceId: (args.notebookId ?? args.documentId ?? args.id) as
          | string
          | undefined,
        sessionValid: sessionValidation.valid,
        timestamp: Date.now(),
      });

      let accessResult: AccessResult;

      // Check resource-specific access
      switch (resourceType) {
        case "notebook": {
          if (!args.notebookId && !args.url) {
            throw new ConvexError("Notebook identifier required");
          }

          let notebookId = args.notebookId;
          if (!notebookId && args.url) {
            // Look up notebook by URL
            const notebook = await ctx.db
              .query("notebooks")
              .withIndex("by_url", (q) => q.eq("url", args.url as string))
              .first();
            notebookId = notebook?._id;
          }

          if (!notebookId) {
            throw new ConvexError("Notebook not found");
          }

          accessResult = await checkNotebookAccess(
            ctx,
            notebookId as Id<"notebooks">,
            sessionValidation.userId,
            args.sessionToken as string | undefined,
          );
          break;
        }

        case "document": {
          if (!args.documentId) {
            throw new ConvexError("Document identifier required");
          }

          accessResult = await checkDocumentAccess(
            ctx,
            args.documentId as Id<"documents">,
            sessionValidation.userId,
            args.sessionToken as string | undefined,
          );
          break;
        }

        case "user": {
          // User resource access (profile, settings, etc.)
          if (!sessionValidation.valid) {
            accessResult = {
              granted: false,
              permission: "none",
              reason: "Authentication required",
            };
          } else if (args.userId && args.userId !== sessionValidation.userId) {
            accessResult = {
              granted: false,
              permission: "none",
              reason: "Cannot access other user's resources",
            };
          } else {
            accessResult = {
              granted: true,
              permission: "owner",
              userId: sessionValidation.userId,
            };
          }
          break;
        }

        case "system": {
          // System-level access (admin functions)
          // TODO: Implement admin role checking
          accessResult = {
            granted: sessionValidation.valid,
            permission: sessionValidation.valid ? "read" : "none",
            reason: sessionValidation.valid
              ? undefined
              : "Authentication required",
          };
          break;
        }

        default:
          throw new ConvexError(
            `Unknown resource type: ${resourceType as string}`,
          );
      }

      // Check if access is granted and permission level is sufficient
      if (!accessResult.granted) {
        throw new ConvexError(accessResult.reason ?? "Access denied");
      }

      // Check permission level
      const permissionLevels: PermissionLevel[] = [
        "none",
        "read",
        "write",
        "admin",
        "owner",
      ];
      const userLevel = permissionLevels.indexOf(accessResult.permission);
      const requiredLevel = permissionLevels.indexOf(requiredPermission);

      if (userLevel < requiredLevel) {
        throw new ConvexError(
          `Insufficient permissions. Required: ${requiredPermission}, Current: ${accessResult.permission}`,
        );
      }

      // Inject access context into the handler
      const enhancedCtx = {
        ...ctx,
        access: {
          userId: accessResult.userId,
          permission: accessResult.permission,
          resourceId: accessResult.resourceId,
          resourceType,
        },
      };

      return handler(enhancedCtx, args);
    };
  };
}

/**
 * Log access attempt for security monitoring
 */
async function logAccessAttempt(
  ctx: QueryCtx | MutationCtx,
  details: {
    resourceType: ResourceType;
    requiredPermission: PermissionLevel;
    userId?: string;
    resourceId?: string;
    sessionValid: boolean;
    timestamp: number;
  },
) {
  try {
    if ("insert" in ctx.db) {
      await ctx.db.insert("auditLog", {
        event: "access_attempt",
        userId: details.userId,
        timestamp: details.timestamp,
        severity: "info",
        details: {
          resourceType: details.resourceType,
          requiredPermission: details.requiredPermission,
          resourceId: details.resourceId,
          sessionValid: details.sessionValid,
        },
      });
    }
  } catch (error) {
    // Don't throw on logging errors
    console.warn("Failed to log access attempt:", error);
  }
}

/**
 * Check current user's access to a resource (query function)
 */
export const checkAccess = query({
  args: {
    resourceType: v.string(),
    resourceId: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<AccessResult> => {
    const resourceType = args.resourceType as ResourceType;
    const sessionValidation = await validateUserSession(ctx);

    switch (resourceType) {
      case "notebook":
        if (!args.resourceId) {
          return {
            granted: false,
            permission: "none",
            reason: "Resource ID required",
          };
        }
        return checkNotebookAccess(
          ctx,
          args.resourceId as Id<"notebooks">,
          sessionValidation.userId,
          args.sessionToken,
        );

      case "document":
        if (!args.resourceId) {
          return {
            granted: false,
            permission: "none",
            reason: "Resource ID required",
          };
        }
        return checkDocumentAccess(
          ctx,
          args.resourceId as Id<"documents">,
          sessionValidation.userId,
          args.sessionToken,
        );

      case "user":
        return {
          granted: sessionValidation.valid,
          permission: sessionValidation.valid ? "owner" : "none",
          userId: sessionValidation.userId,
          reason: sessionValidation.valid
            ? undefined
            : "Authentication required",
        };

      default:
        return {
          granted: false,
          permission: "none",
          reason: "Unknown resource type",
        };
    }
  },
});

/**
 * Get current user's session information
 */
export const getCurrentUser = query({
  handler: async (ctx): Promise<SessionValidation> => {
    return validateUserSession(ctx);
  },
});

/**
 * Administrative function to revoke access
 */
export const revokeAccess = mutation({
  args: {
    resourceType: v.string(),
    resourceId: v.string(),
    userId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // TODO: Add admin authorization check

    const resourceType = args.resourceType as ResourceType;

    // Log access revocation
    await ctx.db.insert("auditLog", {
      event: "access_revoked",
      userId: args.userId,
      timestamp: Date.now(),
      severity: "warning",
      details: {
        resourceType,
        resourceId: args.resourceId,
        revokedBy: "admin", // TODO: Get actual admin user ID
        reason: args.reason ?? "manual_revocation",
      },
    });

    // Resource-specific revocation logic
    switch (resourceType) {
      case "notebook": {
        // Revoke all sessions for this notebook and user
        const sessions = await ctx.db
          .query("notebookSessions")
          .filter((q) =>
            q.and(
              q.eq(q.field("notebookId"), args.resourceId as Id<"notebooks">),
              q.eq(q.field("userId"), args.userId as Id<"users">),
            ),
          )
          .collect();

        for (const session of sessions) {
          await ctx.db.patch(session._id, {
            isActive: false,
          });
        }
        break;
      }

      case "document": {
        // Remove document permissions
        const permission = await ctx.db
          .query("documentPermissions")
          .filter((q) =>
            q.and(
              q.eq(q.field("documentId"), args.resourceId as Id<"documents">),
              q.eq(q.field("userId"), args.userId as Id<"users">),
            ),
          )
          .first();

        if (permission) {
          await ctx.db.delete(permission._id);
        }
        break;
      }
    }

    return { success: true };
  },
});
