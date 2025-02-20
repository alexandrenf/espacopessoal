import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const userUpdateRouter = createTRPCRouter({

    checkUserHealth: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.user.findFirst({
        where: { id: ctx.session.user.id },
      });
      if (!user) {
        throw new Error("User not found");
      }
      if (!user.name || !user.email) {
        return {
          isHealthy: false,
        };
      }
      return {
        isHealthy: true,
      };
    }),



    changeName: protectedProcedure
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
    }
  ),
});
