// OWNER: Person B (map & UI). W4: the map's vocabulary in one glance —
// what every color and glyph means, readable from the back of the room.
// Pure static overlay; palette values come from ./palette, never duplicated.
import type { ReactNode } from "react";
import { TERRAIN_COLORS, teamColor } from "./palette";

function Row({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex w-6 shrink-0 items-center justify-center">
        {swatch}
      </span>
      <span className="text-[10px] uppercase tracking-[0.14em] text-white/85">
        {label}
      </span>
    </div>
  );
}

// Terrain swatches carry a faint border so steep (pure black) stays visible
// against the dark card.
function Fill({ color }: { color: string }) {
  return (
    <span
      className="h-2.5 w-5 rounded-[2px] border border-white/25"
      style={{ backgroundColor: color, opacity: 0.85 }}
    />
  );
}

export function Legend() {
  return (
    <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1.5 rounded-md border border-white/15 bg-black/70 px-3 py-2.5 font-mono shadow-lg backdrop-blur">
      <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/60">
        Legend
      </span>
      <Row swatch={<Fill color={TERRAIN_COLORS.trail} />} label="Trail" />
      <Row swatch={<Fill color={TERRAIN_COLORS.road} />} label="Road" />
      <Row swatch={<Fill color={TERRAIN_COLORS.water} />} label="Creek" />
      <Row swatch={<Fill color={TERRAIN_COLORS.steep} />} label="Steep" />
      <Row
        swatch={
          <span
            className="h-2.5 w-5 rounded-[2px]"
            style={{
              background:
                "linear-gradient(to right, rgba(127,29,29,0.85), #dc2626, #f59e0b, #fef3c7)",
            }}
          />
        }
        label="Probability"
      />
      <Row
        swatch={
          <span
            className="h-2.5 w-5 rounded-[2px]"
            style={{ backgroundColor: "#5b6b7a", opacity: 0.7 }}
          />
        }
        label="Searched"
      />
      <Row
        swatch={
          <span
            className="h-2.5 w-5 rounded-[2px] border-2"
            style={{ borderColor: teamColor(0) }}
          />
        }
        label="Claimed"
      />
      <Row
        swatch={
          <span className="h-2 w-2 rotate-45 border border-amber-100/90 bg-amber-400/90" />
        }
        label="Tip"
      />
      <Row
        swatch={
          <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-red-600" />
        }
        label="LKP"
      />
      <span className="mt-1 max-w-44 border-t border-white/10 pt-1.5 text-[9px] leading-relaxed text-white/45">
        select a team, then click a cell to task it — press / to speak
      </span>
    </div>
  );
}
