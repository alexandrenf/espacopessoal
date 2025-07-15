/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as accessControl from "../accessControl.js";
import type * as boards from "../boards.js";
import type * as crons from "../crons.js";
import type * as dictionary from "../dictionary.js";
import type * as documents from "../documents.js";
import type * as http from "../http.js";
import type * as magicCodes from "../magicCodes.js";
import type * as migratedocumentstonotebooks from "../migratedocumentstonotebooks.js";
import type * as migrations from "../migrations.js";
import type * as notebooks from "../notebooks.js";
import type * as scheduledNotifications from "../scheduledNotifications.js";
import type * as tasks from "../tasks.js";
import type * as userSettings from "../userSettings.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  accessControl: typeof accessControl;
  boards: typeof boards;
  crons: typeof crons;
  dictionary: typeof dictionary;
  documents: typeof documents;
  http: typeof http;
  magicCodes: typeof magicCodes;
  migratedocumentstonotebooks: typeof migratedocumentstonotebooks;
  migrations: typeof migrations;
  notebooks: typeof notebooks;
  scheduledNotifications: typeof scheduledNotifications;
  tasks: typeof tasks;
  userSettings: typeof userSettings;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
