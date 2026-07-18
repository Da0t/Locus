# LOCUS — Stage run-of-show (90 seconds)

**Measured, not guessed.** Every timing below comes from a full dress
rehearsal on production (2026-07-18, cloud Convex + Vercel): voice line at
+15s, second line at +25s, drip at +30s, **found fired at +67s**. Two
earlier hands-off runs found at 44–46s; the early voice tip is what buys
the window. Follow the sequence in order — it is load-bearing.

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

### T0 — "This is Maya Chen."

> "Maya Chen. Day hiker, missing on Mount Tam since 9:41 this morning.
> Every SAR team in the country plans this search by hand, on a map that
> freezes the moment it's drawn."

**Click RUN.** Hands off.

### T0–15s — it moves on its own

The heatmap blooms along the trails, the radius ring grows, three teams
deploy without anyone touching anything.

> "Locus never freezes. LLM agents reason about who Maya is — the
> probability model is grounded in Koester's lost-person research, fifty
> thousand real cases — and the simulation re-plans the search every two
> seconds, on its own."

### +15s — speak to it (voice line 1)

**Press /** (focus insurance), then say into Voice Cursor:

> **"Add a sighting near the north creek about an hour ago."**

Watch with the audience: add-tip chip lands, the judge scores it, the
hiker hypothesis pulls ahead with fresh reasoning, the heatmap drags
north. Narrate exactly that, one sentence.

### +25s — voice line 2

> **"Which sector is most under-searched?"**

The answer prints AND speaks aloud (read-back). Rehearsal answer: *"the
hot cell 0.1 km from North Creek."* Let the room hear it — say nothing
over it.

### +30s — the intel starts flowing

**Click "Start scripted tips."** Hands off for good.

> "Now the tips start coming in the way they really do — witnesses, 911
> calls, radio traffic. Watch the credibility meters: the reasoning judge
> scores every report."

At ~+51s the **red herring** lands: a gas-station clerk 3 km downhill.
Point at it — rehearsal score **0.10 credibility**:

> "That one's physically impossible — she can't be 3 kilometers downhill.
> The judge scores it a 0.1 and the search doesn't chase it. No team
> wasted."

### ~+60–75s — found

The heatmap tightens creek-side, off-trail, west of the ford; a team
reaches the cell; **SUBJECT LOCATED** fires with the sim clock, grid, and
prediction rank — then the after-action debrief writes itself under it
(~5s later, names the decisive tip).

> "And there she is — off-trail by the creek, exactly where the intel
> pinned her. The debrief just wrote itself."

**Insurance:** if found hasn't fired by **+75s**, click **Charlie's chip**,
then click the hottest cell. That's not a cheat — say: *"and the
coordinator can task a team straight onto the peak"* — claim, two ticks,
found by ~+85s.

### +75–90s — the kicker

> "We voice-coded a voice-commanded product — I've used Voice Cursor
> daily for a year. **Convex** runs this entire live world: the
> self-scheduling simulation, the agent threads, every screen in sync.
> Every reasoning call rides one gateway client, Respan-shaped — it's a
> single env var to route through their platform. Locus: the search plan
> that never freezes."

Stop at 90.

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
