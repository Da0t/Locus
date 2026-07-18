// OWNER: Person A (sim core). Greedy coverage planner.
// STUB on main — Person A implements per plans/PERSON_A.md and calls it
// from the tick. Kept as a separate module so the tick stays readable.
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Assign highest-priority unsearched, unclaimed cells to idle teams.
// Priority = probability x staleness. No overlap. See PERSON_A.md §4.
export async function assignTeams(
  _ctx: MutationCtx,
  _caseId: Id<"cases">,
  _heatmap: number[][],
): Promise<void> {
  // TODO(Person A)
}
