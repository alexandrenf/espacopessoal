// Legacy Prisma-based routers (marked for removal)
import { postRouter } from "~/server/api/routers/post";
import { userUpdateRouter } from "~/server/api/routers/userUpdate";
import { userSettingsRouter } from "~/server/api/routers/userSettings";
import { notificationsRouter } from "./routers/notifications";
import { boardRouter } from "./routers/board";
import { taskRouter } from "./routers/task";
import { dictionaryRouter } from "./routers/dictionary";

// New Convex-based routers
import { boardsConvexRouter } from "./routers/boards-convex";
import { tasksConvexRouter } from "./routers/tasks-convex";
import { dictionaryConvexRouter } from "./routers/dictionary-convex";
import { notificationsConvexRouter } from "./routers/notifications-convex";

// Migration complete routers
import { notebooksRouter } from "./routers/notebooks";
import { userSettingsConvexRouter } from "./routers/userSettings-convex";

import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  // Fully migrated Convex routers
  notebooks: notebooksRouter,
  userSettings: userSettingsConvexRouter,

  // New Convex routers (preferred)
  boards: boardsConvexRouter,
  tasks: tasksConvexRouter,
  dictionary: dictionaryConvexRouter,
  notifications: notificationsConvexRouter,

  // Legacy Prisma routers (deprecated - will be removed)
  post: postRouter,
  userUpdate: userUpdateRouter,
  userSettingsLegacy: userSettingsRouter,
  notificationsLegacy: notificationsRouter,
  boardLegacy: boardRouter,
  taskLegacy: taskRouter,
  dictionaryLegacy: dictionaryRouter,
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
