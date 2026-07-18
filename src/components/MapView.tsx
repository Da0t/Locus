// OWNER: Person B (map & UI). Skeleton on main: base map + live heatmap.
// Person B: grid fill/claim layers, terrain overlay, team markers, radius
// ring, found moment — see plans/PERSON_B.md.
import Map, { Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { cellCenter } from "../../convex/lib/geo";

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

export function MapView({ activeCase }: { activeCase: Doc<"cases"> }) {
  const sim = useQuery(api.sim.state, { caseId: activeCase._id });

  if (!TOKEN) {
    return (
      <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">
        Set VITE_MAPBOX_TOKEN in .env.local to render the map.
      </div>
    );
  }

  const bounds = {
    swLat: activeCase.boundsSwLat,
    swLng: activeCase.boundsSwLng,
    neLat: activeCase.boundsNeLat,
    neLng: activeCase.boundsNeLng,
  };

  const heatPoints = {
    type: "FeatureCollection" as const,
    features:
      sim?.heatmap.flatMap((row, y) =>
        row.map((p, x) => {
          const { lat, lng } = cellCenter(bounds, activeCase.gridSize, { x, y });
          return {
            type: "Feature" as const,
            properties: { weight: p },
            geometry: { type: "Point" as const, coordinates: [lng, lat] },
          };
        }),
      ) ?? [],
  };

  return (
    <Map
      mapboxAccessToken={TOKEN}
      initialViewState={{
        latitude: (bounds.swLat + bounds.neLat) / 2,
        longitude: (bounds.swLng + bounds.neLng) / 2,
        zoom: 12,
      }}
      mapStyle="mapbox://styles/mapbox/outdoors-v12"
    >
      <Source id="probability" type="geojson" data={heatPoints}>
        <Layer
          id="probability-heat"
          type="heatmap"
          paint={{
            "heatmap-weight": ["get", "weight"],
            "heatmap-intensity": 1.2,
            "heatmap-radius": [
              "interpolate", ["linear"], ["zoom"], 10, 12, 14, 40,
            ],
            "heatmap-opacity": 0.75,
          }}
        />
      </Source>
    </Map>
  );
}
