// OWNER: Person B (map & UI). The found moment — unmissable from the back
// of the room. Full-screen veil + banner strip; pointer-events pass through
// so the map stays live underneath.
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { latLngToCell } from "../../convex/lib/geo";
import { simTime } from "../lib/format";

export function FoundOverlay({ activeCase }: { activeCase: Doc<"cases"> }) {
  const sim = useQuery(api.sim.state, { caseId: activeCase._id });
  if (activeCase.status !== "found" || !sim) return null;

  const bounds = {
    swLat: activeCase.boundsSwLat,
    swLng: activeCase.boundsSwLng,
    neLat: activeCase.boundsNeLat,
    neLng: activeCase.boundsNeLng,
  };
  const cell = latLngToCell(
    bounds,
    activeCase.gridSize,
    activeCase.hiddenTrueLat,
    activeCase.hiddenTrueLng,
  );

  // Prediction-match line: where the found cell ranked in the final
  // probability picture. Skip when the heatmap is empty (pre-engine stub).
  let predictionLine: string | null = null;
  const values = sim.heatmap.flat();
  const p = sim.heatmap[cell.y]?.[cell.x] ?? 0;
  if (values.some((val) => val > 0)) {
    const rank = values.filter((val) => val > p).length;
    const topPct = Math.max(1, Math.ceil(((rank + 1) / values.length) * 100));
    predictionLine = `Predicted — top ${topPct}% of search area`;
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 flex items-end pb-16"
      style={{ animation: "found-veil 600ms ease-out" }}
    >
      {/* Lower-third strip: flyTo centers the subject marker — keep it visible. */}
      <div className="absolute inset-0 bg-black/35" />
      <div
        className="relative w-full border-y-2 border-accent bg-black/85 py-8 text-center backdrop-blur-sm"
        style={{ animation: "found-strip 500ms cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <p className="text-4xl font-black uppercase tracking-[0.35em] text-accent md:text-6xl">
          Subject located
        </p>
        <p className="mt-4 font-mono text-lg tabular-nums tracking-[0.2em] text-white/90 md:text-2xl">
          {simTime(sim.simClockMin)} · Grid ({cell.x}, {cell.y})
        </p>
        {predictionLine && (
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.25em] text-white/60 md:text-sm">
            {predictionLine}
          </p>
        )}
        {/* W5: after-action debrief — written by internal.debrief.generate
            shortly after the found moment. Shimmer until it lands. */}
        <div className="mx-auto mt-6 max-w-2xl px-6 text-left">
          {activeCase.debrief ? (
            <div className="whitespace-pre-line font-mono text-xs leading-relaxed text-white/80 md:text-sm">
              {activeCase.debrief.split("\n").map((line, i) => {
                const m = line.match(/^([A-Z][A-Z ]+):\s*(.*)$/);
                return m ? (
                  <p key={i}>
                    <span className="text-amber-400">{m[1]}:</span> {m[2]}
                  </p>
                ) : (
                  <p key={i}>{line}</p>
                );
              })}
            </div>
          ) : (
            <p className="animate-pulse text-center font-mono text-xs uppercase tracking-[0.25em] text-white/50">
              generating after-action debrief…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
