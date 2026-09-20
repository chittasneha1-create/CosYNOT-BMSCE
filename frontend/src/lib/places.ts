import type { RegionState } from "./types";

const STATUS_RANK: Record<string, number> = {
  critical: 5,
  high: 4,
  warning: 3,
  safe: 2,
  normal: 1,
};

function minEttc(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

function worseStatus(a: string, b: string): string {
  return (STATUS_RANK[a] ?? 0) >= (STATUS_RANK[b] ?? 0) ? a : b;
}

export function aggregateByPlace(regions: RegionState[]): RegionState[] {
  const map = new Map<string, RegionState>();
  for (const r of regions) {
    const prev = map.get(r.name);
    if (!prev) {
      map.set(r.name, { ...r });
      continue;
    }
    map.set(r.name, {
      ...prev,
      risk: Math.max(prev.risk, r.risk),
      water_pct: Math.max(prev.water_pct, r.water_pct),
      ettc_min: minEttc(prev.ettc_min, r.ettc_min),
      ttw_min: minEttc(prev.ttw_min, r.ttw_min),
      tthr_min: minEttc(prev.tthr_min, r.tthr_min),
      population: prev.population + r.population,
      population_exposed: prev.population_exposed + r.population_exposed,
      priority: Math.max(prev.priority, r.priority),
      elevation_m: Math.min(prev.elevation_m, r.elevation_m),
      status: worseStatus(prev.status, r.status),
      causes: [...new Set([...prev.causes, ...r.causes])].slice(0, 6),
    });
  }
  return [...map.values()].sort((a, b) => b.priority - a.priority || b.risk - a.risk);
}
