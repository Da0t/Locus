// OWNER: Person D (voice, scenario, demo). The demo-driver control strip that
// sits above the command console. One button: kick off the authored scripted
// tip drip (convex/scenario.ts). The driver clicks it once at "Run"; tips then
// arrive on their own clock and the heatmap reshapes hands-off.
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../ui/button";

export function ScenarioControls({
  caseId,
  stage,
}: {
  caseId: Id<"cases">;
  stage: boolean;
}) {
  const startDrip = useMutation(api.scenario.startDrip);
  const [started, setStarted] = useState(false);

  const run = () => {
    void startDrip({ caseId });
    setStarted(true);
  };

  return (
    <div className="flex items-center gap-2 border-b px-3 py-2">
      <Button
        size={stage ? "default" : "sm"}
        variant={started ? "secondary" : "default"}
        onClick={run}
        title="Inject the authored scripted tips on their demo clock"
      >
        {started ? "Restart tip drip" : "Start scripted tips"}
      </Button>
      <span
        className={
          started
            ? "text-xs text-emerald-600"
            : "text-xs text-muted-foreground"
        }
      >
        {started ? "tips dripping…" : "drives the demo hands-off"}
      </span>
    </div>
  );
}
