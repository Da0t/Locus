// OWNER: Person A (sim core). The fast clock.
// STUB on main: advances the sim clock and reschedules itself so every
// branch sees a live-updating world. Person A replaces the tick body with
// the real engine (Monte Carlo walker -> heatmap -> planner -> found check).
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { SIM } from "./profiles";

export const state = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, { caseId }) => {
    return await ctx.db
      .query("simState")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .unique();
  },
});

export const setRunning = mutation({
  args: { caseId: v.id("cases"), running: v.boolean() },
  handler: async (ctx, { caseId, running }) => {
    const s = await ctx.db
      .query("simState")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .unique();
    if (!s) throw new Error("No simState — seed the case first");
    const wasRunning = s.running;
    await ctx.db.patch(s._id, { running });
    if (running && !wasRunning) {
      await ctx.scheduler.runAfter(0, internal.sim.tick, { caseId });
    }
  },
});

export const tick = internalMutation({
  args: { caseId: v.id("cases") },
  handler: async (ctx, { caseId }) => {
    const s = await ctx.db
      .query("simState")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .unique();
    if (!s || !s.running) return; // paused: the self-scheduling chain stops

    // ---- STUB BODY (Person A: replace everything between the rails) ----
    await ctx.db.patch(s._id, {
      tick: s.tick + 1,
      simClockMin: s.simClockMin + s.minutesPerTick,
    });
    // --------------------------------------------------------------------

    await ctx.scheduler.runAfter(SIM.TICK_MS, internal.sim.tick, { caseId });
  },
});
