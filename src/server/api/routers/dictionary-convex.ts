import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { api } from "../../../../convex/_generated/api";
import { TRPCError } from "@trpc/server";
import { type Id } from "../../../../convex/_generated/dataModel";

export const dictionaryConvexRouter = createTRPCRouter({
  getDictionary: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(100).default(20),
        includePublic: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const { cursor, limit, includePublic } = input;

        if (!ctx.convex) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Convex client not available",
          });
        }
        if (!ctx.convex) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Convex client not available",
          });
        }
        const result = await ctx.convex.query(api.dictionary.getDictionary, {
          userId: ctx.session.user.id as Id<"users">,
          cursor: cursor ? (cursor as Id<"dictionary">) : undefined,
          limit,
          includePublic,
        });

        return {
          entries: result.entries,
          nextCursor: result.isDone ? null : result.continueCursor,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch dictionary",
        });
      }
    }),

  createDictionaryEntry: protectedProcedure
    .input(
      z.object({
        from: z.string().min(1).max(200),
        to: z.string().min(1).max(200),
        isPublic: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.convex) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Convex client not available",
          });
        }
        const entry = await ctx.convex.mutation(
          api.dictionary.createDictionaryEntry,
          {
            userId: ctx.session.user.id as Id<"users">,
            from: input.from,
            to: input.to,
            isPublic: input.isPublic,
          },
        );

        return entry;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Entry already exists")) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Dictionary entry already exists",
            });
          }
          if (error.message.includes("Invalid")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: error.message,
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create dictionary entry",
        });
      }
    }),

  updateDictionaryEntry: protectedProcedure
    .input(
      z.object({
        entryId: z.string(),
        from: z.string().min(1).max(200).optional(),
        to: z.string().min(1).max(200).optional(),
        isPublic: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.convex) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Convex client not available",
          });
        }
        const entry = await ctx.convex.mutation(
          api.dictionary.updateDictionaryEntry,
          {
            userId: ctx.session.user.id as Id<"users">,
            entryId: input.entryId as Id<"dictionary">,
            from: input.from,
            to: input.to,
            isPublic: input.isPublic,
          },
        );

        return entry;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Entry not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Dictionary entry not found",
            });
          }
          if (error.message.includes("don't have permission")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "You don't have permission to update this dictionary entry",
            });
          }
          if (error.message.includes("Entry already exists")) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Dictionary entry with this 'from' text already exists",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update dictionary entry",
        });
      }
    }),

  deleteDictionaryEntry: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.convex) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Convex client not available",
          });
        }
        await ctx.convex.mutation(api.dictionary.deleteDictionaryEntry, {
          userId: ctx.session.user.id as Id<"users">,
          entryId: input as Id<"dictionary">,
        });

        return { success: true };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Entry not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Dictionary entry not found",
            });
          }
          if (error.message.includes("don't have permission")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "You don't have permission to delete this dictionary entry",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to delete dictionary entry",
        });
      }
    }),

  getDictionaryEntry: protectedProcedure
    .input(z.object({ entryId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.convex) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Convex client not available",
          });
        }
        const entry = await ctx.convex.query(
          api.dictionary.getDictionaryEntry,
          {
            userId: ctx.session.user.id as Id<"users">,
            entryId: input.entryId as Id<"dictionary">,
          },
        );

        return entry;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Entry not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Dictionary entry not found",
            });
          }
          if (error.message.includes("don't have permission")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "You don't have permission to view this dictionary entry",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch dictionary entry",
        });
      }
    }),

  searchDictionary: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
        includePublic: z.boolean().default(false),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.convex) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Convex client not available",
          });
        }
        const entries = await ctx.convex.query(
          api.dictionary.searchDictionary,
          {
            userId: ctx.session.user.id as Id<"users">,
            query: input.query,
            includePublic: input.includePublic,
            limit: input.limit,
          },
        );

        return entries;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to search dictionary",
        });
      }
    }),

  getPublicDictionary: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.convex) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Convex client not available",
          });
        }
        const result = await ctx.convex.query(
          api.dictionary.getPublicDictionary,
          {
            cursor: input.cursor
              ? (input.cursor as Id<"dictionary">)
              : undefined,
            limit: input.limit,
          },
        );

        return {
          entries: result.entries,
          nextCursor: result.isDone ? null : result.continueCursor,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch public dictionary",
        });
      }
    }),

  bulkCreateDictionaryEntries: protectedProcedure
    .input(
      z.object({
        entries: z
          .array(
            z.object({
              from: z.string().min(1).max(200),
              to: z.string().min(1).max(200),
              isPublic: z.boolean().default(false),
            }),
          )
          .min(1)
          .max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.convex) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Convex client not available",
          });
        }
        const results = await ctx.convex.mutation(
          api.dictionary.bulkCreateDictionaryEntries,
          {
            userId: ctx.session.user.id as Id<"users">,
            entries: input.entries,
          },
        );

        return results;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Some entries already exist")) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Some dictionary entries already exist",
            });
          }
          if (error.message.includes("Invalid")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: error.message,
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create dictionary entries",
        });
      }
    }),

  exportDictionary: protectedProcedure
    .input(
      z.object({
        format: z.enum(["json", "csv"]).default("json"),
        includePublic: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.convex) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Convex client not available",
          });
        }
        const result = await ctx.convex.query(api.dictionary.exportDictionary, {
          userId: ctx.session.user.id as Id<"users">,
          format: input.format,
          includePublic: input.includePublic,
        });

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to export dictionary",
        });
      }
    }),

  importDictionary: protectedProcedure
    .input(
      z.object({
        data: z.string(),
        format: z.enum(["json", "csv"]).default("json"),
        overwrite: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.convex) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Convex client not available",
          });
        }
        const result = await ctx.convex.mutation(
          api.dictionary.importDictionary,
          {
            userId: ctx.session.user.id as Id<"users">,
            data: input.data,
            format: input.format,
            overwrite: input.overwrite,
          },
        );

        return result;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("Invalid format")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid import data format",
            });
          }
          if (error.message.includes("Duplicate entries")) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "Some entries already exist. Use overwrite option to replace them.",
            });
          }
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to import dictionary",
        });
      }
    }),
});
