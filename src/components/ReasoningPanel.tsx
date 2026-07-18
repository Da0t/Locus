// OWNER: Person B (map & UI). Renders Person C's hypothesis reasoning.
// Rows re-sort by weight with a 600ms FLIP animation; a row flashes when
// its updatedAt changes — that flash is "the LLM just reasoned" on stage.
import { useLayoutEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { PROFILES } from "../../convex/profiles";
import { cn } from "../lib/utils";

function profileLabel(profile: string): string {
  return profile in PROFILES
    ? PROFILES[profile as keyof typeof PROFILES].label
    : profile;
}

export function ReasoningPanel({ caseId }: { caseId: Id<"cases"> }) {
  const hypotheses = useQuery(api.cases.hypotheses, { caseId });
  const rowRefs = useRef(new Map<string, HTMLDivElement | null>());
  const prevTops = useRef(new Map<string, number>());
  const prevUpdated = useRef(new Map<string, number>());

  const sorted = [...(hypotheses ?? [])].sort((a, b) => b.weight - a.weight);

  // FLIP: compare each row's screen position to last render; animate the
  // delta. Also flash rows whose updatedAt advanced.
  useLayoutEffect(() => {
    const tops = new Map<string, number>();
    for (const h of sorted) {
      const el = rowRefs.current.get(h.profile);
      if (!el) continue;
      const top = el.getBoundingClientRect().top;
      tops.set(h.profile, top);

      const prevTop = prevTops.current.get(h.profile);
      if (prevTop !== undefined && Math.abs(prevTop - top) > 1) {
        el.animate(
          [
            { transform: `translateY(${prevTop - top}px)` },
            { transform: "translateY(0)" },
          ],
          { duration: 600, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        );
      }

      const prev = prevUpdated.current.get(h.profile);
      if (prev !== undefined && prev !== h.updatedAt) {
        el.animate(
          [
            { backgroundColor: "rgba(245, 158, 11, 0.22)" },
            { backgroundColor: "rgba(245, 158, 11, 0)" },
          ],
          { duration: 1200, easing: "ease-out" },
        );
      }
      prevUpdated.current.set(h.profile, h.updatedAt);
    }
    prevTops.current = tops;
  });

  if (!hypotheses) return null;

  return (
    <div className="space-y-2.5 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          Hypotheses
        </h2>
        <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground/70">
          LLM · re-weighs on intel
        </span>
      </div>
      {sorted.map((h, i) => {
        const leader = i === 0;
        return (
          <div
            key={h.profile}
            ref={(el) => {
              rowRefs.current.set(h.profile, el);
            }}
            className={cn(
              "rounded-md border bg-background/40 p-3",
              leader ? "border-l-2 border-accent/80" : "border-border",
            )}
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                {profileLabel(h.profile)}
                {leader && (
                  <span className="rounded-sm bg-accent/15 px-1 py-px font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-accent">
                    Lead
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "font-mono text-base font-bold tabular-nums leading-none",
                  leader ? "text-accent" : "text-muted-foreground",
                )}
              >
                {(h.weight * 100).toFixed(0)}%
              </span>
            </div>
            <div className="mb-2 h-1.5 overflow-hidden rounded bg-muted">
              <div
                className={cn(
                  "h-full rounded transition-[width] duration-[600ms] ease-out",
                  leader ? "bg-accent" : "bg-primary/60",
                )}
                style={{ width: `${Math.round(h.weight * 100)}%` }}
              />
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {h.reasoning}
            </p>
          </div>
        );
      })}
    </div>
  );
}
