import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const notesRouter = createTRPCRouter({
  fetchNotesPublic: publicProcedure
    .input(z.object({ url: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const userThings = await ctx.db.userThings.findFirst({
        where: { notePadUrl: input.url },
        select: {
          id: true,
          privateOrPublicUrl: true,
          ownedById: true,
        },
      });

      if (!userThings) {
        throw new Error("Notepad not found");
      }

      // Default to private if privateOrPublicUrl is null
      if (userThings.privateOrPublicUrl !== false) {
        throw new Error("This notepad is private");
      }

      const notes = await ctx.db.notepad.findMany({
        where: {
          createdById: userThings.ownedById,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return notes;
    }),

  createNotePublic: publicProcedure
    .input(z.object({
      url: z.string().min(1),
      content: z.string().min(1)
    }))
    .mutation(async ({ ctx, input }) => {
      const userThings = await ctx.db.userThings.findFirst({
        where: { notePadUrl: input.url },
        select: {
          id: true,
          privateOrPublicUrl: true,
          ownedById: true,
        },
      });

      if (!userThings) {
        throw new Error("Notepad not found");
      }

      if (userThings.privateOrPublicUrl !== false) {
        throw new Error("This notepad is private");
      }

      return await ctx.db.notepad.create({
        data: {
          content: input.content,
          createdById: userThings.ownedById,
        },
      });
    }),

  deleteNotePublic: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.notepad.findFirst({
        where: { id: input.id },
        select: {
          id: true,
          createdById: true,
          createdBy: {
            select: {
              userThings: {
                select: {
                  privateOrPublicUrl: true
                }
              }
            }
          }
        }
      });

      if (!note) {
        throw new Error("Note not found");
      }

      const isPrivate = note.createdBy.userThings?.[0]?.privateOrPublicUrl !== false;
      if (isPrivate) {
        throw new Error("This notepad is private");
      }

      return await ctx.db.notepad.delete({
        where: { id: input.id },
      });
    }),

  updateNotePublic: publicProcedure
    .input(z.object({
      id: z.number(),
      content: z.string().min(1)
    }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.notepad.findFirst({
        where: { id: input.id },
        select: {
          id: true,
          createdById: true,
          createdBy: {
            select: {
              userThings: {
                select: {
                  privateOrPublicUrl: true
                }
              }
            }
          }
        }
      });

      if (!note) {
        throw new Error("Note not found");
      }

      const isPrivate = note.createdBy.userThings?.[0]?.privateOrPublicUrl !== false;
      if (isPrivate) {
        throw new Error("This notepad is private");
      }

      return await ctx.db.notepad.update({
        where: { id: input.id },
        data: { content: input.content },
      });
    }),
});
