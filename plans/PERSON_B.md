# PERSON B — Map & UI

**Mission:** make the live world legible and beautiful: heatmap, terrain,
grid states, moving teams, the radius ring, the claim interaction (our
contention demo beat), the reasoning panel, and the found moment. Judges
experience the whole project through your screen.

**Branch:** `person-b-map`.
**You own:** `src/App.tsx`, `src/components/**` EXCEPT
`src/components/voice/**` (Person D), `src/index.css`.
**Never touch:** anything under `convex/` (read freely — especially
`convex/lib/geo.ts`, which is your only coordinate math), or
`src/components/voice/**` (keep the `<CommandConsole />` slot mounted).
**Before coding:** read `docs/CONTRACTS.md` and skim `convex/schema.ts`.

Setup: `npm install && npx convex dev` (local mode fine) + `npm run dev`.
Put `VITE_MAPBOX_TOKEN=pk.…` in `.env.local`. **Open demo case → Run** —
the stub world ticks, so you develop against live-updating (if uniform)
data from minute one. A tip you type into the console lands in the tips
table; use it to test markers before Person A's engine exists.

Data you render (all via `useQuery`, all already exposed):
`api.cases.active`, `api.sim.state` (heatmap `[y][x]`, SW origin, max=1),
`api.cases.hypotheses`, `api.tips.list`, `api.teams.list`,
`api.teams.gridStates` (only searched/claimed rows come over the wire).

---

## Task 1 — Command-center look

Dark theme by default: map style `mapbox://styles/mapbox/dark-v11`
(terrain legibility matters less than mood; `outdoors-v12` is the
fallback if dark reads badly at the demo zoom). Tighten the shell in
`App.tsx`: monospace accents for numbers, uppercase micro-labels,
red/amber accent palette. This is a SAR ops room, not a dashboard SaaS.

## Task 2 — Map layers (build in this order)

All polygons from `cellPolygon`, centers from `cellCenter` — never inline
the math. One `<Source>` per concern:

1. **Terrain overlay** (from `activeCase.terrainCells`): fill layer,
   trail = tan, road = gray, water = blue, steep = dark hatch feel via low
   opacity (0.25). Static — memoize the GeoJSON.
2. **Heatmap** — already wired on `main`. Tune the color ramp
   (`heatmap-color` interpolate: transparent → deep red → amber → white
   core) and radius so single hot cells read at zoom 12.
3. **Grid state** (from `gridStates`): searched cells = desaturated fill
   (0.35 opacity gray-blue, "cleared"); claimed cells = colored 2px
   outline per team (stable team→color map by index).
4. **Last-known point**: pulsing marker (CSS keyframe) + label.
5. **Radius ring** from `sim.radiusKm`: polygon via `movePoint` at 64
   bearings around the LKP; thin dashed line layer. It visibly grows —
   free "the world is alive" signal.
6. **Tips** (from `api.tips.list`): small diamond markers, opacity =
   `tip.weight` (they visibly age), tooltip with text + credibility.
7. **Teams**: `<Marker>` per team with smooth motion
   (`transition: transform 1.4s linear` — just under tick cadence), status
   glyph (idle ○ / enroute ▸ / searching ◉) + name chip.

## Task 3 — The claim interaction (contention beat)

- Click a team chip to select it; click a grid cell →
  `teams.claimGrid({teamId, x, y})` (cell from `latLngToCell` of the map
  click lng/lat).
- On success: outline appears (reactivity does this for free).
- **On error: show the thrown message as a prominent toast** — "Cell
  already claimed by another team" IS the demo line when two tabs race.
  Never swallow it. A 20-line toast is fine; no new deps.

## Task 4 — Reasoning panel & tips feed

Upgrade the stub panel: sort by weight, animate bar width AND row reorder
(600ms), flash a row briefly when `updatedAt` changes (that flash = "the
LLM just reasoned" on stage), leader gets the accent border. Below the
hypotheses: compact tips feed, newest first, credibility as small meter,
so C's judge scores are visible. Keep D's console slot untouched at the
bottom of the sidebar.

## Task 5 — The found moment

When `activeCase.status === "found"` (poll nothing — reactivity hands it
to you): drop a marker at `hiddenTrueLat/Lng` (ONLY now — never render it
before, see CONTRACTS), `flyTo` it (zoom ~14, 2s), full-screen overlay
strip: "SUBJECT LOCATED — T+{h}h{m} — grid ({x},{y})" with the elapsed
time from `sim.simClockMin`. Make this beat unmissable from the back of
the room. Add a small "prediction match" line if cheap: probability rank
of the found cell at find time (read it from the heatmap — top-N% text).

## Task 6 — Stage polish pass

- Type scale up: the demo projects at distance. Status bar numbers big.
- Loading states: never a blank white flash (dark background from html up).
- A second browser tab open side-by-side must stay in perfect sync with
  zero work from you — verify, that's a pitch line.
- 30-minute timebox, then stop polishing.

## Definition of done

- All seven layers render against the stub world; heatmap updates each
  tick without flicker (declarative `data` prop, no manual map mutation).
- Claim flow works two-tabs-racing with a visible loser toast.
- Found moment fires end-to-end on the stub scenario (ask A or force
  `status` via dashboard if A isn't merged yet).
- `npm run lint` clean; committed + pushed on `person-b-map`.
