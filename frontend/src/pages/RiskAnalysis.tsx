import { SatelliteFloodMap } from "../components/SatelliteFloodMap";
import type { SimulationResult } from "../lib/types";
import { fmtMin, fmtNum } from "../lib/format";
import { aggregateByPlace } from "../lib/places";

export function RiskAnalysis({
  result,
  idx,
  selected,
  onSelect,
}: {
  result: SimulationResult;
  idx: number;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const snap = result.timeline[idx];
  const places = aggregateByPlace(snap.regions);
  const ranked = places.slice(0, 12);
  const focus = places.find((r) => r.id === selected) ?? ranked[0];
  const ettcDist = places
    .filter((r) => r.ettc_min !== null)
    .sort((a, b) => (a.ettc_min as number) - (b.ettc_min as number));

  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl font-bold">Risk analysis</h2>
      <p className="text-xs text-slate-400">
        Real neighbourhoods on this river corridor. Risk uses water, rise, drainage, elevation and rainfall from the engine.
        Elevations are relative SRTM-style metres so downhill wards rank higher.
      </p>
      <div className="h-72 overflow-hidden rounded-xl">
        <SatelliteFloodMap
          cityId={result.city.id}
          regions={snap.regions}
          flows={snap.flows}
          selected={null}
          onSelect={() => undefined}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="text-slate-400">
            <tr>
              <th className="py-2">Place</th>
              <th>Risk</th>
              <th>Water %</th>
              <th>ETTC</th>
              <th>Exposed</th>
              <th>Priority</th>
              <th>Elev. (m)</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r) => (
              <tr key={r.name} className="cursor-pointer border-t border-white/5 hover:bg-white/5" onClick={() => onSelect(r.id)}>
                <td className="py-1.5 font-medium">{r.name}</td>
                <td className="font-mono">{r.risk.toFixed(0)}</td>
                <td className="font-mono">{r.water_pct.toFixed(0)}</td>
                <td>{fmtMin(r.ettc_min)}</td>
                <td className="font-mono">{fmtNum(r.population_exposed)}</td>
                <td className="font-mono">{r.priority.toFixed(0)}</td>
                <td className="font-mono">{r.elevation_m.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {focus && (
        <div className="glass rounded-xl p-4 text-sm text-slate-300">
          <div className="font-display text-lg font-semibold">{focus.name}</div>
          <p className="mt-1 text-xs text-slate-400">
            {focus.elevation_m.toFixed(0)} m · {focus.causes.slice(0, 3).join(" · ") || "Low ground in the flood corridor"}
          </p>
        </div>
      )}
      <div className="glass rounded-xl p-3">
        <div className="section-title mb-2">Soonest ETTC</div>
        <div className="flex flex-wrap gap-2">
          {ettcDist.slice(0, 16).map((e) => (
            <button key={e.name} onClick={() => onSelect(e.id)} className="rounded-md bg-white/5 px-2 py-1 text-[11px]">
              {e.name} · {fmtMin(e.ettc_min)}
            </button>
          ))}
          {ettcDist.length === 0 && <span className="text-sm text-slate-400">No critical condition predicted in this horizon.</span>}
        </div>
      </div>
    </div>
  );
}
