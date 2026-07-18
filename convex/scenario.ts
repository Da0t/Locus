// OWNER: Person D (voice, scenario, demo). The authored demo world.
// STUB on main: a minimal Mount Tamalpais scenario so every branch has data
// on day one. Person D replaces this with the full authored scenario per
// plans/PERSON_D.md (rich terrain, landmark set, scripted tip drip that
// converges on the hidden true location).
import { mutation } from "./_generated/server";
import { api } from "./_generated/api";

// Mount Tamalpais, Marin County — the demo stage. ~6 x 6 km box.
const BOUNDS = { swLat: 37.885, swLng: -122.65, neLat: 37.94, neLng: -122.58 };
const GRID = 24;

export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const caseId: unknown = await ctx.runMutation(api.cases.seedCase, {
      name: "Maya Chen, 34",
      subjectFacts:
        "Day hiker, solo. Parked at Pantoll lot 7am. No overnight gear. " +
        "Phone last pinged 9:41am. Weather clear, cooling after sunset.",
      lastKnownLat: 37.9045,
      lastKnownLng: -122.6045,
      boundsSwLat: BOUNDS.swLat,
      boundsSwLng: BOUNDS.swLng,
      boundsNeLat: BOUNDS.neLat,
      boundsNeLng: BOUNDS.neLng,
      gridSize: GRID,
      // TODO(Person D): author the real overlay — trail polylines as cell
      // runs, the creek, steep faces. This placeholder is one trail + creek.
      terrainCells: [
        ...[...Array(10)].map((_, i) => ({ x: 6 + i, y: 12, kind: "trail" as const })),
        ...[...Array(8)].map((_, i) => ({ x: 14, y: 12 + i, kind: "water" as const })),
      ],
      landmarks: [
        { name: "north creek", lat: 37.922, lng: -122.607 },
        { name: "pantoll lot", lat: 37.9045, lng: -122.6045 },
        { name: "east ridge", lat: 37.91, lng: -122.59 },
      ],
      // Ground truth. The UI must never render this before the found moment.
      hiddenTrueLat: 37.9185,
      hiddenTrueLng: -122.6065,
      teams: [
        { name: "Team Alpha", lat: 37.9045, lng: -122.6045 },
        { name: "Team Bravo", lat: 37.9, lng: -122.62 },
        { name: "Team Charlie", lat: 37.912, lng: -122.585 },
      ],
      minutesPerTick: 4, // 90s of demo ≈ 4 sim-hours
      initialSimMin: 180, // already missing 3 hours at case open
    });
    return caseId;
  },
});

// TODO(Person D): scripted tip drip — a self-scheduling chain that injects
// authored tips (with honest noise, trending toward the hidden location) at
// demo-friendly intervals. See plans/PERSON_D.md §3.
