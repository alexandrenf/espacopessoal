/**
 * Convex Adapter for NextAuth.js
 * 
 * This adapter allows NextAuth.js to use Convex as the database backend
 * instead of Prisma/PostgreSQL.
 */

import { type Adapter } from "next-auth/adapters";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { type Id } from "../../../convex/_generated/dataModel";

export function ConvexAdapter(convexUrl: string): Adapter {
  const convex = new ConvexHttpClient(convexUrl);

  return {
    async createUser(user) {
      const convexUserId = await convex.mutation(api.users.createForAuth, {
        name: user.name ?? undefined,
        email: user.email,
        image: user.image ?? undefined,
        emailVerified: user.emailVerified ? user.emailVerified.getTime() : undefined,
      });

      return {
        id: convexUserId,
        name: user.name,
        email: user.email,
        image: user.image,
        emailVerified: user.emailVerified,
      };
    },

    async getUser(id) {
      const user = await convex.query(api.users.getById, { id: id as Id<"users"> });
      if (!user) return null;

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
      };
    },

    async getUserByEmail(email) {
      const user = await convex.query(api.users.getByEmail, { email });
      if (!user) return null;

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
      };
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const account = await convex.query(api.users.getAccountByProvider, {
        provider,
        providerAccountId,
      });
      
      if (!account) return null;

      const user = await convex.query(api.users.getById, { id: account.userId });
      if (!user) return null;

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
      };
    },

    async updateUser(user) {
      const updatedUser = await convex.mutation(api.users.updateForAuth, {
        id: user.id as Id<"users">,
        name: user.name ?? undefined,
        email: user.email,
        image: user.image ?? undefined,
        emailVerified: user.emailVerified ? user.emailVerified.getTime() : undefined,
      });

      if (!updatedUser) {
        throw new Error("Failed to update user");
      }

      return {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image,
        emailVerified: updatedUser.emailVerified ? new Date(updatedUser.emailVerified) : null,
      };
    },

    async linkAccount(account) {
      await convex.mutation(api.users.createAccount, {
        userId: account.userId as Id<"users">,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        type: account.type,
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state as string | undefined,
        refresh_token_expires_in: account.refresh_token_expires_in as number | undefined,
      });

      return account;
    },

    async unlinkAccount({ providerAccountId, provider }) {
      await convex.mutation(api.users.deleteAccount, {
        provider,
        providerAccountId,
      });
    },

    async createSession({ sessionToken, userId, expires }) {
      await convex.mutation(api.users.createAuthSession, {
        sessionToken,
        userId: userId as Id<"users">,
        expires: expires.getTime(),
      });

      return {
        sessionToken,
        userId,
        expires,
      };
    },

    async getSessionAndUser(sessionToken) {
      const session = await convex.query(api.users.getSessionByToken, { sessionToken });
      if (!session) return null;

      const user = await convex.query(api.users.getById, { id: session.userId });
      if (!user) return null;

      return {
        session: {
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: new Date(session.expires),
        },
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          image: user.image,
          emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
        },
      };
    },

    async updateSession({ sessionToken, ...session }) {
      const updatedSession = await convex.mutation(api.users.updateAuthSession, {
        sessionToken,
        expires: session.expires?.getTime(),
      });

      if (!updatedSession) {
        throw new Error("Failed to update session");
      }

      return {
        sessionToken: updatedSession.sessionToken,
        userId: updatedSession.userId,
        expires: new Date(updatedSession.expires),
      };
    },

    async deleteSession(sessionToken) {
      await convex.mutation(api.users.deleteAuthSession, { sessionToken });
    },

    async createVerificationToken({ identifier, expires, token }) {
      await convex.mutation(api.users.createVerificationToken, {
        identifier,
        token,
        expires: expires.getTime(),
      });

      return {
        identifier,
        expires,
        token,
      };
    },

    async useVerificationToken({ identifier, token }) {
      const verificationToken = await convex.mutation(api.users.useVerificationToken, {
        identifier,
        token,
      });

      if (!verificationToken) return null;

      return {
        identifier: verificationToken.identifier,
        token: verificationToken.token,
        expires: new Date(verificationToken.expires),
      };
    },
  };
}
