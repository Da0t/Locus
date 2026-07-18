# LOCUS — Master Plan

Voice Coding Hackathon · Convex, 444 De Haro St, SF · build 11:00–15:30,
pitches 15:30–16:00 (assume a **90-second** slot).

## One-liner

LLM agents reason about who the missing person is and how they move, a
simulation computes where they likely are and the fastest way to search it,
and the coordinator drives the whole room hands-free by voice. It re-runs
itself as new information arrives.

## Positioning (what we say, what we never say)

Mature SAR coordination software exists (CalTopo/SARTopo owns it). Our
wedge is the other half: today the probability thinking is manual and the
plan is frozen the moment it's drawn. Locus's probability picture
**reasons and re-plans itself live**, and you command it by voice.

Say: grounded in Koester's ISRID research (50k+ cases, ~41 subject
categories) and the Hashimoto et al. Nature Sci Reports agent-based model;
decision support for trained searchers; "we voice-coded a voice-commanded
product" (we genuinely use Voice Cursor — daily-user credibility).

Never say: it finds people on its own; Voice Cursor controls the agents;
we invented probabilistic search; coordination is unsolved.

## Architecture — the invariant

**The LLM reasons, math does the searching, voice drives it.**

- **Role A — LLM agents (brains, not legs):** one agent per hypothesis of
  who the person is (hiker / dementia / child / injured). Each outputs
  profile parameters + a weight + a rationale. Visible as a reasoning
  panel, never on the map. All calls through the Respan gateway.
- **Role B — simulation (math, no LLM):** profile-biased Monte Carlo walks
  from the last-known point, blended by hypothesis weight, aggregated into
  a probability heatmap; a greedy planner assigns high-probability
  unsearched cells to teams with no overlap.
- **Role C — voice:** Voice Cursor (speech→text) → Respan (text→intent) →
  Convex (intent→state) → reactive map. Honest phrasing on stage.

**Two clocks.** Fast clock: pure-math tick every ~1.5s (age tips, walks,
heatmap, planner, one transactional write). Event clock: LLM reasoning
ONLY on new tips/voice commands. This keeps cost and latency sane.

## Sponsor surfaces

- **Convex (heavy, the spine):** self-scheduling tick loop, Agent
  component threads, reactivity to every screen, transactional grid claims
  under contention, file storage for the subject photo; vector
  search/presence/crons as stretch.
- **Respan (central):** gateway for hypothesis reasoning + intent parsing;
  judge scores tip credibility. Does NOT pick the winning hypothesis.
- **Voice Cursor (real, input-only):** dictation into the command console
  and into our AI coding tools while building.

## The demo (90 seconds, three beats)

1. **It moves on its own.** Case open, tips dripping in on a clock; the
   heatmap visibly reshapes and assignments re-prioritize, hands off.
2. **Speak to it.** "Add a sighting near the north creek" — one hypothesis
   pulls ahead, the plan re-weights live. (Backup beat, time permitting:
   two tabs claim the same grid at the same instant; consistency holds.)
3. **Found.** The heatmap tightens on the hidden true location; a team
   reaches that cell; the found moment fires. "And there she is."

Ground truth is seeded and hidden; the scripted tips converge on it with
honest noise. No payoff without it — it's built FIRST, not last.

## Parallel build (4 people, one integration hour)

Ownership, interfaces, and git protocol: `docs/CONTRACTS.md`. Plans:
`plans/PERSON_[A-D].md` on each person's branch.

- **A — sim core:** the real tick engine (walker → heatmap → planner →
  found check). The heart.
- **B — map & UI:** heatmap/grid/teams/terrain rendering, claim
  interaction, reasoning panel, found moment, polish. The face.
- **C — intelligence:** Agent component via Respan, hypothesis reasoning
  on tips, tip-credibility judge, LLM intent parsing + status readback.
  The brains.
- **D — voice/scenario/demo:** console with dictation + Web Speech
  fallback, the authored Mt. Tam scenario + scripted tip drip, timing,
  `docs/DEMO.md`, the pitch. The show.

Integration order A → B → C → D, integrator drives, `main` must tick after
every merge. Milestone check at T+2h: heatmap moving (A), map rendering it
(B), one real LLM reasoning pass (C), tips dripping (D).

## Risks & pre-answered questions

- **Respan gateway details unknown** → confirm base URL/model at check-in;
  env-swap to direct OpenAI if needed (C's plan has the switch).
- **Terrain realism** → authored overlay, said honestly: "production would
  pull OSM + USGS like CalTopo does."
- **Offline reality** → "demo assumes connectivity; production syncs
  opportunistically."
- **Overclaiming** → decision support for trained searchers, every time.
- **Pitch overrun** → 90s script rehearsed against a timer, twice.
