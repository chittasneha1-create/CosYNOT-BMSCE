import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, CartesianGrid } from "recharts";
import { api } from "../lib/api";
import { fmtMin, fmtNum } from "../lib/format";
import type { SimulationResult } from "../lib/types";

type LabRow = {
  id: string;
  name: string;
  summary: SimulationResult["summary"];
  series: { t_min: number; critical: number; peak_pct: number }[];
};

export function FloodLab({ city }: { city: string }) {
  const [rows, setRows] = useState<LabRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setErr(null);
    api
      .floodLab(city)
      .then((d) => setRows(d.scenarios))
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [city]);

  const a = rows?.[0];
  const b = rows?.find((r) => r.id === "F") ?? rows?.[1];

  const chart = () => {
    if (!rows) return [];
    const map = new Map<number, Record<string, number>>();
    for (const r of rows) {
      for (const p of r.series) {
        const cur = map.get(p.t_min) ?? { t: p.t_min };
        cur[r.id] = p.critical;
        map.set(p.t_min, cur);
      }
    }
    return [...map.values()];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-bold">Flood Lab</h2>
          <p className="text-xs text-slate-400">
            Six scenarios, one engine. Baseline vs intervention is computed — not hardcoded.
          </p>
        </div>
        <button onClick={load} className="rounded-lg bg-violetx-600 px-3 py-1.5 text-xs font-semibold" disabled={loading}>
          {loading ? "Running lab…" : "Re-run lab"}
        </button>
      </div>
      {err && <p className="text-sm text-rose-300">{err}</p>}
      {loading && !rows && (
        <div className="glass rounded-xl p-6 text-sm text-slate-300">
          Running six scenarios through the same water-balance engine. This takes a few seconds…
        </div>
      )}
      {a && b && (
        <div className="grid gap-3 md:grid-cols-3">
          <BeforeAfter title="Baseline A" s={a.summary} />
          <div className="glass flex flex-col justify-center rounded-xl p-4 text-center">
            <div className="section-title">Compare</div>
            <Delta label="Critical zones" from={a.summary.critical_zones} to={b.summary.critical_zones} />
            <Delta label="Peak water" from={a.summary.peak_water_pct} to={b.summary.peak_water_pct} unit="%" />
            <Delta label="Population" from={a.summary.population_affected} to={b.summary.population_affected} />
            <Delta label="First critical" from={a.summary.first_critical_min} to={b.summary.first_critical_min} unit=" min" />
            <Delta label="Hospital risk" from={a.summary.hospital_risk} to={b.summary.hospital_risk} />
          </div>
          <BeforeAfter title={b.name} s={b.summary} accent />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="text-slate-400">
            <tr>
              <th className="py-2">Scenario</th>
              <th>Critical</th>
              <th>Peak %</th>
              <th>First critical</th>
              <th>Population</th>
              <th>Duration</th>
              <th>Max flow</th>
              <th>Drain util</th>
              <th>Hospital</th>
              <th>Metro</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="py-2 font-medium">
                  {r.id}. {r.name}
                </td>
                <td className="font-mono">{r.summary.critical_zones}</td>
                <td className="font-mono">{r.summary.peak_water_pct.toFixed(1)}</td>
                <td className="font-mono">{fmtMin(r.summary.first_critical_min)}</td>
                <td className="font-mono">{fmtNum(r.summary.population_affected)}</td>
                <td className="font-mono">{r.summary.flood_duration_min}</td>
                <td className="font-mono">{r.summary.max_flow_m3_min.toFixed(1)}</td>
                <td className="font-mono">{(r.summary.mean_drainage_util * 100).toFixed(0)}%</td>
                <td className="font-mono">{r.summary.hospital_risk.toFixed(0)}</td>
                <td className="font-mono">{r.summary.metro_risk.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="glass h-56 rounded-xl p-3">
        <div className="section-title mb-1">Critical regions vs time</div>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={chart()}>
            <CartesianGrid stroke="#1e293b" />
            <XAxis dataKey="t" stroke="#64748b" fontSize={10} />
            <YAxis stroke="#64748b" fontSize={10} />
            <Tooltip contentStyle={{ background: "#111a2e", border: "1px solid #334155" }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {rows?.map((r, i) => (
              <Line key={r.id} type="monotone" dataKey={r.id} name={r.name} stroke={["#a78bfa", "#34d399", "#38bdf8", "#fbbf24", "#fb923c", "#f43f5e"][i]} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BeforeAfter({ title, s, accent }: { title: string; s: SimulationResult["summary"]; accent?: boolean }) {
  return (
    <div className={`glass rounded-xl p-4 ${accent ? "border-safe/30" : ""}`}>
      <div className="section-title">{title}</div>
      <ul className="mt-2 space-y-1 text-sm">
        <li>Critical zones: <b>{s.critical_zones}</b></li>
        <li>Peak water: <b>{s.peak_water_pct.toFixed(1)}%</b></li>
        <li>Population: <b>{fmtNum(s.population_affected)}</b></li>
        <li>Hospital risk: <b>{s.hospital_risk.toFixed(0)}</b></li>
        <li>First critical: <b>{fmtMin(s.first_critical_min)}</b></li>
        <li>Flood duration: <b>{s.flood_duration_min} min</b></li>
      </ul>
    </div>
  );
}

function Delta({ label, from, to, unit = "" }: { label: string; from: number | null; to: number | null; unit?: string }) {
  if (from === null || to === null) {
    return (
      <div className="py-1 text-sm">
        {label}: {fmtMin(from)} → {fmtMin(to)}
      </div>
    );
  }
  const first = label.includes("First");
  const good = first ? to > from : to < from;
  return (
    <div className={`py-1 text-sm ${good ? "text-emerald-300" : "text-slate-200"}`}>
      {label}: <span className="font-mono">{from.toFixed(0)}{unit}</span> → <span className="font-mono">{to.toFixed(0)}{unit}</span>
    </div>
  );
}
