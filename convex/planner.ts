// OWNER: Person A (sim core). Greedy coverage planner.
// Assigns idle teams to the highest-priority unsearched, unclaimed cells
// per tick. Priority = probability x staleness. Never touches enroute or
// searching teams, and never reassigns a cell claimed by anyone (including
// human claims made through teams.claimGrid). See PERSON_A.md §4.
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { cellCenter, distanceKm, type Bounds } from "./lib/geo";

// Assign highest-priority unsearched, unclaimed cells to idle teams.
// Priority = probability x staleness. No overlap. See PERSON_A.md §4.
export async function assignTeams(
  ctx: MutationCtx,
  caseId: Id<"cases">,
  heatmap: number[][],
): Promise<void> {
  const caseDoc = await ctx.db.get(caseId);
  if (!caseDoc) return;

  const grids = await ctx.db
    .query("grids")
    .withIndex("by_case", (q) => q.eq("caseId", caseId))
    .collect();
  const teams = await ctx.db
    .query("teams")
    .withIndex("by_case", (q) => q.eq("caseId", caseId))
    .collect();
  const simState = await ctx.db
    .query("simState")
    .withIndex("by_case", (q) => q.eq("caseId", caseId))
    .unique();
  if (!simState) return;
  const tick = simState.tick;

  const idleTeams = teams.filter((t) => t.status === "idle");
  if (idleTeams.length === 0) return;

  let candidates = grids.filter((g) => !g.searched && g.claimedBy === undefined);
  if (candidates.length === 0) return;

  // Searched-cell list, computed once: used to find each candidate's
  // spatially nearest searched cell (grid-space distance) for staleness.
  const searchedGrids = grids.filter((g) => g.searched);

  function nearestSearchedAtTick(g: Doc<"grids">): number {
    if (searchedGrids.length === 0) return 0;
    let bestD2 = Infinity;
    let bestTick = 0;
    for (const s of searchedGrids) {
      const dx = g.x - s.x;
      const dy = g.y - s.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestTick = s.searchedAtTick ?? 0;
      }
    }
    return bestTick;
  }

  // Score depends only on the (fixed) searched-cell set and heatmap, not on
  // which team is being assigned, so compute it once per candidate.
  const scoreById = new Map<Id<"grids">, number>();
  for (const g of candidates) {
    const staleTick = nearestSearchedAtTick(g);
    scoreById.set(g._id, heatmap[g.y][g.x] * (1 + 0.02 * (tick - staleTick)));
  }

  const bounds: Bounds = {
    swLat: caseDoc.boundsSwLat,
    swLng: caseDoc.boundsSwLng,
    neLat: caseDoc.boundsNeLat,
    neLng: caseDoc.boundsNeLng,
  };

  // g is strictly better than the current best: higher score; tie -> nearer
  // to the team; tie -> lower y then lower x (deterministic).
  function isBetter(
    g: Doc<"grids">,
    gScore: number,
    gDist: number,
    best: Doc<"grids">,
    bestScore: number,
    bestDist: number,
  ): boolean {
    if (gScore !== bestScore) return gScore > bestScore;
    if (gDist !== bestDist) return gDist < bestDist;
    if (g.y !== best.y) return g.y < best.y;
    return g.x < best.x;
  }

  for (const team of idleTeams) {
    if (candidates.length === 0) break;

    let best: Doc<"grids"> | undefined;
    let bestScore = -Infinity;
    let bestDist = Infinity;

    for (const g of candidates) {
      const s = scoreById.get(g._id)!;
      const center = cellCenter(bounds, caseDoc.gridSize, { x: g.x, y: g.y });
      const d = distanceKm(team.lat, team.lng, center.lat, center.lng);
      if (best === undefined || isBetter(g, s, d, best, bestScore, bestDist)) {
        best = g;
        bestScore = s;
        bestDist = d;
      }
    }

    // best is always defined here: candidates.length > 0 guaranteed by the
    // loop guard above.
    const chosen = best!;
    await ctx.db.patch(chosen._id, { claimedBy: team._id });
    await ctx.db.patch(team._id, { assignedGridId: chosen._id, status: "enroute" });

    candidates = candidates.filter((g) => g._id !== chosen._id);
  }
}
