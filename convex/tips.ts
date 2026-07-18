// OWNER: Person A (sim core). The ONLY entrypoint for tips — Person C's
// intent dispatch and Person D's scripted scenario both call addTip.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const addTip = mutation({
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
      credibility: 0.5, // Person C's judge overwrites this
      weight: 1,
    });
    // Event clock: wake the reasoning layer (Person C). No-op stub on main.
    await ctx.scheduler.runAfter(0, internal.intel.onNewTip, {
      caseId: args.caseId,
      tipId,
    });
    return tipId;
  },
});

export const list = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, { caseId }) => {
    return await ctx.db
      .query("tips")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .collect();
  },
});
