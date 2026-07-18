// ============================================================
// FROZEN CONTRACT — Koester/ISRID lost-person-behavior profiles.
// Sources:
//  - Find-distance percentiles (km from last-known point, temperate/
//    mountainous): Koester's LPB tables, as distributed in
//    jfweleber/WiSAR-Terrain-Aware-Range-Rings (LPB_DATA) and
//    devclinton/searchparty (MIT, lpb_data.py).
//  - Behavior mix: Hashimoto et al., Sci Reports 2022 agent-based model
//    (ahashimoto13/2022LostPersonModelPython). Hiker weights are the
//    paper's fitted values; other profiles are our reasoned estimates
//    in the same 6-behavior vocabulary — say so if asked.
//  - Terrain attractors: Jacobs (2015), via the range-rings repo.
// Note: ~1 in 4 real finds fall OUTSIDE the p75 ring. Never clip the
// heatmap at p75.
// ============================================================

export type BehaviorWeights = {
  randomWalk: number;
  routeTravel: number;
  directionTravel: number;
  stayPut: number;
  viewEnhance: number;
  backtrack: number;
};

export type TerrainAffinity = {
  trail: number;
  road: number;
  water: number;
  steep: number;
  open: number;
};

export type Profile = {
  key: "hiker" | "dementia" | "child" | "injured";
  label: string;
  // km from IPP: [p25, p50, p75, p95]
  findDistanceKm: [number, number, number, number];
  mobilityKmH: number;
  behaviorWeights: BehaviorWeights;
  terrainAffinity: TerrainAffinity;
  blurb: string; // one-liner for the reasoning panel / agent prompts
};

export const PROFILES: Record<Profile["key"], Profile> = {
  hiker: {
    key: "hiker",
    label: "Hiker",
    findDistanceKm: [1.13, 3.06, 5.79, 14.4],
    mobilityKmH: 3.0,
    // Hashimoto 2022 fitted hiker distribution.
    behaviorWeights: {
      randomWalk: 0.055,
      routeTravel: 0.377,
      directionTravel: 0.559,
      stayPut: 0.003,
      viewEnhance: 0.006,
      backtrack: 0.0,
    },
    terrainAffinity: { trail: 6.0, road: 5.0, water: 2.5, steep: 0.3, open: 1.0 },
    blurb: "Follows trails and roads; travels far; stays on linear features.",
  },
  dementia: {
    key: "dementia",
    label: "Dementia",
    findDistanceKm: [0.32, 0.8, 1.93, 6.4],
    mobilityKmH: 1.5,
    // Estimate: travels in one direction regardless of terrain until stuck.
    behaviorWeights: {
      randomWalk: 0.1,
      routeTravel: 0.05,
      directionTravel: 0.75,
      stayPut: 0.1,
      viewEnhance: 0.0,
      backtrack: 0.0,
    },
    terrainAffinity: { trail: 1.0, road: 1.0, water: 1.5, steep: 0.5, open: 1.0 },
    blurb: "Straight-line travel, ignores terrain, short range, gets stuck.",
  },
  child: {
    key: "child",
    label: "Child (7–12)",
    findDistanceKm: [0.8, 1.61, 3.22, 5.0],
    mobilityKmH: 2.0,
    // Estimate: wanders, follows features, shelters, drawn to water.
    behaviorWeights: {
      randomWalk: 0.25,
      routeTravel: 0.3,
      directionTravel: 0.15,
      stayPut: 0.2,
      viewEnhance: 0.05,
      backtrack: 0.05,
    },
    terrainAffinity: { trail: 2.0, road: 2.0, water: 3.0, steep: 0.4, open: 1.0 },
    blurb: "Short range, wanders, drawn to water and shelter, may hide.",
  },
  injured: {
    key: "injured",
    label: "Injured / despondent",
    findDistanceKm: [0.32, 1.13, 3.22, 6.0],
    mobilityKmH: 0.8,
    // Estimate: mostly immobile after an initial short move.
    behaviorWeights: {
      randomWalk: 0.05,
      routeTravel: 0.15,
      directionTravel: 0.1,
      stayPut: 0.7,
      viewEnhance: 0.0,
      backtrack: 0.0,
    },
    terrainAffinity: { trail: 4.0, road: 3.0, water: 2.0, steep: 0.2, open: 1.0 },
    blurb: "Short initial move then stationary; near features, low mobility.",
  },
};

// Jacobs (2015) terrain-attractor multipliers (relative probability density).
// Stream-trail intersections are the hottest single feature class.
export const TERRAIN_ATTRACTORS = {
  trailStreamIntersection: 7.0,
  trailOrRoad: 5.5,
  lowElevationPocket: 3.5,
  stream: 2.75,
  highProminence: 1.75,
  baseline: 1.0,
};

// Shared simulation constants (Person A consumes; others read, never edit).
export const SIM = {
  TICK_MS: 1500,
  WALKS_PER_HYPOTHESIS: 150,
  WALK_STEP_SIM_MIN: 5, // each walk step = 5 simulated minutes of movement
  POD: 0.6, // probability of detection when a team searches a cell
  TIP_HALF_LIFE_SIM_MIN: 120, // tip weight halves every 2 sim-hours
};
