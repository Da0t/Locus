// OWNER: Person A (sim core). The fast clock.
// Real engine: age tips toward zero, size the search radius from hypothesis
// mobility, run the Monte Carlo walker (Task 1), suppress cells rescue teams
// have already searched, smooth + normalize, and patch simState exactly once
// per tick.
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { PROFILES, SIM, type Profile } from "./profiles";
import { mulberry32, runWalks } from "./simWalker";

export const state = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, { caseId }) => {
    return await ctx.db
      .query("simState")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .unique();
  },
});

export const setRunning = mutation({
  args: { caseId: v.id("cases"), running: v.boolean() },
  handler: async (ctx, { caseId, running }) => {
    const s = await ctx.db
      .query("simState")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .unique();
    if (!s) throw new Error("No simState — seed the case first");
    const wasRunning = s.running;
    await ctx.db.patch(s._id, { running });
    if (running && !wasRunning) {
      await ctx.scheduler.runAfter(0, internal.sim.tick, { caseId });
    }
  },
});

// ---------------------------------------------------------------------------
// Module-private helpers
// ---------------------------------------------------------------------------

/** Safe `PROFILES[profile]` lookup — `h.profile` is a bare string in the
 * schema, not the narrower profile-key union. */
function lookupProfile(profile: string): Profile | undefined {
  return Object.prototype.hasOwnProperty.call(PROFILES, profile)
    ? PROFILES[profile as keyof typeof PROFILES]
    : undefined;
}

/**
 * Search radius (km): weighted mean over ALL hypotheses of how far the
 * subject could plausibly have traveled since last-known (mobility x
 * elapsed sim-time), capped at that profile's p95 find-distance. Hypotheses
 * whose profile string isn't in PROFILES are skipped.
 */
function computeRadiusKm(hypotheses: Doc<"hypotheses">[], simClockMin: number): number {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const h of hypotheses) {
    const profile = lookupProfile(h.profile);
    if (!profile) continue;
    const p95Km = profile.findDistanceKm[3];
    const traveledKm = (h.mobilityKmH * simClockMin) / 60;
    weightedSum += h.weight * Math.min(p95Km, traveledKm);
    weightTotal += h.weight;
  }
  return weightTotal > 0 ? weightedSum / weightTotal : 0;
}

/** One pass of a 3x3 box filter. Edge/corner cells average only their
 * in-bounds neighbors (including themselves), so they divide by fewer than
 * 9. */
function boxSmooth(heatmap: number[][]): number[][] {
  const gridSize = heatmap.length;
  const out: number[][] = Array.from({ length: gridSize }, () => new Array(gridSize).fill(0));
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || ny >= gridSize || nx < 0 || nx >= gridSize) continue;
          sum += heatmap[ny][nx];
          count++;
        }
      }
      out[y][x] = sum / count;
    }
  }
  return out;
}

/** Scale every cell so the max is exactly 1. Leaves an all-zero map as is. */
function normalizeToMax(heatmap: number[][]): number[][] {
  let max = 0;
  for (const row of heatmap) {
    for (const cell of row) {
      if (cell > max) max = cell;
    }
  }
  if (max <= 0) return heatmap;
  return heatmap.map((row) => row.map((cell) => cell / max));
}

export const tick = internalMutation({
  args: { caseId: v.id("cases") },
  handler: async (ctx, { caseId }) => {
    const s = await ctx.db
      .query("simState")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .unique();
    if (!s || !s.running) return; // paused: the self-scheduling chain stops

    // ---- Real tick body ----
    const caseDoc = await ctx.db.get(caseId);
    if (!caseDoc || caseDoc.status !== "active") return; // not active: stop, no reschedule

    const hypotheses = await ctx.db
      .query("hypotheses")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .collect();
    const tips = await ctx.db
      .query("tips")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .collect();
    const grids = await ctx.db
      .query("grids")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .collect();

    const tick = s.tick + 1;
    const simClockMin = s.simClockMin + s.minutesPerTick;

    // Age tips toward zero; patch a row only when its weight moved by more
    // than 0.05 so a typical tick touches no tip rows at all. The walker
    // always sees the freshly recomputed weights, patched or not.
    const agedTips: Doc<"tips">[] = [];
    for (const tipDoc of tips) {
      const minutesSinceObserved = Math.max(0, simClockMin - tipDoc.observedAtSimMin);
      const newWeight = 0.5 ** (minutesSinceObserved / SIM.TIP_HALF_LIFE_SIM_MIN);
      if (Math.abs(newWeight - tipDoc.weight) > 0.05) {
        await ctx.db.patch(tipDoc._id, { weight: newWeight });
        agedTips.push({ ...tipDoc, weight: newWeight });
      } else {
        agedTips.push(tipDoc);
      }
    }

    const radiusKm = computeRadiusKm(hypotheses, simClockMin);

    const rng = mulberry32((tick * 2654435761) % 2 ** 32);
    let heatmap = runWalks(caseDoc, hypotheses, agedTips, simClockMin, rng);

    // Searched-cell suppression: claimed-but-unsearched cells are untouched.
    for (const g of grids) {
      if (g.searched) heatmap[g.y][g.x] *= 1 - SIM.POD;
    }

    heatmap = normalizeToMax(boxSmooth(heatmap));

    await ctx.db.patch(s._id, { tick, simClockMin, radiusKm, heatmap });

    // Task 3: team movement & search
    // Task 4: planner
    // Task 5: found check
    // --------------------------------------------------------------------

    await ctx.scheduler.runAfter(SIM.TICK_MS, internal.sim.tick, { caseId });
  },
});
