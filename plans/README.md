# Plans

One detailed, AI-executable implementation plan per person, each living on
its owner's branch:

| Branch | Plan | Mission |
|---|---|---|
| `person-a-sim` | `plans/PERSON_A.md` | Monte Carlo walker, tick engine, planner, found check |
| `person-b-map` | `plans/PERSON_B.md` | Map layers, claim UX, reasoning panel, found moment, polish |
| `person-c-intel` | `plans/PERSON_C.md` | Agent component + Respan, tip judge, LLM intent parsing |
| `person-d-voice` | `plans/PERSON_D.md` | Voice console, authored scenario, tip drip, demo script |

## How to work your plan with an AI assistant

Check out your branch, then give your AI (Claude Code / Cursor / etc.)
this bootstrap prompt — by voice, obviously:

> Read `plans/PERSON_X.md`, `docs/CONTRACTS.md`, and `CLAUDE.md` in this
> repo, then implement my plan task by task, in order. Hard rules: touch
> only the files my plan says I own; never edit `convex/schema.ts`,
> `convex/profiles.ts`, or `convex/lib/**`; keep every function signature
> that exists on `main`; run `npx convex dev --once` and `npm run lint`
> after each task and fix what breaks; commit after each task with a short
> message; stop and tell me if you need a contract change or another
> person's file edited.

Then keep it honest: watch the app while it works (`npm run dev`), and
test your seam with the stub — every other person's side already works in
stub form on `main`, so "it works against the stubs" means "it will work
at integration."
