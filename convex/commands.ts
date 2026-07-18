// OWNER: Person C (intelligence). Console entrypoint + audit log.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const submit = mutation({
  args: { caseId: v.id("cases"), rawText: v.string() },
  handler: async (ctx, { caseId, rawText }) => {
    const commandId = await ctx.db.insert("commands", {
      caseId,
      rawText,
      status: "pending",
    });
    await ctx.scheduler.runAfter(0, internal.intel.processCommand, {
      caseId,
      commandId,
      rawText,
    });
    return commandId;
  },
});

export const list = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, { caseId }) => {
    const all = await ctx.db
      .query("commands")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .collect();
    return all.slice(-20).reverse(); // newest first, bounded
  },
});
