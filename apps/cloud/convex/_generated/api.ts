/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { ApiFromModules } from "convex/server";
import type * as apiKeys from "../apiKeys.js";
import type * as apps from "../apps.js";
import type * as organizations from "../organizations.js";
import type * as reports from "../reports.js";
import type * as http from "../http.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  apiKeys: typeof apiKeys;
  apps: typeof apps;
  organizations: typeof organizations;
  reports: typeof reports;
  http: typeof http;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

import type { FilterApi, FunctionReference } from "convex/server";
