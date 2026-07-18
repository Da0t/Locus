// OWNER: Person C (intelligence). The single LLM gateway for LOCUS.
// Every LLM call — intent parse, tip judge, hypothesis threads, status
// read-back — goes through this one Respan provider. The env indirection
// IS the fallback plan: point RESPAN_BASE_URL at https://api.openai.com/v1
// and everything keeps working unchanged.
//
// ⚠️ INTEGRATOR / MERGE NOTE — REQUIRED package.json FIX ⚠️
// package.json pins "@ai-sdk/openai": "^4.0.16". That version emits
// LanguageModelV4, but @convex-dev/agent@0.6.4 requires ai@6.0.230, whose
// runtime only accepts v2/v3 models and throws AI_UnsupportedModelVersionError
// on v4 *before any network call*. The working pairing is:
//     "@ai-sdk/openai": "^3.0.86"
// (v3 models; same @ai-sdk/provider@3.0.14 that ai@6.0.230 bundles; matches
// @convex-dev/agent's @ai-sdk/provider-utils@^4 peer dep).
// This branch has 3.0.86 installed in node_modules via `npm install
// @ai-sdk/openai@3.0.86 --no-save`, so package.json is untouched. Before the
// final-hour merge, bump package.json to ^3.0.86 and re-run npm install, or a
// plain `npm install` will restore ^4.0.16 and every LLM call will throw.
import { createOpenAI } from "@ai-sdk/openai";

export const respan = createOpenAI({
  baseURL: process.env.RESPAN_BASE_URL ?? "https://api.respan.ai/api/",
  apiKey: process.env.RESPAN_API_KEY!,
});

export const MODEL = process.env.RESPAN_MODEL ?? "gpt-4o-mini";
