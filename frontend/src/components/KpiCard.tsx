export function KpiCard({
  label,
  value,
  unit,
  tone = "default",
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "default" | "safe" | "warn" | "high" | "crit";
}) {
  const ring = {
    default: "border-white/10",
    safe: "border-safe/40",
    warn: "border-warn/40",
    high: "border-high/40",
    crit: "border-crit/40",
  }[tone];
  return (
    <div className={`kpi min-w-[118px] flex-1 ${ring}`}>
      <div className="section-title">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-mono text-xl font-semibold tracking-tight">{value}</span>
        {unit && <span className="text-[10px] text-slate-400">{unit}</span>}
      </div>
    </div>
  );
}
