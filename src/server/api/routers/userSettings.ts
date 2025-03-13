import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import type { createTRPCContext } from "~/server/api/trpc";

const updateSettingsInput = z.object({
  notePadUrl: z.string()
    .min(3, "URL deve ter pelo menos 3 caracteres")
    .max(50, "URL não pode ter mais que 50 caracteres")
    .regex(/^[a-zA-Z0-9-_]+$/, "URL pode conter apenas letras, números, hífen e underscore"),
  privateOrPublicUrl: z.boolean(),
  password: z.string().nullable(),
});

type UpdateSettingsInput = z.infer<typeof updateSettingsInput>;

export const userSettingsRouter = createTRPCRouter({
  getNoteSettings: protectedProcedure.query(async ({ ctx }) => {
    const userThings = await ctx.db.userThings.upsert({
      where: { ownedById: ctx.session.user.id },
      create: {
        notePadUrl: "",
        privateOrPublicUrl: true,
        password: null,
        ownedById: ctx.session.user.id,
      },
      update: {},
      select: {
        notePadUrl: true,
        privateOrPublicUrl: true,
        password: true,
      },
    });

    return userThings;
  }),

  updateNoteSettings: protectedProcedure
    .input(updateSettingsInput)
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

      const result = await ctx.db.userThings.upsert({
        where: {
          ownedById: ctx.session.user.id,
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

      return result;
    }),

  getUserSettingsAndHealth: protectedProcedure
    .query(async ({ ctx }) => {
      const userSettings = await ctx.db.userThings.findUnique({
        where: { ownedById: ctx.session.user.id },
        select: {
          id: true,
          notePadUrl: true,
          privateOrPublicUrl: true,
          ownedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });

      if (!userSettings) {
        return {
          settings: await ctx.db.userThings.create({
            data: {
              notePadUrl: '',
              privateOrPublicUrl: false,
              ownedById: ctx.session.user.id,
            },
            select: {
              id: true,
              notePadUrl: true,
              privateOrPublicUrl: true,
            }
          }),
          health: {
            isHealthy: false,
            status: "NEEDS_SETUP",
            details: {
              hasName: false,
              hasNotepadUrl: false
            }
          }
        };
      }

      const hasName = !!userSettings.ownedBy.name;
      const hasNotepadUrl = !!userSettings.notePadUrl;
      const isHealthy = hasName && hasNotepadUrl;

      return {
        settings: userSettings,
        health: {
          isHealthy,
          status: isHealthy ? "HEALTHY" : "NEEDS_SETUP",
          details: {
            hasName,
            hasNotepadUrl
          }
        }
      };
    }),
});
