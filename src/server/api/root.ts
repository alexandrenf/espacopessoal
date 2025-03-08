import { postRouter } from "~/server/api/routers/post";
import { userUpdateRouter } from "~/server/api/routers/userUpdate";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { notesRouter } from "./routers/notes";
import { userSettingsRouter } from "~/server/api/routers/userSettings";
import { notificationsRouter } from "./routers/notifications";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  userUpdate: userUpdateRouter,
  notes: notesRouter,
  userSettings: userSettingsRouter,
  notifications: notificationsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
