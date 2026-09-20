import { AlertPanel } from "../components/AlertPanel";
import type { SimulationResult } from "../lib/types";
import { fmtMin, fmtNum } from "../lib/format";
import { aggregateByPlace } from "../lib/places";

export function EarlyWarning({
  result,
  idx,
  onSelect,
}: {
  result: SimulationResult;
  idx: number;
  onSelect: (id: string) => void;
}) {
  const snap = result.timeline[idx];
  const places = aggregateByPlace(snap.regions);
  const next = [...places]
    .filter((r) => r.ettc_min !== null || r.status === "critical")
    .sort((a, b) => (a.ettc_min ?? 1e9) - (b.ettc_min ?? 1e9) || b.priority - a.priority)[0];
  const priorities = places
    .filter((r) => r.priority > 25 && (r.ettc_min !== null || r.water_pct >= 40))
    .slice(0, 8);
  const alerts = places
    .filter((r) => r.status === "critical" || r.status === "high" || r.status === "warning" || (r.ettc_min !== null && r.ettc_min <= 180))
    .slice(0, 16)
    .map((r) => ({
      level: r.status === "critical" || (r.ettc_min !== null && r.ettc_min <= 30) ? "critical" : "warning",
      region_id: r.id,
      name: r.name,
      status: r.status,
      ettc_min: r.ettc_min,
      risk: r.risk,
      priority: r.priority,
      rise_cm_min: r.rise_m_per_min * 100,
      causes: r.causes,
      action: `Watch ${r.name} (${r.elevation_m.toFixed(0)} m). Increase drainage / move people from the lowest streets.`,
      water_pct: r.water_pct,
      infrastructure: [],
    }));

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">Early warning</h2>
      <p className="text-xs text-slate-400">
        Neighbourhoods along this city’s mapped river corridor, ranked by simulated water, elevation and people exposed.
      </p>
      <div className="glass rounded-xl border-crit/30 p-5">
        <div className="section-title">Next place to go critical</div>
        {next ? (
          <div className="mt-2">
            <div className="font-display text-2xl font-bold">{next.name}</div>
            <div className="mt-2 font-mono text-3xl text-rose-300">{fmtMin(next.ettc_min)}</div>
            <div className="mt-1 text-sm text-slate-300">
              Risk {next.risk.toFixed(0)} · Water {next.water_pct.toFixed(0)}% · Exposed {fmtNum(next.population_exposed)} · Elev{" "}
              {next.elevation_m.toFixed(0)} m
            </div>
            <p className="mt-2 text-sm text-slate-400">{next.causes.slice(0, 4).join(" · ") || "Low ground accumulating runoff"}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No critical condition predicted in the remaining horizon.</p>
        )}
      </div>
      <div>
        <div className="section-title mb-2">Places at risk · priority order</div>
        <div className="grid gap-2 md:grid-cols-3">
          {priorities.map((r, i) => (
            <button key={r.name} onClick={() => onSelect(r.id)} className="glass rounded-xl p-3 text-left">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Priority {i + 1}</div>
              <div className="font-medium">{r.name}</div>
              <div className="font-mono text-sm text-violetx-200">Critical in {fmtMin(r.ettc_min)}</div>
              <div className="text-[11px] text-slate-400">
                Risk {r.risk.toFixed(0)} · Water {r.water_pct.toFixed(0)}% · Exposed {fmtNum(r.population_exposed)} · {r.elevation_m.toFixed(0)} m
              </div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="section-title mb-2">Active alerts · surrounding localities</div>
        <AlertPanel alerts={alerts} onSelect={onSelect} />
      </div>
    </div>
  );
}
