// OWNER: Person B (map & UI). The live world: terrain, probability heatmap,
// grid search/claim state, LKP, radius ring, tips, teams. Everything is
// declarative — Convex reactivity drives the data props; no manual map
// mutation, so per-tick updates never flicker.
import { useEffect, useMemo, useRef, useState } from "react";
// Named MapGL so the component doesn't shadow the global Map constructor.
import MapGL, {
  Layer,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { latLngToCell } from "../../convex/lib/geo";
import { claimedFC, heatFC, ringFC, searchedFC, terrainFC } from "./map/geojson";
import { TERRAIN_COLORS, teamColor } from "./map/palette";
import { LkpMarker } from "./map/LkpMarker";
import { TeamMarkers } from "./map/TeamMarkers";
import { TipMarkers } from "./map/TipMarkers";
import { TeamRoster } from "./map/TeamRoster";
import { FoundMarker } from "./map/FoundMarker";
import { errorMessage, toast } from "../lib/toast";

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

export function MapView({ activeCase }: { activeCase: Doc<"cases"> }) {
  const sim = useQuery(api.sim.state, { caseId: activeCase._id });
  const teams = useQuery(api.teams.list, { caseId: activeCase._id });
  const gridStates = useQuery(api.teams.gridStates, { caseId: activeCase._id });
  const tips = useQuery(api.tips.list, { caseId: activeCase._id });

  const claimGrid = useMutation(api.teams.claimGrid);

  const mapRef = useRef<MapRef>(null);
  const [mapMoving, setMapMoving] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Id<"teams"> | null>(null);

  const { gridSize } = activeCase;
  const bounds = useMemo(
    () => ({
      swLat: activeCase.boundsSwLat,
      swLng: activeCase.boundsSwLng,
      neLat: activeCase.boundsNeLat,
      neLng: activeCase.boundsNeLng,
    }),
    [activeCase.boundsSwLat, activeCase.boundsSwLng, activeCase.boundsNeLat, activeCase.boundsNeLng],
  );

  // Static per case — memoized once.
  const terrain = useMemo(
    () => terrainFC(bounds, gridSize, activeCase.terrainCells),
    [bounds, gridSize, activeCase.terrainCells],
  );
  const heat = useMemo(
    () => heatFC(bounds, gridSize, sim?.heatmap),
    [bounds, gridSize, sim?.heatmap],
  );
  const searched = useMemo(
    () => searchedFC(bounds, gridSize, gridStates ?? []),
    [bounds, gridSize, gridStates],
  );
  const colorByTeam = useMemo(() => {
    const m = new Map<Id<"teams">, string>();
    (teams ?? []).forEach((t, i) => m.set(t._id, teamColor(i)));
    return m;
  }, [teams]);
  const claimed = useMemo(
    () =>
      claimedFC(bounds, gridSize, gridStates ?? [], (teamId) =>
        colorByTeam.get(teamId) ?? "#ffffff",
      ),
    [bounds, gridSize, gridStates, colorByTeam],
  );
  const ring = useMemo(
    () =>
      ringFC(activeCase.lastKnownLat, activeCase.lastKnownLng, sim?.radiusKm ?? 0),
    [activeCase.lastKnownLat, activeCase.lastKnownLng, sim?.radiusKm],
  );

  // The found moment: reactivity flips status → fly to the subject once.
  const found = activeCase.status === "found";
  const prevFound = useRef(false);
  useEffect(() => {
    if (found && !prevFound.current) {
      mapRef.current?.flyTo({
        center: [activeCase.hiddenTrueLng, activeCase.hiddenTrueLat],
        zoom: 14,
        duration: 2000,
        essential: true,
      });
    }
    prevFound.current = found;
  }, [found, activeCase.hiddenTrueLat, activeCase.hiddenTrueLng]);

  if (!TOKEN) {
    return (
      <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">
        Set VITE_MAPBOX_TOKEN in .env.local to render the map.
      </div>
    );
  }

  // The claim interaction: armed team + grid cell click → claimGrid.
  // A lost race throws — that message IS the contention demo; show it big.
  const onMapClick = (e: MapLayerMouseEvent) => {
    if (!selectedTeam || activeCase.status === "found") return;
    const cell = latLngToCell(bounds, gridSize, e.lngLat.lat, e.lngLat.lng);
    claimGrid({ teamId: selectedTeam, x: cell.x, y: cell.y })
      .then(() => setSelectedTeam(null))
      .catch((err: unknown) => toast(errorMessage(err)));
  };

  return (
    <MapGL
      ref={mapRef}
      mapboxAccessToken={TOKEN}
      initialViewState={{
        bounds: [
          [bounds.swLng, bounds.swLat],
          [bounds.neLng, bounds.neLat],
        ],
        fitBoundsOptions: { padding: 40 },
      }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      cursor={selectedTeam ? "crosshair" : "grab"}
      onClick={onMapClick}
      onMoveStart={() => setMapMoving(true)}
      onMoveEnd={() => setMapMoving(false)}
    >
      {/* 1 — authored terrain overlay (static) */}
      <Source id="terrain-cells" type="geojson" data={terrain}>
        <Layer
          id="terrain-fill"
          type="fill"
          paint={{
            "fill-color": [
              "match",
              ["get", "kind"],
              "trail", TERRAIN_COLORS.trail,
              "road", TERRAIN_COLORS.road,
              "water", TERRAIN_COLORS.water,
              "steep", TERRAIN_COLORS.steep,
              "#000000",
            ],
            "fill-opacity": [
              "match",
              ["get", "kind"],
              "steep", 0.35,
              0.25,
            ],
          }}
        />
      </Source>

      {/* 3a — searched cells: desaturated "cleared" fill under the heat */}
      <Source id="grid-searched" type="geojson" data={searched}>
        <Layer
          id="grid-searched-fill"
          type="fill"
          paint={{ "fill-color": "#5b6b7a", "fill-opacity": 0.35 }}
        />
      </Source>

      {/* 2 — probability heatmap, tuned so one hot cell reads at zoom 12 */}
      <Source id="probability" type="geojson" data={heat}>
        <Layer
          id="probability-heat"
          type="heatmap"
          paint={{
            "heatmap-weight": ["get", "weight"],
            "heatmap-intensity": [
              "interpolate", ["linear"], ["zoom"], 10, 0.9, 14, 1.6,
            ],
            "heatmap-radius": [
              "interpolate", ["linear"], ["zoom"], 10, 9, 12, 20, 14, 48,
            ],
            "heatmap-color": [
              "interpolate", ["linear"], ["heatmap-density"],
              0, "rgba(0,0,0,0)",
              0.12, "rgba(127,29,29,0.5)",
              0.4, "rgba(220,38,38,0.72)",
              0.7, "rgba(245,158,11,0.85)",
              0.92, "rgba(254,243,199,0.95)",
              1, "rgba(255,255,255,0.98)",
            ],
            "heatmap-opacity": 0.8,
          }}
        />
      </Source>

      {/* 3b — claimed cells: 2px team-colored outline */}
      <Source id="grid-claimed" type="geojson" data={claimed}>
        <Layer
          id="grid-claimed-line"
          type="line"
          paint={{
            "line-color": ["get", "color"],
            "line-width": 2,
            "line-opacity": 0.95,
          }}
        />
      </Source>

      {/* 5 — the growing radius ring around the LKP */}
      <Source id="radius-ring" type="geojson" data={ring}>
        <Layer
          id="radius-ring-line"
          type="line"
          paint={{
            "line-color": "#f59e0b",
            "line-width": 1.5,
            "line-opacity": 0.75,
            "line-dasharray": [2, 2],
          }}
        />
      </Source>

      {/* 4 — last-known point */}
      <LkpMarker lat={activeCase.lastKnownLat} lng={activeCase.lastKnownLng} />

      {/* 6 — tip sightings */}
      <TipMarkers tips={tips ?? []} />

      {/* 7 — teams */}
      <TeamMarkers
        teams={teams ?? []}
        selectedId={selectedTeam}
        onSelect={(id) => setSelectedTeam((cur) => (cur === id ? null : id))}
        mapMoving={mapMoving}
      />

      <TeamRoster
        teams={teams ?? []}
        selectedId={selectedTeam}
        onSelect={(id) => setSelectedTeam((cur) => (cur === id ? null : id))}
      />

      {/* Ground truth — rendered ONLY after the find (see CONTRACTS §Found) */}
      {found && (
        <FoundMarker lat={activeCase.hiddenTrueLat} lng={activeCase.hiddenTrueLng} />
      )}
    </MapGL>
  );
}
