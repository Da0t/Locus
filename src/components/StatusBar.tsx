// OWNER: Person B (map & UI).
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "./ui/button";

export function StatusBar({
  caseId,
  onToggleRunning,
}: {
  caseId: Id<"cases">;
  onToggleRunning: (running: boolean) => void;
}) {
  const sim = useQuery(api.sim.state, { caseId });
  if (!sim) return null;
  const hours = Math.floor(sim.simClockMin / 60);
  const mins = Math.round(sim.simClockMin % 60);

  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="tabular-nums text-muted-foreground">
        missing {hours}h {mins.toString().padStart(2, "0")}m
      </span>
      <span className="tabular-nums text-muted-foreground">tick {sim.tick}</span>
      <Button
        size="sm"
        variant={sim.running ? "secondary" : "default"}
        onClick={() => onToggleRunning(!sim.running)}
      >
        {sim.running ? "Pause" : "Run"}
      </Button>
    </div>
  );
}
