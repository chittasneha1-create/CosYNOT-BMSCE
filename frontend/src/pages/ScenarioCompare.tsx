import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../lib/api";
import { fmtMin, fmtNum } from "../lib/format";

const DEFAULTS = ["normal", "heavy", "extreme", "drainage_failure", "blocked", "intervention"];

export function ScenarioCompare({ city }: { city: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.compare>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setErr(null);
    try {
      setData(await api.compare(city, DEFAULTS));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const chart = () => {
    if (!data) return [];
    const map = new Map<number, Record<string, number>>();
    for (const [name, series] of Object.entries(data.series)) {
      for (const p of series) {
        const cur = map.get(p.t_min) ?? { t: p.t_min };
        cur[name] = p.critical;
        map.set(p.t_min, cur);
      }
    }
    return [...map.values()];
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">Scenario comparison</h2>
          <p className="text-xs text-slate-400">Normal · Heavy · Extreme · Drainage failure · Blocked · Intervention — same city, same engine.</p>
        </div>
        <button onClick={run} disabled={loading} className="rounded-lg bg-violetx-600 px-3 py-1.5 text-xs font-semibold">
          {loading ? "Comparing…" : "Run comparison"}
        </button>
      </div>
      {err && <p className="text-sm text-rose-300">{err}</p>}
      {data && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead>
                <tr className="text-slate-400">
                  <th className="py-2">Metric</th>
                  {data.columns.map((c) => (
                    <th key={c}>{c.replaceAll("_", " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.rows).map(([metric, vals]) => (
                  <tr key={metric} className="border-t border-white/5">
                    <td className="py-1.5">{metric}</td>
                    {vals.map((v, i) => (
                      <td key={i} className="font-mono">
                        {metric.includes("time") ? fmtMin(v) : typeof v === "number" ? fmtNum(v, 1) : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="glass h-56 rounded-xl p-3">
            <div className="section-title">Critical regions vs time</div>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={chart()}>
                <CartesianGrid stroke="#1e293b" />
                <XAxis dataKey="t" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ background: "#111a2e", border: "1px solid #334155" }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {data.columns.map((c, i) => (
                  <Line key={c} type="monotone" dataKey={c} stroke={["#94a3b8", "#a78bfa", "#f43f5e", "#fb923c", "#fbbf24", "#34d399"][i]} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
