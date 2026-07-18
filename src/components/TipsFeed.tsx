// OWNER: Person B (map & UI). Compact intel feed under the hypotheses:
// newest first, credibility as a small meter (Person C's judge scores),
// row opacity follows the tip's aged weight.
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { clamp } from "../../convex/lib/geo";
import { simTime } from "../lib/format";

export function TipsFeed({ caseId }: { caseId: Id<"cases"> }) {
  const tips = useQuery(api.tips.list, { caseId });
  if (!tips) return null;
  const sorted = [...tips].sort((a, b) => b._creationTime - a._creationTime);
  // Lookup for showing a snippet of the tip a report corroborates (W1).
  const byId = new Map(tips.map((t) => [t._id, t]));

  return (
    <div className="space-y-2 border-t p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          Intel feed
        </h2>
        <span className="font-mono text-[9px] tabular-nums text-muted-foreground/70">
          {tips.length} tip{tips.length === 1 ? "" : "s"}
        </span>
      </div>
      {sorted.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          No tips yet — report one through the console.
        </p>
      )}
      {sorted.map((tip) => {
        const source = tip.corroborates ? byId.get(tip.corroborates) : undefined;
        const snippet = source?.text.replace(/\s+/g, " ").trim();
        return (
        <div
          key={tip._id}
          style={{
            opacity: 0.35 + 0.65 * clamp(tip.weight, 0, 1),
            animation: "toast-in 300ms ease-out",
          }}
          className="rounded-md border border-border bg-background/40 p-2.5"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-accent">
              {tip.source}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              {simTime(tip.observedAtSimMin)}
            </span>
          </div>
          <p className="mb-1.5 text-[11px] leading-snug">{tip.text}</p>
          {tip.corroborates && (
            <p className="mb-1.5 font-mono text-[9px] leading-snug text-amber-500">
              ↳ corroborates earlier report
              {snippet && (
                <span className="text-amber-500/70">
                  {" — “"}
                  {snippet.length > 42 ? `${snippet.slice(0, 42)}…` : snippet}
                  {"”"}
                </span>
              )}
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
              Cred
            </span>
            <div className="h-1 flex-1 overflow-hidden rounded bg-muted">
              <div
                className="h-full rounded bg-accent transition-[width] duration-500"
                style={{ width: `${Math.round(tip.credibility * 100)}%` }}
              />
            </div>
            <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
              {(tip.credibility * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        );
      })}
    </div>
  );
}
