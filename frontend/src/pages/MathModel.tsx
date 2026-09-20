import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { RegionState, SimulationResult } from "../lib/types";

export function MathModel({ result, idx, selected }: { result: SimulationResult; idx: number; selected: string | null }) {
  const [eqs, setEqs] = useState<Awaited<ReturnType<typeof api.math>> | null>(null);
  useEffect(() => {
    api.math().then(setEqs);
  }, []);
  const snap = result.timeline[idx];
  const r = snap.regions.find((x) => x.id === selected) ?? snap.regions.reduce((a, b) => (a.risk > b.risk ? a : b));
  const v = result.validation;
  const dw = (r.runoff_m3_min - r.drainage_m3_min + r.inflow_m3_min - r.outflow_m3_min) * result.delta_t_min;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">The math behind the flood</h2>
        <p className="text-xs text-slate-400">
          One source of truth: <span className="font-mono">backend/app/services/math_model.py</span>. Live numbers are from {r.id} at t = {snap.t_min.toFixed(0)} min.
        </p>
      </div>
      <Chain r={r} dw={dw} />
      <div className="grid gap-3 lg:grid-cols-2">
        <Eq
          title="Water balance"
          latex="W(t+Δt) = W + (Qr − D + Fin − Fout) · Δt"
          rows={[
            ["Qr runoff", `${r.runoff_m3_min.toFixed(2)} m³/min`],
            ["D drainage", `${r.drainage_m3_min.toFixed(2)} m³/min`],
            ["Fin", `${r.inflow_m3_min.toFixed(2)} m³/min`],
            ["Fout", `${r.outflow_m3_min.toFixed(2)} m³/min`],
            ["Δt", `${result.delta_t_min} min`],
            ["ΔW", `${dw.toFixed(2)} m³`],
            ["W now", `${r.water_volume_m3.toFixed(1)} m³`],
          ]}
        />
        <Eq
          title="Runoff  Qr = C × P × A"
          latex="Qr [m³/min] = C × (P/1000/60) × A"
          rows={[
            ["C", r.runoff_c.toFixed(2)],
            ["P", `${r.rainfall_mm_hr.toFixed(1)} mm/hr`],
            ["A", `${r.area_m2.toFixed(0)} m²`],
            ["Qr", `${r.runoff_m3_min.toFixed(2)} m³/min`],
          ]}
        />
        <Eq
          title="Depth and flood %"
          latex="h = W / A    Water% = (h / h_safe) × 100"
          rows={[
            ["h", `${(r.water_depth_m * 100).toFixed(1)} cm`],
            ["h_safe", `${(r.h_safe_m * 100).toFixed(0)} cm`],
            ["Water%", `${r.water_pct.toFixed(1)}%`],
          ]}
        />
        <Eq
          title="Drainage  D = min(avail, Cap × η + pump)"
          latex="η drops 1.00 → 0.85 → 0.60 → 0.40 with flood %"
          rows={[
            ["Capacity", `${r.drainage_capacity_m3_min.toFixed(1)} m³/min`],
            ["η", r.drainage_eta.toFixed(2)],
            ["D", `${r.drainage_m3_min.toFixed(2)} m³/min`],
            ["Utilization", `${(r.drainage_utilization * 100).toFixed(0)}%`],
          ]}
        />
        <Eq
          title="Flow  F = K · max(0, Hi − Hj)"
          latex="H = z + h     K = C_flow · A_conn / L"
          rows={[
            ["z", `${r.elevation_m.toFixed(2)} m`],
            ["H", `${(r.elevation_m + r.water_depth_m).toFixed(2)} m`],
            ["Inflow", `${r.inflow_m3_min.toFixed(2)} m³/min`],
            ["Outflow", `${r.outflow_m3_min.toFixed(2)} m³/min`],
            ["Upstream", r.upstream.join(", ") || "none"],
          ]}
        />
        <Eq
          title="Risk and ETTC"
          latex="Risk = 0.35 WL + 0.20 Rise + 0.15 Drain + 0.15 Elev + 0.10 Rain + 0.05 Infra"
          rows={[
            ["Risk", `${r.risk.toFixed(1)} / 100`],
            ["ETTC", r.ettc_min === null ? "No critical condition predicted" : `${r.ettc_min.toFixed(0)} min`],
            ["TTW", r.ttw_min === null ? "—" : `${r.ttw_min.toFixed(0)} min`],
            ["TTHR", r.tthr_min === null ? "—" : `${r.tthr_min.toFixed(0)} min`],
          ]}
        />
      </div>
      <div className="glass rounded-xl p-4">
        <div className="section-title">Simulation validation · mass balance</div>
        <p className="mt-1 text-xs text-slate-400">{v.note}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
          <V k="Initial W₀" v={`${v.initial_volume_m3.toFixed(1)} m³`} />
          <V k="Σ runoff" v={`${v.total_runoff_m3.toFixed(1)} m³`} />
          <V k="Σ drainage" v={`${v.total_drainage_m3.toFixed(1)} m³`} />
          <V k="Σ transferred" v={`${v.total_transferred_m3.toFixed(1)} m³`} />
          <V k="Final W" v={`${v.final_volume_m3.toFixed(1)} m³`} />
          <V k="Residual ε" v={`${v.residual_m3.toFixed(2)} m³ (${v.residual_pct.toFixed(3)}%)`} />
        </div>
      </div>
      <div className="space-y-2">
        {eqs?.equations.map((e) => (
          <div key={e.id} className="glass rounded-xl p-3">
            <div className="font-display text-sm font-semibold">{e.title}</div>
            <div className="font-mono text-[12px] text-violetx-200">{e.latex}</div>
            <p className="mt-1 text-xs text-slate-400">{e.plain}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chain({ r, dw }: { r: RegionState; dw: number }) {
  const steps = [
    ["RAIN", `${r.rainfall_mm_hr.toFixed(0)} mm/hr`],
    ["RUNOFF", `${r.runoff_m3_min.toFixed(1)} m³/min`],
    ["DRAINAGE", `${r.drainage_m3_min.toFixed(1)} m³/min`],
    ["FLOW", `+${r.inflow_m3_min.toFixed(1)} / −${r.outflow_m3_min.toFixed(1)}`],
    ["ΔW", `${dw.toFixed(1)} m³`],
    ["LEVEL", `${r.water_pct.toFixed(0)}%`],
    ["RISK", r.risk.toFixed(0)],
    ["ETTC", r.ettc_min === null ? "none" : `${r.ettc_min.toFixed(0)}m`],
  ];
  return (
    <div className="flex flex-wrap items-center gap-1">
      {steps.map(([k, v], i) => (
        <div key={k} className="flex items-center gap-1">
          <div className="rounded-lg bg-violetx-600/20 px-2 py-1">
            <div className="text-[9px] uppercase tracking-wider text-slate-400">{k}</div>
            <div className="font-mono text-xs">{v}</div>
          </div>
          {i < steps.length - 1 && <span className="text-slate-600">→</span>}
        </div>
      ))}
    </div>
  );
}

function Eq({ title, latex, rows }: { title: string; latex: string; rows: [string, string][] }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="font-display text-sm font-semibold">{title}</div>
      <div className="mt-1 font-mono text-[12px] text-violetx-200">{latex}</div>
      <dl className="mt-2 space-y-1 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-slate-400">{k}</dt>
            <dd className="font-mono">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function V({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-2">
      <div className="text-[10px] uppercase text-slate-500">{k}</div>
      <div className="font-mono">{v}</div>
    </div>
  );
}
