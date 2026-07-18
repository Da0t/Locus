// OWNER: Person B (map & UI). Renders the toast store — prominent, stage-
// readable. The claim-race loser message is a demo beat; never swallow it.
import { useSyncExternalStore } from "react";
import { getToasts, subscribe } from "../lib/toast";
import { cn } from "../lib/utils";

export function Toaster() {
  const toasts = useSyncExternalStore(subscribe, getToasts);
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-8 z-50 flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{ animation: "toast-in 200ms ease-out" }}
          className={cn(
            "rounded-md border px-5 py-3 font-mono text-sm font-bold uppercase tracking-[0.12em] shadow-2xl backdrop-blur",
            t.tone === "error"
              ? "border-red-500/70 bg-red-950/90 text-red-200"
              : "border-border bg-card/95 text-foreground",
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
