import type { RegionState } from "../lib/types";
import { fmtMin, fmtNum, infraIcon, statusLabel } from "../lib/format";
import { RiskBreakdown } from "./RiskBreakdown";

export function RegionDetails({ region }: { region: RegionState | null }) {
  if (!region) {
    return (
      <div className="glass rounded-xl p-4 text-sm text-slate-400">
        Click a region on the digital twin to inspect water balance, ETTC and the causal chain.
      </div>
    );
  }
  const r = region;
  return (
    <div className="glass max-h-[70vh] space-y-3 overflow-auto rounded-xl p-4">
      <div>
        <div className="section-title">Region details · Simulation data</div>
        <div className="mt-1 font-display text-lg font-semibold">{r.name}</div>
        <div className="text-xs text-slate-400">
          {statusLabel(r.status)} · {r.land_use.replaceAll("_", " ")} {r.infrastructure.map(infraIcon).join(" ")}
        </div>
      </div>
      <div className="rounded-lg border border-violetx-500/20 bg-violetx-600/10 p-3">
        <div className="section-title mb-1">Why is this region flooding?</div>
        <p className="text-[12px] leading-relaxed text-slate-100">{r.explanation}</p>
        <ul className="mt-2 space-y-1 text-[12px] text-violetx-200">
          {r.causes.map((c) => (
            <li key={c}>+ {c}</li>
          ))}
        </ul>
        {r.upstream.length > 0 && (
          <p className="mt-2 text-[11px] text-slate-400">Upstream contributing regions: {r.upstream.join(", ")}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat k="Elevation" v={`${r.elevation_m.toFixed(1)} m`} />
        <Stat k="Area" v={`${fmtNum(r.area_m2)} m²`} />
        <Stat k="Rainfall" v={`${r.rainfall_mm_hr.toFixed(1)} mm/hr`} />
        <Stat k="Runoff C" v={r.runoff_c.toFixed(2)} />
        <Stat k="Runoff Qr" v={`${r.runoff_m3_min.toFixed(2)} m³/min`} />
        <Stat k="Drainage D" v={`${r.drainage_m3_min.toFixed(2)} m³/min`} />
        <Stat k="Drain util." v={`${(r.drainage_utilization * 100).toFixed(0)}%`} />
        <Stat k="η efficiency" v={r.drainage_eta.toFixed(2)} />
        <Stat k="Water depth" v={`${(r.water_depth_m * 100).toFixed(1)} cm`} />
        <Stat k="Safe depth" v={`${(r.h_safe_m * 100).toFixed(0)} cm`} />
        <Stat k="Water level" v={`${r.water_pct.toFixed(1)}%`} />
        <Stat k="Inflow" v={`${r.inflow_m3_min.toFixed(2)} m³/min`} />
        <Stat k="Outflow" v={`${r.outflow_m3_min.toFixed(2)} m³/min`} />
        <Stat k="Rise" v={`${(r.rise_m_per_min * 100).toFixed(2)} cm/min`} />
        <Stat k="Population" v={fmtNum(r.population)} />
        <Stat k="Exposed" v={fmtNum(r.population_exposed)} />
        <Stat k="ETTC" v={fmtMin(r.ettc_min)} />
        <Stat k="TTW / TTHR" v={`${fmtMin(r.ttw_min)} / ${fmtMin(r.tthr_min)}`} />
      </div>
      <RiskBreakdown score={r.risk} components={r.risk_components} />
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
      <div className="font-mono text-[12px]">{v}</div>
    </div>
  );
}
