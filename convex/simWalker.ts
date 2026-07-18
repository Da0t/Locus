// OWNER: Person A (sim core).
// Pure Monte Carlo walker: given a case, a set of profile hypotheses, and
// tips, simulate SIM.WALKS_PER_HYPOTHESIS random walks per hypothesis and
// accumulate an UNNORMALIZED probability-mass heatmap. No ctx, no database,
// no Date.now, no Math.random — the Convex tick loop (Task 2) supplies a
// seeded rng and writes the result. Keep this file pure and dependency-free
// beyond convex/lib/geo.ts and convex/profiles.ts (data only).
import type { Doc } from "./_generated/dataModel";
import { SIM } from "./profiles";
import {
  clamp,
  distanceKm,
  emptyHeatmap,
  latLngToCell,
  movePoint,
  type Bounds,
  type Cell,
} from "./lib/geo";

// ---------------------------------------------------------------------------
// PRNG
// ---------------------------------------------------------------------------

/** Standard mulberry32 PRNG. Returns a function yielding floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Small math/random helpers
// ---------------------------------------------------------------------------

function uniform(rng: () => number, lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}

function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

type BehaviorWeights = Doc<"hypotheses">["behaviorWeights"];
type BehaviorName = keyof BehaviorWeights;

const BEHAVIOR_ORDER: BehaviorName[] = [
  "randomWalk",
  "routeTravel",
  "directionTravel",
  "stayPut",
  "viewEnhance",
  "backtrack",
];

/** Cumulative-weight draw over the six behaviors. */
function sampleBehavior(weights: BehaviorWeights, rng: () => number): BehaviorName {
  let total = 0;
  for (const k of BEHAVIOR_ORDER) total += weights[k];
  if (total <= 0) return "stayPut";
  let r = rng() * total;
  for (const k of BEHAVIOR_ORDER) {
    r -= weights[k];
    if (r <= 0) return k;
  }
  return BEHAVIOR_ORDER[BEHAVIOR_ORDER.length - 1];
}

// ---------------------------------------------------------------------------
// Terrain lookup
// ---------------------------------------------------------------------------

type StoredTerrainKind = Doc<"cases">["terrainCells"][number]["kind"];
type TerrainAffinity = Doc<"hypotheses">["terrainAffinity"];
type TerrainKey = keyof TerrainAffinity; // "trail" | "road" | "water" | "steep" | "open"

function buildTerrainMap(caseDoc: Doc<"cases">): Map<string, StoredTerrainKind> {
  const m = new Map<string, StoredTerrainKind>();
  for (const c of caseDoc.terrainCells) m.set(`${c.x},${c.y}`, c.kind);
  return m;
}

function kindAt(terrain: Map<string, StoredTerrainKind>, cell: Cell): TerrainKey {
  return terrain.get(`${cell.x},${cell.y}`) ?? "open";
}

// ---------------------------------------------------------------------------
// Movement primitives
// ---------------------------------------------------------------------------

type MoveResult = { lat: number; lng: number; heading: number };

/**
 * Apply movePoint at `heading`/`stepKm`, then clamp into bounds and reflect
 * the heading if the raw destination left the box. East/west edge negates
 * the heading; north/south edge mirrors it via 180 - heading.
 */
function applyMove(
  lat: number,
  lng: number,
  heading: number,
  stepKm: number,
  bounds: Bounds,
): MoveResult {
  const dest = movePoint(lat, lng, stepKm, heading);
  let outLat = dest.lat;
  let outLng = dest.lng;
  let outHeading = heading;

  const hitLngEdge = outLng < bounds.swLng || outLng > bounds.neLng;
  const hitLatEdge = outLat < bounds.swLat || outLat > bounds.neLat;

  if (hitLngEdge) {
    outLng = clamp(outLng, bounds.swLng, bounds.neLng);
    outHeading = normalizeDeg(-outHeading);
  }
  if (hitLatEdge) {
    outLat = clamp(outLat, bounds.swLat, bounds.neLat);
    outHeading = normalizeDeg(180 - outHeading);
  }
  return { lat: outLat, lng: outLng, heading: outHeading };
}

/**
 * randomWalk / directionTravel terrain nudge: draw a candidate bearing per
 * the behavior's own rule, look up the affinity of its destination cell, and
 * accept the move with probability affinity/maxAffinity. On reject, redraw
 * once (same rule) and take that move unconditionally.
 */
function moveWithTerrainNudge(
  lat: number,
  lng: number,
  stepKm: number,
  bounds: Bounds,
  gridSize: number,
  terrain: Map<string, StoredTerrainKind>,
  affinity: TerrainAffinity,
  maxAffinity: number,
  rng: () => number,
  pickBearing: () => number,
): MoveResult {
  const bearing1 = pickBearing();
  const dest1 = movePoint(lat, lng, stepKm, bearing1);
  const cell1 = latLngToCell(bounds, gridSize, dest1.lat, dest1.lng);
  const acceptP = maxAffinity > 0 ? affinity[kindAt(terrain, cell1)] / maxAffinity : 1;
  if (rng() < acceptP) {
    return applyMove(lat, lng, bearing1, stepKm, bounds);
  }
  const bearing2 = pickBearing();
  return applyMove(lat, lng, bearing2, stepKm, bounds);
}

/**
 * routeTravel: 8 candidate bearings (heading + k*45), weighted by
 * affinity(destination kind)^2, cumulative-sampled. The winner becomes the
 * new heading and the move is taken (no further accept/reject retry — the
 * affinity^2 weighting *is* the terrain nudge for this behavior).
 */
function routeTravelMove(
  lat: number,
  lng: number,
  heading: number,
  stepKm: number,
  bounds: Bounds,
  gridSize: number,
  terrain: Map<string, StoredTerrainKind>,
  affinity: TerrainAffinity,
  rng: () => number,
): MoveResult {
  const bearings: number[] = [];
  const weights: number[] = [];
  for (let k = 0; k < 8; k++) {
    const bearing = normalizeDeg(heading + k * 45);
    const dest = movePoint(lat, lng, stepKm, bearing);
    const cell = latLngToCell(bounds, gridSize, dest.lat, dest.lng);
    const aff = affinity[kindAt(terrain, cell)];
    bearings.push(bearing);
    weights.push(aff * aff);
  }
  let total = 0;
  for (const w of weights) total += w;

  let chosen = bearings[bearings.length - 1];
  if (total > 0) {
    let r = rng() * total;
    for (let k = 0; k < 8; k++) {
      r -= weights[k];
      if (r <= 0) {
        chosen = bearings[k];
        break;
      }
    }
  } else {
    chosen = bearings[Math.min(7, Math.floor(rng() * 8))];
  }
  return applyMove(lat, lng, chosen, stepKm, bounds);
}

// ---------------------------------------------------------------------------
// One walk
// ---------------------------------------------------------------------------

type WalkResult = { path: Cell[]; endLat: number; endLng: number };

/**
 * Simulate one walk of `nSteps` steps starting at the case's last-known
 * point. Persistent state across steps is just `heading` — backtrack is
 * resolved as a heading reversal (heading + 180 +/- 20 deg) rather than a
 * literal return-to-previous-cell, so no separate prevCell tracking is
 * needed (per the task's ambiguity resolution).
 */
function runOneWalk(
  caseDoc: Doc<"cases">,
  h: Doc<"hypotheses">,
  terrain: Map<string, StoredTerrainKind>,
  maxAffinity: number,
  nSteps: number,
  stepKm: number,
  bounds: Bounds,
  gridSize: number,
  rng: () => number,
): WalkResult {
  let lat = caseDoc.lastKnownLat;
  let lng = caseDoc.lastKnownLng;
  let heading = uniform(rng, 0, 360);
  const path: Cell[] = [];

  for (let i = 0; i < nSteps; i++) {
    const behavior = sampleBehavior(h.behaviorWeights, rng);
    switch (behavior) {
      case "stayPut":
        break;
      case "viewEnhance":
        heading = normalizeDeg(heading + uniform(rng, -30, 30));
        break;
      case "directionTravel": {
        const capturedHeading = heading;
        const moved = moveWithTerrainNudge(
          lat,
          lng,
          stepKm,
          bounds,
          gridSize,
          terrain,
          h.terrainAffinity,
          maxAffinity,
          rng,
          () => normalizeDeg(capturedHeading + uniform(rng, -15, 15)),
        );
        lat = moved.lat;
        lng = moved.lng;
        heading = moved.heading;
        break;
      }
      case "backtrack": {
        const bearing = normalizeDeg(heading + 180 + uniform(rng, -20, 20));
        const moved = applyMove(lat, lng, bearing, stepKm, bounds);
        lat = moved.lat;
        lng = moved.lng;
        heading = moved.heading;
        break;
      }
      case "randomWalk": {
        const moved = moveWithTerrainNudge(
          lat,
          lng,
          stepKm,
          bounds,
          gridSize,
          terrain,
          h.terrainAffinity,
          maxAffinity,
          rng,
          () => uniform(rng, 0, 360),
        );
        lat = moved.lat;
        lng = moved.lng;
        heading = moved.heading;
        break;
      }
      case "routeTravel": {
        const moved = routeTravelMove(
          lat,
          lng,
          heading,
          stepKm,
          bounds,
          gridSize,
          terrain,
          h.terrainAffinity,
          rng,
        );
        lat = moved.lat;
        lng = moved.lng;
        heading = moved.heading;
        break;
      }
    }
    path.push(latLngToCell(bounds, gridSize, lat, lng));
  }

  return { path, endLat: lat, endLng: lng };
}

// ---------------------------------------------------------------------------
// runWalks
// ---------------------------------------------------------------------------

/**
 * Run SIM.WALKS_PER_HYPOTHESIS Monte Carlo walks per active hypothesis
 * (weight >= 0.02, skip otherwise) and accumulate an UNNORMALIZED
 * gridSize x gridSize heatmap indexed [y][x], SW origin. Budget: at most
 * 600 walks (150/hypothesis x 4 hypotheses design point) x at most 96 steps.
 */
export function runWalks(
  caseDoc: Doc<"cases">,
  hypotheses: Doc<"hypotheses">[],
  tips: Doc<"tips">[],
  simClockMin: number,
  rng: () => number,
): number[][] {
  const gridSize = caseDoc.gridSize;
  const heatmap = emptyHeatmap(gridSize);
  const bounds: Bounds = {
    swLat: caseDoc.boundsSwLat,
    swLng: caseDoc.boundsSwLng,
    neLat: caseDoc.boundsNeLat,
    neLng: caseDoc.boundsNeLng,
  };
  const terrain = buildTerrainMap(caseDoc);

  const nSteps = clamp(Math.floor(simClockMin / SIM.WALK_STEP_SIM_MIN), 12, 96);
  const tailCount = Math.ceil(nSteps * 0.25);
  const tailStart = Math.max(0, nSteps - tailCount);

  // Tip conditioning: only tips with weight * credibility > 0.1 participate.
  const activeTips = tips.filter((t) => t.weight * t.credibility > 0.1);

  for (const h of hypotheses) {
    if (h.weight < 0.02) continue;
    const stepKm = h.mobilityKmH * (SIM.WALK_STEP_SIM_MIN / 60);
    let maxAffinity = 0;
    for (const v of Object.values(h.terrainAffinity)) {
      if (v > maxAffinity) maxAffinity = v;
    }

    for (let w = 0; w < SIM.WALKS_PER_HYPOTHESIS; w++) {
      const { path, endLat, endLng } = runOneWalk(
        caseDoc,
        h,
        terrain,
        maxAffinity,
        nSteps,
        stepKm,
        bounds,
        gridSize,
        rng,
      );

      let walkWeight = 1;
      for (const tip of activeTips) {
        const d = distanceKm(endLat, endLng, tip.lat, tip.lng);
        walkWeight *=
          1 + 2 * tip.credibility * tip.weight * Math.exp(-(d * d) / (2 * 0.6 * 0.6));
      }

      const depositBase = h.weight * walkWeight;
      const endpointCell = path[path.length - 1];
      heatmap[endpointCell.y][endpointCell.x] += depositBase * 1.0;

      // Tail = last 25% of steps (ceil), excluding the endpoint itself.
      for (let i = tailStart; i < path.length - 1; i++) {
        const c = path[i];
        heatmap[c.y][c.x] += depositBase * 0.15;
      }
    }
  }

  return heatmap;
}
