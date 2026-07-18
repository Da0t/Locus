<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# LOCUS

Voice-driven SAR command center (Voice Coding Hackathon). LLM hypothesis
agents (Koester lost-person profiles) re-weight on incoming tips, a Monte
Carlo simulation turns them into a live probability heatmap and search-team
assignments, and the coordinator drives it by voice. Decision support for
trained searchers — never claim it "finds people on its own."

## Architecture invariant

**The LLM reasons, math does the searching, voice drives it.** Two clocks:

- **Fast clock** (`convex/sim.ts` tick, self-scheduling every 1.5s): pure
  math — tip aging, Monte Carlo walker (`convex/simWalker.ts`), searched-cell
  suppression, planner (`convex/planner.ts`), found check. ONE `simState`
  write per tick. **No LLM calls in the tick, ever.**
- **Event clock** (`convex/intel.ts`): LLM reasoning fires only on new tips
  and console commands, debounced 10s. All calls ride the Respan gateway
  (`convex/agents/client.ts`); regex `fallbackParse` is the seatbelt — keep it.

## Rules that override defaults

- `docs/CONTRACTS.md` is the law: frozen schema (`convex/schema.ts`),
  Koester constants (`convex/profiles.ts`), grid math (`convex/lib/geo.ts` —
  never inline cell↔lat/lng conversions), and the intent vocabulary
  (`convex/lib/contracts.ts`).
- Heatmap is `[y][x]`, cell (0,0) = south-west corner, normalized max = 1.
- `tips.addTip` is the only tip entrypoint; it schedules `intel.onNewTip`.
- `cases.hiddenTrueLat/Lng` is demo ground truth — never render it before
  `cases.status === "found"`.
- Pinned deps: `ai@^6` + `@ai-sdk/openai@^3` (what `@convex-dev/agent`
  v0.6 supports). Don't bump majors casually.
- react-map-gl v8: import from `react-map-gl/mapbox`; the click event type
  is `MapMouseEvent` (not v7's `MapLayerMouseEvent`).
- No `Co-Authored-By` trailers in commits.

## Run

```bash
npx convex dev     # terminal 1 (anonymous local works: no account needed)
npm run dev        # terminal 2
```

`.env.local`: `VITE_MAPBOX_TOKEN`. Backend env (`npx convex env set`):
`RESPAN_API_KEY`, optional `RESPAN_BASE_URL` (default
`https://api.respan.ai/api/`), `RESPAN_MODEL`. Without a key the app still
runs — intent parsing degrades to regex, hypothesis weights stay static.

Demo flow: **Open demo case → Run** (Mt. Tam scenario seeds itself; drip +
run-of-show in `docs/DEMO.md`). Verify with `npm run lint` and
`npx convex dev --once`; both must be clean before pushing.

## History

Built from four parallel branches (`person-a-sim`, `person-b-map`,
`person-c-intel`, `person-d-voice` — plans in `plans/`), merged A→B→C→D.
Post-hack work happens on `main`.
