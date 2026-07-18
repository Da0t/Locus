// OWNER: Person C (intelligence). The reasoning brains: four persistent
// hypothesis Agents (one per Koester profile, each with its own thread memory),
// plus the pure prompt/schema/normalization helpers used by intel.onNewTip.
// Every LLM call here rides the single Respan gateway (see ./client.ts).
import { Agent } from "@convex-dev/agent";
import { z } from "zod";
import { components } from "../_generated/api";
import { respan, MODEL } from "./client";
import { PROFILES, type Profile } from "../profiles";
import { distanceKm } from "../lib/geo";

export const PROFILE_KEYS = Object.keys(PROFILES) as Profile["key"][];

// One persistent Agent per profile. Instances are cheap (no LLM call at
// construction); each accumulates its own memory of the case via its thread.
export const hypothesisAgents: Record<Profile["key"], Agent> = Object.fromEntries(
  PROFILE_KEYS.map((key) => {
    const p = PROFILES[key];
    return [
      key,
      new Agent(components.agent, {
        name: `hypothesis-${key}`,
        languageModel: respan.chat(MODEL),
        instructions:
          `You are the ${p.label} hypothesis agent in a wilderness search-and-rescue case. ` +
          `Profile behaviour: ${p.blurb} ` +
          `You remember every tip in this case. After each new tip you re-estimate the ` +
          `probability (0-1) that the missing subject fits THIS profile. Stay calibrated ` +
          `against the evidence and keep reasoning to one or two sentences.`,
      }),
    ];
  }),
) as Record<Profile["key"], Agent>;

// ---- Structured-output schemas ---------------------------------------------
// NOTE: no .min()/.max() — OpenAI strict structured outputs rejects
// minimum/maximum. All fields required (strict-mode safe). We clamp in code.
export const judgeSchema = z.object({
  credibility: z
    .number()
    .describe("0 = almost certainly noise, 1 = highly credible"),
  rationale: z.string().describe("one short sentence"),
});

export const hypothesisSchema = z.object({
  weight: z
    .number()
    .describe("0-1 probability the subject fits THIS profile given all evidence"),
  reasoning: z.string().describe("one or two sentences"),
  mobilityKmH: z
    .number()
    .describe("estimated travel speed km/h; stay within +-50% of the given prior"),
});

// ---- Shared context shape passed into prompt builders ----------------------
export type ReasonContext = {
  subjectFacts: string;
  simClockMin: number;
  lastKnownLat: number;
  lastKnownLng: number;
  tip: {
    text: string;
    source: string;
    lat: number;
    lng: number;
    observedAtSimMin: number;
  };
};

function tipDistanceKm(cx: ReasonContext): number {
  return distanceKm(cx.tip.lat, cx.tip.lng, cx.lastKnownLat, cx.lastKnownLng);
}

// ---- Prompt builders (kept short: budget + latency) ------------------------
export function buildJudgePrompt(cx: ReasonContext): string {
  const dist = tipDistanceKm(cx).toFixed(1);
  return [
    `Score this search-and-rescue tip's credibility from 0 to 1.`,
    `Subject: ${cx.subjectFacts}`,
    `Subject has been missing ${cx.simClockMin} simulated minutes.`,
    `Tip (source "${cx.tip.source}"): "${cx.tip.text}"`,
    `It places the subject ${dist} km from the last-known point, observed about ${cx.tip.observedAtSimMin} sim-min into the search.`,
    `A sighting far outside plausible travel range (tens of km) is almost certainly noise -> low credibility. A plausible nearby sighting -> higher.`,
  ].join("\n");
}

export function buildHypothesisPrompt(
  cx: ReasonContext,
  key: Profile["key"],
  credibility: number,
): string {
  const p = PROFILES[key];
  const dist = tipDistanceKm(cx).toFixed(1);
  const [, p50, p75] = p.findDistanceKm;
  return [
    `New tip (judged credibility ${credibility.toFixed(2)}, source "${cx.tip.source}"):`,
    `"${cx.tip.text}" — ${dist} km from the last-known point, observed ~${cx.tip.observedAtSimMin} sim-min in.`,
    `Case: ${cx.subjectFacts} Missing ${cx.simClockMin} sim-min.`,
    `Your ${p.label} Koester priors: find-distance p50 ${p50} km, p75 ${p75} km; base mobility ${p.mobilityKmH} km/h.`,
    `Considering this tip plus everything you already remember about this case, output an updated weight (0-1) that the subject fits the ${p.label} profile, brief reasoning, and mobilityKmH within +-50% of ${p.mobilityKmH}.`,
  ].join("\n");
}

// ---- Combine helpers -------------------------------------------------------
export type RawWeight = {
  profile: Profile["key"];
  weight: number;
  reasoning: string;
  mobilityKmH: number;
};

// Clamp a suggested param nudge to +-50% of the profile default.
export function clampNudge(value: number, def: number): number {
  if (!Number.isFinite(value)) return def;
  return Math.max(def * 0.5, Math.min(def * 1.5, value));
}

// Floor each raw weight at 0.02 (no hypothesis dies), then normalize to sum 1.
export function normalizeWeights(items: RawWeight[]): RawWeight[] {
  const floored = items.map((i) => ({
    ...i,
    weight: Math.max(0.02, Number.isFinite(i.weight) ? i.weight : 0.02),
    mobilityKmH: clampNudge(i.mobilityKmH, PROFILES[i.profile].mobilityKmH),
  }));
  const sum = floored.reduce((a, i) => a + i.weight, 0) || 1;
  return floored.map((i) => ({ ...i, weight: i.weight / sum }));
}
