import { CITIES } from "../lib/types";

export function Settings({
  city,
  hours,
  dt,
  onCity,
  onHours,
  onDt,
}: {
  city: string;
  hours: number;
  dt: number;
  onCity: (v: string) => void;
  onHours: (v: number) => void;
  onDt: (v: number) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">Settings</h2>
      <p className="text-xs text-slate-400">Pick a city corridor. The live flood uses a heavy-monsoon pulse on mapped neighbourhoods.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="glass block rounded-xl p-3 text-xs">
          City
          <select className="mt-1 w-full rounded bg-ink-800 p-2" value={city} onChange={(e) => onCity(e.target.value)}>
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="glass block rounded-xl p-3 text-xs">
          Horizon (hours)
          <input type="number" min={0.5} max={24} step={0.5} value={hours} onChange={(e) => onHours(Number(e.target.value))} className="mt-1 w-full rounded bg-ink-800 p-2" />
        </label>
        <label className="glass block rounded-xl p-3 text-xs">
          Time step (minutes)
          <input type="number" min={1} max={30} value={dt} onChange={(e) => onDt(Number(e.target.value))} className="mt-1 w-full rounded bg-ink-800 p-2" />
        </label>
      </div>
    </div>
  );
}
