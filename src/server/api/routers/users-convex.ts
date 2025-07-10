import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { api } from "../../../../convex/_generated/api";
import type { Session } from "next-auth";
import type { Id, Doc } from "../../../../convex/_generated/dataModel";
import type { ConvexHttpClient } from "convex/browser";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// Helper function to get or create Convex user from NextAuth session
async function getOrCreateConvexUser(
  convex: ConvexHttpClient,
  session: Session,
): Promise<Doc<"users">> {
  if (!session?.user?.id || !session.user.email) {
    throw new Error("Invalid session data");
  }

  // First try to find existing user
  let convexUser: Doc<"users"> | null = await convex.query(
    api.users.getByNextAuthId,
    {
      nextAuthId: session.user.id,
    },
  );

  // If user doesn't exist, sync/create them
  if (!convexUser) {
    const userId: Id<"users"> = await convex.mutation(
      api.users.syncNextAuthUser,
      {
        email: session.user.email,
        name: session.user.name ?? undefined,
        image: session.user.image ?? undefined,
        externalId: session.user.id,
        provider: "nextauth",
      },
    );

    // Get the newly created user
    convexUser = await convex.query(api.users.getById, {
      id: userId,
    });
  }

  if (!convexUser) {
    throw new Error("Failed to create or retrieve Convex user");
  }

  return convexUser;
}

export const usersConvexRouter = createTRPCRouter({
  checkUserHealth: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      // Get or create the Convex user
      const convexUser: Doc<"users"> = await getOrCreateConvexUser(
        ctx.convex,
        ctx.session,
      );

      const response = (await ctx.convex.query(api.users.checkUserHealth, {
        userId: convexUser._id,
      })) as { isHealthy: boolean };

      if (response && typeof response === "object" && "isHealthy" in response) {
        const result: { isHealthy: boolean } = response as {
          isHealthy: boolean;
        };
        return result;
      }

      throw new Error("Invalid response from checkUserHealth");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to check user health";
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: errorMessage,
      });
    }
  }),

  getUserProfile: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.convex) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Convex client not available",
        });
      }

      // Get or create the Convex user
      const convexUser: Doc<"users"> = await getOrCreateConvexUser(
        ctx.convex,
        ctx.session,
      );

      const user = (await ctx.convex.query(api.users.getUserProfile, {
        userId: convexUser._id,
      })) as {
        id: Id<"users">;
        name: string | undefined;
        email: string;
        image: string | undefined;
        emailVerified: number | undefined;
      };

      return user;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "User not found";
      throw new TRPCError({
        code: "NOT_FOUND",
        message: errorMessage,
      });
    }
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .min(1, "Name cannot be empty")
          .max(50, "Name is too long")
          .trim()
          .regex(/^[a-zA-Z\s-']+$/, "Name contains invalid characters"),
        email: z.string().email("Invalid email address").trim(),
        image: z
          .string()
          .nullable()
          .transform((val) => {
            if (!val) return undefined;
            try {
              new URL(val);
              return val.trim();
            } catch {
              return undefined;
            }
          }),
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

        // Get or create the Convex user
        const convexUser: Doc<"users"> = await getOrCreateConvexUser(
          ctx.convex,
          ctx.session,
        );

        const user = await ctx.convex.mutation(api.users.updateProfile, {
          userId: convexUser._id,
          name: input.name,
          email: input.email,
          image: input.image,
        });

        return user;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to update profile";
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: errorMessage,
        });
      }
    }),

  changeName: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .min(1, "Name cannot be empty")
          .max(50, "Name is too long")
          .trim()
          .regex(/^[a-zA-Z\s-']+$/, "Name contains invalid characters"),
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

        // Get or create the Convex user
        const convexUser: Doc<"users"> = await getOrCreateConvexUser(
          ctx.convex,
          ctx.session,
        );

        const user = await ctx.convex.mutation(api.users.changeName, {
          userId: convexUser._id,
          name: input.name,
        });

        return user;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to update user name";
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: errorMessage,
        });
      }
    }),
});
