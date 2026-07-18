// OWNER: Person B (map & UI).
// Sim-clock formatting: minutes since last seen → "T+3h42m".
export function simTime(min: number): string {
  return `T+${Math.floor(min / 60)}h${Math.floor(min % 60)
    .toString()
    .padStart(2, "0")}m`;
}
