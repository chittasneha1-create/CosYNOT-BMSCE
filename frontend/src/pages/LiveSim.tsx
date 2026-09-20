import { Pause, Play, RotateCcw } from "lucide-react";
import { SatelliteFloodMap } from "../components/SatelliteFloodMap";
import { cityGeo } from "../lib/indiaGeo";
import { fmtNum } from "../lib/format";
import type { SimulationResult } from "../lib/types";

export function LiveSim(props: {
  result: SimulationResult;
  idx: number;
  selected: string | null;
  onSelect: (id: string) => void;
  playing: boolean;
  speed: number;
  onT: (t: number) => void;
  onPlay: () => void;
  onReset: () => void;
  onSpeed: (s: number) => void;
  onStep: (d: -1 | 1) => void;
  onReplay: () => void;
}) {
  const snap = props.result.timeline[props.idx];
  const geo = cityGeo(props.result.city.id);
  const t = snap.t_min;
  const max = props.result.duration_min;

  return (
    <div className="flood-theater relative h-full min-h-0 overflow-hidden bg-black">
      <div className="absolute inset-0">
        <SatelliteFloodMap
          cityId={props.result.city.id}
          regions={snap.regions}
          flows={snap.flows}
          selected={props.selected}
          onSelect={props.onSelect}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/55" />

      <div className="pointer-events-none absolute inset-x-0 top-6 z-[510] flex flex-col items-center px-4 text-center sm:top-8">
        <h2 className="flood-hero pointer-events-none">{geo.name.toUpperCase()}</h2>
        <div className="pointer-events-auto mt-3 w-full max-w-xl px-2">
          <input
            className="flood-slider w-full"
            type="range"
            min={0}
            max={max}
            step={1}
            value={t}
            onChange={(e) => props.onT(Number(e.target.value))}
            aria-label="Flood time"
          />
          <div className="mt-1 flex w-full justify-between font-mono text-[10px] text-white/70">
            <span>0 min</span>
            <span>
              {t.toFixed(0)} / {max.toFixed(0)} min
            </span>
          </div>
        </div>
        <p className="pointer-events-none mt-3 max-w-xl text-[11px] tracking-[0.16em] text-white/85 sm:text-xs">
          {geo.river.toUpperCase()}
        </p>
        <p className="pointer-events-none mt-1 max-w-lg text-[11px] text-white/70">{geo.event}</p>
        <div className="pointer-events-auto mt-4 flex flex-wrap justify-center gap-2">
          <button onClick={props.onReplay} className="flood-cta">
            ▶ PLAY FLOOD
          </button>
          <button onClick={props.onPlay} className="flood-cta">
            {props.playing ? (
              <>
                <Pause className="h-3.5 w-3.5" /> PAUSE
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" /> RESUME
              </>
            )}
          </button>
        </div>
      </div>

      <div className="pointer-events-auto absolute bottom-3 left-3 z-[510] max-w-sm rounded-lg bg-black/55 px-3 py-2 text-[10px] leading-relaxed text-white/80 backdrop-blur-sm">
        Open-source Leaflet map on Esri World Imagery. Water is the cosYNOT BMSCE engine painted onto a real {geo.name}{" "}
        river corridor — not an official inundation product.
      </div>

      <div className="pointer-events-auto absolute bottom-3 right-3 z-[510] space-y-2">
        <div className="flex gap-2">
          <Kpi k="Critical" v={String(snap.kpis.critical_zones)} />
          <Kpi k="Peak water" v={`${snap.kpis.highest_water_pct.toFixed(0)}%`} />
          <Kpi k="Exposed" v={fmtNum(snap.kpis.population_at_risk)} />
        </div>
        <div className="flex items-center justify-end gap-2">
          <button className="flood-icon" onClick={props.onReset} aria-label="Reset">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <label className="flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[10px] text-white/80">
            Speed
            <select
              value={props.speed}
              onChange={(e) => props.onSpeed(Number(e.target.value))}
              className="bg-transparent"
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={4}>4×</option>
              <option value={8}>8×</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}

function Kpi({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md bg-black/55 px-2.5 py-1.5 text-right backdrop-blur-sm">
      <div className="font-mono text-sm text-sky-100">{v}</div>
      <div className="text-[9px] uppercase tracking-wider text-white/55">{k}</div>
    </div>
  );
}
