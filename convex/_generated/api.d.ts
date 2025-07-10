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
import type * as dictionary from "../dictionary.js";
import type * as documents from "../documents.js";
import type * as http from "../http.js";
import type * as migratedocumentstonotebooks from "../migratedocumentstonotebooks.js";
import type * as migrations from "../migrations.js";
import type * as notebooks from "../notebooks.js";
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
  dictionary: typeof dictionary;
  documents: typeof documents;
  http: typeof http;
  migratedocumentstonotebooks: typeof migratedocumentstonotebooks;
  migrations: typeof migrations;
  notebooks: typeof notebooks;
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
