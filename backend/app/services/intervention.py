"""Intervention + scenario comparison — same engine, different inputs."""

from __future__ import annotations

from typing import Any

from app.models.schemas import (
    CompareRequest,
    CompareResult,
    InterventionRequest,
    InterventionResult,
    InterventionSpec,
    OptimizeRequest,
    OptimizeResult,
    SimulationRequest,
)
from app.services.simulator import DEFAULT_INTERVENTIONS, run_simulation


def _spec_from_dict(d: dict[str, Any]) -> InterventionSpec:
    return InterventionSpec(
        id=d.get("id", "custom"),
        name=d.get("name", "Custom"),
        description=d.get("description", ""),
        drainage_multiplier=d.get("drainage_multiplier", 1.0),
        emergency_pump_m3_min=d.get("emergency_pump_m3_min", 0.0),
        green_reduction=d.get("green_reduction", 0.0),
        retention_boost_m3=d.get("retention_boost_m3", 0.0),
        open_alternate=d.get("open_alternate", False),
        blocked_edges=d.get("blocked_edges", []),
        estimated_cost_inr=d.get("estimated_cost_inr", 0),
    )


def apply_intervention(base: SimulationRequest, spec: InterventionSpec) -> SimulationRequest:
    data = base.model_dump()
    data["drainage_multiplier"] = spec.drainage_multiplier
    data["emergency_pump_m3_min"] = spec.emergency_pump_m3_min
    data["green_reduction"] = spec.green_reduction
    data["retention_boost_m3"] = spec.retention_boost_m3
    data["open_alternate"] = spec.open_alternate or base.open_alternate
    if spec.id == "unblock":
        data["blocked_edges"] = []
        if data.get("scenario") == "blocked":
            data["scenario"] = "heavy"
    elif spec.blocked_edges:
        data["blocked_edges"] = spec.blocked_edges
    return SimulationRequest(**data)


def _delta(before, after) -> dict[str, Any]:
    b, a = before.summary, after.summary

    def span(x, y):
        return {"before": x, "after": y, "delta": (None if x is None or y is None else y - x)}

    return {
        "critical_zones": span(b.critical_zones, a.critical_zones),
        "peak_water_pct": span(b.peak_water_pct, a.peak_water_pct),
        "population_affected": span(b.population_affected, a.population_affected),
        "hospital_risk": span(b.hospital_risk, a.hospital_risk),
        "metro_risk": span(b.metro_risk, a.metro_risk),
        "first_critical_min": span(b.first_critical_min, a.first_critical_min),
        "flood_duration_min": span(b.flood_duration_min, a.flood_duration_min),
        "max_flow_m3_min": span(b.max_flow_m3_min, a.max_flow_m3_min),
        "mean_drainage_util": span(b.mean_drainage_util, a.mean_drainage_util),
    }


def run_intervention(req: InterventionRequest) -> InterventionResult:
    base = SimulationRequest(**req.model_dump(exclude={"intervention"}))
    spec = req.intervention or _spec_from_dict(DEFAULT_INTERVENTIONS[0])
    before = run_simulation(base)
    after = run_simulation(apply_intervention(base, spec))
    return InterventionResult(before=before, after=after, delta=_delta(before, after), intervention=spec)


def run_optimize(req: OptimizeRequest) -> OptimizeResult:
    base = SimulationRequest(**req.model_dump(exclude={"interventions"}))
    baseline = run_simulation(base)
    specs = req.interventions or [_spec_from_dict(d) for d in DEFAULT_INTERVENTIONS]
    options = []
    for spec in specs:
        after = run_simulation(apply_intervention(base, spec))
        options.append(
            {
                "intervention": spec.model_dump(),
                "summary": after.summary.model_dump(),
                "delta": _delta(baseline, after),
                "cost_inr": spec.estimated_cost_inr,
            }
        )
    return OptimizeResult(baseline=baseline.summary, options=options)


SCENARIO_PRESETS = {
    "normal": {"scenario": "normal"},
    "heavy": {"scenario": "heavy"},
    "extreme": {"scenario": "extreme"},
    "storm_burst": {"scenario": "storm_burst"},
    "drainage_failure": {"scenario": "drainage_failure"},
    "blocked": {"scenario": "blocked"},
    "intervention": {
        "scenario": "heavy",
        "drainage_multiplier": 1.5,
        "emergency_pump_m3_min": 28.0,
        "green_reduction": 0.15,
        "retention_boost_m3": 8000.0,
        "open_alternate": True,
    },
}


def run_compare(req: CompareRequest) -> CompareResult:
    columns: list[str] = []
    metrics = {
        "Peak water level (%)": [],
        "Critical zones": [],
        "High-risk zones": [],
        "First critical time (min)": [],
        "Population affected": [],
        "Flood duration (min)": [],
        "Maximum flow (m³/min)": [],
        "Drainage utilization": [],
        "Hospital risk": [],
        "Metro risk": [],
    }
    series: dict[str, list[dict[str, Any]]] = {}
    for name in req.scenarios:
        preset = SCENARIO_PRESETS.get(name, {"scenario": name})
        sim_req = SimulationRequest(
            city=req.city,
            duration_hours=req.duration_hours,
            delta_t_minutes=req.delta_t_minutes,
            **preset,
        )
        result = run_simulation(sim_req)
        columns.append(name)
        s = result.summary
        metrics["Peak water level (%)"].append(s.peak_water_pct)
        metrics["Critical zones"].append(s.critical_zones)
        metrics["High-risk zones"].append(s.high_zones)
        metrics["First critical time (min)"].append(s.first_critical_min)
        metrics["Population affected"].append(s.population_affected)
        metrics["Flood duration (min)"].append(s.flood_duration_min)
        metrics["Maximum flow (m³/min)"].append(s.max_flow_m3_min)
        metrics["Drainage utilization"].append(s.mean_drainage_util)
        metrics["Hospital risk"].append(s.hospital_risk)
        metrics["Metro risk"].append(s.metro_risk)
        series[name] = [
            {
                "t_min": snap.t_min,
                "critical": snap.kpis["critical_zones"],
                "warning": snap.kpis["warning_zones"],
                "peak_pct": snap.kpis["highest_water_pct"],
                "population": snap.kpis["population_at_risk"],
            }
            for snap in result.timeline
        ]
    return CompareResult(city=req.city, columns=columns, rows=metrics, series=series)


FLOOD_LAB_SCENARIOS = [
    {"id": "A", "name": "Current infrastructure", "request": {"scenario": "heavy"}},
    {"id": "B", "name": "+50% drainage capacity", "request": {"scenario": "heavy", "drainage_multiplier": 1.5}},
    {"id": "C", "name": "Retention pond expansion", "request": {"scenario": "heavy", "retention_boost_m3": 14000.0}},
    {"id": "D", "name": "Increase green surface", "request": {"scenario": "heavy", "green_reduction": 0.28}},
    {"id": "E", "name": "Blocked drainage connection", "request": {"scenario": "blocked"}},
    {"id": "F", "name": "Protect hospital package", "request": {"scenario": "heavy", "drainage_multiplier": 1.5, "emergency_pump_m3_min": 28.0, "green_reduction": 0.15, "retention_boost_m3": 8000.0, "open_alternate": True}},
]


def run_flood_lab(city: str, duration_hours: float = 3.0, delta_t: float = 5.0) -> dict[str, Any]:
    out = []
    for spec in FLOOD_LAB_SCENARIOS:
        req = SimulationRequest(city=city, duration_hours=duration_hours, delta_t_minutes=delta_t, **spec["request"])
        result = run_simulation(req)
        out.append(
            {
                "id": spec["id"],
                "name": spec["name"],
                "summary": result.summary.model_dump(),
                "series": [
                    {"t_min": s.t_min, "critical": s.kpis["critical_zones"], "peak_pct": s.kpis["highest_water_pct"]}
                    for s in result.timeline
                ],
                "next_critical": result.summary.next_critical,
            }
        )
    return {"city": city, "scenarios": out, "label": "Simulation Data — Synthetic Digital Twin"}
