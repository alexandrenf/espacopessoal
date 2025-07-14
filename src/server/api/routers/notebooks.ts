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
        url: z
          .string()
          .min(3)
          .max(50)
          .regex(/^[a-zA-Z0-9_-]+$/, {
            message:
              "URL must contain only letters, numbers, hyphens, and underscores",
          }),
        title: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        isPrivate: z.boolean().default(false),
        password: z.string().optional(),
      }),
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
          userId: ctx.session.user.id as Id<"users">,
          isPrivate: input.isPrivate,
          password: input.password,
        });

        return { id: notebookId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create notebook",
        });
      }
    }),

  // Get notebook by URL
  getByUrl: publicProcedure
    .input(
      z.object({
        url: z.string().min(1),
        password: z.string().optional(),
      }),
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
          userId: ctx.session?.user?.id as Id<"users">,
        });

        // If notebook is private and password is provided, validate it
        if (notebook.isPrivate && input.password) {
          const validationResult = await ctx.convex.mutation(
            api.notebooks.validatePassword,
            {
              url: input.url,
              password: input.password,
            },
          );

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
          message:
            error instanceof Error ? error.message : "Failed to fetch notebook",
        });
      }
    }),

  // Get notebooks owned by user
  getByOwner: protectedProcedure.query(async ({ ctx }) => {
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
        userId: ctx.session.user.id as Id<"users">,
      });
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch notebooks",
      });
    }
  }),

  // Get notebooks owned by user with document counts
  getByOwnerWithDocumentCounts: protectedProcedure.query(async ({ ctx }) => {
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
      return await ctx.convex.query(
        api.notebooks.getByOwnerWithDocumentCounts,
        {
          userId: ctx.session.user.id as Id<"users">,
        },
      );
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to fetch notebooks",
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
      }),
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
          userId: ctx.session.user.id as Id<"users">,
        });

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update notebook",
        });
      }
    }),

  // Delete notebook
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
      }),
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
          userId: ctx.session.user.id as Id<"users">,
        });

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to delete notebook",
        });
      }
    }),

  // Check if notebook URL is available
  checkUrlAvailability: protectedProcedure
    .input(
      z.object({
        url: z.string().min(1),
      }),
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
          userId: ctx.session.user.id as Id<"users">,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to check URL availability",
        });
      }
    }),

  // Get or create default notebook
  getOrCreateDefault: protectedProcedure.mutation(async ({ ctx }) => {
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
      const notebook = await ctx.convex.mutation(
        api.notebooks.getOrCreateDefault,
        {
          userId: ctx.session.user.id as Id<"users">,
        },
      );

      return notebook;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get or create default notebook",
      });
    }
  }),

  // Verify notebook password
  verifyPassword: publicProcedure
    .input(
      z.object({
        url: z.string().min(1),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        const result = await ctx.convex.mutation(
          api.notebooks.validatePassword,
          {
            url: input.url,
            password: input.password,
          },
        );

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: error instanceof Error ? error.message : "Invalid password",
        });
      }
    }),

  // Get notebook with access control (public endpoint)
  getWithAccess: publicProcedure
    .input(
      z.object({
        url: z.string().min(1),
        password: z.string().optional(),
      }),
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
          userId: ctx.session?.user?.id as Id<"users">,
        });

        // Determine access level based on isPrivate and password fields
        let accessLevel: "public" | "password" | "private";
        if (!notebook.isPrivate) {
          accessLevel = "public";
        } else if (notebook.password) {
          accessLevel = "password";
        } else {
          accessLevel = "private";
        }

        // Check access permissions
        const isOwner = ctx.session?.user?.id === notebook.ownerId;

        if (accessLevel === "private" && !isOwner) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "This notebook is private",
          });
        }

        if (accessLevel === "password" && !isOwner) {
          if (!input.password) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Password required",
            });
          }

          const validationResult = await ctx.convex.mutation(
            api.notebooks.validatePassword,
            {
              url: input.url,
              password: input.password,
            },
          );

          if (!validationResult.valid) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Invalid password",
            });
          }
        }

        return {
          ...notebook,
          accessLevel,
          hasAccess: true,
          isOwner,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch notebook",
        });
      }
    }),

  // Update notebook (public endpoint with access control)
  updatePublic: publicProcedure
    .input(
      z.object({
        url: z.string().min(1),
        password: z.string().optional(),
        updates: z.object({
          title: z.string().min(1).max(100).optional(),
          description: z.string().max(500).optional(),
          isPrivate: z.boolean().optional(),
          password: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      try {
        // First get the notebook to check access
        const notebook = await ctx.convex.query(api.notebooks.getByUrl, {
          url: input.url,
          userId: ctx.session?.user?.id as Id<"users">,
        });

        // Determine access level
        let accessLevel: "public" | "password" | "private";
        if (!notebook.isPrivate) {
          accessLevel = "public";
        } else if (notebook.password) {
          accessLevel = "password";
        } else {
          accessLevel = "private";
        }

        // Check access permissions
        const isOwner = ctx.session?.user?.id === notebook.ownerId;

        if (accessLevel === "private" && !isOwner) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "This notebook is private",
          });
        }

        if (accessLevel === "password" && !isOwner) {
          if (!input.password) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Password required",
            });
          }

          const validationResult = await ctx.convex.mutation(
            api.notebooks.validatePassword,
            {
              url: input.url,
              password: input.password,
            },
          );

          if (!validationResult.valid) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Invalid password",
            });
          }
        }

        // Update the notebook
        await ctx.convex.mutation(api.notebooks.update, {
          id: notebook._id as Id<"notebooks">,
          title: input.updates.title,
          description: input.updates.description,
          isPrivate: input.updates.isPrivate,
          password: input.updates.password,
          userId: notebook.ownerId, // Use notebook owner ID
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update notebook",
        });
      }
    }),

  // Delete notebook (restricted to authenticated users only)
  deletePublic: publicProcedure
    .input(
      z.object({
        url: z.string().min(1),
        password: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Notebook deletion is restricted to authenticated users only
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
        // First get the notebook to check ownership
        const notebook = await ctx.convex.query(api.notebooks.getByUrl, {
          url: input.url,
          userId: ctx.session.user.id as Id<"users">,
        });

        // Only the owner can delete a notebook
        const isOwner = ctx.session.user.id === notebook.ownerId;

        if (!isOwner) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Only the notebook owner can delete it",
          });
        }

        // Delete the notebook
        await ctx.convex.mutation(api.notebooks.remove, {
          id: notebook._id as Id<"notebooks">,
          userId: notebook.ownerId, // Use notebook owner ID
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to delete notebook",
        });
      }
    }),

  // Check if user has documents that need migration from DEFAULT_USER_ID
  checkMigrationNeeded: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to check migration status",
      });
    }

    if (!ctx.convex) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Convex client not available",
      });
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await ctx.convex.query(
        api.documents.checkForMigrationNeeded,
        {
          userId: ctx.session.user.id as Id<"users">,
        },
      );

      // Validate the result structure and return typed object
      if (
        result &&
        typeof result === "object" &&
        "migrationNeeded" in result &&
        "defaultUserDocumentsCount" in result &&
        "userDocumentsCount" in result
      ) {
        const typedResult = result as {
          migrationNeeded: boolean;
          defaultUserDocumentsCount: number;
          userDocumentsCount: number;
        };
        return {
          migrationNeeded: Boolean(typedResult.migrationNeeded),
          defaultUserDocumentsCount: Number(
            typedResult.defaultUserDocumentsCount,
          ),
          userDocumentsCount: Number(typedResult.userDocumentsCount),
        };
      } else {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invalid migration status format returned from database",
        });
      }
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to check migration status",
      });
    }
  }),

  // Migrate documents from DEFAULT_USER_ID to the current user
  migrateDocuments: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to migrate documents",
      });
    }

    if (!ctx.convex) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Convex client not available",
      });
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await ctx.convex.mutation(
        api.documents.migrateDefaultUserDocuments,
        {
          userId: ctx.session.user.id as Id<"users">,
        },
      );

      // Validate the result structure and return typed object
      if (
        result &&
        typeof result === "object" &&
        "totalFound" in result &&
        "migratedCount" in result &&
        "success" in result
      ) {
        const typedResult = result as {
          totalFound: number;
          migratedCount: number;
          success: boolean;
        };
        return {
          totalFound: Number(typedResult.totalFound),
          migratedCount: Number(typedResult.migratedCount),
          success: Boolean(typedResult.success),
        };
      } else {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invalid migration result format returned from database",
        });
      }
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to migrate documents",
      });
    }
  }),
});
