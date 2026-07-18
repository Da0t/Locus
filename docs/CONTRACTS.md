# CONTRACTS — read before writing code

Four people build in parallel on four branches and merge in the final hour.
This works only if the seams are frozen. This file is the seams.

## 1. File ownership

Work ONLY in files you own. Creating new files inside your area is fine.
Reading anyone's code is fine. Editing someone else's file is not — if you
need something changed there, ping its owner in the team chat.

| Area | Files | Owner |
|---|---|---|
| Shared, FROZEN | `convex/schema.ts`, `convex/profiles.ts`, `convex/lib/**`, `docs/**`, `package.json` | change = team decision, applied to `main` by the integrator, everyone merges `main` immediately |
| Sim core | `convex/sim.ts`, `convex/planner.ts`, `convex/cases.ts`, `convex/tips.ts`, `convex/teams.ts` | **A** |
| Map & UI | `src/App.tsx`, `src/components/**` (except `voice/`), `src/index.css` | **B** |
| Intelligence | `convex/intel.ts`, `convex/commands.ts`, `convex/convex.config.ts` (C creates), `convex/agents/**` | **C** |
| Voice + scenario + demo | `src/components/voice/**`, `convex/scenario.ts`, `docs/DEMO.md` | **D** |
| Generated | `convex/_generated/**`, `package-lock.json` | machine-owned; regenerate, never hand-edit; merge conflicts → regenerate |

`main` ships with a **working stub** in every owned file. You replace your
stub's internals; the signatures are the contract and do not change.

## 2. Interface contracts (the seams)

### Grid geometry
- Square grid, `gridSize × gridSize` (demo: 24), over `cases.bounds*`.
- Cell `(0,0)` is the **south-west** corner. `heatmap` is indexed `[y][x]`.
- ALL cell↔lat/lng math goes through `convex/lib/geo.ts`. Never inline it.

### Heatmap (A → B)
- `simState.heatmap: number[gridSize][gridSize]`, normalized so max = 1.
- A writes it once per tick (single doc write). B renders it. Nobody else
  reads or writes it.

### Tips (C, D → A → C)
- `tips.addTip` (public mutation, Person A's file) is the ONLY way a tip
  enters the system. C's intent dispatch and D's scripted drip both call it.
- `addTip` schedules `internal.intel.onNewTip` — that is the **event
  clock**: LLM reasoning fires on tips and commands, NEVER per tick.
- A's tick ages `tips.weight` (half-life `SIM.TIP_HALF_LIFE_SIM_MIN`).
  C owns `tips.credibility` (judge score, default 0.5). A consumes both.

### Hypotheses (C → A → B)
- C writes `weight` (normalized: the four sum to 1), `reasoning`,
  `behaviorWeights`, `terrainAffinity`, `mobilityKmH`, `updatedAt`.
- A's next tick consumes them blindly. B renders them. A never writes them.

### Commands (D → C → A)
- Console submits raw text via `commands.submit` (C's file).
- C parses to an `Intent` (`convex/lib/contracts.ts` — the FROZEN
  vocabulary) and applies it via `intel.applyIntent`, which calls A's
  mutations. C sets `commands.response` — the read-back D displays.
- New intent type needed → team decision, added to `contracts.ts` on `main`.

### Claims / contention (B → A)
- Human claim: `teams.claimGrid` throws on a lost race — B shows the error
  as a toast (that IS the demo beat, don't swallow it).
- A's planner writes the same `grids.claimedBy` / `teams.assignedGridId`
  fields and must skip human-claimed cells.

### Found (A → B, D)
- A's tick detects a searched cell containing the hidden true location:
  sets `simState.foundAtTick`, `cases.status = "found"`, stops the sim.
- B renders the found moment. D scripts the path to it. `hiddenTrueLat/Lng`
  is NEVER rendered before `status === "found"`.

### Sim clock
- `simState.simClockMin` = simulated minutes since last seen;
  `minutesPerTick` is the demo-pacing knob (D tunes it). Real wall-clock
  (`Date.now()`) is only for `updatedAt`-style bookkeeping, never sim logic.

## 3. Git protocol

- Branch from `main`: `person-a-sim`, `person-b-map`, `person-c-intel`,
  `person-d-voice`. Your plan lives at `plans/PERSON_X.md` on your branch.
- Commit small, push often (a broken pushed branch is fine; an unpushed
  masterpiece is not). Don't rebase published branches.
- Contract change: stop, post in team chat, integrator commits it to
  `main`, EVERYONE merges `main` into their branch immediately.
- Integration (final hour, integrator drives): merge order **A → B → C →
  D** into `main`, running `npx convex dev --once && npm run lint` after
  each. Conflicts in `_generated/` or `package-lock.json`: take either
  side, regenerate, commit. Real code conflicts should not exist if
  ownership was respected.

## 4. Perf guardrails (why the stubs look the way they do)

- Fast clock: pure math, ~1.5s period, ONE `simState` write per tick, grid
  rows patched only on change. No LLM calls, ever.
- Event clock: LLM reasoning only on new tips/commands, debounced (skip if
  `lastReasonedAt` < 10s ago).
- Monte Carlo budget: ≤ 600 walks × ≤ 96 steps per tick. It fits in a
  mutation; keep it that way.
