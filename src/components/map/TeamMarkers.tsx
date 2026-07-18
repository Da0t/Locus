// OWNER: Person B (map & UI). Team markers: smooth tick-to-tick motion
// (transition just under the 1.5s tick cadence, suppressed while the map
// itself moves so pan/zoom stays crisp), status glyph + name chip.
import { Marker } from "react-map-gl/mapbox";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { TEAM_GLYPH, teamColor } from "./palette";
import { cn } from "../../lib/utils";

export function TeamMarkers({
  teams,
  selectedId,
  onSelect,
  mapMoving,
}: {
  teams: Doc<"teams">[];
  selectedId: Id<"teams"> | null;
  onSelect: (teamId: Id<"teams">) => void;
  mapMoving: boolean;
}) {
  return (
    <>
      {teams.map((team, i) => {
        const color = teamColor(i);
        const selected = team._id === selectedId;
        return (
          <Marker
            key={team._id}
            latitude={team.lat}
            longitude={team.lng}
            anchor="center"
            style={{
              transition: mapMoving ? "none" : "transform 1.4s linear",
              zIndex: selected ? 4 : 2,
            }}
          >
            <button
              type="button"
              onClick={() => onSelect(team._id)}
              className={cn(
                "group flex cursor-pointer flex-col items-center gap-1 outline-none",
                selected && "scale-110",
              )}
              style={{ transition: "transform 200ms ease" }}
              title={`${team.name} — ${team.status}`}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border-2 bg-black/80 font-mono text-[13px] leading-none shadow-lg backdrop-blur",
                  selected && "ring-2 ring-white/90",
                )}
                style={{ borderColor: color, color }}
              >
                {TEAM_GLYPH[team.status]}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap rounded-sm border bg-black/75 px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-[0.14em] backdrop-blur",
                  selected ? "text-white" : "text-white/85",
                )}
                style={{ borderColor: selected ? color : "rgba(255,255,255,0.2)" }}
              >
                {team.name.replace(/^Team\s+/i, "")}
              </span>
            </button>
          </Marker>
        );
      })}
    </>
  );
}
