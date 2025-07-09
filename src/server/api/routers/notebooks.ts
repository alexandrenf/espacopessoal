import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const notebooksRouter = createTRPCRouter({
  // Create a new notebook
  create: protectedProcedure
    .input(
      z.object({
        url: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/, {
          message: "URL must contain only letters, numbers, hyphens, and underscores"
        }),
        title: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        isPrivate: z.boolean().default(false),
        password: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to create a notebook",
        });
      }

      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        const notebookId = await ctx.convex.mutation(api.notebooks.create, {
          url: input.url,
          title: input.title,
          description: input.description,
          userId: ctx.session.user.id,
          isPrivate: input.isPrivate,
          password: input.password,
        });

        return { id: notebookId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to create notebook",
        });
      }
    }),

  // Get notebook by URL
  getByUrl: publicProcedure
    .input(
      z.object({
        url: z.string().min(1),
        password: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        const notebook = await ctx.convex.query(api.notebooks.getByUrl, {
          url: input.url,
          userId: ctx.session?.user?.id,
        });

        // If notebook is private and password is provided, validate it
        if (notebook.isPrivate && input.password) {
          const validationResult = await ctx.convex.mutation(api.notebooks.validatePassword, {
            url: input.url,
            password: input.password,
          });

          if (!validationResult.valid) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Invalid password",
            });
          }
        }

        return notebook;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to fetch notebook",
        });
      }
    }),

  // Get notebooks owned by user
  getByOwner: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to view your notebooks",
        });
      }

      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        return await ctx.convex.query(api.notebooks.getByOwner, {
          userId: ctx.session.user.id,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to fetch notebooks",
        });
      }
    }),

  // Update notebook
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        isPrivate: z.boolean().optional(),
        password: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to update a notebook",
        });
      }

      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        await ctx.convex.mutation(api.notebooks.update, {
          id: input.id as Id<"notebooks">,
          title: input.title,
          description: input.description,
          isPrivate: input.isPrivate,
          password: input.password,
          userId: ctx.session.user.id,
        });

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to update notebook",
        });
      }
    }),

  // Delete notebook
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to delete a notebook",
        });
      }

      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        await ctx.convex.mutation(api.notebooks.remove, {
          id: input.id as Id<"notebooks">,
          userId: ctx.session.user.id,
        });

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to delete notebook",
        });
      }
    }),

  // Check if notebook URL is available
  checkUrlAvailability: protectedProcedure
    .input(
      z.object({
        url: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to check URL availability",
        });
      }

      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        return await ctx.convex.query(api.notebooks.checkUrlAvailability, {
          url: input.url,
          userId: ctx.session.user.id,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to check URL availability",
        });
      }
    }),

  // Get or create default notebook
  getOrCreateDefault: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to create a default notebook",
        });
      }

      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        const notebook = await ctx.convex.mutation(api.notebooks.getOrCreateDefault, {
          userId: ctx.session.user.id,
        });

        return notebook;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get or create default notebook",
        });
      }
    }),

  // Verify notebook password
  verifyPassword: publicProcedure
    .input(
      z.object({
        url: z.string().min(1),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        const result = await ctx.convex.mutation(api.notebooks.validatePassword, {
          url: input.url,
          password: input.password,
        });

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: error instanceof Error ? error.message : "Invalid password",
        });
      }
    }),
});