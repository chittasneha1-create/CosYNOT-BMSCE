"""REST API — frontend never computes flood values itself."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from pathlib import Path

from app.data.cases import CASES, DISCLAIMER
from app.models.schemas import (
    CityModel,
    CompareRequest,
    InterventionRequest,
    OptimizeRequest,
    SimulationRequest,
)
from app.services.city_builder import CITY_PROFILES, build_city, list_cities
from app.services.intervention import run_compare, run_flood_lab, run_intervention, run_optimize
from app.services.math_model import LAND_USE, RISK_WEIGHTS, SURFACE_C_PRESETS, equation_catalog
from app.services.rainfall import SCENARIOS
from app.services.simulator import DEFAULT_INTERVENTIONS, run_simulation

router = APIRouter()


@router.get("/health")
def health():
    return {"ok": True, "service": "flowshield", "label": "Simulation Data — Synthetic Digital Twin"}


@router.get("/cities")
def cities():
    return {"cities": list_cities()}


@router.get("/city")
def get_city(name: str = "bengaluru", seed: int = 42):
    if name not in CITY_PROFILES:
        raise HTTPException(400, f"Unknown city '{name}'. Use one of: {list(CITY_PROFILES)}")
    city = build_city(name, seed=seed)
    return city.model_dump()


@router.post("/city/custom")
def custom_city(city: CityModel):
    if city.rows < 2 or city.cols < 2:
        raise HTTPException(400, "Grid must be at least 2×2")
    if any(r.area_m2 <= 0 for r in city.regions):
        raise HTTPException(400, "Region area must be positive")
    return {"ok": True, "regions": len(city.regions), "label": "Simulation Data — Synthetic Digital Twin"}


@router.get("/scenarios")
def scenarios():
    return {
        "rainfall": {k: {"label": v["label"], "narrative": v["narrative"], "segments": v["segments"]} for k, v in SCENARIOS.items()},
        "interventions": DEFAULT_INTERVENTIONS,
    }


@router.get("/land-use")
def land_use():
    return {"land_use": LAND_USE, "surface_c": SURFACE_C_PRESETS, "note": "Modelling assumptions, not measured city values."}


@router.post("/simulate")
def simulate(req: SimulationRequest):
    try:
        return run_simulation(req).model_dump()
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc


@router.post("/intervene")
def intervene(req: InterventionRequest):
    return run_intervention(req).model_dump()


@router.post("/compare")
def compare(req: CompareRequest):
    return run_compare(req).model_dump()


@router.post("/optimize")
def optimize(req: OptimizeRequest):
    return run_optimize(req).model_dump()


@router.get("/flood-lab")
def flood_lab(city: str = "bengaluru", duration_hours: float = 3.0):
    if city not in CITY_PROFILES:
        raise HTTPException(400, "Unknown city")
    return run_flood_lab(city, duration_hours)


@router.get("/math")
def math():
    return {
        "title": "The math behind the flood",
        "source_of_truth": "backend/app/services/math_model.py",
        "equations": equation_catalog(),
        "risk_weights": RISK_WEIGHTS,
        "disclaimer": "One simulation engine. The UI only displays values this engine computes.",
    }


@router.get("/demo")
def demo_scorecard():
    here = Path(__file__).resolve()
    candidates = [
        here.parents[3] / "data" / "demo_scorecard.json",
        here.parents[2] / "data" / "demo_scorecard.json",
        Path("/workspace/data/demo_scorecard.json"),
        Path("/workspace/backend/data/demo_scorecard.json"),
    ]
    path = next((p for p in candidates if p.exists()), None)
    if path:
        import json

        return json.loads(path.read_text())
    raise HTTPException(404, "Scorecard not generated")


@router.get("/cases")
def cases():
    return {
        "title": "Indian flood events",
        "disclaimer": DISCLAIMER,
        "cases": CASES,
        "footer": (
            "cosYNOT BMSCE is a simulation and decision-support prototype. "
            "Synthetic scenarios are not official forecasts or emergency warnings. "
            "Historical Indian flood events are provided for contextual reference."
        ),
    }


# Aliases matching the original prompt's suggested paths
@router.post("/simulation/run")
def simulation_run(req: SimulationRequest):
    return simulate(req)


@router.post("/simulation/intervention")
def simulation_intervention(req: InterventionRequest):
    return intervene(req)


@router.post("/simulation/compare")
def simulation_compare(req: CompareRequest):
    return compare(req)


@router.get("/simulation/math")
def simulation_math():
    return math()


@router.get("/simulation/cases")
def simulation_cases():
    return cases()
