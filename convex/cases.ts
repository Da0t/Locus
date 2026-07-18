// OWNER: Person A (sim core). Others call these; never edit this file.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { terrainKind } from "./schema";
import { PROFILES } from "./profiles";
import { emptyHeatmap } from "./lib/geo";

// The single seed entrypoint. Person D's scenario calls this.
export const seedCase = mutation({
  args: {
    name: v.string(),
    subjectFacts: v.string(),
    lastKnownLat: v.number(),
    lastKnownLng: v.number(),
    boundsSwLat: v.number(),
    boundsSwLng: v.number(),
    boundsNeLat: v.number(),
    boundsNeLng: v.number(),
    gridSize: v.number(),
    terrainCells: v.array(
      v.object({ x: v.number(), y: v.number(), kind: terrainKind }),
    ),
    landmarks: v.array(
      v.object({ name: v.string(), lat: v.number(), lng: v.number() }),
    ),
    hiddenTrueLat: v.number(),
    hiddenTrueLng: v.number(),
    teams: v.array(
      v.object({ name: v.string(), lat: v.number(), lng: v.number() }),
    ),
    minutesPerTick: v.number(),
    initialSimMin: v.number(), // how long the person has already been missing
  },
  handler: async (ctx, args) => {
    const { teams, minutesPerTick, initialSimMin, ...caseFields } = args;
    const caseId = await ctx.db.insert("cases", {
      ...caseFields,
      status: "active" as const,
    });
    await ctx.db.insert("simState", {
      caseId,
      tick: 0,
      running: false,
      simClockMin: initialSimMin,
      minutesPerTick,
      radiusKm: 1,
      heatmap: emptyHeatmap(args.gridSize),
    });
    const now = Date.now();
    for (const p of Object.values(PROFILES)) {
      await ctx.db.insert("hypotheses", {
        caseId,
        profile: p.key,
        weight: 1 / Object.keys(PROFILES).length,
        reasoning: `Initial prior. ${p.blurb}`,
        behaviorWeights: p.behaviorWeights,
        mobilityKmH: p.mobilityKmH,
        terrainAffinity: p.terrainAffinity,
        updatedAt: now,
      });
    }
    for (const t of teams) {
      await ctx.db.insert("teams", { caseId, ...t, status: "idle" as const });
    }
    for (let y = 0; y < args.gridSize; y++) {
      for (let x = 0; x < args.gridSize; x++) {
        await ctx.db.insert("grids", { caseId, x, y, searched: false });
      }
    }
    return caseId;
  },
});

// The active case, or null before seeding. Every client starts here.
export const active = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("cases")
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
  },
});

export const hypotheses = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, { caseId }) => {
    return await ctx.db
      .query("hypotheses")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .collect();
  },
});
