// OWNER: Person A (sim core). The fast clock.
// Real engine: age tips toward zero, size the search radius from hypothesis
// mobility, run the Monte Carlo walker (Task 1), suppress cells rescue teams
// have already searched, smooth + normalize, patch simState once per tick
// (found tick adds one extra patch).
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { PROFILES, SIM, type Profile } from "./profiles";
import { mulberry32, runWalks } from "./simWalker";
import {
  bearingDeg,
  cellCenter,
  distanceKm,
  latLngToCell,
  movePoint,
  type Bounds,
} from "./lib/geo";
import { assignTeams } from "./planner";

// Team ground speed. Not part of SIM (profiles.ts) — teams are simulated
// units, not lost-person hypotheses.
const TEAM_SPEED_KM_H = 3;

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

/**
 * Drive enroute teams toward their assigned cell and complete searches.
 * Statelessly infers "2 consecutive ticks in the cell" from status alone —
 * a team lands on its cell center and flips to "searching" on the arrival
 * tick, then this function completes the search on the very next tick it
 * still sees that team as "searching". Idle teams are left untouched (no
 * patch). Returns the grid docs newly marked searched THIS tick, which
 * Task 5's found check consumes.
 */
async function moveAndSearchTeams(
  ctx: MutationCtx,
  tick: number,
  minutesPerTick: number,
  bounds: Bounds,
  gridSize: number,
  teams: Doc<"teams">[],
  grids: Doc<"grids">[],
): Promise<Doc<"grids">[]> {
  const stepKm = (TEAM_SPEED_KM_H * minutesPerTick) / 60;
  const newlySearched: Doc<"grids">[] = [];

  for (const team of teams) {
    if (team.status === "idle") continue;

    const grid = team.assignedGridId
      ? grids.find((g) => g._id === team.assignedGridId)
      : undefined;

    if (!grid) {
      // Defensive: enroute/searching with no assignment, or an assignment
      // that isn't in the loaded grids. Reset to idle.
      await ctx.db.patch(team._id, { status: "idle", assignedGridId: undefined });
      continue;
    }

    if (team.status === "enroute") {
      const target = cellCenter(bounds, gridSize, { x: grid.x, y: grid.y });
      const remainingKm = distanceKm(team.lat, team.lng, target.lat, target.lng);
      if (remainingKm < 0.1 || stepKm >= remainingKm) {
        // Arrival tick: snap exactly to the cell center.
        await ctx.db.patch(team._id, {
          lat: target.lat,
          lng: target.lng,
          status: "searching",
        });
      } else {
        const bearing = bearingDeg(team.lat, team.lng, target.lat, target.lng);
        const moved = movePoint(team.lat, team.lng, stepKm, bearing);
        await ctx.db.patch(team._id, { lat: moved.lat, lng: moved.lng });
      }
      continue;
    }

    // team.status === "searching": arrived on an earlier tick, so this is
    // the 2nd consecutive tick in the cell -> the search is complete.
    if (!grid.searched) {
      const searchedGrid = { ...grid, searched: true, searchedAtTick: tick, claimedBy: undefined };
      await ctx.db.patch(grid._id, {
        searched: true,
        searchedAtTick: tick,
        claimedBy: undefined,
      });
      newlySearched.push(searchedGrid);
    } else if (grid.claimedBy !== undefined) {
      // Already searched (e.g. claimed after another team searched it): the
      // team still needs to release its claim when it goes idle below.
      await ctx.db.patch(grid._id, { claimedBy: undefined });
    }
    await ctx.db.patch(team._id, { status: "idle", assignedGridId: undefined });
  }

  return newlySearched;
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
    if (!caseDoc || caseDoc.status !== "active") {
      // Case doc missing entirely: nothing to resume, leave state untouched.
      // Case doc present but externally suspended/found: unwedge the running
      // flag so a later setRunning(true)/resume isn't a no-op.
      if (caseDoc && s.running) {
        await ctx.db.patch(s._id, { running: false });
      }
      return; // not active: stop, no reschedule
    }

    const bounds: Bounds = {
      swLat: caseDoc.boundsSwLat,
      swLng: caseDoc.boundsSwLng,
      neLat: caseDoc.boundsNeLat,
      neLng: caseDoc.boundsNeLng,
    };

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
    const teams = await ctx.db
      .query("teams")
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
      }
      agedTips.push({ ...tipDoc, weight: newWeight });
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

    // Task 3: team movement & search. Drives enroute teams toward their
    // assigned cells and completes searches; returns the grid docs newly
    // marked searched this tick.
    const newlySearchedGrids = await moveAndSearchTeams(
      ctx,
      tick,
      s.minutesPerTick,
      bounds,
      caseDoc.gridSize,
      teams,
      grids,
    );
    // Task 5: found check. If any cell newly searched this tick is the
    // hidden true location, stop the world: freeze simState and mark the
    // case found. Coordinates never leave this computation. Runs before the
    // planner so a found tick never re-dispatches the finding team with a
    // fresh claim before the world stops.
    const trueCell = latLngToCell(
      bounds,
      caseDoc.gridSize,
      caseDoc.hiddenTrueLat,
      caseDoc.hiddenTrueLng,
    );
    const found = newlySearchedGrids.some(
      (g) => g.x === trueCell.x && g.y === trueCell.y,
    );
    if (found) {
      await ctx.db.patch(s._id, { foundAtTick: tick, running: false });
      await ctx.db.patch(caseId, { status: "found" });
      await ctx.scheduler.runAfter(0, internal.debrief.generate, { caseId });
    } else {
      // Task 4: planner. Assigns idle teams to the highest-priority
      // unsearched, unclaimed cells using this tick's freshly written
      // heatmap. Skipped on the found tick above.
      await assignTeams(ctx, caseId, heatmap);
    }
    // --------------------------------------------------------------------

    await ctx.scheduler.runAfter(SIM.TICK_MS, internal.sim.tick, { caseId });
  },
});
