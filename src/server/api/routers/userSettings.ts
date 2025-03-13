import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import type { inferAsyncReturnType } from "@trpc/server";
import type { createTRPCContext } from "~/server/api/trpc";

type Context = inferAsyncReturnType<typeof createTRPCContext>;

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
    // Only select specific fields and use findUnique with a single query
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
    .mutation(async ({ ctx, input }: { 
      ctx: Context; 
      input: UpdateSettingsInput;
    }) => {
      // Check if URL is already taken by another user
      const existingUrl = await ctx.db.userThings.findFirst({
        where: {
          notePadUrl: input.notePadUrl,
          ownedById: { not: ctx.session!.user.id },
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
          ownedById: ctx.session!.user.id,
        },
        create: {
          notePadUrl: input.notePadUrl,
          privateOrPublicUrl: input.privateOrPublicUrl,
          password: input.password,
          ownedById: ctx.session!.user.id,
        },
        update: {
          notePadUrl: input.notePadUrl,
          privateOrPublicUrl: input.privateOrPublicUrl,
          password: input.password,
        },
      });

      // Return the result directly without attempting revalidation
      // Revalidation should be handled on the client side using 
      // appropriate TRPC utils.invalidate() calls
      return result;
    }),

  getUserSettingsAndHealth: protectedProcedure
    .query(async ({ ctx }) => {
      const userData = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          name: true,
          email: true,
          userThings: {
            select: {
              notePadUrl: true,
              privateOrPublicUrl: true,
              password: true,
            }
          }
        }
      });

      if (!userData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found"
        });
      }

      return {
        settings: {
          notePadUrl: userData.userThings?.notePadUrl ?? "",
          privateOrPublicUrl: userData.userThings?.privateOrPublicUrl ?? true,
          password: userData.userThings?.password ?? null,
        },
        health: {
          isHealthy: !!(
            userData.name &&
            userData.email &&
            userData.userThings?.notePadUrl
          ),
        }
      };
    }),
});
