import { Menu, Play, RotateCcw } from "lucide-react";
import { CITIES } from "../lib/types";

export function TopBar({
  city,
  onCity,
  onRun,
  onMenu,
  loading,
}: {
  city: string;
  onCity: (v: string) => void;
  onRun: () => void;
  onMenu: () => void;
  loading: boolean;
}) {
  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-white/5 bg-ink-900/70 px-3 py-2.5 backdrop-blur-md">
      <button className="rounded-md p-2 text-slate-300 lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="font-display text-sm font-semibold leading-tight">Predict the flood. Protect the future.</div>
        <div className="text-[10px] uppercase tracking-wider text-violetx-300/70">cosYNOT BMSCE · live simulation</div>
      </div>
      <select
        value={city}
        onChange={(e) => onCity(e.target.value)}
        className="rounded-lg border border-white/10 bg-ink-800 px-2 py-1.5 text-xs"
      >
        {CITIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        onClick={onRun}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-violetx-600 px-3 py-1.5 text-xs font-semibold hover:bg-violetx-500 disabled:opacity-60"
      >
        {loading ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        {loading ? "Simulating" : "Run flood"}
      </button>
    </header>
  );
}
