import type { SimRequest, SimulationResult } from "./types";

const BASE = "/api/v1";

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text) as { detail?: unknown };
      const d = parsed.detail;
      if (typeof d === "string") throw new Error(d);
      if (Array.isArray(d)) throw new Error(d.map((x: { msg?: string }) => x.msg).filter(Boolean).join("; ") || text);
    } catch (e) {
      if (e instanceof Error && e.message !== text) throw e;
    }
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => j<{ ok: boolean }>("/health"),
  simulate: (body: SimRequest) => j<SimulationResult>("/simulate", { method: "POST", body: JSON.stringify(body) }),
  intervene: (body: SimRequest & { intervention: Record<string, unknown> }) =>
    j<{ before: SimulationResult; after: SimulationResult; delta: Record<string, { before: number | null; after: number | null; delta: number | null }>; intervention: { name: string; description: string; estimated_cost_inr: number } }>(
      "/intervene",
      { method: "POST", body: JSON.stringify(body) },
    ),
  compare: (city: string, scenarios: string[]) =>
    j<{ columns: string[]; rows: Record<string, (number | null)[]>; series: Record<string, { t_min: number; critical: number; peak_pct: number; population: number }[]> }>(
      "/compare",
      { method: "POST", body: JSON.stringify({ city, scenarios, duration_hours: 3, delta_t_minutes: 5 }) },
    ),
  optimize: (body: SimRequest) =>
    j<{
      baseline: SimulationResult["summary"];
      options: {
        intervention: { id: string; name: string; description: string; estimated_cost_inr: number };
        summary: SimulationResult["summary"];
        delta: Record<string, { before: number | null; after: number | null }>;
        cost_inr: number;
      }[];
    }>("/optimize", { method: "POST", body: JSON.stringify(body) }),
  floodLab: (city: string) =>
    j<{
      scenarios: {
        id: string;
        name: string;
        summary: SimulationResult["summary"];
        series: { t_min: number; critical: number; peak_pct: number }[];
      }[];
    }>(`/flood-lab?city=${city}&duration_hours=3`),
  math: () => j<{ equations: { id: string; title: string; latex: string; plain: string; variables: { symbol: string; name: string; unit: string }[] }[]; risk_weights: Record<string, number> }>("/math"),
  demo: () => j<Record<string, unknown>>("/demo"),
  cases: () =>
    j<{
      disclaimer: string;
      footer: string;
      cases: {
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
      }[];
    }>("/cases"),
};
