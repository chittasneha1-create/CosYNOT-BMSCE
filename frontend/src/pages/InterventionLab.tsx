import { useState } from "react";
import { api } from "../lib/api";
import type { SimRequest, SimulationResult } from "../lib/types";
import { fmtMin, fmtNum } from "../lib/format";

const PRESETS = [
  { id: "combo", name: "Protect hospital package", description: "Drainage + pumps + green + ponds + relief channel.", drainage_multiplier: 1.5, emergency_pump_m3_min: 28, green_reduction: 0.15, retention_boost_m3: 8000, open_alternate: true, estimated_cost_inr: 9800000 },
  { id: "drain_boost", name: "Increase drainage +50%", description: "Raise drainage capacity by 50%.", drainage_multiplier: 1.5, emergency_pump_m3_min: 0, green_reduction: 0, retention_boost_m3: 0, open_alternate: false, estimated_cost_inr: 4800000 },
  { id: "pump", name: "Emergency hospital pumps", description: "Add 40 m³/min pumping at hospital cells.", drainage_multiplier: 1, emergency_pump_m3_min: 40, green_reduction: 0, retention_boost_m3: 0, open_alternate: false, estimated_cost_inr: 1600000 },
  { id: "green", name: "Increase green surface", description: "Reduce runoff coefficient C.", drainage_multiplier: 1, emergency_pump_m3_min: 0, green_reduction: 0.25, retention_boost_m3: 0, open_alternate: false, estimated_cost_inr: 3200000 },
  { id: "pond", name: "Expand retention ponds", description: "Add storage at lake cells.", drainage_multiplier: 1, emergency_pump_m3_min: 0, green_reduction: 0, retention_boost_m3: 12000, open_alternate: false, estimated_cost_inr: 6500000 },
  { id: "alternate", name: "Open alternate route", description: "Open the relief channel.", drainage_multiplier: 1, emergency_pump_m3_min: 0, green_reduction: 0, retention_boost_m3: 0, open_alternate: true, estimated_cost_inr: 2100000 },
];

export function InterventionLab({ base }: { base: SimRequest }) {
  const [drain, setDrain] = useState(1.5);
  const [pump, setPump] = useState(0);
  const [green, setGreen] = useState(0);
  const [pond, setPond] = useState(0);
  const [alt, setAlt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pair, setPair] = useState<{
    before: SimulationResult;
    after: SimulationResult;
    delta: Record<string, { before: number | null; after: number | null }>;
    intervention: { name: string; estimated_cost_inr: number };
  } | null>(null);
  const [opt, setOpt] = useState<Awaited<ReturnType<typeof api.optimize>> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = async (preset?: (typeof PRESETS)[number]) => {
    setLoading(true);
    setErr(null);
    try {
      const intervention = preset ?? {
        id: "custom",
        name: "Custom intervention",
        description: "User sliders",
        drainage_multiplier: drain,
        emergency_pump_m3_min: pump,
        green_reduction: green,
        retention_boost_m3: pond,
        open_alternate: alt,
        estimated_cost_inr: 0,
      };
      const res = await api.intervene({ ...base, intervention });
      setPair(res);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const optimize = async () => {
    setLoading(true);
    setErr(null);
    try {
      setOpt(await api.optimize(base));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">How can we prevent this?</h2>
        <p className="text-xs text-slate-400">Every before/after number is a second full-engine run. Costs are illustrative policy tags in ₹, not tenders.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="glass space-y-3 rounded-xl p-4">
          <Slider label={`Drainage multiplier ${drain.toFixed(2)}×`} min={0.5} max={2} step={0.05} value={drain} onChange={setDrain} />
          <Slider label={`Emergency pump ${pump.toFixed(0)} m³/min`} min={0} max={80} step={5} value={pump} onChange={setPump} />
          <Slider label={`Green surface reduction of C ${Math.round(green * 100)}%`} min={0} max={0.5} step={0.05} value={green} onChange={setGreen} />
          <Slider label={`Retention storage +${pond.toFixed(0)} m³`} min={0} max={20000} step={1000} value={pond} onChange={setPond} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={alt} onChange={(e) => setAlt(e.target.checked)} />
            Open alternate drainage route
          </label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => run()} disabled={loading} className="rounded-lg bg-violetx-600 px-3 py-1.5 text-xs font-semibold">
              {loading ? "Re-running…" : "Rerun with intervention"}
            </button>
            <button onClick={optimize} disabled={loading} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs">
              Run intervention optimizer
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.id} onClick={() => run(p)} className="rounded-md bg-white/5 px-2 py-1 text-[11px]">
                {p.name}
              </button>
            ))}
          </div>
        </div>
        {pair && (
          <div className="grid grid-cols-2 gap-2">
            <Card title="Before" s={pair.before.summary} />
            <Card title="After" s={pair.after.summary} good />
          </div>
        )}
      </div>
      {err && <p className="text-sm text-rose-300">{err}</p>}
      {opt && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="py-2">Intervention</th>
                <th>Cost (₹)</th>
                <th>Critical</th>
                <th>Peak %</th>
                <th>ETTC first</th>
                <th>Population</th>
                <th>Hospital</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-white/5">
                <td className="py-1.5">Baseline</td>
                <td>—</td>
                <td className="font-mono">{opt.baseline.critical_zones}</td>
                <td className="font-mono">{opt.baseline.peak_water_pct.toFixed(1)}</td>
                <td>{fmtMin(opt.baseline.first_critical_min)}</td>
                <td className="font-mono">{fmtNum(opt.baseline.population_affected)}</td>
                <td className="font-mono">{opt.baseline.hospital_risk.toFixed(0)}</td>
              </tr>
              {opt.options.map((o) => (
                <tr key={o.intervention.id} className="border-t border-white/5">
                  <td className="py-1.5">{o.intervention.name}</td>
                  <td className="font-mono">{fmtNum(o.cost_inr)}</td>
                  <td className="font-mono">
                    {o.delta.critical_zones.before} → {o.delta.critical_zones.after}
                  </td>
                  <td className="font-mono">
                    {o.delta.peak_water_pct.before?.toFixed(0)} → {o.delta.peak_water_pct.after?.toFixed(0)}
                  </td>
                  <td>
                    {fmtMin(o.delta.first_critical_min.before)} → {fmtMin(o.delta.first_critical_min.after)}
                  </td>
                  <td className="font-mono">
                    {fmtNum(o.delta.population_affected.before)} → {fmtNum(o.delta.population_affected.after)}
                  </td>
                  <td className="font-mono">
                    {o.delta.hospital_risk.before?.toFixed(0)} → {o.delta.hospital_risk.after?.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Slider({ label, ...p }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-xs">
      <div className="mb-1 text-slate-300">{label}</div>
      <input className="w-full" type="range" min={p.min} max={p.max} step={p.step} value={p.value} onChange={(e) => p.onChange(Number(e.target.value))} />
    </label>
  );
}

function Card({ title, s, good }: { title: string; s: SimulationResult["summary"]; good?: boolean }) {
  return (
    <div className={`glass rounded-xl p-3 ${good ? "border-safe/30" : ""}`}>
      <div className="section-title">{title}</div>
      <ul className="mt-2 space-y-1 text-sm">
        <li>Critical zones: {s.critical_zones}</li>
        <li>Peak water: {s.peak_water_pct.toFixed(1)}%</li>
        <li>Population: {fmtNum(s.population_affected)}</li>
        <li>Hospital risk: {s.hospital_risk.toFixed(0)}</li>
        <li>First critical: {fmtMin(s.first_critical_min)}</li>
      </ul>
    </div>
  );
}
