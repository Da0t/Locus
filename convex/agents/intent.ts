// OWNER: Person C (intelligence). Intent-parse prompt + envelope schema.
// The frozen intentSchema is a discriminated UNION with optional fields.
// OpenAI structured outputs require an OBJECT at the schema root, so we wrap
// it in { intent } and relax strict mode (strictJsonSchema:false) at the call
// site. We still validate straight into the frozen Intent type.
import { z } from "zod";
import { intentSchema } from "../lib/contracts";

export const intentEnvelope = z.object({ intent: intentSchema });

export type CommandContext = {
  subjectFacts: string;
  landmarks: string[];
  simClockMin: number;
};

export function buildIntentSystem(cx: CommandContext): string {
  return [
    `You parse a search-and-rescue coordinator's command into ONE structured intent.`,
    `Known landmarks: ${cx.landmarks.join(", ") || "(none)"}. Map colloquial places ("the north creek") to the closest landmark name and put it in \`place\`.`,
    `Subject: ${cx.subjectFacts}`,
    `Hypothesis profiles: hiker, dementia, child, injured. Current sim clock: ${cx.simClockMin} minutes since last seen.`,
    `A sighting/tip -> add_tip (place in \`place\`, the sentence in \`text\`, "an hour ago"-style phrasing is approximate minutesAgo).`,
    `"which sector / where / under-searched / status" -> query_status. "re-run the <profile>" -> rerun_hypothesis.`,
    `"pause/freeze" -> pause_sim, "resume/continue" -> resume_sim, "missing for X hours" -> set_time_missing.`,
    `Anything you cannot confidently map -> unknown.`,
  ].join("\n");
}
