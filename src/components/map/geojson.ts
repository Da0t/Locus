// OWNER: Person B (map & UI). Pure GeoJSON builders for the map sources.
// ALL cell↔lat/lng math goes through convex/lib/geo (frozen contract).
import type { Doc } from "../../../convex/_generated/dataModel";
import {
  type Bounds,
  cellCenter,
  cellPolygon,
  movePoint,
} from "../../../convex/lib/geo";

export type FC = GeoJSON.FeatureCollection;

const EMPTY: FC = { type: "FeatureCollection", features: [] };

export function terrainFC(
  bounds: Bounds,
  gridSize: number,
  cells: Doc<"cases">["terrainCells"],
): FC {
  return {
    type: "FeatureCollection",
    features: cells.map((c) => ({
      type: "Feature",
      properties: { kind: c.kind },
      geometry: {
        type: "Polygon",
        coordinates: [cellPolygon(bounds, gridSize, c)],
      },
    })),
  };
}

// Probability points for the heatmap layer. Near-zero cells are skipped to
// keep the source small; the layer re-renders per tick via the data prop.
export function heatFC(
  bounds: Bounds,
  gridSize: number,
  heatmap: number[][] | undefined,
): FC {
  if (!heatmap) return EMPTY;
  const features: GeoJSON.Feature[] = [];
  heatmap.forEach((row, y) =>
    row.forEach((p, x) => {
      if (p <= 0.001) return;
      const { lat, lng } = cellCenter(bounds, gridSize, { x, y });
      features.push({
        type: "Feature",
        properties: { weight: p },
        geometry: { type: "Point", coordinates: [lng, lat] },
      });
    }),
  );
  return { type: "FeatureCollection", features };
}

export function searchedFC(
  bounds: Bounds,
  gridSize: number,
  grids: Doc<"grids">[],
): FC {
  return {
    type: "FeatureCollection",
    features: grids
      .filter((g) => g.searched)
      .map((g) => ({
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [cellPolygon(bounds, gridSize, g)],
        },
      })),
  };
}

export function claimedFC(
  bounds: Bounds,
  gridSize: number,
  grids: Doc<"grids">[],
  colorForTeam: (teamId: Doc<"teams">["_id"]) => string,
): FC {
  return {
    type: "FeatureCollection",
    features: grids
      .filter((g) => g.claimedBy !== undefined)
      .map((g) => ({
        type: "Feature",
        properties: { color: colorForTeam(g.claimedBy!) },
        geometry: {
          type: "Polygon",
          coordinates: [cellPolygon(bounds, gridSize, g)],
        },
      })),
  };
}

// The growing search-radius ring: a 64-bearing polygon line around the LKP.
export function ringFC(lat: number, lng: number, radiusKm: number): FC {
  const coordinates = Array.from({ length: 65 }, (_, i) => {
    const p = movePoint(lat, lng, radiusKm, (i * 360) / 64);
    return [p.lng, p.lat];
  });
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates },
      },
    ],
  };
}
