// OWNER: Person B (map & UI). The subject marker. Rendered ONLY once
// cases.status === "found" — hiddenTrueLat/Lng must never appear before
// then (docs/CONTRACTS.md §Found).
import { Marker } from "react-map-gl/mapbox";

export function FoundMarker({ lat, lng }: { lat: number; lng: number }) {
  return (
    <Marker latitude={lat} longitude={lng} anchor="center" style={{ zIndex: 5 }}>
      <div className="pointer-events-none relative flex h-8 w-8 items-center justify-center">
        <span
          className="absolute h-8 w-8 rounded-full border-2 border-amber-400"
          style={{ animation: "lkp-ring 2s ease-out infinite" }}
        />
        <span className="absolute h-8 w-8 rounded-full border-2 border-amber-300/80" />
        <span className="h-3.5 w-3.5 rounded-full border-2 border-black bg-amber-300 shadow-lg" />
        <span className="absolute top-9 whitespace-nowrap rounded-sm border border-amber-400/70 bg-black/85 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 backdrop-blur">
          Subject
        </span>
      </div>
    </Marker>
  );
}
