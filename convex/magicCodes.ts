import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

/**
 * Store a magic code for email verification
 */
export const storeMagicCode = mutation({
  args: {
    email: v.string(),
    code: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, { email, code, expiresAt }) => {
    // Clean up any existing codes for this email
    const existingCodes = await ctx.db
      .query("magicCodes")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    for (const existingCode of existingCodes) {
      await ctx.db.delete(existingCode._id);
    }

    // Store the new code
    return await ctx.db.insert("magicCodes", {
      email,
      code,
      expiresAt,
      attempts: 0,
      isUsed: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Verify a magic code
 */
export const verifyMagicCode = mutation({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, { email, code }) => {
    const now = Date.now();

    // Find the code for this email
    const magicCodeRecord = await ctx.db
      .query("magicCodes")
      .withIndex("by_email_code", (q) => q.eq("email", email).eq("code", code))
      .first();

    if (!magicCodeRecord) {
      // Try to find any code for this email to increment attempts
      const anyCodeForEmail = await ctx.db
        .query("magicCodes")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (anyCodeForEmail) {
        await ctx.db.patch(anyCodeForEmail._id, {
          attempts: anyCodeForEmail.attempts + 1,
        });
      }

      return { success: false, error: "Código não encontrado ou inválido" };
    }

    // Check if code is expired
    if (now > magicCodeRecord.expiresAt) {
      await ctx.db.delete(magicCodeRecord._id);
      return { success: false, error: "Código expirado" };
    }

    // Check if code was already used
    if (magicCodeRecord.isUsed) {
      return { success: false, error: "Código já foi utilizado" };
    }

    // Check for too many attempts (rate limiting)
    if (magicCodeRecord.attempts >= 5) {
      await ctx.db.delete(magicCodeRecord._id);
      return {
        success: false,
        error: "Muitas tentativas incorretas. Solicite um novo código.",
      };
    }

    // Code is valid - mark as used and delete
    await ctx.db.patch(magicCodeRecord._id, {
      isUsed: true,
    });

    // Clean up the used code
    await ctx.db.delete(magicCodeRecord._id);

    return { success: true };
  },
});

/**
 * Clean up expired magic codes (called by cron)
 */
export const cleanupExpiredCodes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expiredCodes = await ctx.db
      .query("magicCodes")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .collect();

    let deletedCount = 0;
    for (const expiredCode of expiredCodes) {
      await ctx.db.delete(expiredCode._id);
      deletedCount++;
    }

    return { deletedCount };
  },
});

/**
 * Get magic code info (for debugging - admin only)
 */
export const getMagicCodeInfo = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const magicCode = await ctx.db
      .query("magicCodes")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!magicCode) {
      return null;
    }

    return {
      email: magicCode.email,
      attempts: magicCode.attempts,
      isUsed: magicCode.isUsed,
      expiresAt: magicCode.expiresAt,
      createdAt: magicCode.createdAt,
      isExpired: Date.now() > magicCode.expiresAt,
    };
  },
});
