// OWNER: Person D (voice, scenario, demo). The authored demo world.
//
// The Mount Tamalpais search for Maya Chen: a hand-authored terrain overlay,
// a named landmark set the pitch driver speaks aloud, a hidden ground-truth
// location, and a self-scheduling scripted tip drip that converges on it with
// honest noise. "No payoff without ground truth" — this file IS the payoff.
//
// FROZEN: seedDemo's signature and its api.cases.seedCase call. We replace the
// DATA it passes, never the contract. cases.hiddenTrueLat/Lng is demo ground
// truth and must NEVER be rendered before cases.status === "found".
import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { latLngToCell, type Bounds, type Cell } from "./lib/geo";

// Mount Tamalpais, Marin County — the demo stage. ~6 x 6 km box.
// Cell (0,0) is the SOUTH-WEST corner; x increases east, y increases north.
const BOUNDS: Bounds = {
  swLat: 37.885,
  swLng: -122.65,
  neLat: 37.94,
  neLng: -122.58,
};
const GRID = 24;

// The last-known point: Pantoll trailhead, where Maya parked at 7am.
const PANTOLL = { lat: 37.9045, lng: -122.6045 };

// Where the Matt Davis trail fords the creek, below the fire-road junction —
// the trail-stream intersection Koester/Jacobs rate the hottest single spot.
// Trail/creek geometry anchors here (NOT on the hidden truth).
const TRAIL_FORD = { lat: 37.9182, lng: -122.6078 }; // -> cell (14, 14)

// Demo ground truth — one cell OFF-trail, creek-side, ~300m west of the
// ford: cell (13, 14). Deliberately NOT the hottest prior cell: with truth
// on the ford itself the first blind assignment finds her in ~35s (measured
// on cloud) before the tip arc even lands. Off-trail, the teams grind the
// hot trail cells first and it's the TIPS that pin her — which is the
// story: "the prior narrows it; the intel finds her."
const HIDDEN_TRUE = { lat: 37.9184, lng: -122.6112 }; // -> cell (13, 14)

// ---------------------------------------------------------------------------
// Terrain authoring. We author features as lat/lng polylines and rasterize
// them into CONNECTED cell runs via latLngToCell (never inline the grid math —
// docs/CONTRACTS.md). It does not need to be cartographically true; it needs
// to LOOK like terrain logic on B's heatmap: probability mass hugging the
// trails and spilling where the creek crosses them.
// ---------------------------------------------------------------------------
type LL = { lat: number; lng: number };
type Kind = "trail" | "road" | "water" | "steep";

// Walk a contiguous chain of cells between consecutive waypoints (inclusive),
// stepping one cell at a time so every run is unbroken on the grid.
function rasterize(pts: LL[]): Cell[] {
  const out: Cell[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = latLngToCell(BOUNDS, GRID, pts[i].lat, pts[i].lng);
    const b = latLngToCell(BOUNDS, GRID, pts[i + 1].lat, pts[i + 1].lng);
    let { x, y } = a;
    out.push({ x, y });
    while (x !== b.x || y !== b.y) {
      if (x !== b.x) x += Math.sign(b.x - x);
      if (y !== b.y) y += Math.sign(b.y - y);
      out.push({ x, y });
    }
  }
  return out;
}

// Each feature is a set of polylines rasterized to that terrain kind. Order in
// FEATURES matters: later features overwrite earlier ones where cells overlap,
// so water is applied last and "wins" at fords (the creek reads unbroken and
// the crossings pop). Steep/road sit east and south and never contend.
const FEATURES: { kind: Kind; lines: LL[][] }[] = [
  {
    // Matt Davis Trail: Pantoll LKP -> the fire-road junction -> north creek.
    // The spine of the search; the hidden location sits one cell off it.
    kind: "trail",
    lines: [
      [
        PANTOLL,
        { lat: 37.908, lng: -122.607 },
        { lat: 37.912, lng: -122.609 },
        { lat: 37.916, lng: -122.61 },
        TRAIL_FORD, // trail passes through the ford cell (14,14)
        { lat: 37.9195, lng: -122.6075 }, // fire-road junction, just uphill
        { lat: 37.922, lng: -122.607 }, // north creek
      ],
    ],
  },
  {
    // Steep Ravine Trail: drops SW from the junction down the ravine, plus the
    // Old Mine Trail branch reaching NW toward Rock Spring. Trail mass in NW.
    kind: "trail",
    lines: [
      [
        TRAIL_FORD,
        { lat: 37.916, lng: -122.611 },
        { lat: 37.9125, lng: -122.6135 },
        { lat: 37.908, lng: -122.617 },
      ],
      [
        { lat: 37.922, lng: -122.607 },
        { lat: 37.925, lng: -122.612 },
        { lat: 37.928, lng: -122.62 },
      ],
    ],
  },
  {
    // Panoramic Highway: the paved road hugging the south edge of the box.
    kind: "road",
    lines: [
      [
        { lat: 37.888, lng: -122.64 },
        { lat: 37.89, lng: -122.62 },
        { lat: 37.892, lng: -122.6 },
        { lat: 37.895, lng: -122.585 },
      ],
    ],
  },
  {
    // Steep faces east of the ridge — two parallel runs so it reads as a face,
    // not a line. Hiker affinity for "steep" is 0.3, so mass avoids it: the
    // heatmap stays west, where the trails and creek are.
    kind: "steep",
    lines: [
      [
        { lat: 37.92, lng: -122.596 },
        { lat: 37.912, lng: -122.592 },
        { lat: 37.904, lng: -122.589 },
        { lat: 37.898, lng: -122.587 },
      ],
      [
        { lat: 37.922, lng: -122.593 },
        { lat: 37.914, lng: -122.59 },
        { lat: 37.906, lng: -122.587 },
      ],
    ],
  },
  {
    // Steep Ravine creek: crosses the NW quadrant N->S and fords the trails
    // near the hidden location. Applied last, so the crossings win.
    kind: "water",
    lines: [
      [
        { lat: 37.928, lng: -122.62 },
        { lat: 37.926, lng: -122.616 },
        { lat: 37.922, lng: -122.612 },
        { lat: 37.918, lng: -122.61 }, // fords the trail just W of the hidden cell
        { lat: 37.9125, lng: -122.6135 },
        { lat: 37.908, lng: -122.615 },
      ],
    ],
  },
];

function buildTerrainCells(): { x: number; y: number; kind: Kind }[] {
  const byCell = new Map<string, Kind>();
  for (const feature of FEATURES) {
    for (const line of feature.lines) {
      for (const cell of rasterize(line)) {
        byCell.set(`${cell.x},${cell.y}`, feature.kind);
      }
    }
  }
  return [...byCell.entries()].map(([key, kind]) => {
    const [x, y] = key.split(",").map(Number);
    return { x, y, kind };
  });
}

// The exact strings the driver SAYS on stage. Person C's landmark resolver
// matches on substring, so keep them short and speakable. "north creek",
// "pantoll lot", and "east ridge" are frozen (voice commands already resolve
// against them); the rest are named for what the pitch will actually say.
const LANDMARKS = [
  { name: "pantoll lot", lat: PANTOLL.lat, lng: PANTOLL.lng },
  { name: "north creek", lat: 37.922, lng: -122.607 },
  { name: "east ridge", lat: 37.91, lng: -122.59 },
  { name: "fire road junction", lat: 37.9195, lng: -122.6075 },
  { name: "waterfall", lat: 37.9125, lng: -122.6135 },
  { name: "steep ravine", lat: 37.908, lng: -122.617 },
  { name: "rock spring", lat: 37.928, lng: -122.62 },
  { name: "panoramic highway", lat: 37.892, lng: -122.6 },
];

export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const caseId: unknown = await ctx.runMutation(api.cases.seedCase, {
      name: "Maya Chen, 34",
      subjectFacts:
        "Day hiker, solo. Parked at Pantoll lot 7am. No overnight gear. " +
        "Phone last pinged 9:41am. Weather clear, cooling after sunset.",
      lastKnownLat: PANTOLL.lat,
      lastKnownLng: PANTOLL.lng,
      boundsSwLat: BOUNDS.swLat,
      boundsSwLng: BOUNDS.swLng,
      boundsNeLat: BOUNDS.neLat,
      boundsNeLng: BOUNDS.neLng,
      gridSize: GRID,
      terrainCells: buildTerrainCells(),
      landmarks: LANDMARKS,
      // Maya is a known day hiker: only hiker-derived hypotheses apply —
      // mobile hiker vs. injured/immobile hiker. Dementia/child would be
      // wrong for this subject and must not pollute the panel or the sim.
      profiles: ["hiker", "injured"],
      // Ground truth. The UI must never render this before the found moment.
      hiddenTrueLat: HIDDEN_TRUE.lat,
      hiddenTrueLng: HIDDEN_TRUE.lng,
      teams: [
        // Alpha staged at the Panoramic pullout SOUTH of the LKP (not on it):
        // stage pacing — teams starting on top of the hot trail cells can
        // reach the truth cell before the tip arc even lands (measured 35s
        // hands-off found on 2026-07-18, vs the 60-100s stage window).
        { name: "Team Alpha", lat: 37.8985, lng: -122.6035 },
        { name: "Team Bravo", lat: 37.9, lng: -122.62 },
        { name: "Team Charlie", lat: 37.912, lng: -122.585 },
      ],
      // --- PACING KNOBS (Person D tunes) ---
      // minutesPerTick scales how much sim-time each ~1.5s fast-clock tick
      // advances; higher = the heatmap spreads and teams cover ground faster,
      // so the found moment lands sooner. Against main's stub the tick only
      // advances the clock (no walker/planner/found check), so this just makes
      // the clock READ sensibly: 3h missing at open, ~+4 sim-hours over 90s.
      // TUNE at integration (Task 5): with Person A's real engine, target
      // hands-off Run->found at 75-100s. Too early -> lower toward 3; too late
      // -> raise toward 6. Retime after every engine change.
      minutesPerTick: 2, // 4 -> 35s found, 3 -> 46s; 2 targets the 60-90s stage window (cloud ~1.6s/tick)
      initialSimMin: 180, // already missing 3 hours at case open
    });
    return caseId as import("./_generated/dataModel").Id<"cases">;
  },
});

// ---------------------------------------------------------------------------
// Scripted tip drip. A self-scheduling chain (same pattern as A's tick) that
// injects authored tips through the ONE legal entrypoint, api.tips.addTip, so
// each fires the event clock (internal.intel.onNewTip) exactly like a live
// tip. The arc: vague trail sighting -> dog-walker near the junction ->
// credible creek-side sighting (one hypothesis pulls ahead) -> one deliberate
// red herring far south with an impossible story (Person C's judge scores it
// low) -> a final tight corroboration near, but never on, the truth.
//
// Honest noise: every tip lands 100-400m off HIDDEN_TRUE, never on it, so the
// found moment is still a reveal.
// ---------------------------------------------------------------------------
type ScriptedTip = {
  afterSec: number; // delay before this tip, measured from the previous one
  text: string;
  lat: number;
  lng: number;
  observedAtSimMinOffset: number; // sim-minutes before "now" the sighting was
  source: string;
};

// Cumulative wall-clock (afterSec summed): 4, 13, 25, 37, 48, 60s — the last
// authored tip lands ~60s in, before the 75-100s found window.
export const TIP_SCRIPT: ScriptedTip[] = [
  {
    afterSec: 4,
    text: "Trail runner thinks she passed a woman in a red jacket heading uphill on Matt Davis, maybe 90 minutes ago. Wasn't sure.",
    lat: 37.9155,
    lng: -122.6095, // ~330m SW of truth, on the trail
    observedAtSimMinOffset: 90,
    source: "scripted",
  },
  {
    afterSec: 9,
    text: "Dog-walker reports a hiker resting near the fire-road junction about an hour ago; didn't look distressed.",
    lat: 37.92,
    lng: -122.6072, // ~200m N of truth, at the junction
    observedAtSimMinOffset: 60,
    source: "scripted",
  },
  {
    afterSec: 8,
    // RED HERRING, deliberately EARLY (cumulative ~21s) so the judge's
    // discount is visible on stage BEFORE the found moment (~45-60s) —
    // measured runs finish before a late herring would land. Implausible on
    // purpose: 3km downhill in 10 minutes on foot.
    text: "Gas-station clerk on Panoramic Highway swears a woman just like Maya bought water 10 minutes ago — but that's over 3km downhill from her last position.",
    lat: 37.892,
    lng: -122.6, // far south, ~3km off truth
    observedAtSimMinOffset: 10,
    source: "scripted",
  },
  {
    afterSec: 10,
    text: "911 caller heard someone calling for help down by the creek crossing roughly 40 minutes ago.",
    lat: 37.9178,
    lng: -122.6103, // ~120m SE of truth, at the creek ford
    observedAtSimMinOffset: 40,
    source: "scripted",
  },
  {
    afterSec: 10,
    text: "Two backpackers saw a woman matching Maya sitting off-trail near the creek below the junction, favoring one ankle, about 25 minutes ago.",
    lat: 37.917,
    lng: -122.6092, // ~230m SE of truth — the credible one, hiker pulls ahead
    observedAtSimMinOffset: 25,
    source: "scripted",
  },
  {
    afterSec: 10,
    text: "Team Alpha radios a fresh boot print and a dropped water bottle just west of the creek crossing, minutes old.",
    lat: 37.9192,
    lng: -122.6098, // ~150m NE of truth — final tight corroboration
    observedAtSimMinOffset: 15,
    source: "scripted",
  },
];

// Public: the demo driver clicks "Start scripted tips" once. Kicks off the
// self-scheduling chain at index 0.
export const startDrip = mutation({
  args: { caseId: v.id("cases") },
  handler: async (ctx, { caseId }) => {
    if (TIP_SCRIPT.length === 0) return;
    await ctx.scheduler.runAfter(
      TIP_SCRIPT[0].afterSec * 1000,
      internal.scenario.dripNext,
      { caseId, index: 0 },
    );
  },
});

// Internal: fire tip[index] through addTip, then schedule the next. Stops when
// the case is found or the script is exhausted.
export const dripNext = internalMutation({
  args: { caseId: v.id("cases"), index: v.number() },
  handler: async (ctx, { caseId, index }) => {
    if (index >= TIP_SCRIPT.length) return;
    const theCase = await ctx.db.get(caseId);
    if (!theCase || theCase.status === "found") return; // payoff reached; stop

    const sim = await ctx.db
      .query("simState")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .unique();
    const clock = sim?.simClockMin ?? 0;

    const tip = TIP_SCRIPT[index];
    await ctx.runMutation(api.tips.addTip, {
      caseId,
      text: tip.text,
      lat: tip.lat,
      lng: tip.lng,
      // Map the authored "minutes before now" offset onto the live sim clock so
      // A's tip aging and C's judge see a realistic observation time.
      observedAtSimMin: Math.max(0, clock - tip.observedAtSimMinOffset),
      source: tip.source,
    });

    const next = index + 1;
    if (next < TIP_SCRIPT.length) {
      await ctx.scheduler.runAfter(
        TIP_SCRIPT[next].afterSec * 1000,
        internal.scenario.dripNext,
        { caseId, index: next },
      );
    }
  },
});

// Public: wipe the world back to the "Open demo case" splash. For rehearsals
// and between-pitch resets; deletes every row of every demo table. Pending
// scheduled ticks/drips self-terminate on their missing-row guards.
export const resetDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "commands",
      "tips",
      "grids",
      "teams",
      "hypotheses",
      "simState",
      "cases",
    ] as const;
    for (const table of tables) {
      for (const row of await ctx.db.query(table).collect()) {
        await ctx.db.delete(row._id);
      }
    }
  },
});
