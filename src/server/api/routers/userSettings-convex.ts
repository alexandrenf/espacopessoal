import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

import { api } from "../../../../convex/_generated/api";
import { type Id } from "../../../../convex/_generated/dataModel";

const updateSettingsInput = z.object({
  notePadUrl: z
    .string()
    .min(3, "URL deve ter pelo menos 3 caracteres")
    .max(50, "URL não pode ter mais que 50 caracteres")
    .regex(
      /^[a-zA-Z0-9-_]+$/,
      "URL pode conter apenas letras, números, hífen e underscore",
    ),
  privateOrPublicUrl: z.boolean(),
  password: z.string().nullable(),
});

export const userSettingsRouter = createTRPCRouter({
  getNoteSettings: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.convex) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Convex client not available",
      });
    }

    // Get or create user settings
    const userSettings = await ctx.convex.mutation(api.userSettings.upsert, {
      userId: ctx.session.user.id as Id<"users">,
      notePadUrl: "",
      privateOrPublicUrl: true,
    });

    if (!userSettings) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create or retrieve user settings",
      });
    }

    // Type assertion since we know upsert returns a document object
    const settings = userSettings as {
      notePadUrl?: string;
      privateOrPublicUrl?: boolean;
      password?: string;
    };

    return {
      notePadUrl: settings.notePadUrl ?? "",
      privateOrPublicUrl: settings.privateOrPublicUrl ?? true,
      password: settings.password ?? null,
    };
  }),

  updateNoteSettings: protectedProcedure
    .input(updateSettingsInput)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      // Check if URL is already taken by another user (case-insensitive)
      const isAvailable = await ctx.convex.query(
        api.userSettings.isNotePadUrlAvailable,
        {
          notePadUrl: input.notePadUrl,
          excludeUserId: ctx.session.user.id as Id<"users">,
        },
      );

      if (!isAvailable) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este URL já está sendo usado por outro usuário",
        });
      }

      // Update settings
      await ctx.convex.mutation(api.userSettings.update, {
        userId: ctx.session.user.id as Id<"users">,
        notePadUrl: input.notePadUrl,
        privateOrPublicUrl: input.privateOrPublicUrl,
        password: input.password ?? undefined,
      });

      return { success: true };
    }),

  getUserSettingsAndHealth: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.convex) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Convex client not available",
      });
    }

    // Get user data
    const userData = await ctx.convex.query(api.users.getById, {
      id: ctx.session.user.id as Id<"users">,
    });

    if (!userData) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Get user settings
    const userSettings = await ctx.convex.query(api.userSettings.getByUserId, {
      userId: ctx.session.user.id as Id<"users">,
    });

    return {
      settings: {
        notePadUrl: userSettings?.notePadUrl ?? "",
        privateOrPublicUrl: userSettings?.privateOrPublicUrl ?? true,
        password: userSettings?.password ?? null,
      },
      health: {
        isHealthy: !!(
          userData.name &&
          userData.email &&
          userSettings?.notePadUrl
        ),
      },
    };
  }),
});
