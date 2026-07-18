// OWNER: Person B (map & UI). Layout shell — keep the <CommandConsole />
// slot (Person D owns that component's internals).
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { MapView } from "./components/MapView";
import { ReasoningPanel } from "./components/ReasoningPanel";
import { StatusBar } from "./components/StatusBar";
import { CommandConsole } from "./components/voice/CommandConsole";
import { Button } from "./components/ui/button";

export default function App() {
  const activeCase = useQuery(api.cases.active);
  const seedDemo = useMutation(api.scenario.seedDemo);
  const setRunning = useMutation(api.sim.setRunning);

  if (activeCase === undefined) return null; // loading
  if (activeCase === null) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">LOCUS</h1>
        <p className="text-muted-foreground">No active case.</p>
        <Button onClick={() => void seedDemo()}>Open demo case</Button>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight">
            LOCUS <span className="font-normal text-muted-foreground">/ {activeCase.name}</span>
          </h1>
        </div>
        <StatusBar
          caseId={activeCase._id}
          onToggleRunning={(running) =>
            void setRunning({ caseId: activeCase._id, running })
          }
        />
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <MapView activeCase={activeCase} />
        </div>
        <aside className="flex w-[380px] flex-col border-l">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ReasoningPanel caseId={activeCase._id} />
          </div>
          <div className="border-t">
            <CommandConsole caseId={activeCase._id} />
          </div>
        </aside>
      </div>
    </main>
  );
}
