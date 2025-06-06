import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const userUpdateRouter = createTRPCRouter({
  checkUserHealth: protectedProcedure
    .query(async ({ ctx }) => {
      // Single efficient query with selected fields
      const userData = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          name: true,
          email: true,
          userThings: {
            select: {
              notePadUrl: true
            }
          }
        }
      });

      if (!userData) {
        throw new Error("User not found");
      }

      return {
        isHealthy: !!(
          userData.name &&
          userData.email &&
          userData.userThings?.notePadUrl
        ),
      };
    }),

  getUserProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.user.findFirst({
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
        throw new Error("User not found");
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
      const user = await ctx.db.user.findFirst({
        where: { id: ctx.session.user.id },
      });

      if (!user) {
        throw new Error("User not found");
      }

      try {
        return await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: {
            name: input.name,
            email: input.email,
            image: input.image,
          },
        });
      } catch (error) {
        throw new Error("Failed to update profile. Please try again later.");
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
      const user = await ctx.db.user.findFirst({
        where: { id: ctx.session.user.id },
      });

      if (!user) {
        throw new Error("User not found");
      }

      try {
        return await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: { name: input.name },
        });
      } catch (error) {
        throw new Error("Failed to update user name. Please try again later.");
      }
    }),
});
