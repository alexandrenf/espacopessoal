
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

      // Check password if needed
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

      // Fetch all notes including the structure note
      const allNotes = await ctx.db.notepad.findMany({
        where: {
          createdById: userThings.ownedById,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Find structure note and parse its content
      const structureNote = allNotes.find(note => 
        note.content?.startsWith(STRUCTURE_NOTE_NAME)
      );

      let structure: { id: number; order: number; parentId: number | null; }[] = [];
      if (structureNote?.content) {
        try {
          const structureContent = structureNote.content
            .split('\n')
            .slice(1) // Skip the STRUCTURE_NOTE_NAME line
            .join('\n');
          structure = JSON.parse(structureContent) as Array<{
            id: number;
            order: number;
            parentId: number | null;
          }>;
        } catch (e) {
          console.error('Failed to parse structure note:', e);
        }
      }

      // Filter out structure note
      const normalNotes = allNotes.filter(note => 
        !note.content?.startsWith(STRUCTURE_NOTE_NAME)
      );

      // Sort notes based on structure
      const sortedNotes = [...normalNotes].sort((a, b) => {
        const aStructure = structure.find(s => s.id === a.id);
        const bStructure = structure.find(s => s.id === b.id);
        
        // If note isn't in structure, put it at the end
        if (!aStructure) return 1;
        if (!bStructure) return -1;
        
        return aStructure.order - bStructure.order;
      });

      return sortedNotes;
    }),

  createNotePublic: publicProcedure
    .input(z.object({
      url: z.string().min(1),
      content: z.string(),
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

      return await ctx.db.notepad.create({
        data: {
          content: input.content,
          createdById: userThings.ownedById,
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

  updateStructureNote: publicProcedure
    .input(z.object({
      url: z.string().min(1),
      structure: z.array(z.object({
        id: z.number(),
        parentId: z.number().nullable(),
        order: z.number()
      })),
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

      // Verificar senha se necessário
      if (userThings.privateOrPublicUrl && userThings.password) {
        if (!input.password || input.password !== userThings.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid password",
          });
        }
      }

      // Procurar nota de estrutura existente
      const structureNote = await ctx.db.notepad.findFirst({
        where: {
          createdById: userThings.ownedById,
          content: { startsWith: STRUCTURE_NOTE_NAME }
        }
      });

      const structureContent = `${STRUCTURE_NOTE_NAME}\n${JSON.stringify(input.structure, null, 2)}`;

      if (structureNote) {
        // Atualizar nota existente
        return await ctx.db.notepad.update({
          where: { id: structureNote.id },
          data: { content: structureContent },
          select: {
            id: true,
            content: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      } else {
        // Criar nova nota de estrutura
        return await ctx.db.notepad.create({
          data: {
            content: structureContent,
            createdById: userThings.ownedById,
          },
          select: {
            id: true,
            content: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      }
    }),

  createStructureNote: publicProcedure
    .input(z.object({
      url: z.string().min(1),
      structure: z.array(z.object({
        id: z.number(),
        parentId: z.number().nullable(),
        order: z.number()
      })),
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

      // Verificar senha se necessário
      if (userThings.privateOrPublicUrl && userThings.password) {
        if (!input.password || input.password !== userThings.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid password",
          });
        }
      }

      const structureContent = `${STRUCTURE_NOTE_NAME}\n${JSON.stringify(input.structure, null, 2)}`;

      return await ctx.db.notepad.create({
        data: {
          content: structureContent,
          createdById: userThings.ownedById,
        },
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
      structure: z.array(z.object({
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

      // Find the structure note
      const structureNote = await ctx.db.notepad.findFirst({
        where: {
          createdById: userThings.ownedById,
          content: { startsWith: STRUCTURE_NOTE_NAME }
        }
      });

      const structureContent = `${STRUCTURE_NOTE_NAME}\n${JSON.stringify(input.structure, null, 2)}`;

      if (structureNote) {
        // Update existing structure note
        await ctx.db.notepad.update({
          where: { id: structureNote.id },
          data: { content: structureContent },
        });
      } else {
        // Create new structure note
        await ctx.db.notepad.create({
          data: {
            content: structureContent,
            createdById: userThings.ownedById,
          },
        });
      }
      
      return true;
    }),
});
