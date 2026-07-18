// OWNER: Person C (intelligence). The event clock: LLM reasoning fires on
// tips and commands, NEVER per tick.
// STUB on main: onNewTip is a no-op; parsing uses a regex fallback so the
// console works end-to-end before the LLM lands. Person C replaces both
// with @convex-dev/agent + the Respan gateway per plans/PERSON_C.md.
import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Intent } from "./lib/contracts";

// Event clock entrypoint, scheduled by tips.addTip.
export const onNewTip = internalAction({
  args: { caseId: v.id("cases"), tipId: v.id("tips") },
  handler: async () => {
    // TODO(Person C): score tip credibility (judge), then re-run the four
    // hypothesis agents to update weight/params/reasoning.
  },
});

// Regex fallback parser — replaced by LLM structured output (Person C).
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

// Parse a submitted command and apply it. Scheduled by commands.submit.
export const processCommand = internalAction({
  args: { caseId: v.id("cases"), commandId: v.id("commands"), rawText: v.string() },
  handler: async (ctx, { caseId, commandId, rawText }) => {
    // TODO(Person C): replace fallbackParse with generateObject via Respan.
    const intent = fallbackParse(rawText);
    await ctx.runMutation(internal.intel.applyIntent, {
      caseId,
      commandId,
      intent,
    });
  },
});

// Dispatch a parsed intent to Person A's mutations. Person C extends the
// switch; the mutations themselves belong to A.
export const applyIntent = internalMutation({
  args: { caseId: v.id("cases"), commandId: v.id("commands"), intent: v.any() },
  handler: async (ctx, { caseId, commandId, intent }) => {
    const typed = intent as Intent;
    let response = "Done.";
    switch (typed.type) {
      case "pause_sim": {
        const s = await ctx.db
          .query("simState")
          .withIndex("by_case", (q) => q.eq("caseId", caseId))
          .unique();
        if (s) await ctx.db.patch(s._id, { running: false });
        response = "Simulation paused.";
        break;
      }
      case "resume_sim": {
        const s = await ctx.db
          .query("simState")
          .withIndex("by_case", (q) => q.eq("caseId", caseId))
          .unique();
        if (s && !s.running) {
          await ctx.db.patch(s._id, { running: true });
          await ctx.scheduler.runAfter(0, internal.sim.tick, { caseId });
        }
        response = "Simulation resumed.";
        break;
      }
      case "add_tip": {
        const c = await ctx.db.get(caseId);
        if (!c) break;
        // Landmark resolution; falls back to the last-known point.
        const place = typed.place
          ? c.landmarks.find((l) =>
              l.name.toLowerCase().includes(typed.place!.toLowerCase()),
            )
          : undefined;
        const s = await ctx.db
          .query("simState")
          .withIndex("by_case", (q) => q.eq("caseId", caseId))
          .unique();
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
        response = "Tip logged and pushed to the reasoning layer.";
        break;
      }
      case "query_status":
        // TODO(Person C): answer from live state via the LLM, read back.
        response = "Status readback not implemented yet.";
        break;
      case "rerun_hypothesis":
        // TODO(Person C): re-run that hypothesis agent thread.
        response = `Re-running the ${typed.profile} hypothesis.`;
        break;
      default:
        response = "Sorry, I couldn't parse that command.";
    }
    await ctx.db.patch(commandId, {
      intent: typed,
      status: typed.type === "unknown" ? "failed" : "applied",
      response,
    });
  },
});

// Internal shim so applyIntent (a mutation) can reuse tips.addTip's logic
// without calling a public mutation. Mirrors tips.addTip exactly.
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
