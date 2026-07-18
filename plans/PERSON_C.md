# PERSON C — Intelligence (LLM agents via Respan)

**Mission:** the event clock. When a tip or voice command arrives, LLMs —
and only then — reason: a judge scores tip credibility, four hypothesis
agents re-weight who the missing person probably is, and a parser turns
spoken text into typed intents. All calls through the Respan gateway.
Your work is why the reasoning panel and the voice console feel alive.

**Branch:** `person-c-intel`.
**You own:** `convex/intel.ts`, `convex/commands.ts`,
`convex/convex.config.ts` (you create it), anything under
`convex/agents/`.
**Never touch:** `convex/schema.ts`, `convex/profiles.ts`,
`convex/lib/**`, A's files (`sim/planner/cases/tips/teams`), `src/**`,
`convex/scenario.ts`. You WRITE to `hypotheses` and `tips.credibility`
rows (that's your contract surface) but the mutations you add for it live
in your files.
**Before coding:** read `docs/CONTRACTS.md`, `convex/lib/contracts.ts`,
`convex/profiles.ts`, and `convex/_generated/ai/guidelines.md`
(agent-component rules included).

The two-clock law (CONTRACTS §4): your code runs ONLY on new tips and
commands. If you ever find yourself calling an LLM from a tick, stop.

---

## Task 1 — Wire the Agent component + Respan gateway

1. Create `convex/convex.config.ts`:
   ```ts
   import { defineApp } from "convex/server";
   import agent from "@convex-dev/agent/convex.config";
   const app = defineApp();
   app.use(agent);
   export default app;
   ```
   `npx convex dev --once` regenerates `_generated` (components appear).
2. `convex/agents/client.ts`: one provider for everything:
   ```ts
   import { createOpenAI } from "@ai-sdk/openai";
   export const respan = createOpenAI({
     baseURL: process.env.RESPAN_BASE_URL ?? "https://api.respan.ai/api/",
     apiKey: process.env.RESPAN_API_KEY!,
   });
   export const MODEL = process.env.RESPAN_MODEL ?? "gpt-4o-mini";
   ```
   Env via `npx convex env set RESPAN_API_KEY …` (+ `RESPAN_BASE_URL`,
   `RESPAN_MODEL`). **At check-in, confirm with the Respan folks:** exact
   base path (`/api/` vs `/api/v1/`) and a model id with credits. The env
   indirection IS the fallback plan — pointing `RESPAN_BASE_URL` at
   OpenAI directly must keep everything working.
3. Smoke test: tiny `internalAction` that runs `generateText` once; run it
   from the dashboard. Commit only after this passes.

## Task 2 — Intent parsing (replace `fallbackParse` usage)

In `intel.processCommand`, call `generateObject` (Vercel AI SDK) with
`schema: intentSchema` from `convex/lib/contracts.ts` — zod goes straight
in. System prompt (keep to ~10 lines): you parse SAR coordinator commands;
map colloquial place references to the `landmarks` list (pass the active
case's landmark names + subject facts + the four profile keys as context);
`minutesAgo` from phrases like "around 4pm" is approximate — prefer the
sim clock the user implies; anything you can't map → `{type: "unknown"}`.
On ANY LLM error, fall back to `fallbackParse` (keep it — it's the demo's
seatbelt) and still apply. `applyIntent` already dispatches; extend it:

- `rerun_hypothesis` → schedule your Task 3 reasoning for that profile.
- `query_status` → Task 4.

## Task 3 — Hypothesis reasoning on the event clock

Implement `onNewTip` (currently a no-op; it already receives every tip,
scripted, typed, or spoken):

1. **Debounce:** if `simState.lastReasonedAt` is < 10s of wall-clock ago,
   skip (a mutation in your file updates it; A never touches that field).
2. **Judge:** `generateObject` → `{credibility: 0–1, rationale: string}`
   given tip text/source/position vs. case facts and distance from the
   LKP (a tip 40km out is probably noise). Patch `tips.credibility` via
   your own internal mutation. This is the "Respan judges tip
   credibility" pitch line.
3. **Hypothesis agents:** create four Agent-component threads on first
   run (store `threadId` on each hypothesis row — your mutation):
   ```ts
   new Agent(components.agent, { name: "hypothesis-hiker",
     languageModel: respan.chat(MODEL), instructions: …profile blurb… })
   ```
   One thread per profile so each accumulates its own memory of the case
   (that's the sponsor-visible "persistent agent" surface). Per tip, ask
   each thread: given case facts, this tip (+ judge credibility), the tip
   history it remembers, and its profile's Koester priors
   (`PROFILES[key]` — quote the actual numbers in the prompt), return
   structured `{weight: 0–1, reasoning: ≤2 sentences, mobilityKmH?,
   terrainAffinity?}` (`generateObject`; the thread keeps the prose).
4. **Combine:** normalize the four weights to sum 1 (floor each at 0.02),
   patch `hypotheses` rows (`weight`, `reasoning`, optional param nudges
   within ±50% of profile defaults, `updatedAt: Date.now()`). A's next
   tick consumes them blindly; B's panel flashes on `updatedAt`.

Run the four thread calls with `Promise.all` — this is an action, you can.

## Task 4 — Status readback (`query_status`)

Gather live state in `applyIntent`'s branch (top-3 hottest unsearched
cells with their grid coords, team statuses, leading hypothesis + weight,
sim clock) → one `generateText` call → 2-sentence coordinator-voice
answer → `commands.response`. D's console displays (and may speak) it.
LLM failure → template-string fallback from the same data. Never leave
`response` empty.

## Task 5 — Prove the loop, respect the budget

- Type into the console: "we saw someone near the north creek an hour
  ago" → tip lands with judged credibility, panel re-weights with fresh
  reasoning, next heatmap tick visibly shifts. That's the whole event
  clock, demoable.
- "which sector is most under-searched" → grounded readback.
- Feed one absurd tip ("saw her in Los Angeles") → judge scores it low,
  weights barely move. Say this in the pitch if asked about noise.
- Budget check: a full demo run should be ~10–15 gateway calls total. If
  you see more, your debounce is broken.
- Keep every prompt ≤ ~15 lines. You have four hours; prompt-golf later.

## Definition of done

- End-to-end: spoken/typed sentence → typed intent → state change →
  read-back, LLM-parsed, with regex fallback verified (unset the API key
  once and confirm the console still works).
- Four persistent hypothesis threads re-weight on every tip, debounced.
- All calls through the Respan gateway env; base-URL swap tested.
- `npx convex dev --once && npm run lint` clean; committed + pushed.
