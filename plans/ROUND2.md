# Round 2 — final hour, 7 parallel workstreams

One hour. Every workstream is scoped to ~30–45 min, creates NEW files
wherever possible, and edits only the files its plan names — that's what
makes a 7-way merge survivable. Schema changes are ALREADY on `main`
(tips.embedding + vector index, tips.corroborates, cases.debrief): nobody
touches `convex/schema.ts`, `convex/profiles.ts`, or `convex/lib/**`.

| Branch | Plan | Mission | Sponsor |
|---|---|---|---|
| `w1-vector-corroboration` | `plans/W1.md` | Tip embeddings + Convex vector search → "corroborates" in the intel feed | Convex + Respan |
| `w2-cron-escalation` | `plans/W2.md` | Cron sweep: hot cells unsearched too long → console alert | Convex |
| `w3-subject-photo` | `plans/W3.md` | Subject photo via Convex file storage on the case header | Convex |
| `w4-map-legend` | `plans/W4.md` | Map legend + terrain/heatmap readability pass | demo |
| `w5-debrief` | `plans/W5.md` | After-action debrief generated on "found" via the gateway | Respan |
| `w6-presence` | `plans/W6.md` | Presence component: coordinators online | Convex |
| `w7-deploy-demo` | `plans/W7.md` | Cloud deploy (Convex + Vercel), env, rehearsal, fallback recording | demo |
| `w8-tip-attraction` | `plans/W8.md` | **BUG (top priority): tips must move probability mass + teams** — walker anchors | core |
| `w9-visual-polish` | `plans/W9.md` | App-shell visual pass (everything around the map) | demo |

## 7-person assignment (9 lanes, small ones bundled)

| Person | Lanes | Note |
|---|---|---|
| P1 | **W8** | the bug fix — highest priority, merge FIRST |
| P2 | W1 | vector corroboration (both sponsors) |
| P3 | W4 | map legend + readability |
| P4 | W9 | shell visual polish |
| P5 | W2 + W3 | two small Convex checklist wins |
| P6 | W5 | debrief (closing beat) |
| P7 (Dat) | W7 | deploy + rehearsal — needs account access |

W6 (presence) is the cut line: first person finished grabs it; unstarted
at T-15 = skipped. New merge order: **W8 → W1 → W2 → W3 → W4 → W5 → (W6)
→ W9 → W7 last** (deploy after everything is in).

Rules (same as round 1, tighter clock):
- Bootstrap your AI with: read `plans/W<N>.md` + `docs/CONTRACTS.md` +
  `CLAUDE.md`, implement in order, only the named files, run
  `npx convex dev --once && npm run lint` after each step, commit small,
  push your branch. Stop and ping the group on ANY urge to touch a shared
  file.
- Merge at T-15min in numeric order W1→W7 (integrator drives). Unfinished =
  unmerged; a half-feature loses to a clean main.
- The app must keep working WITHOUT your feature (all additions are
  optional-field / new-file / additive).
