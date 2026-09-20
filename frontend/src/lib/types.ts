export type PageId =
  | "dashboard"
  | "live"
  | "lab"
  | "risk"
  | "warning"
  | "cases"
  | "intervene"
  | "math"
  | "compare"
  | "safety";

export interface RegionState {
  id: string;
  name: string;
  row: number;
  col: number;
  land_use: string;
  infrastructure: string[];
  elevation_m: number;
  area_m2: number;
  h_safe_m: number;
  runoff_c: number;
  rainfall_mm_hr: number;
  runoff_m3_min: number;
  infiltration_mm_hr: number;
  water_volume_m3: number;
  water_depth_m: number;
  water_pct: number;
  status: "normal" | "safe" | "warning" | "high" | "critical" | string;
  drainage_capacity_m3_min: number;
  drainage_m3_min: number;
  drainage_eta: number;
  drainage_utilization: number;
  drainage_stress: number;
  inflow_m3_min: number;
  outflow_m3_min: number;
  rise_m_per_min: number;
  risk: number;
  risk_components: Record<string, number>;
  population: number;
  population_exposed: number;
  ettc_min: number | null;
  ttw_min: number | null;
  tthr_min: number | null;
  priority: number;
  explanation: string;
  causes: string[];
  upstream: string[];
  is_retention: boolean;
}

export interface FlowArrow {
  from_id: string;
  to_id: string;
  rate_m3_min: number;
  blocked: boolean;
  kind: string;
}

export interface Snapshot {
  t_min: number;
  rainfall_mm_hr: number;
  regions: RegionState[];
  flows: FlowArrow[];
  kpis: {
    rainfall_mm_hr: number;
    active_flood_zones: number;
    warning_zones: number;
    high_zones: number;
    critical_zones: number;
    highest_water_pct: number;
    next_critical: {
      id: string;
      name: string;
      ettc_min: number | null;
      risk: number;
      status: string;
      causes: string[];
    } | null;
    population_at_risk: number;
    mean_risk: number;
  };
  alerts: Alert[];
}

export interface Alert {
  level: string;
  region_id: string;
  name: string;
  status: string;
  ettc_min: number | null;
  risk: number;
  priority: number;
  rise_cm_min: number;
  causes: string[];
  action: string;
  water_pct: number;
  infrastructure: string[];
}

export interface SimulationResult {
  scenario: string;
  city: {
    id: string;
    name: string;
    display_name: string;
    tagline: string;
    disclaimer: string;
    rows: number;
    cols: number;
    seed: number;
    notes: string[];
    regions: { id: string; row: number; col: number }[];
  };
  duration_min: number;
  delta_t_min: number;
  rainfall_series: { t_min: number; mm_hr: number }[];
  timeline: Snapshot[];
  summary: {
    peak_water_pct: number;
    critical_zones: number;
    warning_zones: number;
    high_zones: number;
    first_critical_min: number | null;
    population_affected: number;
    flood_duration_min: number;
    max_flow_m3_min: number;
    mean_drainage_util: number;
    hospital_risk: number;
    metro_risk: number;
    next_critical: { id: string; name: string; ettc_min: number } | null;
  };
  ettc: Record<string, number | null>;
  validation: {
    initial_volume_m3: number;
    total_runoff_m3: number;
    total_drainage_m3: number;
    total_transferred_m3: number;
    final_volume_m3: number;
    residual_m3: number;
    residual_pct: number;
    note: string;
  };
  blocked_edges: string[];
  math_trace: Record<string, unknown>;
  label: string;
}

export interface SimRequest {
  city: string;
  scenario: string;
  duration_hours: number;
  delta_t_minutes: number;
  rainfall_mm_hr?: number | null;
  storm_motion?: boolean;
  blocked_edges?: string[];
  drainage_multiplier?: number;
  emergency_pump_m3_min?: number;
  green_reduction?: number;
  retention_boost_m3?: number;
  open_alternate?: boolean;
}

export const CITIES = [
  { id: "bengaluru", name: "Bengaluru" },
  { id: "mumbai", name: "Mumbai" },
  { id: "chennai", name: "Chennai" },
  { id: "delhi", name: "Delhi" },
  { id: "hyderabad", name: "Hyderabad" },
  { id: "kolkata", name: "Kolkata" },
  { id: "ahmedabad", name: "Ahmedabad" },
  { id: "pune", name: "Pune" },
  { id: "guwahati", name: "Guwahati" },
  { id: "custom", name: "Custom Indian City" },
];

export const SCENARIOS = [
  { id: "normal", name: "Normal monsoon" },
  { id: "heavy", name: "Heavy monsoon" },
  { id: "extreme", name: "Extreme event" },
  { id: "storm_burst", name: "Storm burst" },
  { id: "increasing", name: "Increasing" },
  { id: "decreasing", name: "Decreasing" },
  { id: "drainage_failure", name: "Drainage failure" },
  { id: "blocked", name: "Blocked channel" },
  { id: "custom", name: "Custom rainfall" },
];
