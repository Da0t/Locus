# DEPLOY — cloud deployment log (W7)

Status log for the W7 cloud deploy. Owned by Dat's lane (`w7-deploy-demo`).
Update this file as steps complete; it is the record of what was actually
done, not aspiration.

## State

| Step | Status |
|---|---|
| Convex cloud dev deployment | ⏳ pending — needs interactive run (see below) |
| Cloud env vars (`RESPAN_API_KEY`, `RESPAN_BASE_URL`) | ⏳ pending — copy from local after cloud exists |
| `intel:smokeTest` on cloud | ⏳ pending |
| Vercel prod deploy | ⏳ pending — blocked on cloud URL |
| `index.html` title + meta description | ✅ done (`a409e6b`) |
| DEMO.md timing updates | ⏳ pending — after prod rehearsal |

## Accounts

- Convex CLI: logged in (token in `~/.convex/config.json`).
- Vercel CLI: logged in as `datqnguyen06-5947` (use `npx vercel`; no global
  install needed).
- Local dev deployment before the switch: `anonymous:anonymous-locus`
  (recorded in case env vars need to be re-read from it).

## Runbook (exact commands)

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
   confirm the found beat, and that a laptop and a phone show the same
   live state.

## Notes

- `npx convex dev --once` conflicts with a running local anonymous backend
  (port 3210). Once the project points at the cloud dev deployment this
  conflict disappears.
- Do not commit the rehearsal recording; park it outside the repo.
