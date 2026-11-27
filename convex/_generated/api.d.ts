/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as canvases from "../canvases.js";
import type * as http from "../http.js";
import type * as kanban from "../kanban.js";
import type * as lib_activeIdentity from "../lib/activeIdentity.js";
import type * as lib_authRecords from "../lib/authRecords.js";
import type * as lib_fileReferences from "../lib/fileReferences.js";
import type * as lib_uploadCleanup from "../lib/uploadCleanup.js";
import type * as lib_versionRetention from "../lib/versionRetention.js";
import type * as notes from "../notes.js";
import type * as tags from "../tags.js";
import type * as uploadCleanup from "../uploadCleanup.js";
import type * as uploads from "../uploads.js";
import type * as versions from "../versions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  canvases: typeof canvases;
  http: typeof http;
  kanban: typeof kanban;
  "lib/activeIdentity": typeof lib_activeIdentity;
  "lib/authRecords": typeof lib_authRecords;
  "lib/fileReferences": typeof lib_fileReferences;
  "lib/uploadCleanup": typeof lib_uploadCleanup;
  "lib/versionRetention": typeof lib_versionRetention;
  notes: typeof notes;
  tags: typeof tags;
  uploadCleanup: typeof uploadCleanup;
  uploads: typeof uploads;
  versions: typeof versions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
};
