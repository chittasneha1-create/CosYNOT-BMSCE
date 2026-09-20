import { CityGrid, FloodLegend } from "../components/CityGrid";
import { KpiCard } from "../components/KpiCard";
import { RegionDetails } from "../components/RegionDetails";
import { AlertPanel } from "../components/AlertPanel";
import { RainfallChart, WaterLevelChart } from "../components/Charts";
import { Timeline } from "../components/Timeline";
import type { SimulationResult } from "../lib/types";
import { fmtMin, fmtNum } from "../lib/format";

export function Dashboard(props: {
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
}) {
  const snap = props.result.timeline[props.idx];
  const k = snap.kpis;
  const region = snap.regions.find((r) => r.id === props.selected) ?? null;
  const next = k.next_critical;
  return (
    <div className="space-y-3">
      <div className="glass rounded-xl px-4 py-3">
        <div className="section-title">Official demo · seed 42 · {props.result.label}</div>
        <p className="mt-1 text-sm text-slate-200">
          WHERE <span className="font-mono text-violetx-200">{props.result.summary.next_critical?.id ?? "—"}</span>
          {"  "}WHEN <span className="font-mono text-violetx-200">{fmtMin(props.result.summary.first_critical_min)}</span>
          {"  "}WHY low elevation + runoff C + drainage stress + upstream flow
          {"  "}Peak {props.result.summary.peak_water_pct.toFixed(0)}% · Critical {props.result.summary.critical_zones} · Exposed {fmtNum(props.result.summary.population_affected)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <KpiCard label="Rainfall" value={k.rainfall_mm_hr.toFixed(0)} unit="mm/hr" />
        <KpiCard label="Active flood zones" value={String(k.active_flood_zones)} />
        <KpiCard label="Warning zones" value={String(k.warning_zones)} tone="warn" />
        <KpiCard label="Critical zones" value={String(k.critical_zones)} tone="crit" />
        <KpiCard label="Highest water level" value={`${k.highest_water_pct.toFixed(0)}`} unit="%" tone="high" />
        <KpiCard label="Next critical event" value={next ? fmtMin(next.ettc_min) : "None"} tone={next ? "crit" : "safe"} />
        <KpiCard label="Population at risk" value={fmtNum(k.population_at_risk)} />
      </div>
      <div className="grid gap-3 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-base font-semibold">{props.result.city.display_name}</div>
              <div className="text-[11px] text-slate-400">{props.result.label}</div>
            </div>
          </div>
          <CityGrid regions={snap.regions} flows={snap.flows} selected={props.selected} onSelect={props.onSelect} />
          <FloodLegend />
          <Timeline
            t={snap.t_min}
            max={props.result.duration_min}
            playing={props.playing}
            speed={props.speed}
            onT={props.onT}
            onPlay={props.onPlay}
            onReset={props.onReset}
            onSpeed={props.onSpeed}
            onStep={props.onStep}
          />
        </div>
        <div className="space-y-3">
          <RegionDetails region={region} />
          <AlertPanel alerts={snap.alerts.slice(0, 3)} onSelect={props.onSelect} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <RainfallChart series={props.result.rainfall_series} />
        <WaterLevelChart timeline={props.result.timeline} regionId={props.selected} />
      </div>
    </div>
  );
}
