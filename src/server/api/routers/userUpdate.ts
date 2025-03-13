import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const userUpdateRouter = createTRPCRouter({
  /**
   * @deprecated Use userSettings.getUserSettingsAndHealth instead
   */
  checkUserHealth: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userThings = await ctx.db.userThings.findUnique({
          where: { ownedById: ctx.session.user.id },
          select: {
            notePadUrl: true,
            ownedBy: {
              select: {
                name: true
              }
            }
          }
        });

        const hasName = !!userThings?.ownedBy.name;
        const hasNotepadUrl = !!userThings?.notePadUrl;
        const isHealthy = hasName && hasNotepadUrl;

        return {
          isHealthy,
          status: isHealthy ? "HEALTHY" : "NEEDS_SETUP",
          details: {
            hasName,
            hasNotepadUrl
          }
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to check user health",
          cause: error,
        });
      }
    }),

  getUserProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          emailVerified: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string()
        .min(1, "Name cannot be empty")
        .max(50, "Name is too long")
        .trim()
        .regex(/^[a-zA-Z\s-']+$/, "Name contains invalid characters"),
      email: z.string()
        .email("Invalid email address")
        .trim(),
      image: z.string()
        .nullable()
        .transform((val) => {
          if (!val) return null;
          try {
            new URL(val);
            return val.trim();
          } catch {
            return null;
          }
        }),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: {
            name: input.name,
            email: input.email,
            image: input.image,
          },
        });
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update profile",
          cause: err,
        });
      }
    }),

  changeName: protectedProcedure
    .input(z.object({
      name: z.string()
        .min(1, "Name cannot be empty")
        .max(50, "Name is too long")
        .trim()
        .regex(/^[a-zA-Z\s-']+$/, "Name contains invalid characters")
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: { name: input.name },
        });
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user name",
          cause: err,
        });
      }
    }),
});
