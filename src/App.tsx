// OWNER: Person B (map & UI). Layout shell — keep the <CommandConsole />
// slot (Person D owns that component's internals).
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { MapView } from "./components/MapView";
import { ReasoningPanel } from "./components/ReasoningPanel";
import { TipsFeed } from "./components/TipsFeed";
import { StatusBar } from "./components/StatusBar";
import { CommandConsole } from "./components/voice/CommandConsole";
import { Toaster } from "./components/Toaster";
import { FoundOverlay } from "./components/FoundOverlay";
import { Button } from "./components/ui/button";

function Wordmark() {
  return (
    <div className="flex items-baseline gap-3">
      <h1 className="text-lg font-black leading-none tracking-[0.35em]">
        LOCUS<span className="text-primary">.</span>
      </h1>
      <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        Search &amp; Rescue Command
      </span>
    </div>
  );
}

export default function App() {
  const activeCase = useQuery(api.cases.active);
  const seedDemo = useMutation(api.scenario.seedDemo);
  const setRunning = useMutation(api.sim.setRunning);

  if (activeCase === undefined) {
    // Loading: dark splash, never a blank flash.
    return (
      <main className="flex h-screen items-center justify-center bg-background">
        <h1 className="animate-pulse text-2xl font-black tracking-[0.35em] text-muted-foreground">
          LOCUS
        </h1>
      </main>
    );
  }
  if (activeCase === null) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-6 bg-background">
        <div className="text-center">
          <h1 className="text-5xl font-black tracking-[0.35em]">
            LOCUS<span className="text-primary">.</span>
          </h1>
          <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Search &amp; Rescue Command
          </p>
        </div>
        <p className="text-sm text-muted-foreground">No active case.</p>
        <Button
          className="font-mono text-xs font-bold uppercase tracking-[0.18em]"
          onClick={() => void seedDemo()}
        >
          Open demo case
        </Button>
      </main>
    );
  }

  const found = activeCase.status === "found";

  return (
    <main className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between gap-6 border-b bg-card px-4 py-2">
        <div className="flex min-w-0 items-center gap-5">
          <Wordmark />
          <div className="h-8 w-px shrink-0 bg-border" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">{activeCase.name}</span>
              <span
                className={
                  found
                    ? "rounded-sm border border-accent/50 bg-accent/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.18em] text-accent"
                    : "rounded-sm border border-primary/50 bg-primary/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.18em] text-primary"
                }
              >
                {activeCase.status}
              </span>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              {activeCase.subjectFacts}
            </p>
          </div>
        </div>
        <StatusBar
          caseId={activeCase._id}
          found={found}
          onToggleRunning={(running) =>
            void setRunning({ caseId: activeCase._id, running })
          }
        />
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <MapView activeCase={activeCase} />
        </div>
        <aside className="flex w-[380px] shrink-0 flex-col border-l bg-card">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ReasoningPanel caseId={activeCase._id} />
            <TipsFeed caseId={activeCase._id} />
          </div>
          <div className="border-t">
            <CommandConsole caseId={activeCase._id} />
          </div>
        </aside>
      </div>
      <FoundOverlay activeCase={activeCase} />
      <Toaster />
    </main>
  );
}
