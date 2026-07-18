// OWNER: Person B (map & UI). Shared map color/glyph vocabulary.
import type { Doc } from "../../../convex/_generated/dataModel";

// Stable team→color by index (order of api.teams.list is insertion order).
export const TEAM_COLORS = [
  "#fbbf24", // amber
  "#38bdf8", // sky
  "#a3e635", // lime
  "#f472b6", // pink
  "#c084fc", // purple
  "#fb923c", // orange
];

export function teamColor(index: number): string {
  return TEAM_COLORS[index % TEAM_COLORS.length];
}

export const TEAM_GLYPH: Record<Doc<"teams">["status"], string> = {
  idle: "○",
  enroute: "▸",
  searching: "◉",
};

export type TerrainKind = Doc<"cases">["terrainCells"][number]["kind"];

export const TERRAIN_COLORS: Record<TerrainKind, string> = {
  trail: "#c9a06d",
  road: "#9aa2ad",
  water: "#3d84d1",
  steep: "#000000",
};
