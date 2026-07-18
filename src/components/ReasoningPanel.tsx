// OWNER: Person B (map & UI). Renders Person C's hypothesis reasoning.
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function ReasoningPanel({ caseId }: { caseId: Id<"cases"> }) {
  const hypotheses = useQuery(api.cases.hypotheses, { caseId });
  if (!hypotheses) return null;
  const sorted = [...hypotheses].sort((a, b) => b.weight - a.weight);

  return (
    <div className="space-y-3 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Hypotheses
      </h2>
      {sorted.map((h) => (
        <div key={h._id} className="rounded-lg border p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-medium capitalize">{h.profile}</span>
            <span className="text-sm tabular-nums text-muted-foreground">
              {(h.weight * 100).toFixed(0)}%
            </span>
          </div>
          <div className="mb-2 h-1.5 overflow-hidden rounded bg-muted">
            <div
              className="h-full rounded bg-primary transition-all duration-700"
              style={{ width: `${Math.round(h.weight * 100)}%` }}
            />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {h.reasoning}
          </p>
        </div>
      ))}
    </div>
  );
}
