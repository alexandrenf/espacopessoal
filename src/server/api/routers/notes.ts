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
      const user = await ctx.db.userThings.findFirst({
        where: { notePadUrl: input.url },
        select: {
          id: true,
          privateOrPublicUrl: true,
          ownedBy: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error("Notepad not found");
      }

      if (user.privateOrPublicUrl === true) {
        throw new Error("This notepad is private");
      }

      const notes = await ctx.db.notepad.findMany({
        where: {
          createdById: user.ownedBy.id,
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

  updateNotePublic: publicProcedure
   .input(z.object({ id: z.number(), content: z.string().min(1) }))
   .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.notepad.findFirst({
        where: {
          id: input.id,
        },
        select: {
          id: true,
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

      const isPrivate = note.createdBy.userThings?.[0]?.privateOrPublicUrl ?? true;
      if (isPrivate) {
        throw new Error("This notepad is private");
      }

      return await ctx.db.notepad.update({
        where: {
          id: input.id,
        },
        data: {
          content: input.content,
        },
      });
    }),

  
});
