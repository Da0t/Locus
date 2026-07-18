// OWNER: Person B (map & UI). Team chips overlaying the map: click to arm
// a team, then click a grid cell to claim it (the contention demo beat).
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { TEAM_GLYPH, teamColor } from "./palette";
import { cn } from "../../lib/utils";

export function TeamRoster({
  teams,
  selectedId,
  onSelect,
}: {
  teams: Doc<"teams">[];
  selectedId: Id<"teams"> | null;
  onSelect: (teamId: Id<"teams">) => void;
}) {
  if (teams.length === 0) return null;

  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-white/60">
        Teams
      </span>
      {teams.map((team, i) => {
        const color = teamColor(i);
        const selected = team._id === selectedId;
        return (
          <button
            key={team._id}
            type="button"
            onClick={() => onSelect(team._id)}
            className={cn(
              "flex items-center gap-2 rounded-md border bg-black/70 px-2.5 py-1.5 text-left shadow-lg backdrop-blur transition-colors",
              selected
                ? "border-white/80 bg-black/85"
                : "border-white/15 hover:border-white/40",
            )}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/90">
              {team.name.replace(/^Team\s+/i, "")}
            </span>
            <span className="ml-auto font-mono text-[10px]" style={{ color }}>
              {TEAM_GLYPH[team.status]}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/45">
              {team.status}
            </span>
          </button>
        );
      })}
      {selectedId && (
        <span
          className="mt-0.5 rounded-sm border border-accent/60 bg-black/80 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-accent"
          style={{ animation: "pulse-dot 1.6s ease-in-out infinite" }}
        >
          Click a grid cell to assign
        </span>
      )}
    </div>
  );
}
