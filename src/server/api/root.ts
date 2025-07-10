import { postRouter } from "~/server/api/routers/post";
import { userUpdateRouter } from "~/server/api/routers/userUpdate";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { userSettingsRouter } from "~/server/api/routers/userSettings";
import { notificationsRouter } from "./routers/notifications";
import { boardRouter } from "./routers/board";
import { taskRouter } from "./routers/task";
import { dictionaryRouter } from "./routers/dictionary";
import { notebooksRouter } from "./routers/notebooks";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  userUpdate: userUpdateRouter,
  userSettings: userSettingsRouter,
  notifications: notificationsRouter,
  board: boardRouter,
  task: taskRouter,
  dictionary: dictionaryRouter,
  notebooks: notebooksRouter,
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
