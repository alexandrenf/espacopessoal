import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const dictionaryRouter = createTRPCRouter({
    getDictionary: protectedProcedure
    .query(async ({ ctx }) => {
      return await ctx.db.replaceDictionary.findMany({
        where: { ownedById: ctx.session.user.id },
        select: {
          id: true,
          from: true,
          to: true,
        },
      });
    }),
    create: protectedProcedure
    .input(z.object({
      from: z.string(),
      to: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.replaceDictionary.create({
        data: {
          from: input.from,
          to: input.to,
          ownedById: ctx.session.user.id,
        },
      });
    }),
    delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.replaceDictionary.delete({
        where: { id: input },
      });
    }),
    update: protectedProcedure
    .input(z.object({
      id: z.string(),
      from: z.string(),
      to: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.replaceDictionary.update({
        where: { id: input.id },
        data: {
          from: input.from,
          to: input.to,
        },
      });
    }),
    getPublicDictionary: publicProcedure
    .input(z.object({
        userId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // First check if the user's notepad is public
      const userThings = await ctx.db.userThings.findFirst({
        where: { ownedById: input.userId },
        select: {
          privateOrPublicUrl: true,
        },
      });

      if (!userThings || userThings.privateOrPublicUrl === true) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "This user's dictionary is private",
        });
      }

      // If public, return the dictionary
      return await ctx.db.replaceDictionary.findMany({
        where: { ownedById: input.userId },
        select: {
          id: true,
          from: true,
          to: true,
        },
      });
    }),
});
