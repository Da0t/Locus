// OWNER: Person B (map & UI). Pulsing last-known-point marker.
import { Marker } from "react-map-gl/mapbox";

export function LkpMarker({ lat, lng }: { lat: number; lng: number }) {
  return (
    <Marker latitude={lat} longitude={lng} anchor="center" style={{ zIndex: 1 }}>
      <div className="pointer-events-none relative flex h-6 w-6 items-center justify-center">
        <span
          className="absolute h-6 w-6 rounded-full border-2 border-red-500"
          style={{ animation: "lkp-ring 2.4s ease-out infinite" }}
        />
        <span
          className="absolute h-6 w-6 rounded-full border-2 border-red-500"
          style={{ animation: "lkp-ring 2.4s ease-out 1.2s infinite" }}
        />
        <span className="h-3 w-3 rounded-full border-2 border-white bg-red-600 shadow" />
        <span className="absolute top-7 whitespace-nowrap rounded-sm border border-red-500/50 bg-black/75 px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-red-300 backdrop-blur">
          Last known
        </span>
      </div>
    </Marker>
  );
}
