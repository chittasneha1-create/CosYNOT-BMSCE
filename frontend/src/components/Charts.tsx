import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SimulationResult, Snapshot } from "../lib/types";

const axis = { stroke: "#64748b", fontSize: 10 };
const tip = { background: "#111a2e", border: "1px solid #334155", fontSize: 12 };

export function RainfallChart({ series }: { series: { t_min: number; mm_hr: number }[] }) {
  return (
    <div className="glass h-44 rounded-xl p-3">
      <div className="section-title mb-1">Rainfall vs time · drives the simulation</div>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={series}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis dataKey="t_min" {...axis} unit="m" />
          <YAxis {...axis} unit=" mm/h" />
          <Tooltip contentStyle={tip} />
          <Area type="monotone" dataKey="mm_hr" stroke="#a78bfa" fill="#7c3aed55" name="mm/hr" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WaterLevelChart({ timeline, regionId }: { timeline: Snapshot[]; regionId: string | null }) {
  const data = timeline.map((s) => {
    const r = regionId ? s.regions.find((x) => x.id === regionId) : null;
    const peak = Math.max(...s.regions.map((x) => x.water_pct));
    return {
      t: s.t_min,
      region: r?.water_pct ?? null,
      peak,
      critical: s.kpis.critical_zones,
      rain: s.rainfall_mm_hr,
    };
  });
  return (
    <div className="glass h-48 rounded-xl p-3">
      <div className="section-title mb-1">Water level vs time</div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis dataKey="t" {...axis} />
          <YAxis {...axis} />
          <Tooltip contentStyle={tip} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="peak" stroke="#f43f5e" dot={false} name="City peak %" />
          {regionId && <Line type="monotone" dataKey="region" stroke="#38bdf8" dot={false} name={`${regionId} %`} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MultiSeriesChart({ result, regionId }: { result: SimulationResult; regionId: string | null }) {
  const data = result.timeline.map((s) => {
    const r = regionId ? s.regions.find((x) => x.id === regionId) : s.regions[0];
    return {
      t: s.t_min,
      drainage: r ? r.drainage_utilization * 100 : 0,
      inflow: r?.inflow_m3_min ?? 0,
      outflow: r?.outflow_m3_min ?? 0,
      critical: s.kpis.critical_zones,
      pop: s.kpis.population_at_risk,
    };
  });
  return (
    <div className="glass h-52 rounded-xl p-3">
      <div className="section-title mb-1">Drainage · flow · critical regions</div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis dataKey="t" {...axis} />
          <YAxis {...axis} />
          <Tooltip contentStyle={tip} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="drainage" stroke="#a78bfa" dot={false} name="Drain util %" />
          <Line type="monotone" dataKey="inflow" stroke="#38bdf8" dot={false} name="Inflow m³/min" />
          <Line type="monotone" dataKey="outflow" stroke="#34d399" dot={false} name="Outflow" />
          <Line type="monotone" dataKey="critical" stroke="#fb7185" dot={false} name="Critical zones" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
