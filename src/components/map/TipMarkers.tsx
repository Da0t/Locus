// OWNER: Person B (map & UI). Tip sightings: small diamonds whose opacity
// is the tip's aged weight (they visibly fade as the sim clock runs), with
// a hover popup showing text + credibility.
import { useState } from "react";
import { Marker, Popup } from "react-map-gl/mapbox";
import type { Doc } from "../../../convex/_generated/dataModel";
import { clamp } from "../../../convex/lib/geo";

function simTime(min: number): string {
  return `T+${Math.floor(min / 60)}h${Math.floor(min % 60)
    .toString()
    .padStart(2, "0")}m`;
}

export function TipMarkers({ tips }: { tips: Doc<"tips">[] }) {
  const [hovered, setHovered] = useState<Doc<"tips"> | null>(null);

  return (
    <>
      {tips.map((tip) => (
        <Marker
          key={tip._id}
          latitude={tip.lat}
          longitude={tip.lng}
          anchor="center"
          style={{ zIndex: 1 }}
        >
          <div
            onMouseEnter={() => setHovered(tip)}
            onMouseLeave={() => setHovered(null)}
            style={{ opacity: clamp(tip.weight, 0.2, 1) }}
            className="h-3 w-3 rotate-45 cursor-help border border-amber-100/90 bg-amber-400/90 shadow-md"
          />
        </Marker>
      ))}
      {hovered && (
        <Popup
          latitude={hovered.lat}
          longitude={hovered.lng}
          anchor="bottom"
          offset={12}
          closeButton={false}
          closeOnClick={false}
          maxWidth="260px"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-amber-400">
                {hovered.source}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/50">
                {simTime(hovered.observedAtSimMin)}
              </span>
            </div>
            <p className="text-[11px] leading-snug text-white/90">{hovered.text}</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/50">
                Cred
              </span>
              <div className="h-1 flex-1 overflow-hidden rounded bg-white/15">
                <div
                  className="h-full rounded bg-amber-400"
                  style={{ width: `${Math.round(hovered.credibility * 100)}%` }}
                />
              </div>
              <span className="font-mono text-[9px] tabular-nums text-white/70">
                {(hovered.credibility * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}
