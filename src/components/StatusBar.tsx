// OWNER: Person B (map & UI).
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { PresenceBar } from "./PresenceBar";

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span className={cn("font-mono text-xl font-semibold leading-tight tabular-nums", className)}>
        {value}
      </span>
    </div>
  );
}

export function StatusBar({
  caseId,
  found,
  onToggleRunning,
}: {
  caseId: Id<"cases">;
  found?: boolean;
  onToggleRunning: (running: boolean) => void;
}) {
  const sim = useQuery(api.sim.state, { caseId });
  if (!sim) return null;
  const hours = Math.floor(sim.simClockMin / 60);
  const mins = Math.floor(sim.simClockMin % 60);

  return (
    <div className="flex items-center gap-6">
      <PresenceBar caseId={caseId} />
      <Stat
        label="Missing"
        value={`T+${hours}h${mins.toString().padStart(2, "0")}m`}
        className={found ? "text-accent" : "text-foreground"}
      />
      <Stat label="Tick" value={sim.tick.toString().padStart(4, "0")} />
      <Stat label="Ring" value={`${sim.radiusKm.toFixed(1)}km`} />
      {found ? (
        <span className="rounded border border-accent/60 bg-accent/15 px-3 py-1.5 font-mono text-sm font-bold uppercase tracking-[0.18em] text-accent">
          Located
        </span>
      ) : (
        <Button
          size="sm"
          variant={sim.running ? "secondary" : "default"}
          className="min-w-20 font-mono text-xs font-bold uppercase tracking-[0.18em]"
          onClick={() => onToggleRunning(!sim.running)}
        >
          {sim.running ? "❚❚ Pause" : "▶ Run"}
        </Button>
      )}
    </div>
  );
}
