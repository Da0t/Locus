# PERSON A — Simulation Core

**Mission:** replace the stub tick with the real engine: profile-biased
Monte Carlo walker → probability heatmap → team movement & search → greedy
planner → found check. You are the heart of the demo: when you're done,
the map moves on its own and tightens around the truth.

**Branch:** `person-a-sim`.
**You own:** `convex/sim.ts`, `convex/planner.ts`, `convex/cases.ts`,
`convex/tips.ts`, `convex/teams.ts` (+ new files under `convex/` prefixed
`sim`, e.g. `convex/simWalker.ts`).
**Never touch:** `convex/schema.ts`, `convex/profiles.ts`,
`convex/lib/**`, `src/**` except to read, `convex/intel.ts`,
`convex/commands.ts`, `convex/scenario.ts`.
**Before coding:** read `docs/CONTRACTS.md`, `convex/profiles.ts`,
`convex/lib/geo.ts`, and `convex/_generated/ai/guidelines.md`.

Setup: `npm install && npx convex dev` (terminal 1, local mode is fine),
`npm run dev` (terminal 2). Open the app → **Open demo case → Run**. The
stub clock ticks. Everything below happens inside that running world.

Global constraints (from CONTRACTS §4): one `simState` write per tick;
grid rows patched only when they change; no LLM calls anywhere in your
code; budget ≤ 600 walks × ≤ 96 steps; tick body must stay well under 1s.
Use a seeded PRNG (mulberry32, seed = `tick * 2654435761 % 2^32`) so a
given tick is reproducible when debugging — never `Math.random()`.

---

## Task 1 — Walker module (`convex/simWalker.ts`, pure functions)

Write `runWalks(caseDoc, hypotheses, tips, simClockMin, rng): number[][]`
returning an UNNORMALIZED heatmap. Pure math, no ctx — unit-testable.

1. Build a terrain lookup once: `Map<"x,y", kind>` from
   `caseDoc.terrainCells`; missing = `"open"`.
2. For each hypothesis `h` (skip if `h.weight < 0.02`): run
   `SIM.WALKS_PER_HYPOTHESIS` walks. Each walk:
   - Start at the last-known point. Persistent state: `heading` (initial
     uniform 0–360°), `prevCell` (for backtrack).
   - Steps: `nSteps = clamp(floor(simClockMin / SIM.WALK_STEP_SIM_MIN), 12, 96)`.
   - Per step, draw a behavior from `h.behaviorWeights` (cumulative
     sampling). Step length `stepKm = h.mobilityKmH * (SIM.WALK_STEP_SIM_MIN / 60)`.
     - `stayPut` / `viewEnhance`: don't move (viewEnhance may jitter ±30°
       heading).
     - `directionTravel`: keep `heading` ± uniform(−15°, +15°).
     - `backtrack`: reverse heading (±180° ± 20°).
     - `randomWalk`: new uniform heading.
     - `routeTravel`: pick among 8 candidate bearings (heading + k·45°),
       weighted by `h.terrainAffinity[kindOf(destination cell)]` — use
       affinity² for routeTravel so linear features really capture walks;
       plain affinity weighting for the direction chosen by randomWalk /
       directionTravel (i.e. terrain still nudges every moving behavior:
       compute destination for the chosen bearing, then accept it with
       probability proportional to affinity vs. the best candidate —
       one retry is enough, don't over-engineer).
   - Move via `movePoint`, clamp into bounds (reflect heading on hitting
     an edge). Track the walk's cell path tail (last 25% of steps).
3. **Tip conditioning (importance weighting).** For each walk compute
   `walkWeight = 1`; for each tip with `weight * credibility > 0.1`:
   `d = distanceKm(walkEndpoint, tip)`;
   `walkWeight *= 1 + 2 * tip.credibility * tip.weight * exp(-(d*d) / (2 * 0.6²))`.
   (Endpoint-only is fine; path-proximity is a stretch.)
4. Deposit into the heatmap: endpoint cell gets
   `h.weight * walkWeight * 1.0`; each tail cell gets
   `h.weight * walkWeight * 0.15`.
5. Return the accumulated `number[gridSize][gridSize]` (`[y][x]`, SW
   origin — use `latLngToCell` from `convex/lib/geo.ts`).

Acceptance: with the stub scenario, log a few runs — probability mass
should visibly hug the trail cells for the hiker hypothesis and stay
tight for dementia/injured.

## Task 2 — Real tick (`convex/sim.ts`, replace the stub body only)

Keep the query/`setRunning`/reschedule rails EXACTLY as they are. New body:

1. Load case (bail if `status !== "active"`), hypotheses, tips, grids,
   teams.
2. Advance clock (as the stub does). Age tips:
   `weight = 0.5^(minutesSinceObserved / SIM.TIP_HALF_LIFE_SIM_MIN)` where
   `minutesSinceObserved = simClockMin - observedAtSimMin` — recompute,
   patch a tip row only if it changed by > 0.05 (bounded writes).
3. `radiusKm` = weighted mean over hypotheses of
   `min(p95Km, mobilityKmH * simClockMin / 60)` (percentiles from
   `PROFILES[profile].findDistanceKm`).
4. Run the walker (Task 1).
5. **Searched-cell suppression:** for each searched grid row multiply that
   heatmap cell by `(1 - SIM.POD)`. Claimed-but-unsearched: no change.
6. Smooth (3×3 box, one pass) and normalize max → 1. Patch `simState`
   ONCE with `{tick, simClockMin, radiusKm, heatmap}`.
7. Team movement & search (Task 3), planner (Task 4), found check (Task 5)
   — all inside the same mutation, writes batched per changed row.

## Task 3 — Team movement & search

Teams are simulated field units (the demo runs hands-off; humans can also
claim manually via B's UI — same fields).

- `enroute`: move `teamSpeedKmH (3) * minutesPerTick / 60` km toward the
  assigned cell center (`bearingDeg` + `movePoint`); on arrival (< 0.1 km)
  → `searching`, remember arrival tick in-memory via distance ≈ 0 check.
- `searching`: after 2 consecutive ticks in the cell → mark the grid row
  `{searched: true, searchedAtTick: tick, claimedBy: undefined}`, team →
  `{status: "idle", assignedGridId: undefined}`.
- Patch team rows every tick (positions change — that's fine, ~3 rows).

## Task 4 — Greedy planner (`convex/planner.ts`)

Implement `assignTeams(ctx, caseId, heatmap)` and call it from the tick:

1. Candidates: unsearched, unclaimed cells.
   `score = heatmap[y][x] * (1 + 0.02 * ticksSinceLastSearchAnywhereNearby)`
   — simplest honest staleness: `1 + 0.02 * (tick - (searchedAtTick of the
   nearest searched cell, else 0))`; if that's fiddly, plain
   `score = heatmap[y][x]` first, staleness second.
2. For each `idle` team, assign the highest-score cell, tie-broken by
   distance (nearest wins); skip cells claimed by ANY team (planner must
   respect human claims from B's UI); write `grids.claimedBy` +
   `teams.assignedGridId/status = "enroute"`.
3. Never reassign `enroute`/`searching` teams (stability beats optimality
   on stage).

## Task 5 — Found check

After search marking: if a newly searched cell ==
`latLngToCell(bounds, gridSize, hiddenTrueLat, hiddenTrueLng)` →
`simState.foundAtTick = tick`, `cases.status = "found"`, `running = false`.
Do NOT reveal coordinates anywhere else. B renders the moment.

## Task 6 — Verify the arc, then tune

Full run: seed → run → watch. Expected: heatmap blooms outward, hugs
trails, tips (D's drip or console-typed "we saw her near the north creek")
visibly pull mass, teams sweep high-probability cells, found fires within
a demo-length run. Tune deposit weights / smoothing / tail fraction until
the arc reads clearly at the map. Then run the contention check: two
browser tabs, claim the same cell simultaneously, exactly one wins and the
loser gets the error.

## Definition of done

- Tick sustains 1.5s cadence with 576 cells, 4 hypotheses, 10+ tips.
- Pause/resume from console commands works (C's `applyIntent` flips
  `running`; your rails already handle the rest).
- A typed tip visibly moves the heatmap within 2 ticks.
- Found moment fires on the stub scenario.
- `npx convex dev --once && npm run lint` clean; committed + pushed.
