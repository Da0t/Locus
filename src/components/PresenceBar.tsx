// OWNER: W6 (presence). Live "coordinators online" facepile for the header.
import { useState } from "react";
import usePresence from "@convex-dev/presence/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { cn } from "../lib/utils";

const ADJECTIVES = [
  "amber",
  "cobalt",
  "drifting",
  "ember",
  "granite",
  "hollow",
  "keen",
  "lunar",
  "mossy",
  "north",
  "quiet",
  "ridge",
  "summit",
  "timber",
  "vector",
  "wolf",
];

function tabName(): string {
  const key = "locus-presence-name";
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const name = `coordinator-${adjective}`;
    sessionStorage.setItem(key, name);
    return name;
  } catch {
    return `coordinator-${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]}`;
  }
}

function adjectiveOf(userId: string): string {
  return userId.replace(/^coordinator-/, "");
}

export function PresenceBar({ caseId }: { caseId: Id<"cases"> }) {
  const [name] = useState(tabName);
  const presenceState = usePresence(api.presence, caseId, name);

  const online = (presenceState ?? []).filter((p) => p.online);
  if (online.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center -space-x-1.5">
        {online.slice(0, 4).map((p) => {
          const self = p.userId === name;
          return (
            <div
              key={p.userId}
              title={p.userId}
              className={cn(
                "relative flex size-5 items-center justify-center rounded-full border bg-secondary font-mono text-[9px] font-bold uppercase text-muted-foreground",
                self ? "border-primary/60 text-primary" : "border-border",
              )}
            >
              {adjectiveOf(p.userId).charAt(0)}
              {self && (
                <span className="absolute -right-px -top-px size-1.5 animate-pulse rounded-full bg-primary" />
              )}
            </div>
          );
        })}
      </div>
      <span className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {online.length} coordinator{online.length === 1 ? "" : "s"} online
      </span>
    </div>
  );
}
