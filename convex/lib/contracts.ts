import { z } from "zod";

// ============================================================
// FROZEN CONTRACT — the voice-command intent vocabulary.
// Person C produces these (LLM parse), Person A's mutations consume
// them, Person D's console displays them. Adding a new intent type
// requires a team ping + merge to all branches.
// ============================================================

export const intentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("add_tip"),
    text: z.string(),
    // Either explicit coords or a landmark name from cases.landmarks.
    lat: z.number().optional(),
    lng: z.number().optional(),
    place: z.string().optional(),
    minutesAgo: z.number().optional(), // real-world phrasing, sim-mapped
    source: z.string().default("voice"),
  }),
  z.object({
    type: z.literal("set_time_missing"),
    hours: z.number(),
  }),
  z.object({
    type: z.literal("rerun_hypothesis"),
    profile: z.enum(["hiker", "dementia", "child", "injured"]),
  }),
  z.object({ type: z.literal("pause_sim") }),
  z.object({ type: z.literal("resume_sim") }),
  z.object({
    type: z.literal("query_status"),
    question: z.string(),
  }),
  z.object({
    type: z.literal("unknown"),
    raw: z.string(),
  }),
]);

export type Intent = z.infer<typeof intentSchema>;

// ---------------------------------------------------------------
// Data-shape contracts (documentation of shapes already enforced
// by convex/schema.ts — kept here so every plan can cite one file):
//
// HEATMAP: simState.heatmap is number[gridSize][gridSize], indexed
//   heatmap[y][x], normalized so max cell = 1. Cell (0,0) is the
//   SOUTH-WEST corner. Person A writes it; B renders it; nobody
//   else touches it.
//
// GRID GEOMETRY: all cell<->lat/lng conversion goes through
//   convex/lib/geo.ts. Never inline the math.
//
// TIP FLOW: tips.addTip (Person A) is the ONLY way a tip enters the
//   system. C's intent dispatch and D's scripted scenario both call
//   it. addTip schedules intel.onNewTip (Person C) — the event clock.
// ---------------------------------------------------------------
