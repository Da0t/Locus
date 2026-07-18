# LOCUS — Stage run-of-show (60 seconds)

**Measured, not guessed.** Timings from two dress rehearsals on production
(2026-07-18, cloud Convex + Vercel, six teams): voice at +8s, second line
+14s, drip +16s, **found at +56s and +60s** — the found tick was identical
(36) in both runs; the arc is near-deterministic. Follow the sequence in
order — it is load-bearing: the early voice tip is what keeps the blind
convergence from ending the show early.

Demo from **https://locus-iota-orcin.vercel.app** in Chrome, one window,
projector-mirrored.

---

## Pre-flight (10 minutes before, from the repo checkout)

```bash
npx convex run scenario:resetDemo     # wipe the world
# in the browser: click "Open demo case"  (do NOT click Run yet)
npx convex run photos:attachLatest    # Maya's portrait -> header, survives resets
```

- [ ] Sim **paused** (RUN button showing), intel feed empty, clock T+3h00m.
- [ ] Maya's photo visible in the header.
- [ ] Voice Cursor running; mic + accessibility permitted; dictate one test
      sentence into the console, then **delete it**. Press **/** — focus
      must jump back to the console (map clicks steal focus; **/** gets it
      back; this is your panic key).
- [ ] Console toggles: read-back **ON** (🔊), stage mode **ON** (Aa).
- [ ] Hover the LEGEND pill once so you know where it lives (bottom-left).
- [ ] Fallback recording open in a second tab (record your best rehearsal).
- [ ] Phone timer on the podium. Two lines memorized (below).

---

## The sequence (driver actions in bold, all times from clicking RUN)

### T0 — "This is Maya Chen." **Click RUN.**

> "Maya Chen. Day hiker, missing on Mount Tam since 9:41 this morning.
> Every search plan today is drawn by hand — and frozen the moment it's
> drawn. Locus never freezes."

The heatmap blooms along the trails, the ring grows, **six teams** deploy
on their own. One breath — let the room see it move.

### +8s — speak to it (voice line 1)

**Press /** (focus insurance), then say into Voice Cursor:

> **"Add a sighting near the north creek about an hour ago."**

Add-tip chip lands, the judge scores it, Hiker pulls ahead with fresh
reasoning, the heatmap drags north. One narrated sentence:

> "LLM agents re-weigh who Maya is on every piece of intel — grounded in
> Koester's fifty thousand real lost-person cases."

### +14s — voice line 2

> **"Which sector is most under-searched?"**

The answer prints AND speaks aloud (read-back). Rehearsal answer: *"the
hot cell 0.1 km from North Creek."* Say nothing over it.

### +16s — the intel starts flowing

**Click "Start scripted tips."** Hands off for good.

> "Now the tips flow the way they really do — witnesses, 911, radio.
> The judge scores every report's credibility."

At ~+29s the **red herring** lands: a gas-station clerk 3 km downhill.
Point at it — rehearsal score **0.10**:

> "Physically impossible — 3 kilometers downhill. Scored 0.1, ignored.
> No team wasted."

### ~+50–60s — found

The heatmap tightens creek-side, off-trail, west of the ford; a team
reaches the cell; **SUBJECT LOCATED** fires — sim clock, grid, prediction
rank — and the after-action debrief writes itself beneath it.

> "And there she is — off-trail by the creek, exactly where the intel
> pinned her. The debrief just wrote itself."

**Insurance:** if found hasn't fired by **+60s**, click **Charlie's chip**,
then the hottest cell — *"and the coordinator can task a team straight
onto the peak"* — claim, two ticks, found by ~+68s.

### Found +8s — the kicker (say it over the debrief)

> "We voice-coded a voice-commanded product — I've used Voice Cursor
> daily for a year. **Convex** runs this whole live world; every
> reasoning call rides one gateway client, Respan-shaped, one env var to
> route through their platform. Locus: the search plan that never
> freezes."

Done ~70 seconds.

---

## The two voice lines (exact words — they hit the landmark resolver)

1. **"Add a sighting near the north creek about an hour ago."**
2. **"Which sector is most under-searched?"**

Say **"north creek"** exactly — it's a seeded landmark string. Other
speakable landmarks if you improvise: *pantoll lot, east ridge, fire road
junction, waterfall, steep ravine, rock spring, panoramic highway.*

**Judge behavior (measured):** phrasing changes scores. "Credible report
from a trail runner…" ≈ 0.8; a bare "someone saw her" ≈ 0.3–0.5. Speak
like a dispatcher: name the source, sound specific.

---

## Fallback ladder (fastest first)

1. **Voice not heard** → type the same sentence. Identical parse.
2. **Mic fallback** → click the mic button (Chrome Web Speech), speak.
3. **Drip doesn't fire** → type the 911-caller line yourself:
   *"911 caller heard someone calling for help by the creek crossing 40
   minutes ago"* — same effect.
4. **Found stalls past +75s** → the Charlie insurance click (above). This
   is scripted, not an apology.
5. **Sim/world dead** → switch tabs to the rehearsal recording. Keep
   talking; the script reads the same over video.
6. **Map blank** (Mapbox token) → the panel + console still carry it;
   narrate over them.

Reset between any two runs: `npx convex run scenario:resetDemo`, reload,
Open demo case, `npx convex run photos:attachLatest`.

---

## Q&A ammunition

- **"Is the movement model real?"** Six-behavior agent-based model from
  Hashimoto et al. (Nature Scientific Reports 2022); category priors from
  Koester's ISRID tables. We reimplemented it in TypeScript inside the
  Convex tick. Distances are the published percentiles.
- **"Why only two hypotheses?"** Derived from subject facts — Maya's a
  known day hiker, so the panel seeds mobile-hiker vs injured-hiker.
  A dementia case would seed different profiles.
- **"What about the tip that corroborates?"** Tips are embedded and
  vector-matched (Convex vector search); a rephrased confirming report
  links to the original and boosts its credibility.
- **"Offline?"** Demo assumes connectivity; production would sync
  opportunistically, like existing SAR tools.
- **"Does it replace searchers?"** Decision support for trained
  coordinators. It re-plans; humans decide. Always say this.
- **Contention bonus (2-min slots only):** two tabs claim the same cell;
  Convex serializes; the loser gets the toast. "Two coordinators, one
  source of truth, no double-tasking."

---

## Positioning — never say

It finds people on its own · Voice Cursor controls the agents · we
invented probabilistic search · coordination is unsolved (CalTopo owns
coordination; our wedge is the plan that never freezes) · "every call
goes through Respan" (it's gateway-shaped; credits pending — the env-flip
line above is the honest version).
