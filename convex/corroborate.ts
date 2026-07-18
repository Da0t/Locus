// OWNER: W1 (tip corroboration). New lane — for each incoming tip it asks the
// Respan gateway for an embedding, then vector-searches the case's earlier
// tips for a near-duplicate. A close match tags the tip as `corroborates`
// and nudges its credibility up: two independent reports of the same thing
// is stronger intel. Runs off the EVENT clock (scheduled by tips.addTip),
// never inside the fast tick, and fails soft — if the gateway is down the tip
// is still saved and fully usable, it just won't carry a corroboration link.
import { v } from "convex/values";
import { embed } from "ai";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { respan } from "./agents/client";

const MATCH_THRESHOLD = 0.6; // cosine score above which two tips corroborate — 0.8 was unreachable for real phrasing variance (text-embedding-3-small puts same-event reworded reports ~0.6-0.75)
const CRED_BUMP = 0.1; // credibility gain when a tip is corroborated
const CRED_CAP = 0.95; // corroborated intel is stronger, but never certain

// Actions have no ctx.db, so read the tip through an internal query.
export const getTip = internalQuery({
  args: { tipId: v.id("tips") },
  handler: async (ctx, { tipId }): Promise<Doc<"tips"> | null> => {
    return await ctx.db.get(tipId);
  },
});

// Persist the embedding and, when we matched a prior tip, the corroboration
// link plus a credibility nudge — all in one mutation so the write is atomic.
// Credibility is re-read here (not passed in) so we bump whatever the judge
// most recently set rather than a stale value.
export const saveCorroboration = internalMutation({
  args: {
    tipId: v.id("tips"),
    embedding: v.array(v.float64()),
    corroborates: v.optional(v.id("tips")),
  },
  handler: async (ctx, { tipId, embedding, corroborates }) => {
    const patch: Partial<Doc<"tips">> = { embedding, corroborates };
    if (corroborates) {
      const tip = await ctx.db.get(tipId);
      if (tip) patch.credibility = Math.min(CRED_CAP, tip.credibility + CRED_BUMP);
    }
    await ctx.db.patch(tipId, patch);
  },
});

export const embedTip = internalAction({
  args: { tipId: v.id("tips"), caseId: v.id("cases") },
  handler: async (ctx, { tipId, caseId }) => {
    const tip = await ctx.runQuery(internal.corroborate.getTip, { tipId });
    if (!tip) return;

    // Embed via the gateway. Seatbelt: a down gateway or missing key must not
    // break tip ingestion — log and bail, leaving the tip embedding-less.
    let embedding: number[];
    try {
      const result = await embed({
        model: respan.textEmbedding("text-embedding-3-small"),
        value: tip.text,
      });
      embedding = result.embedding;
    } catch (err) {
      console.error("corroborate.embedTip: embedding failed, skipping", err);
      return;
    }

    // Nearest prior tips in this case; skip self, require a strong match.
    const matches = await ctx.vectorSearch("tips", "by_embedding", {
      vector: embedding,
      limit: 3,
      filter: (q) => q.eq("caseId", caseId),
    });
    const best: Id<"tips"> | undefined = matches.find(
      (m) => m._id !== tipId && m._score > MATCH_THRESHOLD,
    )?._id;

    await ctx.runMutation(internal.corroborate.saveCorroboration, {
      tipId,
      embedding,
      corroborates: best,
    });
  },
});
