// OWNER: Person D (voice). Presentation metadata for the command-intent chips
// rendered in the console. Intent types come from the FROZEN vocabulary in
// convex/lib/contracts.ts — keep this map in sync if that union changes.

export type IntentType =
  | "add_tip"
  | "set_time_missing"
  | "rerun_hypothesis"
  | "pause_sim"
  | "resume_sim"
  | "query_status"
  | "unknown";

type ChipMeta = { label: string; className: string };

// Subtle tinted chips (bg + border + text) so each intent kind is scannable at
// a glance on stage. "unknown" is red so a mis-parse reads as HANDLED, not
// broken.
const META: Record<IntentType, ChipMeta> = {
  add_tip: {
    label: "add tip",
    className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  query_status: {
    label: "status",
    className: "bg-violet-500/15 text-violet-600 border-violet-500/30",
  },
  rerun_hypothesis: {
    label: "rerun",
    className: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
  },
  set_time_missing: {
    label: "set time",
    className: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
  },
  pause_sim: {
    label: "pause",
    className: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  },
  resume_sim: {
    label: "resume",
    className: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  },
  unknown: {
    label: "unknown",
    className: "bg-red-500/15 text-red-600 border-red-500/40",
  },
};

const PENDING: ChipMeta = {
  label: "parsing…",
  className: "bg-muted text-muted-foreground border-border",
};

export function intentChip(intentType: string | undefined): ChipMeta {
  if (!intentType) return PENDING;
  return META[intentType as IntentType] ?? META.unknown;
}
