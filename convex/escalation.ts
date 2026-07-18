// OWNER: W2 (cron escalation sweep). New lane — touches nothing else.
//
// A background re-audit of search coverage. Every couple of minutes it hunts
// for a hot cell that is still unsearched AND unclaimed and drops an [AUTO]
// escalation line into the console log — the same commands table the voice
// console reads, so this needs ZERO new UI. No LLM: pure read of the heatmap
// the fast tick already maintains.
import { internalMutation } from "./_generated/server";
import { cellCenter, type Bounds } from "./lib/geo";

const HOT_THRESHOLD = 0.6; // heatmap is normalized to max = 1

export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    // The single active case, or nothing to do.
    const caseDoc = await ctx.db
      .query("cases")
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    if (!caseDoc) return;

    const s = await ctx.db
      .query("simState")
      .withIndex("by_case", (q) => q.eq("caseId", caseDoc._id))
      .unique();
    if (!s || !s.running) return; // sim paused/unstarted: nothing to escalate

    // Search/claim state per cell; probabilities live in simState.heatmap[y][x].
    const grids = await ctx.db
      .query("grids")
      .withIndex("by_case", (q) => q.eq("caseId", caseDoc._id))
      .collect();

    // Hottest cell above threshold that is both unsearched and unclaimed.
    let best: { x: number; y: number; p: number } | null = null;
    for (const g of grids) {
      if (g.searched || g.claimedBy) continue;
      const p = s.heatmap[g.y]?.[g.x] ?? 0;
      if (p > HOT_THRESHOLD && (!best || p > best.p)) {
        best = { x: g.x, y: g.y, p };
      }
    }
    if (!best) return; // coverage is fine, or every hot cell is already handled

    const cellTag = `grid (${best.x},${best.y})`;

    // Dedupe: don't re-flag a cell already called out in the last few commands.
    const recent = await ctx.db
      .query("commands")
      .withIndex("by_case", (q) => q.eq("caseId", caseDoc._id))
      .order("desc")
      .take(5);
    const alreadyFlagged = recent.some(
      (c) =>
        c.rawText === "[AUTO] escalation sweep" &&
        (c.response ?? "").includes(cellTag),
    );
    if (alreadyFlagged) return;

    const bounds: Bounds = {
      swLat: caseDoc.boundsSwLat,
      swLng: caseDoc.boundsSwLng,
      neLat: caseDoc.boundsNeLat,
      neLng: caseDoc.boundsNeLng,
    };
    const center = cellCenter(bounds, caseDoc.gridSize, { x: best.x, y: best.y });
    const pct = Math.round(best.p * 100);

    await ctx.db.insert("commands", {
      caseId: caseDoc._id,
      rawText: "[AUTO] escalation sweep",
      intent: { type: "query_status", question: "escalation" },
      status: "applied",
      response:
        `ESCALATION: ${cellTag} holds ~${pct}% of probability mass and is ` +
        `unassigned (≈${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}). ` +
        `Recommend tasking a team.`,
    });
  },
});
