import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { nanoid } from 'nanoid';

export const notesRouter = createTRPCRouter({
  verifyNotepadPassword: publicProcedure
    .input(
      z.object({
        url: z.string().min(1),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userThings = await ctx.db.userThings.findFirst({
        where: { notePadUrl: input.url },
        select: {
          id: true,
          privateOrPublicUrl: true,
          password: true,
        },
      });

      if (!userThings) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notepad not found",
        });
      }

      if (userThings.privateOrPublicUrl !== true) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This notepad is public and doesn't require a password",
        });
      }

      if (userThings.password !== input.password) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid password",
        });
      }

      return { success: true };
    }),

  fetchNotesPublic: publicProcedure
    .input(
      z.object({
        url: z.string().min(1),
        password: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // First, get only the necessary fields from userThings
      const userThings = await ctx.db.userThings.findFirst({
        where: { notePadUrl: input.url },
        select: {
          ownedById: true,
          privateOrPublicUrl: true,
          password: true,
        },
      });

      if (!userThings) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notepad not found",
        });
      }

      // Password check
      if (userThings.privateOrPublicUrl === true && userThings.password) {
        if (!input.password || input.password !== userThings.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid password",
          });
        }
      }

      // Use a single query with proper indexing and ordering
      return await ctx.db.notepad.findMany({
        where: {
          createdById: userThings.ownedById,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          parentId: true,
          isFolder: true,
          order: true,
        },
        orderBy: [
          { parentId: "asc" },
          { order: "asc" },
          { createdAt: "desc" }
        ],
      });
    }),

  createNotePublic: publicProcedure
    .input(
      z.object({
        url: z.string().min(1),
        content: z.string(),
        password: z.string().optional(),
        isFolder: z.boolean().optional().default(false),
        parentId: z.number().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userThings = await ctx.db.userThings.findFirst({
        where: { notePadUrl: input.url },
        select: {
          id: true,
          privateOrPublicUrl: true,
          password: true,
          ownedById: true,
        },
      });

      if (!userThings) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notepad not found",
        });
      }

      // Check if notepad is private and requires password
      if (userThings.privateOrPublicUrl === true && userThings.password) {
        if (!input.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "This notepad requires a password",
          });
        }

        if (input.password !== userThings.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid password",
          });
        }
      }

      // Get the highest order in the same level (same parentId)
      const highestOrder = await ctx.db.notepad.findFirst({
        where: {
          createdById: userThings.ownedById,
          parentId: input.parentId ?? null,
        },
        orderBy: {
          order: 'desc',
        },
        select: {
          order: true,
        },
      });

      // Set the new order to be higher than the highest existing order
      const newOrder = (highestOrder?.order ?? -1) + 1;

      return await ctx.db.notepad.create({
        data: {
          content: input.content,
          createdById: userThings.ownedById,
          isFolder: input.isFolder,
          order: newOrder,
          parentId: input.parentId ?? null,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          parentId: true,
          isFolder: true,
          order: true,
        },
      });
    }),

  updateNotePublic: publicProcedure
    .input(
      z.object({
        id: z.number(),
        content: z.string().min(1),
        url: z.string().min(1),
        password: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userThings = await ctx.db.userThings.findFirst({
        where: { notePadUrl: input.url },
        select: {
          id: true,
          privateOrPublicUrl: true,
          password: true,
          ownedById: true,
        },
      });

      if (!userThings) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notepad not found",
        });
      }

      // Check if notepad is private and requires password
      if (userThings.privateOrPublicUrl === true && userThings.password) {
        if (!input.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "This notepad requires a password",
          });
        }

        if (input.password !== userThings.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid password",
          });
        }
      }

      // Verify the note belongs to this notepad
      const note = await ctx.db.notepad.findFirst({
        where: {
          id: input.id,
          createdById: userThings.ownedById,
        },
      });

      if (!note) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Note not found",
        });
      }

      return await ctx.db.notepad.update({
        where: { id: input.id },
        data: { content: input.content },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }),

  deleteNotePublic: publicProcedure
    .input(
      z.object({
        id: z.number(),
        url: z.string().min(1),
        password: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userThings = await ctx.db.userThings.findFirst({
        where: { notePadUrl: input.url },
        select: {
          id: true,
          privateOrPublicUrl: true,
          password: true,
          ownedById: true,
        },
      });

      if (!userThings) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notepad not found",
        });
      }

      // Check if notepad is private and requires password
      if (userThings.privateOrPublicUrl === true && userThings.password) {
        if (!input.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "This notepad requires a password",
          });
        }

        if (input.password !== userThings.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid password",
          });
        }
      }

      // Verify the note belongs to this notepad
      const note = await ctx.db.notepad.findFirst({
        where: {
          id: input.id,
          createdById: userThings.ownedById,
        },
      });

      if (!note) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Note not found",
        });
      }

      return await ctx.db.notepad.delete({
        where: { id: input.id },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }),

  updateStructure: publicProcedure
    .input(
      z.object({
        url: z.string(),
        password: z.string().optional(),
        updates: z.array(
          z.object({
            id: z.number(),
            parentId: z.number().nullable(),
            order: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userThings = await ctx.db.userThings.findFirst({
        where: { notePadUrl: input.url },
        select: {
          id: true,
          privateOrPublicUrl: true,
          password: true,
          ownedById: true,
        },
      });

      if (!userThings) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Notepad not found",
        });
      }

      // Check if notepad is private and requires password
      if (userThings.privateOrPublicUrl === true && userThings.password) {
        if (!input.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "This notepad requires a password",
          });
        }

        if (input.password !== userThings.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid password",
          });
        }
      }

      // Update all notes in a transaction
      await ctx.db.$transaction(
        input.updates.map((update) =>
          ctx.db.notepad.update({
            where: { id: update.id },
            data: {
              parentId: update.parentId,
              order: update.order,
            },
          }),
        ),
      );

      return true;
    }),

  createSharedNote: protectedProcedure
    .input(
      z.object({
        noteId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // First verify note ownership
      const note = await ctx.db.notepad.findUnique({
        where: { id: input.noteId },
        select: {
          id: true,
          createdById: true,
        },
      });

      if (!note) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Note not found",
        });
      }

      if (note.createdById !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to share this note",
        });
      }

      const generateUniqueUrl = async () => {
        while (true) {
          const url = nanoid(8); // generates an 8-character URL-safe string
          const existing = await ctx.db.sharedNote.findUnique({ where: { url } });
          if (!existing) return url;
        }
      };

      const uniqueUrl = await generateUniqueUrl();

      // Create shared note
      return await ctx.db.sharedNote.create({
        data: {
          url: uniqueUrl,
          noteId: input.noteId,
        },
        include: {
          note: {
            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      });
    }),

  getSharedNote: publicProcedure
    .input(
      z.object({
        url: z.string().length(8),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sharedNote = await ctx.db.sharedNote.findUnique({
        where: { url: input.url },
        include: {
          note: {
            include: {
              createdBy: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!sharedNote) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared note not found",
        });
      }

      return sharedNote;
    }),

  getSharedNoteByNoteId: publicProcedure
    .input(
      z.object({
        noteId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // First get the note to check ownership
      const note = await ctx.db.notepad.findUnique({
        where: { id: input.noteId },
        select: {
          id: true,
          createdById: true,
        },
      });

      if (!note) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Note not found",
        });
      }

      // Get the shared note if it exists
      const sharedNote = await ctx.db.sharedNote.findFirst({
        where: { 
          noteId: input.noteId,
        },
        include: {
          note: {
            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      // Return both the ownership status and the shared note data
      return {
        isOwner: note.createdById === ctx.session?.user.id,
        sharedNote: sharedNote,
      };
    }),

  deleteSharedNote: protectedProcedure
    .input(
      z.object({
        url: z.string().length(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sharedNote = await ctx.db.sharedNote.findUnique({
        where: { url: input.url },
        include: {
          note: {
            select: {
              createdById: true,
            },
          },
        },
      });

      if (!sharedNote) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared note not found",
        });
      }

      // Verify ownership
      if (sharedNote.note.createdById !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this shared note",
        });
      }

      return await ctx.db.sharedNote.delete({
        where: { url: input.url },
      });
    }),
});