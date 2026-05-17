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
import type * as applications from "../applications.js";
import type * as introductions from "../introductions.js";
import type * as photos from "../photos.js";
import type * as profile from "../profile.js";
import type * as referrals from "../referrals.js";
import type * as referrers from "../referrers.js";
import type * as rewardPools from "../rewardPools.js";
import type * as session from "../session.js";
import type * as sharing from "../sharing.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";
import type * as voice from "../voice.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  applications: typeof applications;
  introductions: typeof introductions;
  photos: typeof photos;
  profile: typeof profile;
  referrals: typeof referrals;
  referrers: typeof referrers;
  rewardPools: typeof rewardPools;
  session: typeof session;
  sharing: typeof sharing;
  users: typeof users;
  utils: typeof utils;
  voice: typeof voice;
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

export declare const components: {};
