// OWNER: Person A (sim core). claimGrid is the contention-demo mutation:
// Convex serializes conflicting claims; the loser gets a clean error.
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, { caseId }) => {
    return await ctx.db
      .query("teams")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .collect();
  },
});

export const gridStates = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, { caseId }) => {
    // Only non-default rows matter to the UI; keep the wire small.
    const all = await ctx.db
      .query("grids")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .collect();
    return all.filter((g) => g.searched || g.claimedBy !== undefined);
  },
});

export const claimGrid = mutation({
  args: { teamId: v.id("teams"), x: v.number(), y: v.number() },
  handler: async (ctx, { teamId, x, y }) => {
    const team = await ctx.db.get(teamId);
    if (!team) throw new Error("Unknown team");
    const grid = await ctx.db
      .query("grids")
      .withIndex("by_cell", (q) =>
        q.eq("caseId", team.caseId).eq("x", x).eq("y", y),
      )
      .unique();
    if (!grid) throw new Error("Unknown grid cell");
    if (grid.claimedBy && grid.claimedBy !== teamId) {
      throw new Error("Cell already claimed by another team");
    }
    await ctx.db.patch(grid._id, { claimedBy: teamId });
    await ctx.db.patch(teamId, { assignedGridId: grid._id, status: "enroute" });
    return grid._id;
  },
});
