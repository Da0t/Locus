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
