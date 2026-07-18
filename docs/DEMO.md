# LOCUS — 90-second demo run-of-show

**The one rule:** no payoff without ground truth. The scenario is authored so
the scripted tips converge on a hidden true location; a team reaches it and the
found moment fires. Person D calls the pacing; everyone follows the countdown.

Scenario: **Maya Chen, 34** — day hiker, solo, parked at the Pantoll lot 7am,
phone last pinged 9:41am, no overnight gear, cooling after sunset. Ground truth
is just off the Matt Davis trail, one cell downhill of the fire-road junction,
where the trail fords the creek — a trail-stream intersection, statistically
the single hottest place to look. The tips never land on it; they tighten
around it with honest 100–400 m noise.

---

## Pre-flight (before you walk on stage)

- [ ] Chrome, one window, `npm run dev` up, `npx convex dev` running.
- [ ] `VITE_MAPBOX_TOKEN` set in `.env.local` (map is blank without it).
- [ ] Case seeded and reset clean: run `npx convex run scenario:seedDemo` if
      there is no active case. Sim **paused**, tips list empty, clock at 3:00.
- [ ] Voice Cursor running, mic + accessibility permitted, tested dictating one
      sentence into the console input (autofocus should catch it).
- [ ] Console toggles: **read-back ON** (🔊), **stage mode ON** (Aa) for the
      projector.
- [ ] Disaster fallback: the rehearsal screen recording open in a second tab.
- [ ] Know your two lines cold (below). Stand at arm's length from the mic.

---

## The beat sheet

Times are cumulative wall-clock. The tip drip is authored to land its last tip
~60 s in (afterSec chain: 4, 13, 25, 37, 48, 60 s), before the found window.

### 0–15 s — the problem, and it moves on its own

| | |
|---|---|
| **Speaker** | "This is Maya Chen. Day hiker, missing since this morning on Mount Tam. Every dot you'll see is grounded in the same lost-person-behavior research CalTopo users apply by hand." |
| **Action** | Click **Run**. Click **Start scripted tips** — once. Then hands off the keyboard. Tips begin dripping; the heatmap reshapes; assignments re-prioritize. **No clicking.** |
| **Fallback** | Drip dead → type the first sighting yourself (it still parses and logs). Sim dead → cut to the screen recording. |

### 15–45 s — speak to it

| | |
|---|---|
| **Speaker line 1** | *"Add a sighting near the north creek about an hour ago."* |
| **Action** | The command lands in the console with an **add-tip** chip; the hiker hypothesis pulls ahead; the heatmap shifts north toward the creek; the planner re-tasks a team. |
| **Speaker line 2** | *"Which sector is most under-searched?"* |
| **Action** | A **status** chip appears and the answer is **spoken aloud** (read-back) while it prints — hands-free reply. |
| **Fallback** | Voice/mic dead → click the mic button (Web Speech), or type the exact same sentences. Both parse identically. |

### 45–75 s — found

| | |
|---|---|
| **Speaker** | "The picture never stopped updating. Locus put the probability mass right where the trail crosses the creek, downhill of the junction — and there she is." |
| **Action** | The final corroboration tip lands; a team reaches the hot cell; the **found moment** fires and the true location is revealed for the first time. |
| **Fallback** | If found is slow, narrate the tightening heatmap and let the last tip carry it; worst case, cut to the recording at the reveal. |

### 75–90 s — the kicker

| | |
|---|---|
| **Speaker** | "We voice-coded a voice-commanded product — I've been a daily Voice Cursor user for a year. **Convex** runs the whole live world; every reasoning call goes through the **Respan** gateway." |
| **Action** | Land it. Stop talking at 90. |

---

## Exact voice lines (memorize these — they match the landmarks)

1. **"Add a sighting near the north creek about an hour ago."**
2. **"Which sector is most under-searched?"**

Both are chosen to hit the parser cleanly (`sighting` → add_tip, `under-searched`
→ query_status) so they parse even on the regex fallback before the LLM lands.
Spoken landmarks that resolve in the scenario: *north creek, pantoll lot, east
ridge, fire road junction, waterfall, steep ravine, rock spring, panoramic
highway.* Say those exact strings.

---

## The red herring (built for Person C's judge)

Around 48 s a deliberately implausible tip lands: a gas-station clerk on
Panoramic Highway "sees Maya" 3 km downhill, 10 minutes ago — a distance she
could not cover on foot. C's credibility judge should score it low and the
heatmap should **not** chase it south. If asked in Q&A: *"That's the point — the
system discounts a physically impossible sighting instead of sending a team to
the wrong place."*

---

## Fallback ladder (fastest to slowest)

1. **Tip drip doesn't fire** → type the sighting sentence; it logs the same tip.
2. **Voice Cursor / mic doesn't hear you** → type the exact same sentences.
3. **Sim / found doesn't fire** → keep narrating the live heatmap; if it stalls,
   cut to the **rehearsal screen recording** (record the best timed run the
   moment integration works — this is the disaster fallback).
4. **Map is blank** (no Mapbox token) → the console, tips, and reasoning panel
   still tell the story; narrate over them.

---

## Appendix — contention beat (only if Q&A or a 2-minute slot opens)

Open a second browser tab on the same case. Both tabs claim the **same grid**
at the same instant. One wins; the other gets a toast error — Convex holds
consistency under a real race. Say: *"Two coordinators, one source of truth,
no double-tasking."* Do **not** put this in the 90-second run; it's a bonus.

---

## Positioning — say / never say

- **Say:** grounded in Koester's ISRID research and an agent-based movement
  model; decision support for trained searchers; we genuinely voice-code.
- **Never say:** it finds people on its own; Voice Cursor controls the agents;
  we invented probabilistic search; coordination is an unsolved problem.
