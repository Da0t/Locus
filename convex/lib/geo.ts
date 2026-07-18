// ============================================================
// FROZEN CONTRACT — grid geometry helpers.
// Shared by the Convex backend (walker, planner) and the frontend
// (heatmap/grid rendering): frontend imports from "../convex/lib/geo".
// Cell (0,0) = SOUTH-WEST corner. heatmap is indexed [y][x].
// ============================================================

export type Bounds = {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
};

export type Cell = { x: number; y: number };

export function cellCenter(bounds: Bounds, gridSize: number, cell: Cell) {
  const lat =
    bounds.swLat + ((cell.y + 0.5) / gridSize) * (bounds.neLat - bounds.swLat);
  const lng =
    bounds.swLng + ((cell.x + 0.5) / gridSize) * (bounds.neLng - bounds.swLng);
  return { lat, lng };
}

export function latLngToCell(
  bounds: Bounds,
  gridSize: number,
  lat: number,
  lng: number,
): Cell {
  const y = Math.floor(
    ((lat - bounds.swLat) / (bounds.neLat - bounds.swLat)) * gridSize,
  );
  const x = Math.floor(
    ((lng - bounds.swLng) / (bounds.neLng - bounds.swLng)) * gridSize,
  );
  return { x: clamp(x, 0, gridSize - 1), y: clamp(y, 0, gridSize - 1) };
}

// GeoJSON polygon ring for a cell (for Mapbox fill layers).
export function cellPolygon(bounds: Bounds, gridSize: number, cell: Cell) {
  const latStep = (bounds.neLat - bounds.swLat) / gridSize;
  const lngStep = (bounds.neLng - bounds.swLng) / gridSize;
  const sw = [bounds.swLng + cell.x * lngStep, bounds.swLat + cell.y * latStep];
  return [
    sw,
    [sw[0] + lngStep, sw[1]],
    [sw[0] + lngStep, sw[1] + latStep],
    [sw[0], sw[1] + latStep],
    sw,
  ];
}

// Move a point by km at a bearing (degrees, 0 = north). Equirectangular
// approximation — fine at demo scale (< 20 km).
export function movePoint(lat: number, lng: number, km: number, bearingDeg: number) {
  const rad = (bearingDeg * Math.PI) / 180;
  const dLat = (km * Math.cos(rad)) / 110.574;
  const dLng = (km * Math.sin(rad)) / (111.32 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = (bLat - aLat) * 110.574;
  const dLng =
    (bLng - aLng) * 111.32 * Math.cos(((aLat + bLat) / 2) * (Math.PI / 180));
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export function bearingDeg(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = (bLat - aLat) * 110.574;
  const dLng =
    (bLng - aLng) * 111.32 * Math.cos(((aLat + bLat) / 2) * (Math.PI / 180));
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function emptyHeatmap(gridSize: number): number[][] {
  return Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
}
