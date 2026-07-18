/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents_client from "../agents/client.js";
import type * as agents_hypothesis from "../agents/hypothesis.js";
import type * as agents_intent from "../agents/intent.js";
import type * as agents_status from "../agents/status.js";
import type * as cases from "../cases.js";
import type * as commands from "../commands.js";
import type * as debrief from "../debrief.js";
import type * as intel from "../intel.js";
import type * as lib_contracts from "../lib/contracts.js";
import type * as lib_geo from "../lib/geo.js";
import type * as planner from "../planner.js";
import type * as presence from "../presence.js";
import type * as profiles from "../profiles.js";
import type * as scenario from "../scenario.js";
import type * as sim from "../sim.js";
import type * as simWalker from "../simWalker.js";
import type * as teams from "../teams.js";
import type * as tips from "../tips.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "agents/client": typeof agents_client;
  "agents/hypothesis": typeof agents_hypothesis;
  "agents/intent": typeof agents_intent;
  "agents/status": typeof agents_status;
  cases: typeof cases;
  commands: typeof commands;
  debrief: typeof debrief;
  intel: typeof intel;
  "lib/contracts": typeof lib_contracts;
  "lib/geo": typeof lib_geo;
  planner: typeof planner;
  presence: typeof presence;
  profiles: typeof profiles;
  scenario: typeof scenario;
  sim: typeof sim;
  simWalker: typeof simWalker;
  teams: typeof teams;
  tips: typeof tips;
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
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  presence: import("@convex-dev/presence/_generated/component.js").ComponentApi<"presence">;
};
