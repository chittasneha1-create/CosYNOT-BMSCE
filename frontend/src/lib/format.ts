export function fmtMin(v: number | null | undefined): string {
  if (v === null || v === undefined) return "No critical condition predicted";
  if (v <= 0) return "Now / already critical";
  const m = Math.round(v);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function fmtNum(v: number | null | undefined, d = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return v.toLocaleString("en-IN", { maximumFractionDigits: d });
}

export function statusLabel(s: string): string {
  return { normal: "Normal", safe: "Safe", warning: "Warning", high: "High risk", critical: "Critical" }[s] ?? s;
}

export function infraIcon(kind: string): string {
  const map: Record<string, string> = {
    hospital: "🏥",
    school: "🏫",
    metro: "🚇",
    railway: "🚉",
    fire: "🚒",
    police: "🚓",
    power: "⚡",
    water: "💧",
    bus: "🚌",
    lake: "🟦",
  };
  return map[kind] ?? "";
}
