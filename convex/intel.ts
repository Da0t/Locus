// OWNER: Person C (intelligence). The EVENT CLOCK: LLM reasoning fires on
// tips and commands, NEVER per tick (CONTRACTS §4). Every LLM call rides the
// single Respan gateway (convex/agents/client.ts).
//   - processCommand: spoken/typed text -> typed Intent (generateObject) -> apply
//   - onNewTip: judge tip credibility + re-weight four persistent hypothesis
//     threads, debounced on simState.lastReasonedAt
//   - query_status: grounded 2-sentence coordinator read-back
// fallbackParse and the template answers are the demo's seatbelt: any LLM
// failure degrades gracefully instead of breaking the console.
import {
  internalAction,
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { generateObject, generateText } from "ai";
import type { Intent } from "./lib/contracts";
import { PROFILES, type Profile } from "./profiles";
import { cellCenter, distanceKm } from "./lib/geo";
import { respan, MODEL } from "./agents/client";
import { intentEnvelope, buildIntentSystem } from "./agents/intent";
import {
  hypothesisAgents,
  judgeSchema,
  hypothesisSchema,
  buildJudgePrompt,
  buildHypothesisPrompt,
  normalizeWeights,
  clampNudge,
  type ReasonContext,
  type RawWeight,
} from "./agents/hypothesis";
import {
  buildStatusTemplate,
  buildStatusPrompt,
  type StatusFacts,
} from "./agents/status";

const DEBOUNCE_MS = 10_000; // two-clock law: skip reasoning if <10s since last

// ============================================================
// Task 1 — Respan gateway smoke test.
// `npx convex run intel:smokeTest` (or from the dashboard). Also the base-URL
// swap test: point RESPAN_BASE_URL at OpenAI and this must still return text.
// ============================================================
export const smokeTest = internalAction({
  args: {},
  handler: async () => {
    const { text } = await generateText({
      model: respan.chat(MODEL),
      prompt: "Reply with exactly: LOCUS gateway online.",
    });
    return text;
  },
});

// ============================================================
// Task 2 — Intent parsing (LLM, with regex seatbelt).
// ============================================================

// Regex fallback parser — the demo's seatbelt. KEEP IT.
export function fallbackParse(raw: string): Intent {
  const t = raw.toLowerCase();
  if (/(pause|freeze|hold)/.test(t)) return { type: "pause_sim" };
  if (/(resume|unpause|continue)/.test(t)) return { type: "resume_sim" };
  if (/(sighting|saw|spotted|tip)/.test(t))
    return { type: "add_tip", text: raw, source: "voice" };
  if (/(status|under-?searched|where)/.test(t))
    return { type: "query_status", question: raw };
  const rerun = t.match(/re-?run the (hiker|dementia|child|injured)/);
  if (rerun)
    return {
      type: "rerun_hypothesis",
      profile: rerun[1] as "hiker" | "dementia" | "child" | "injured",
    };
  return { type: "unknown", raw };
}

// Case facts needed to ground the intent parse.
export const caseBrief = internalQuery({
  args: { caseId: v.id("cases") },
  handler: async (ctx, { caseId }) => {
    const c = await ctx.db.get(caseId);
    if (!c) return null;
    const s = await ctx.db
      .query("simState")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .unique();
    return {
      subjectFacts: c.subjectFacts,
      landmarks: c.landmarks.map((l) => l.name),
      simClockMin: s?.simClockMin ?? 0,
    };
  },
});

// Parse a submitted command via the LLM, then dispatch it. Scheduled by
// commands.submit. On ANY LLM error, fall back to fallbackParse and still apply.
export const processCommand = internalAction({
  args: {
    caseId: v.id("cases"),
    commandId: v.id("commands"),
    rawText: v.string(),
  },
  handler: async (ctx, { caseId, commandId, rawText }) => {
    let intent: Intent;
    try {
      const cx = await ctx.runQuery(internal.intel.caseBrief, { caseId });
      const { object } = await generateObject({
        model: respan.chat(MODEL),
        schema: intentEnvelope,
        // Frozen intentSchema is a union with optionals; relax strict mode.
        providerOptions: { openai: { strictJsonSchema: false } },
        system: buildIntentSystem(
          cx ?? { subjectFacts: "", landmarks: [], simClockMin: 0 },
        ),
        prompt: rawText,
      });
      intent = object.intent;
    } catch (e) {
      console.error("[intel] intent parse failed, using fallbackParse:", e);
      intent = fallbackParse(rawText);
    }
    await ctx.runMutation(internal.intel.applyIntent, {
      caseId,
      commandId,
      intent,
    });
  },
});

// ============================================================
// Dispatch a parsed intent. Pure state changes happen here; anything that
// needs an LLM (query_status, rerun_hypothesis) sets an immediate response and
// schedules an action to enrich it — the response is NEVER left empty.
// ============================================================
export const applyIntent = internalMutation({
  args: { caseId: v.id("cases"), commandId: v.id("commands"), intent: v.any() },
  handler: async (ctx, { caseId, commandId, intent }) => {
    const typed = intent as Intent;
    let response = "Done.";
    let status: "applied" | "failed" = "applied";

    switch (typed.type) {
      case "pause_sim": {
        const s = await simRow(ctx, caseId);
        if (s) await ctx.db.patch(s._id, { running: false });
        response = "Simulation paused.";
        break;
      }
      case "resume_sim": {
        const s = await simRow(ctx, caseId);
        if (s && !s.running) {
          await ctx.db.patch(s._id, { running: true });
          await ctx.scheduler.runAfter(0, internal.sim.tick, { caseId });
        }
        response = "Simulation resumed.";
        break;
      }
      case "add_tip": {
        const c = await ctx.db.get(caseId);
        if (!c) {
          response = "No active case.";
          status = "failed";
          break;
        }
        const place = typed.place
          ? c.landmarks.find((l) =>
              l.name.toLowerCase().includes(typed.place!.toLowerCase()),
            )
          : undefined;
        const s = await simRow(ctx, caseId);
        await ctx.runMutation(internal.intel.insertTipFromIntent, {
          caseId,
          text: typed.text,
          lat: typed.lat ?? place?.lat ?? c.lastKnownLat,
          lng: typed.lng ?? place?.lng ?? c.lastKnownLng,
          observedAtSimMin: Math.max(
            0,
            (s?.simClockMin ?? 0) - (typed.minutesAgo ?? 0),
          ),
          source: typed.source ?? "voice",
        });
        response = place
          ? `Tip logged near ${place.name} and pushed to the reasoning layer.`
          : "Tip logged and pushed to the reasoning layer.";
        break;
      }
      case "query_status": {
        // Gather now, answer with a grounded template immediately, then let an
        // LLM action upgrade it to a two-sentence coordinator voice.
        const facts = await gatherStatus(ctx, caseId);
        response = buildStatusTemplate(facts);
        await ctx.scheduler.runAfter(0, internal.intel.statusReadback, {
          caseId,
          commandId,
          question: typed.question,
        });
        break;
      }
      case "rerun_hypothesis": {
        response = `Re-running the ${typed.profile} hypothesis.`;
        await ctx.scheduler.runAfter(0, internal.intel.rerunHypothesis, {
          caseId,
          profile: typed.profile,
        });
        break;
      }
      case "set_time_missing": {
        // Parsed fine, but changing the sim clock is Person A's surface and no
        // mutation for it exists yet — respond gracefully (CONTRACTS §1).
        response = `Noted: set time-missing to ${typed.hours}h. Wiring to the sim clock is owned by the sim module and isn't hooked up yet.`;
        break;
      }
      default:
        response = "Sorry, I couldn't parse that command.";
        status = "failed";
    }

    await ctx.db.patch(commandId, { intent: typed, status, response });
  },
});

// Internal shim so applyIntent (a mutation) can enter the event clock without
// calling a public mutation. Mirrors tips.addTip exactly.
export const insertTipFromIntent = internalMutation({
  args: {
    caseId: v.id("cases"),
    text: v.string(),
    lat: v.number(),
    lng: v.number(),
    observedAtSimMin: v.number(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const tipId = await ctx.db.insert("tips", {
      ...args,
      credibility: 0.5,
      weight: 1,
    });
    await ctx.scheduler.runAfter(0, internal.intel.onNewTip, {
      caseId: args.caseId,
      tipId,
    });
    return tipId;
  },
});

// ============================================================
// Task 3 — Hypothesis reasoning on the event clock.
// ============================================================

// Atomic debounce: returns true (and stamps lastReasonedAt) iff it has been
// >= DEBOUNCE_MS since the last reasoning pass. Being a mutation makes this
// race-safe even if two tips land near-simultaneously.
export const tryClaimReasoning = internalMutation({
  args: { caseId: v.id("cases") },
  handler: async (ctx, { caseId }): Promise<boolean> => {
    const s = await simRow(ctx, caseId);
    if (!s) return false;
    const now = Date.now();
    if (s.lastReasonedAt && now - s.lastReasonedAt < DEBOUNCE_MS) return false;
    await ctx.db.patch(s._id, { lastReasonedAt: now });
    return true;
  },
});

// Everything onNewTip needs, in one round trip.
export const reasoningContext = internalQuery({
  args: { caseId: v.id("cases"), tipId: v.id("tips") },
  handler: async (ctx, { caseId, tipId }) => {
    const c = await ctx.db.get(caseId);
    const tip = await ctx.db.get(tipId);
    if (!c || !tip) return null;
    const s = await simRow(ctx, caseId);
    const hypotheses = await ctx.db
      .query("hypotheses")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .collect();
    return {
      subjectFacts: c.subjectFacts,
      simClockMin: s?.simClockMin ?? 0,
      lastKnownLat: c.lastKnownLat,
      lastKnownLng: c.lastKnownLng,
      tip: {
        text: tip.text,
        source: tip.source,
        lat: tip.lat,
        lng: tip.lng,
        observedAtSimMin: tip.observedAtSimMin,
      },
      hypotheses: hypotheses.map((h) => ({
        _id: h._id,
        profile: h.profile,
        threadId: h.threadId,
        weight: h.weight,
        reasoning: h.reasoning,
        mobilityKmH: h.mobilityKmH,
      })),
    };
  },
});

export const setHypothesisThread = internalMutation({
  args: { hypothesisId: v.id("hypotheses"), threadId: v.string() },
  handler: async (ctx, { hypothesisId, threadId }) => {
    await ctx.db.patch(hypothesisId, { threadId });
  },
});

// Person C owns tips.credibility. Patched only from here.
export const patchTipCredibility = internalMutation({
  args: { tipId: v.id("tips"), credibility: v.number() },
  handler: async (ctx, { tipId, credibility }) => {
    await ctx.db.patch(tipId, { credibility });
  },
});

// Patch the four hypothesis rows with normalized weights + fresh reasoning.
// B's panel flashes on updatedAt; A's next tick consumes weight/params blindly.
export const commitHypotheses = internalMutation({
  args: {
    caseId: v.id("cases"),
    updates: v.array(
      v.object({
        profile: v.string(),
        weight: v.number(),
        reasoning: v.string(),
        mobilityKmH: v.number(),
      }),
    ),
  },
  handler: async (ctx, { caseId, updates }) => {
    const rows = await ctx.db
      .query("hypotheses")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .collect();
    const byProfile = new Map(rows.map((r) => [r.profile, r]));
    const now = Date.now();
    for (const u of updates) {
      const row = byProfile.get(u.profile);
      if (!row) continue;
      await ctx.db.patch(row._id, {
        weight: u.weight,
        reasoning: u.reasoning,
        mobilityKmH: u.mobilityKmH,
        updatedAt: now,
      });
    }
  },
});

// Event-clock entrypoint, scheduled by tips.addTip / insertTipFromIntent.
export const onNewTip = internalAction({
  args: { caseId: v.id("cases"), tipId: v.id("tips") },
  handler: async (ctx, { caseId, tipId }) => {
    // 3a. Debounce (two-clock law).
    const claimed = await ctx.runMutation(internal.intel.tryClaimReasoning, {
      caseId,
    });
    if (!claimed) {
      console.log("[intel] onNewTip debounced");
      return;
    }

    const cx = await ctx.runQuery(internal.intel.reasoningContext, {
      caseId,
      tipId,
    });
    if (!cx) return;
    const reason: ReasonContext = {
      subjectFacts: cx.subjectFacts,
      simClockMin: cx.simClockMin,
      lastKnownLat: cx.lastKnownLat,
      lastKnownLng: cx.lastKnownLng,
      tip: cx.tip,
    };

    // 3b. Judge tip credibility, patch tips.credibility.
    let credibility = 0.5;
    try {
      const { object } = await generateObject({
        model: respan.chat(MODEL),
        schema: judgeSchema,
        prompt: buildJudgePrompt(reason),
      });
      credibility = clamp01(object.credibility);
      console.log(`[intel] judged credibility ${credibility}: ${object.rationale}`);
    } catch (e) {
      console.error("[intel] tip judge failed, keeping 0.5:", e);
    }
    await ctx.runMutation(internal.intel.patchTipCredibility, {
      tipId,
      credibility,
    });

    // 3c. Ensure each profile has a persistent thread (lazy, first-run only).
    const withThreads = await Promise.all(
      cx.hypotheses.map(async (h) => {
        const key = h.profile as Profile["key"];
        let threadId = h.threadId;
        if (!threadId && hypothesisAgents[key]) {
          const created = await hypothesisAgents[key].createThread(ctx, {
            title: `hypothesis-${key}`,
          });
          threadId = created.threadId;
          await ctx.runMutation(internal.intel.setHypothesisThread, {
            hypothesisId: h._id,
            threadId,
          });
        }
        return { ...h, key, threadId };
      }),
    );

    // Ask all four threads in parallel (we're in an action).
    const raws: RawWeight[] = await Promise.all(
      withThreads.map(async (h): Promise<RawWeight> => {
        const agent = hypothesisAgents[h.key];
        if (!agent || !h.threadId) {
          return keepCurrent(h);
        }
        try {
          const { object } = await agent.generateObject(
            ctx,
            { threadId: h.threadId },
            {
              schema: hypothesisSchema,
              prompt: buildHypothesisPrompt(reason, h.key, credibility),
            },
          );
          return {
            profile: h.key,
            weight: clamp01(object.weight),
            reasoning: object.reasoning,
            mobilityKmH: object.mobilityKmH,
          };
        } catch (e) {
          console.error(`[intel] hypothesis ${h.key} failed, keeping current:`, e);
          return keepCurrent(h);
        }
      }),
    );

    // 3d. Normalize (floor 0.02, sum 1) and commit.
    await ctx.runMutation(internal.intel.commitHypotheses, {
      caseId,
      updates: normalizeWeights(raws),
    });
  },
});

// Latest tip + all hypotheses, for a manual single-profile re-run.
export const rerunContext = internalQuery({
  args: { caseId: v.id("cases") },
  handler: async (ctx, { caseId }) => {
    const c = await ctx.db.get(caseId);
    if (!c) return null;
    const s = await simRow(ctx, caseId);
    const tips = await ctx.db
      .query("tips")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .collect();
    const latest = tips.length ? tips[tips.length - 1] : null;
    const hypotheses = await ctx.db
      .query("hypotheses")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .collect();
    return {
      subjectFacts: c.subjectFacts,
      simClockMin: s?.simClockMin ?? 0,
      latest: latest
        ? { text: latest.text, credibility: latest.credibility }
        : null,
      hypotheses: hypotheses.map((h) => ({
        _id: h._id,
        profile: h.profile,
        threadId: h.threadId,
        weight: h.weight,
        reasoning: h.reasoning,
        mobilityKmH: h.mobilityKmH,
      })),
    };
  },
});

// rerun_hypothesis: re-run ONE profile's thread, then renormalize the four.
export const rerunHypothesis = internalAction({
  args: {
    caseId: v.id("cases"),
    profile: v.union(
      v.literal("hiker"),
      v.literal("dementia"),
      v.literal("child"),
      v.literal("injured"),
    ),
  },
  handler: async (ctx, { caseId, profile }) => {
    const cx = await ctx.runQuery(internal.intel.rerunContext, { caseId });
    if (!cx) return;
    const target = cx.hypotheses.find((h) => h.profile === profile);
    if (!target) return;
    const p = PROFILES[profile];

    // Ensure a thread exists.
    let threadId = target.threadId;
    if (!threadId) {
      const created = await hypothesisAgents[profile].createThread(ctx, {
        title: `hypothesis-${profile}`,
      });
      threadId = created.threadId;
      await ctx.runMutation(internal.intel.setHypothesisThread, {
        hypothesisId: target._id,
        threadId,
      });
    }

    const prompt = cx.latest
      ? `Reconsider. Latest tip (credibility ${cx.latest.credibility.toFixed(2)}): "${cx.latest.text}". Re-state your weight (0-1) and reasoning for the ${p.label} profile given all evidence so far, and mobilityKmH within +-50% of ${p.mobilityKmH}.`
      : `Reconsider from scratch (no tips yet). State your prior weight (0-1) and reasoning for the ${p.label} profile for this case: ${cx.subjectFacts}. mobilityKmH within +-50% of ${p.mobilityKmH}.`;

    let updated: RawWeight;
    try {
      const { object } = await hypothesisAgents[profile].generateObject(
        ctx,
        { threadId },
        { schema: hypothesisSchema, prompt },
      );
      updated = {
        profile,
        weight: clamp01(object.weight),
        reasoning: object.reasoning,
        mobilityKmH: object.mobilityKmH,
      };
    } catch (e) {
      console.error(`[intel] rerun ${profile} failed:`, e);
      return; // leave the panel as-is
    }

    // Renormalize across the four (others keep their current values).
    const raws: RawWeight[] = cx.hypotheses.map((h) =>
      h.profile === profile
        ? updated
        : {
            profile: h.profile as Profile["key"],
            weight: h.weight,
            reasoning: h.reasoning,
            mobilityKmH: h.mobilityKmH,
          },
    );
    await ctx.runMutation(internal.intel.commitHypotheses, {
      caseId,
      updates: normalizeWeights(raws),
    });
  },
});

// ============================================================
// Task 4 — query_status read-back.
// ============================================================

export const statusFacts = internalQuery({
  args: { caseId: v.id("cases") },
  handler: async (ctx, { caseId }): Promise<StatusFacts> => {
    return await gatherStatus(ctx, caseId);
  },
});

export const statusReadback = internalAction({
  args: {
    caseId: v.id("cases"),
    commandId: v.id("commands"),
    question: v.string(),
  },
  handler: async (ctx, { caseId, commandId, question }) => {
    const facts = await ctx.runQuery(internal.intel.statusFacts, { caseId });
    try {
      const { text } = await generateText({
        model: respan.chat(MODEL),
        prompt: buildStatusPrompt(facts, question),
      });
      const answer = text.trim();
      if (answer) {
        await ctx.runMutation(internal.intel.setCommandResponse, {
          commandId,
          response: answer,
        });
      }
    } catch (e) {
      // Template answer set by applyIntent stays in place.
      console.error("[intel] status readback LLM failed, keeping template:", e);
    }
  },
});

export const setCommandResponse = internalMutation({
  args: { commandId: v.id("commands"), response: v.string() },
  handler: async (ctx, { commandId, response }) => {
    await ctx.db.patch(commandId, { response });
  },
});

// ============================================================
// Shared DB helpers.
// ============================================================

async function simRow(ctx: QueryCtx, caseId: import("./_generated/dataModel").Id<"cases">) {
  return await ctx.db
    .query("simState")
    .withIndex("by_case", (q) => q.eq("caseId", caseId))
    .unique();
}

// Top-3 hottest UNSEARCHED cells (with nearest landmark), team statuses,
// leading hypothesis, sim clock. Used for both the template and the LLM prompt.
async function gatherStatus(
  ctx: QueryCtx,
  caseId: import("./_generated/dataModel").Id<"cases">,
): Promise<StatusFacts> {
  const c = await ctx.db.get(caseId);
  const s = await simRow(ctx, caseId);
  const teamsRows = await ctx.db
    .query("teams")
    .withIndex("by_case", (q) => q.eq("caseId", caseId))
    .collect();
  const hyps = await ctx.db
    .query("hypotheses")
    .withIndex("by_case", (q) => q.eq("caseId", caseId))
    .collect();

  const teams = teamsRows.map((t) => ({ name: t.name, status: t.status }));
  const leadRow = hyps.reduce<(typeof hyps)[number] | null>(
    (best, h) => (!best || h.weight > best.weight ? h : best),
    null,
  );
  const leading = leadRow
    ? { profile: leadRow.profile, weight: leadRow.weight, reasoning: leadRow.reasoning }
    : null;

  let hotCells: StatusFacts["hotCells"] = [];
  if (c && s) {
    const bounds = {
      swLat: c.boundsSwLat,
      swLng: c.boundsSwLng,
      neLat: c.boundsNeLat,
      neLng: c.boundsNeLng,
    };
    // grids table has exactly gridSize^2 rows for this case (bounded).
    const grids = await ctx.db
      .query("grids")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .collect();
    const searched = new Set(
      grids.filter((g) => g.searched).map((g) => `${g.x},${g.y}`),
    );
    const candidates: { x: number; y: number; heat: number }[] = [];
    for (let y = 0; y < s.heatmap.length; y++) {
      const row = s.heatmap[y];
      for (let x = 0; x < row.length; x++) {
        if (searched.has(`${x},${y}`)) continue;
        if (row[x] > 0) candidates.push({ x, y, heat: row[x] });
      }
    }
    candidates.sort((a, b) => b.heat - a.heat);
    hotCells = candidates.slice(0, 3).map((cell) => {
      const center = cellCenter(bounds, c.gridSize, { x: cell.x, y: cell.y });
      let landmark = "open terrain";
      let km = Infinity;
      for (const l of c.landmarks) {
        const d = distanceKm(center.lat, center.lng, l.lat, l.lng);
        if (d < km) {
          km = d;
          landmark = l.name;
        }
      }
      return { x: cell.x, y: cell.y, heat: cell.heat, landmark, km: km === Infinity ? 0 : km };
    });
  }

  return { simClockMin: s?.simClockMin ?? 0, hotCells, teams, leading };
}

// ============================================================
// Small pure helpers.
// ============================================================

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function keepCurrent(h: {
  key: Profile["key"];
  weight: number;
  reasoning: string;
  mobilityKmH: number;
}): RawWeight {
  return {
    profile: h.key,
    weight: h.weight,
    reasoning: h.reasoning,
    mobilityKmH: clampNudge(h.mobilityKmH, PROFILES[h.key].mobilityKmH),
  };
}
