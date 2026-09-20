import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Case = {
  id: string;
  city: string;
  year: number;
  month: string;
  title: string;
  label: string;
  what_happened: string[];
  why_it_matters: string;
  flowshield_connection: string[];
  scenario: string;
  mechanism: string;
};

export function IndiaCases({ onApply }: { onApply: (city: string, scenario: string) => void }) {
  const [data, setData] = useState<{ disclaimer: string; footer: string; cases: Case[] } | null>(null);

  useEffect(() => {
    api.cases().then(setData);
  }, []);

  const cityMap: Record<string, string> = { Bengaluru: "bengaluru", Delhi: "delhi", Chennai: "chennai", Mumbai: "mumbai" };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Indian flood events · Real India</h2>
        <p className="mt-1 text-xs text-amber-200/80">{data?.disclaimer}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {data?.cases.map((c) => (
          <article key={c.id} className="glass rounded-xl p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-200">{c.label}</span>
              <span className="font-mono text-xs text-slate-400">
                {c.city} · {c.month} {c.year}
              </span>
            </div>
            <h3 className="mt-2 font-display text-lg font-semibold">{c.title}</h3>
            <div className="mt-2 text-[10px] uppercase tracking-wider text-violetx-300">What happened</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-slate-300">
              {c.what_happened.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-slate-200">{c.why_it_matters}</p>
            <div className="mt-3 text-[10px] uppercase tracking-wider text-violetx-300">cosYNOT BMSCE connection</div>
            <p className="text-sm text-violetx-100">{c.flowshield_connection.join(" → ")}</p>
            <p className="mt-2 text-[11px] text-slate-400">Relevant synthetic scenario: {c.mechanism}</p>
            <button
              onClick={() => onApply(cityMap[c.city] ?? "bengaluru", c.scenario)}
              className="mt-3 rounded-lg bg-violetx-600 px-3 py-1.5 text-xs font-semibold"
            >
              Open matching synthetic scenario
            </button>
          </article>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">{data?.footer}</p>
    </div>
  );
}
