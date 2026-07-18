# DEPLOY — cloud deployment log (W7)

Status log for the W7 cloud deploy. Owned by Dat's lane (`w7-deploy-demo`).
Update this file as steps complete; it is the record of what was actually
done, not aspiration.

## State — DEPLOYED 2026-07-18

| Step | Status |
|---|---|
| Convex cloud dev deployment | ✅ `dev:aromatic-avocet-224` (team `dat-nguyen-af1f4`, project `locus`) — `https://aromatic-avocet-224.convex.cloud` |
| Cloud env vars (`RESPAN_API_KEY`, `RESPAN_BASE_URL`) | ✅ set (OpenAI key + `https://api.openai.com/v1`) |
| `intel:smokeTest` on cloud | ✅ `"LOCUS gateway online."` |
| Vercel prod deploy | ✅ **https://locus-iota-orcin.vercel.app** (public, no auth wall) |
| `index.html` title + meta description | ✅ done (`a409e6b`) |
| DEMO.md timing updates | ✅ cloud-measured notes added; phone-timed rehearsal numbers still to come |

## Verified on prod (browser run, 2026-07-18)

Full demo flow exercised on the Vercel URL against the cloud deployment:
seed (`Open demo case`) → `Run` → `Start scripted tips` → all 4 tips landed
with LLM credibility scores → hypotheses re-weighted with reasoning (Hiker
65% → post-corroboration Injured/despondent 51% LEAD) → planner tasked
teams → **found beat fired**: `SUBJECT LOCATED · Grid (14,14) · top 2% of
search area`. `hiddenTrueLat/Lng` stayed hidden until `status = "found"`.
Tick cadence measured **~1.1 s/tick** (vs ~6 s on the local anonymous
backend — the lag W7 was chasing is gone). Demo state was then reset with
`npx convex run scenario:resetDemo` (works against cloud; use it between
rehearsals).

## Accounts

- Convex CLI: logged in (token in `~/.convex/config.json`).
- Vercel CLI: logged in as `datqnguyen06-5947` (use `npx vercel`; no global
  install needed).
- Local dev deployment before the switch: `anonymous:anonymous-locus`
  (recorded in case env vars need to be re-read from it).

## Runbook (the exact commands that were run)

1. Create the cloud dev deployment and push functions (also rewrites
   `.env.local` to point at it):

   ```bash
   npx convex dev --once --configure new --project locus --dev-deployment cloud
   ```

2. Copy backend env vars to the cloud deployment (values live on the old
   local deployment; read them with
   `npx convex env get <NAME> --env-file <file with CONVEX_DEPLOYMENT=anonymous:anonymous-locus>`
   or from the local dashboard, then):

   ```bash
   npx convex env set RESPAN_API_KEY <value>
   npx convex env set RESPAN_BASE_URL https://api.openai.com/v1
   ```

   **Decision (2026-07-18): Respan's gateway is not used.** OpenAI
   simulates it — `RESPAN_BASE_URL` is permanently
   `https://api.openai.com/v1` and `RESPAN_API_KEY` is an OpenAI key. The
   env indirection in `convex/agents/client.ts` makes this a pure config
   choice; no code changes. Do NOT flip to `https://api.respan.ai/api/`.
   No `RESPAN_MODEL` was set locally, so the client's default
   (`gpt-4o-mini`) applies.

3. Smoke test the cloud backend:

   ```bash
   npx convex run intel:smokeTest
   ```

4. Deploy the frontend (Vite build auto-detected; output `dist/`):

   ```bash
   npx vercel --prod
   ```

   Vercel env vars (Production): `VITE_CONVEX_URL` = cloud deployment URL
   from step 1, `VITE_MAPBOX_TOKEN` = the pk. token from `.env.local`.
   Set via `npx vercel env add <NAME> production` (reads value from stdin).

5. Verify on the Vercel URL: Open demo case → Run → Start scripted tips;
   confirm the found beat (✅ done — see "Verified on prod" above), and
   that a laptop and a phone show the same live state (⏳ needs a human
   with a phone).

## Notes

- `npx convex dev --once` conflicts with a running local anonymous backend
  (port 3210). Once the project points at the cloud dev deployment this
  conflict disappears.
- Do not commit the rehearsal recording; park it outside the repo.
