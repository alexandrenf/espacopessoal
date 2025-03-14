
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const STRUCTURE_NOTE_NAME = "!FStruct!";

export const notesRouter = createTRPCRouter({
  verifyNotepadPassword: publicProcedure
    .input(z.object({ 
      url: z.string().min(1),
      password: z.string().min(1)
    }))
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
    .input(z.object({ 
      url: z.string().min(1),
      password: z.string().optional()
    }))
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
          { parentId: 'asc' },
          { order: 'asc' },
          { createdAt: 'desc' }
        ],
      });
    }),

  createNotePublic: publicProcedure
    .input(z.object({
      url: z.string().min(1),
      content: z.string(),
      password: z.string().optional(),
      isFolder: z.boolean().optional().default(false)
    }))
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

      return await ctx.db.notepad.create({
        data: {
          content: input.content,
          createdById: userThings.ownedById,
          isFolder: input.isFolder,
          order: 0
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }),

  updateNotePublic: publicProcedure
    .input(z.object({
      id: z.number(),
      content: z.string().min(1),
      url: z.string().min(1),
      password: z.string().optional()
    }))
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
    .input(z.object({
      id: z.number(),
      url: z.string().min(1),
      password: z.string().optional()
    }))
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
    .input(z.object({
      url: z.string(),
      password: z.string().optional(),
      updates: z.array(z.object({
        id: z.number(),
        parentId: z.number().nullable(),
        order: z.number(),
      }))
    }))
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
        input.updates.map(update => 
          ctx.db.notepad.update({
            where: { id: update.id },
            data: {
              parentId: update.parentId,
              order: update.order,
            },
          })
        )
      );
      
      return true;
    }),
});
