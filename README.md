# LOCUS

Voice-driven search-and-rescue command center. LLM agents reason about who
the missing person is, a Monte Carlo simulation computes where they likely
are and how to search fastest, and the coordinator drives it all hands-free
by voice. The probability picture re-plans itself as new information arrives.

Built for the Voice Coding Hackathon (Convex SF). Sponsors woven in:
**Convex** runs the entire live world, **Respan** gateways every LLM call,
**Voice Cursor** is how we command it (and how we built it).

Grounded in Robert Koester's ISRID lost-person-behavior research and the
Hashimoto et al. (Nature Sci Reports 2022) agent-based lost-person model.
This is decision support for trained searchers, not an autonomous finder.

## Team

| Person | Branch | Owns | Plan |
|---|---|---|---|
| A | `person-a-sim` | Simulation core: tick loop, Monte Carlo walker, planner | `plans/PERSON_A.md` (on their branch) |
| B | `person-b-map` | Map & UI: heatmap, grid, teams, reasoning panel, polish | `plans/PERSON_B.md` |
| C | `person-c-intel` | Intelligence: hypothesis agents, tip judge, voice-intent LLM | `plans/PERSON_C.md` |
| D | `person-d-voice` | Voice console, authored scenario, demo script | `plans/PERSON_D.md` |

**Read `docs/CONTRACTS.md` before writing any code.** It defines file
ownership, the frozen interfaces, and the git protocol. `docs/PLAN.md` is
the master plan.

## Getting started (each person, on their own machine)

```bash
git clone https://github.com/Da0t/Locus.git && cd Locus
git checkout <your-branch>        # e.g. person-a-sim
npm install
npx convex dev                    # terminal 1 — pick "start without an account" (local) or log in
npm run dev                       # terminal 2 (or let `npm run dev` drive both)
```

Frontend env (`.env.local`, never committed):

```
VITE_MAPBOX_TOKEN=pk.…            # required for the map (Person B/D mainly)
```

Backend env (Person C only): `npx convex env set RESPAN_API_KEY …` etc.

In the app: **Open demo case → Run.** The stub world ticks; your piece
replaces its part of the stub.

## Working agreement (the short version)

- Work ONLY in the files you own (`docs/CONTRACTS.md` §Ownership).
- Commit small, push your branch often.
- Never edit `convex/schema.ts`, `convex/profiles.ts`, `convex/lib/*` —
  schema/contract changes go through the whole team, immediately.
- Feed your plan file to your AI assistant — it's written to be executed.
