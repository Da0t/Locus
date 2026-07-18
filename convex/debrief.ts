// OWNER: W5 (after-action debrief). Fires once, when the sim's found check
// flips the case to "found" (convex/sim.ts schedules internal.debrief.generate).
// ONE generateText call rides the Respan gateway; on any LLM failure a plain
// template built from the same facts is written instead — the FoundOverlay
// panel must NEVER be left empty.
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { generateText } from "ai";
import { respan, MODEL } from "./agents/client";
import { latLngToCell } from "./lib/geo";

const SYSTEM =
  "You write terse SAR after-action debriefs. 5 short lines: OUTCOME / TIMELINE / DECISIVE INTEL / WHAT THE MODEL GOT RIGHT / ONE IMPROVEMENT.";

// Everything the debrief needs, in one round trip.
type DebriefFacts = {
  name: string;
  subjectFacts: string;
  foundCell: { x: number; y: number };
  simClockMin: number;
  foundAtTick: number | null;
  tips: { text: string; credibility: number; corroborated: boolean }[];
  hypotheses: { profile: string; weight: number; reasoning: string }[];
  searchedCellCount: number;
} | null;

export const facts = internalQuery({
  args: { caseId: v.id("cases") },
  handler: async (ctx, { caseId }): Promise<DebriefFacts> => {
    const c = await ctx.db.get(caseId);
    if (!c) return null;
    const s = await ctx.db
      .query("simState")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .unique();
    // Demo-scale case: per-case tips/hypotheses/grids are bounded (matches
    // the established .collect() pattern in intel.ts).
    const tips = await ctx.db
      .query("tips")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .collect();
    const hypotheses = await ctx.db
      .query("hypotheses")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .collect();
    const grids = await ctx.db
      .query("grids")
      .withIndex("by_case", (q) => q.eq("caseId", caseId))
      .collect();

    const bounds = {
      swLat: c.boundsSwLat,
      swLng: c.boundsSwLng,
      neLat: c.boundsNeLat,
      neLng: c.boundsNeLng,
    };
    const foundCell = latLngToCell(
      bounds,
      c.gridSize,
      c.hiddenTrueLat,
      c.hiddenTrueLng,
    );

    return {
      name: c.name,
      subjectFacts: c.subjectFacts,
      foundCell,
      simClockMin: s?.simClockMin ?? 0,
      foundAtTick: s?.foundAtTick ?? null,
      tips: tips.map((t) => ({
        text: t.text,
        credibility: t.credibility,
        corroborated: t.corroborates !== undefined,
      })),
      hypotheses: hypotheses.map((h) => ({
        profile: h.profile,
        weight: h.weight,
        reasoning: h.reasoning,
      })),
      searchedCellCount: grids.filter((g) => g.searched).length,
    };
  },
});

export const save = internalMutation({
  args: { caseId: v.id("cases"), debrief: v.string() },
  handler: async (ctx, { caseId, debrief }) => {
    await ctx.db.patch(caseId, { debrief });
  },
});

// Scheduled by the sim's found check. One gateway call; template on failure.
export const generate = internalAction({
  args: { caseId: v.id("cases") },
  handler: async (ctx, { caseId }) => {
    const f: DebriefFacts = await ctx.runQuery(internal.debrief.facts, {
      caseId,
    });
    if (!f) return;

    let debrief = "";
    try {
      const { text } = await generateText({
        model: respan.chat(MODEL),
        system: SYSTEM,
        prompt: JSON.stringify(f),
      });
      debrief = text.trim();
    } catch (e) {
      console.error("[debrief] LLM failed, writing template:", e);
    }
    if (!debrief) debrief = buildTemplate(f);

    await ctx.runMutation(internal.debrief.save, { caseId, debrief });
  },
});

// Seatbelt: a plain 5-line debrief from the same facts. Never empty.
function buildTemplate(f: NonNullable<DebriefFacts>): string {
  const hours = Math.floor(f.simClockMin / 60);
  const mins = Math.round(f.simClockMin % 60);
  const lead = f.hypotheses.reduce<
    { profile: string; weight: number; reasoning: string } | null
  >((best, h) => (!best || h.weight > best.weight ? h : best), null);
  const bestTip = f.tips.reduce<
    { text: string; credibility: number; corroborated: boolean } | null
  >((best, t) => (!best || t.credibility > best.credibility ? t : best), null);
  return [
    `OUTCOME: Subject located in grid (${f.foundCell.x}, ${f.foundCell.y}) — ${f.name}.`,
    `TIMELINE: Found at T+${hours}h${String(mins).padStart(2, "0")}m (tick ${f.foundAtTick ?? "?"}); ${f.searchedCellCount} cells searched, ${f.tips.length} tips logged.`,
    `DECISIVE INTEL: ${bestTip ? `"${bestTip.text}" (credibility ${bestTip.credibility.toFixed(2)}${bestTip.corroborated ? ", corroborated" : ""})` : "No tips received; located by systematic grid coverage."}`,
    `WHAT THE MODEL GOT RIGHT: Leading hypothesis was ${lead ? `${lead.profile} at weight ${lead.weight.toFixed(2)}` : "unavailable"}.`,
    `ONE IMPROVEMENT: Corroborate high-credibility tips faster to concentrate coverage earlier.`,
  ].join("\n");
}
