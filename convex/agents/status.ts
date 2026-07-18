// OWNER: Person C (intelligence). Pure helpers for the query_status read-back.
// The DB gather lives in intel.ts (needs ctx.db); these shape the answer.

export type HotCell = {
  x: number;
  y: number;
  heat: number;
  landmark: string;
  km: number;
};

export type StatusFacts = {
  simClockMin: number;
  hotCells: HotCell[];
  teams: { name: string; status: string }[];
  leading: { profile: string; weight: number; reasoning: string } | null;
};

// Deterministic fallback answer — used verbatim when the LLM call fails, and
// as the initial response so the console is never blank.
export function buildStatusTemplate(facts: StatusFacts): string {
  const hot =
    facts.hotCells.map((c) => `(${c.x},${c.y}) near ${c.landmark}`).join(", ") ||
    "none yet";
  const lead = facts.leading
    ? `${facts.leading.profile} at ${Math.round(facts.leading.weight * 100)}%`
    : "no clear leader";
  const active = facts.teams.filter((t) => t.status !== "idle").length;
  return (
    `Hottest unsearched cells are ${hot}. ` +
    `Leading hypothesis is ${lead} with ${active}/${facts.teams.length} teams active at ${facts.simClockMin} sim-minutes.`
  );
}

export function buildStatusPrompt(facts: StatusFacts, question: string): string {
  return [
    `You are a search-and-rescue coordinator. Answer in exactly two calm, specific sentences.`,
    `Question: "${question}"`,
    `Sim clock: ${facts.simClockMin} minutes since last seen.`,
    `Top unsearched hot cells: ${
      facts.hotCells
        .map(
          (c) =>
            `(${c.x},${c.y}) ~${c.km.toFixed(1)}km from ${c.landmark}, heat ${c.heat.toFixed(2)}`,
        )
        .join("; ") || "none"
    }.`,
    `Teams: ${facts.teams.map((t) => `${t.name}: ${t.status}`).join(", ") || "none"}.`,
    `Leading hypothesis: ${
      facts.leading
        ? `${facts.leading.profile} at ${(facts.leading.weight * 100).toFixed(0)}% — ${facts.leading.reasoning}`
        : "none"
    }.`,
  ].join("\n");
}
