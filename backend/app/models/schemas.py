"""Pydantic contracts for the FlowShield API."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class Thresholds(BaseModel):
    safe: float = Field(40.0, ge=1, le=90)
    warning: float = Field(70.0, ge=5, le=99)
    high: float = Field(100.0, ge=10, le=200)


class RainSegment(BaseModel):
    start_min: float = Field(..., ge=0)
    end_min: float = Field(..., gt=0)
    intensity_mm_hr: float = Field(..., ge=0, le=500)

    @field_validator("end_min")
    @classmethod
    def end_after_start(cls, v: float, info: Any) -> float:
        start = info.data.get("start_min", 0)
        if v <= start:
            raise ValueError("end_min must be greater than start_min")
        return v


class RegionBase(BaseModel):
    id: str
    name: str
    row: int
    col: int
    lat: float
    lon: float
    elevation_m: float
    area_m2: float
    h_safe_m: float
    runoff_c: float
    infiltration_mm_hr: float
    land_use: str
    surface: str
    drainage_capacity_m3_min: float
    drainage_efficiency_base: float = 1.0
    population: int
    infrastructure: list[str] = []
    infrastructure_importance: float
    neighbors: list[str] = []
    is_retention: bool = False
    storage_extra_m3: float = 0.0


class Connection(BaseModel):
    a: str
    b: str
    kind: Literal["road", "channel", "natural", "alternate"] = "road"
    length_m: float
    width_m: float
    blocked: bool = False


class CityModel(BaseModel):
    id: str
    name: str
    display_name: str
    tagline: str
    disclaimer: str
    rows: int
    cols: int
    cell_size_m: float
    seed: int
    synthetic: bool = True
    regions: list[RegionBase]
    connections: list[Connection]
    notes: list[str] = []


class SimulationRequest(BaseModel):
    city: str = "bengaluru"
    scenario: str = "heavy"
    duration_hours: float = Field(3.0, ge=0.25, le=24)
    delta_t_minutes: float = Field(5.0, ge=1, le=30)
    rainfall_mm_hr: float | None = Field(None, ge=0, le=500)
    rainfall_curve: list[RainSegment] | None = None
    storm_motion: bool = False
    blocked_edges: list[str] = []  # "B3-C3"
    drainage_multiplier: float = Field(1.0, ge=0, le=5)
    drainage_fail_after_min: float | None = Field(None, ge=0)
    drainage_fail_value: float = Field(0.1, ge=0, le=1)
    emergency_pump_m3_min: float = Field(0.0, ge=0, le=500)
    pump_region_ids: list[str] = []
    green_reduction: float = Field(0.0, ge=0, le=0.8)
    retention_boost_m3: float = Field(0.0, ge=0, le=200_000)
    open_alternate: bool = False
    custom_city: CityModel | None = None
    thresholds: Thresholds = Thresholds()
    seed: int = 42


class RegionState(BaseModel):
    id: str
    name: str
    row: int
    col: int
    land_use: str
    infrastructure: list[str]
    elevation_m: float
    area_m2: float
    h_safe_m: float
    runoff_c: float
    rainfall_mm_hr: float
    runoff_m3_min: float
    infiltration_mm_hr: float
    water_volume_m3: float
    water_depth_m: float
    water_pct: float
    status: str
    drainage_capacity_m3_min: float
    drainage_m3_min: float
    drainage_eta: float
    drainage_utilization: float
    drainage_stress: float
    inflow_m3_min: float
    outflow_m3_min: float
    rise_m_per_min: float
    risk: float
    risk_components: dict[str, float]
    population: int
    population_exposed: int
    ettc_min: float | None
    ttw_min: float | None
    tthr_min: float | None
    priority: float
    explanation: str
    causes: list[str]
    upstream: list[str]
    is_retention: bool = False


class FlowArrow(BaseModel):
    from_id: str
    to_id: str
    rate_m3_min: float
    blocked: bool = False
    kind: str = "road"


class TimeStepSnapshot(BaseModel):
    t_min: float
    rainfall_mm_hr: float
    regions: list[RegionState]
    flows: list[FlowArrow]
    kpis: dict[str, Any]
    alerts: list[dict[str, Any]]


class ValidationReport(BaseModel):
    initial_volume_m3: float
    total_runoff_m3: float
    total_drainage_m3: float
    total_transferred_m3: float
    final_volume_m3: float
    residual_m3: float
    residual_pct: float
    note: str


class SimulationSummary(BaseModel):
    peak_water_pct: float
    critical_zones: int
    warning_zones: int
    high_zones: int
    first_critical_min: float | None
    population_affected: int
    flood_duration_min: float
    max_flow_m3_min: float
    mean_drainage_util: float
    hospital_risk: float
    metro_risk: float
    next_critical: dict[str, Any] | None


class SimulationResult(BaseModel):
    scenario: str
    city: CityModel
    duration_min: float
    delta_t_min: float
    rainfall_series: list[dict[str, float]]
    timeline: list[TimeStepSnapshot]
    summary: SimulationSummary
    ettc: dict[str, float | None]
    validation: ValidationReport
    connections: list[Connection]
    blocked_edges: list[str]
    math_trace: dict[str, Any]
    label: str = "Simulation Data — Synthetic Digital Twin"


class InterventionSpec(BaseModel):
    id: str
    name: str
    description: str = ""
    drainage_multiplier: float = 1.0
    emergency_pump_m3_min: float = 0.0
    green_reduction: float = 0.0
    retention_boost_m3: float = 0.0
    open_alternate: bool = False
    blocked_edges: list[str] = []
    estimated_cost_inr: int = 0


class CompareRequest(BaseModel):
    city: str = "bengaluru"
    duration_hours: float = 3.0
    delta_t_minutes: float = 5.0
    scenarios: list[str] = ["normal", "heavy", "extreme", "drainage_failure", "blocked", "intervention"]


class CompareResult(BaseModel):
    city: str
    columns: list[str]
    rows: dict[str, list[Any]]
    series: dict[str, list[dict[str, Any]]]
    label: str = "Simulation Data — Synthetic Digital Twin"


class InterventionRequest(SimulationRequest):
    intervention: InterventionSpec | None = None


class InterventionResult(BaseModel):
    before: SimulationResult
    after: SimulationResult
    delta: dict[str, Any]
    intervention: InterventionSpec


class OptimizeRequest(SimulationRequest):
    interventions: list[InterventionSpec] | None = None


class OptimizeResult(BaseModel):
    baseline: SimulationSummary
    options: list[dict[str, Any]]
    label: str = "Simulation Data — Synthetic Digital Twin"
