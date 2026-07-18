# PERSON D — Voice, Scenario & Demo

**Mission:** the show. You own the voice surfaces (Voice Cursor dictation
+ Web Speech fallback), the authored scenario whose scripted tips converge
on the hidden true location, the demo pacing, and the 90-second pitch.
"No payoff without ground truth" — you are the payoff.

**Branch:** `person-d-voice`.
**You own:** `src/components/voice/**`, `convex/scenario.ts`,
`docs/DEMO.md` (you create it).
**Never touch:** `convex/schema.ts`, `convex/profiles.ts`,
`convex/lib/**`, A's and C's convex files, B's components (the console
slot in the sidebar is already mounted for you).
**Before coding:** read `docs/CONTRACTS.md`, `docs/PLAN.md` (demo
section), and the stub `convex/scenario.ts`.

Setup: `npm install && npx convex dev` + `npm run dev`, plus **Voice
Cursor installed and permitted (mic + accessibility) on the demo
machine** — test dictation into the console input in the first ten
minutes, not at 15:00.

---

## Task 1 — Author the real scenario (`convex/scenario.ts`)

Replace the placeholder `seedDemo` internals (keep the signature and the
`api.cases.seedCase` call — that contract is frozen):

1. **Terrain overlay** (~60–100 cells): the Matt Davis / Steep Ravine
   trail shape as connected `trail` cell runs from the Pantoll LKP, a
   `water` creek line crossing the NW quadrant, `steep` faces east of the
   ridge, one `road` run along the south edge. It does not need to be
   cartographically true — it needs to LOOK like terrain logic on the
   heatmap (mass hugging trails, spilling at the creek). Eyeball it over
   the real map with B's overlay.
2. **Landmarks** (6–8): "north creek", "pantoll lot", "east ridge",
   "waterfall", "fire road junction"… — these are the exact strings voice
   commands resolve against, so name what you'll SAY on stage.
3. **Hidden true location:** just off-trail, near the creek-trail
   crossing in the NW — plausibly downhill of a trail junction (that's
   Koester logic: say it in the pitch). MUST sit inside a
   heatmap-reachable cell for the hiker profile.
4. **Pacing knobs:** `minutesPerTick` + `initialSimMin` such that a
   hands-off run from "Run" to found lands at **75–100 seconds** (tune in
   Task 3 with A's engine; against the stub, just make the clock read
   sensibly).

## Task 2 — Scripted tip drip

Add to `convex/scenario.ts`:

- `TIP_SCRIPT`: 5–7 authored tips `{afterSec, text, lat, lng,
  observedAtSimMinOffset, source}`. Arc: an early vague trail sighting →
  a dog-walker report near the junction → a credible creek-side sighting
  (the "one hypothesis pulls ahead" beat) → **one deliberate red herring**
  far south with an implausible story (C's judge should score it low —
  coordinate the wording with C) → a final tight corroboration near (not
  at) the truth. Honest noise: 100–400m off the hidden location, never on
  it.
- `startDrip` public mutation → schedules `dripNext` internal mutation
  (index-based, `ctx.scheduler.runAfter(afterSec * 1000, …)` chain — same
  self-scheduling pattern as A's tick) → each fires
  `ctx.runMutation(api.tips.addTip, …)` so the event clock triggers
  exactly like a live tip. Stop the chain when the case status is
  "found". Add a "Start scripted tips" button beside your console (inside
  your voice/ dir) — the demo driver clicks it once.

## Task 3 — Voice console (`src/components/voice/CommandConsole.tsx`)

The input already receives Voice Cursor dictation (it's system-level
typing). Upgrade around it:

1. **Mic fallback:** `react-speech-recognition` — mic button toggles
   `continuous` listening, live transcript into the input, Enter or a
   2s-silence auto-submit. Chrome only; the demo machine runs Chrome.
2. **Console feel:** intent chip per log entry (color by `intent.type`),
   pending spinner while `status === "pending"`, response line
   prominent. Failed parse (`unknown`) → visibly red, so a stage fumble
   reads as handled, not broken.
3. **Spoken read-back (cheap, impressive):** when a `query_status`
   response arrives, `speechSynthesis.speak(new SpeechSynthesisUtterance
   (response))` behind a toggle (default ON for the demo, OFF for dev
   sanity). Browser-native, no API, no sponsor overclaim.
4. **Stage mode:** a compact toggle that bumps console font size for
   projection.

## Task 4 — `docs/DEMO.md`: the 90-second script

Write it as a beat sheet with speaker + action + fallback per line:

- **0–15s — problem + it moves on its own.** One sentence of setup
  ("Maya Chen, day hiker, missing 3 hours"), map already running, tips
  dripping, heatmap visibly reshaping. No clicking.
- **15–45s — speak to it.** Driver says: "Add a sighting near the north
  creek about an hour ago." Panel re-weights (hiker pulls ahead), heatmap
  shifts, planner re-tasks a team. Then: "Which sector is most
  under-searched?" — spoken read-back answers.
- **45–75s — found.** Team reaches the hot cell; found moment fires.
  "Grounded in the same lost-person-behavior research CalTopo users apply
  by hand — Locus just never stops updating it."
- **75–90s — the kicker.** "We voice-coded a voice-commanded product —
  I've been a daily Voice Cursor user for a year." Sponsor line: Convex
  runs the world, Respan gateways every reasoning call.
- **Fallbacks:** tip drip dead → type the sighting (still parses); voice
  dead → same sentence typed; sim dead → the rehearsal screen recording
  (record one the moment integration works).
- Contention beat (two tabs, same claim) goes in ONLY if Q&A or a 2-min
  slot materializes — script it as an appendix.

## Task 5 — Rehearse and time it

After integration: two full timed runs minimum. Tune `minutesPerTick`,
`TIP_SCRIPT` timings, and WHERE the driver stands (mic distance changes
dictation accuracy — test at arm's length). Record the best run as the
disaster fallback. You call the pacing; everyone else follows your
countdown.

## Definition of done

- Seed → drip → found runs hands-off in 75–100s against A's engine (or
  demonstrably paced against the stub if A lands late).
- Voice path (Voice Cursor AND mic fallback) and typed path both submit
  commands end-to-end; read-back speaks.
- Red-herring tip visibly discounted (credibility meter low).
- `docs/DEMO.md` committed; screen recording captured; `npm run lint`
  clean; pushed on `person-d-voice`.
