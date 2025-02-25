import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const userSettingsRouter = createTRPCRouter({
  getNoteSettings: protectedProcedure.query(async ({ ctx }) => {
    const userThings = await ctx.db.userThings.findFirst({
      where: { ownedById: ctx.session.user.id },
      select: {
        notePadUrl: true,
        privateOrPublicUrl: true,
        password: true,
      },
    });

    if (!userThings) {
      // Create default settings if they don't exist
      return await ctx.db.userThings.create({
        data: {
          notePadUrl: "",
          privateOrPublicUrl: true, // default to private
          password: null,
          ownedById: ctx.session.user.id,
        },
      });
    }

    return userThings;
  }),

  updateNoteSettings: protectedProcedure
    .input(
      z.object({
        notePadUrl: z.string()
          .min(3, "URL deve ter pelo menos 3 caracteres")
          .max(50, "URL não pode ter mais que 50 caracteres")
          .regex(/^[a-zA-Z0-9-_]+$/, "URL pode conter apenas letras, números, hífen e underscore"),
        privateOrPublicUrl: z.boolean(),
        password: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if URL is already taken by another user
      const existingUrl = await ctx.db.userThings.findFirst({
        where: {
          notePadUrl: input.notePadUrl,
          ownedById: { not: ctx.session.user.id },
        },
      });

      if (existingUrl) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Esta URL já está em uso",
        });
      }

      return await ctx.db.userThings.upsert({
        where: {
          ownedById: ctx.session.user.id,  // This is valid because ownedById is @unique in the schema
        },
        create: {
          notePadUrl: input.notePadUrl,
          privateOrPublicUrl: input.privateOrPublicUrl,
          password: input.password,
          ownedById: ctx.session.user.id,
        },
        update: {
          notePadUrl: input.notePadUrl,
          privateOrPublicUrl: input.privateOrPublicUrl,
          password: input.password,
        },
      });
    }),
});
