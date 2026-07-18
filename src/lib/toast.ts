// OWNER: Person B (map & UI). Minimal toast store — no deps, module-level
// pub/sub consumed via useSyncExternalStore in <Toaster />.
export type Toast = {
  id: number;
  message: string;
  tone: "error" | "info";
};

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function toast(message: string, tone: Toast["tone"] = "error") {
  const id = nextId++;
  toasts = [...toasts, { id, message, tone }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 5000);
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts() {
  return toasts;
}

// Convex dev surfaces thrown mutation errors as
// "[CONVEX M(...)] [Request ID: ...] Server Error\nUncaught Error: <msg>…" —
// extract the human line ("Cell already claimed by another team" IS the demo).
export function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const m = raw.match(/Uncaught Error:\s*([^\n]+)/);
  return (m ? m[1] : raw).trim();
}
