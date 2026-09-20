const LABELS: Record<string, string> = {
  water_level: "Water level",
  rate_of_rise: "Rate of rise",
  drainage_stress: "Drainage stress",
  elevation: "Elevation risk",
  rainfall: "Rainfall",
  infrastructure: "Infrastructure",
};

export function RiskBreakdown({ score, components }: { score: number; components: Record<string, number> }) {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <div className="section-title">Flood risk</div>
        <div className="font-mono text-2xl font-semibold">{score.toFixed(0)} <span className="text-xs text-slate-500">/ 100</span></div>
      </div>
      <div className="space-y-1.5">
        {Object.entries(components).map(([k, v]) => (
          <div key={k}>
            <div className="mb-0.5 flex justify-between text-[10px] text-slate-400">
              <span>{LABELS[k] ?? k}</span>
              <span className="font-mono">{v.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-violetx-500" style={{ width: `${Math.min(100, v)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
