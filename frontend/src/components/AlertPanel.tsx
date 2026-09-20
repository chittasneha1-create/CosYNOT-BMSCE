import type { Alert } from "../lib/types";
import { fmtMin } from "../lib/format";

export function AlertPanel({ alerts, onSelect }: { alerts: Alert[]; onSelect?: (id: string) => void }) {
  if (!alerts.length) {
    return (
      <div className="glass rounded-xl p-4 text-sm text-slate-400">
        No active alerts at this time step. Regions remain below warning thresholds.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <button
          key={a.region_id + a.level}
          onClick={() => onSelect?.(a.region_id)}
          className={`glass w-full rounded-xl p-3 text-left ${a.level === "critical" ? "border-crit/40" : "border-warn/30"}`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {a.level === "critical" ? "🚨 Critical alert" : "⚠ Warning"} · Priority {a.priority.toFixed(0)}
          </div>
          <div className="mt-0.5 font-display text-sm font-semibold">{a.name}</div>
          <div className="text-xs text-slate-300">
            Critical condition predicted in <span className="font-mono text-violetx-200">{fmtMin(a.ettc_min)}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Cause: {a.causes.slice(0, 3).join(" + ") || "Water-balance accumulation"}</div>
          <div className="mt-1 text-[11px] text-violetx-200">Action: {a.action}</div>
        </button>
      ))}
    </div>
  );
}
