import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================
// FROZEN CONTRACT — see docs/CONTRACTS.md before editing.
// Any schema change must be agreed by the whole team and merged
// to every branch immediately. Do not edit casually.
// ============================================================

export const terrainKind = v.union(
  v.literal("trail"),
  v.literal("road"),
  v.literal("water"),
  v.literal("steep"),
);

export default defineSchema({
  // One active search case. Seeded once by scenario.seedDemo.
  cases: defineTable({
    name: v.string(),
    subjectFacts: v.string(),
    lastKnownLat: v.number(),
    lastKnownLng: v.number(),
    // Grid geometry: square grid of gridSize x gridSize cells over bounds.
    boundsSwLat: v.number(),
    boundsSwLng: v.number(),
    boundsNeLat: v.number(),
    boundsNeLng: v.number(),
    gridSize: v.number(),
    // Authored terrain overlay: sparse list of non-"open" cells.
    terrainCells: v.array(
      v.object({ x: v.number(), y: v.number(), kind: terrainKind }),
    ),
    // Named places for voice commands ("near the north creek").
    landmarks: v.array(
      v.object({ name: v.string(), lat: v.number(), lng: v.number() }),
    ),
    // Demo ground truth. NEVER rendered in the UI before the found moment.
    hiddenTrueLat: v.number(),
    hiddenTrueLng: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("found"),
      v.literal("suspended"),
    ),
    photoStorageId: v.optional(v.id("_storage")),
    debrief: v.optional(v.string()), // Round-2: after-action report (W5)
  }),

  // One row per Koester profile hypothesis. Weights sum to ~1.
  hypotheses: defineTable({
    caseId: v.id("cases"),
    profile: v.string(), // "hiker" | "dementia" | "child" | "injured"
    weight: v.number(),
    reasoning: v.string(), // latest rationale, shown in the side panel
    threadId: v.optional(v.string()), // Agent-component thread (Person C)
    behaviorWeights: v.object({
      randomWalk: v.number(),
      routeTravel: v.number(),
      directionTravel: v.number(),
      stayPut: v.number(),
      viewEnhance: v.number(),
      backtrack: v.number(),
    }),
    mobilityKmH: v.number(),
    terrainAffinity: v.object({
      trail: v.number(),
      road: v.number(),
      water: v.number(),
      steep: v.number(),
      open: v.number(),
    }),
    updatedAt: v.number(),
  }).index("by_case", ["caseId"]),

  tips: defineTable({
    caseId: v.id("cases"),
    text: v.string(),
    lat: v.number(),
    lng: v.number(),
    observedAtSimMin: v.number(), // sim-minutes since last seen
    source: v.string(), // "radio" | "voice" | "scripted" | "911"
    credibility: v.number(), // 0..1, scored by Person C's judge (stub: 0.5)
    weight: v.number(), // aged toward 0 by Person A's tick
    // Round-2: gateway embedding for corroboration matching (W1).
    embedding: v.optional(v.array(v.float64())),
    corroborates: v.optional(v.id("tips")), // most-similar prior tip, if close
  })
    .index("by_case", ["caseId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536, // text-embedding-3-small
      filterFields: ["caseId"],
    }),

  // Search/claim state per cell. Probabilities live in simState.heatmap.
  grids: defineTable({
    caseId: v.id("cases"),
    x: v.number(),
    y: v.number(),
    searched: v.boolean(),
    searchedAtTick: v.optional(v.number()),
    claimedBy: v.optional(v.id("teams")),
  })
    .index("by_case", ["caseId"])
    .index("by_cell", ["caseId", "x", "y"]),

  teams: defineTable({
    caseId: v.id("cases"),
    name: v.string(),
    lat: v.number(),
    lng: v.number(),
    status: v.union(
      v.literal("idle"),
      v.literal("enroute"),
      v.literal("searching"),
    ),
    assignedGridId: v.optional(v.id("grids")),
  }).index("by_case", ["caseId"]),

  // Single row per case. The tick loop's read-modify-write target.
  simState: defineTable({
    caseId: v.id("cases"),
    tick: v.number(),
    running: v.boolean(),
    simClockMin: v.number(), // simulated minutes since last seen
    minutesPerTick: v.number(), // time-scale knob (demo pacing)
    radiusKm: v.number(),
    // heatmap[y][x], values normalized to max=1. gridSize x gridSize.
    heatmap: v.array(v.array(v.number())),
    foundAtTick: v.optional(v.number()),
    lastReasonedAt: v.optional(v.number()),
  }).index("by_case", ["caseId"]),

  // Voice/console command audit log. intent shape: see convex/lib/contracts.ts
  commands: defineTable({
    caseId: v.id("cases"),
    rawText: v.string(),
    intent: v.optional(v.any()),
    status: v.union(
      v.literal("pending"),
      v.literal("parsed"),
      v.literal("applied"),
      v.literal("failed"),
    ),
    response: v.optional(v.string()), // read-back text shown in the console
  }).index("by_case", ["caseId"]),
});
