"""Engine tests — rainfall, runoff, drainage, flow, balance, ETTC, interventions."""

from __future__ import annotations

import pytest

from app.models.schemas import SimulationRequest
from app.services.city_builder import build_city
from app.services.math_model import (
    apply_water_balance,
    drainage_efficiency,
    flood_status,
    interregion_flow_m3_per_min,
    mass_balance_residual,
    runoff_rate_m3_per_min,
    water_depth_m,
    water_pct,
)
from app.services.simulator import run_simulation


def test_runoff_increases_with_rainfall():
    a = runoff_rate_m3_per_min(0.8, 40, 25_600)
    b = runoff_rate_m3_per_min(0.8, 120, 25_600)
    assert b > a
    assert a > 0


def test_runoff_increases_with_c():
    park = runoff_rate_m3_per_min(0.2, 100, 25_600)
    road = runoff_rate_m3_per_min(0.85, 100, 25_600)
    assert road > park


def test_no_negative_rainfall():
    assert runoff_rate_m3_per_min(0.8, -20, 1000) == runoff_rate_m3_per_min(0.8, 0, 1000)


def test_drainage_efficiency_degrades():
    assert drainage_efficiency(20) == 1.0
    assert drainage_efficiency(50) == 0.85
    assert drainage_efficiency(80) == 0.60
    assert drainage_efficiency(110) == 0.40


def test_flow_only_downhill():
    assert interregion_flow_m3_per_min(10, 50, 48) > 0
    assert interregion_flow_m3_per_min(10, 48, 50) == 0


def test_water_balance_traceable():
    w1 = apply_water_balance(100, 60, 30, 20, 10, 1)
    assert w1 == 140


def test_depth_and_pct():
    h = water_depth_m(2560, 25_600)
    assert abs(h - 0.1) < 1e-9
    assert abs(water_pct(0.2, 0.4) - 50.0) < 1e-9


def test_status_thresholds():
    assert flood_status(3) == "normal"
    assert flood_status(20) == "safe"
    assert flood_status(50) == "warning"
    assert flood_status(80) == "high"
    assert flood_status(100) == "critical"


def test_mass_residual_zero_when_closed():
    assert abs(mass_balance_residual(10, 50, 20, 40)) < 1e-9


def test_city_is_12x12_deterministic():
    a = build_city("bengaluru", seed=42)
    b = build_city("bengaluru", seed=42)
    assert a.rows == 12 and a.cols == 12
    assert len(a.regions) == 144
    assert [r.elevation_m for r in a.regions] == [r.elevation_m for r in b.regions]


def test_same_input_same_output():
    req = SimulationRequest(city="bengaluru", scenario="heavy", duration_hours=1.0, delta_t_minutes=10)
    x = run_simulation(req)
    y = run_simulation(req)
    assert x.summary.peak_water_pct == y.summary.peak_water_pct
    assert x.summary.critical_zones == y.summary.critical_zones
    assert x.timeline[-1].regions[0].water_volume_m3 == y.timeline[-1].regions[0].water_volume_m3


def test_higher_rain_more_runoff_and_not_less_water():
    light = run_simulation(SimulationRequest(city="bengaluru", scenario="light", duration_hours=1.5, delta_t_minutes=10))
    heavy = run_simulation(SimulationRequest(city="bengaluru", scenario="heavy", duration_hours=1.5, delta_t_minutes=10))
    assert heavy.validation.total_runoff_m3 > light.validation.total_runoff_m3
    assert heavy.summary.peak_water_pct >= light.summary.peak_water_pct


def test_more_drainage_does_not_increase_peak():
    base = run_simulation(SimulationRequest(city="bengaluru", scenario="heavy", duration_hours=1.5, delta_t_minutes=10))
    boosted = run_simulation(
        SimulationRequest(city="bengaluru", scenario="heavy", duration_hours=1.5, delta_t_minutes=10, drainage_multiplier=1.8)
    )
    assert boosted.summary.peak_water_pct <= base.summary.peak_water_pct + 0.05
    assert boosted.summary.critical_zones <= base.summary.critical_zones


def test_zero_drainage_still_runs():
    res = run_simulation(
        SimulationRequest(city="bengaluru", scenario="moderate", duration_hours=1.0, delta_t_minutes=10, drainage_multiplier=0.0)
    )
    assert res.validation.total_drainage_m3 == pytest.approx(0.0, abs=1e-6)
    assert res.summary.peak_water_pct > 0


def test_blocked_channel_changes_flow():
    open_ = run_simulation(SimulationRequest(city="bengaluru", scenario="heavy", duration_hours=1.5, delta_t_minutes=10))
    blocked = run_simulation(
        SimulationRequest(
            city="bengaluru",
            scenario="heavy",
            duration_hours=1.5,
            delta_t_minutes=10,
            blocked_edges=["G8-H8", "H7-H8"],
        )
    )
    assert blocked.blocked_edges
    # Hospital cluster cell should differ in inflow or peak
    def hosp_peak(sim):
        vals = []
        for snap in sim.timeline:
            for r in snap.regions:
                if r.land_use == "hospital":
                    vals.append(r.water_pct)
        return max(vals) if vals else 0

    # Blocking changes the hydrograph — totals transferred should differ
    assert blocked.validation.total_transferred_m3 != open_.validation.total_transferred_m3 or hosp_peak(blocked) != hosp_peak(open_)


def test_ettc_from_trajectory():
    res = run_simulation(SimulationRequest(city="bengaluru", scenario="extreme", duration_hours=3.0, delta_t_minutes=5))
    # If a region is critical in the last frame, ETTC must have been observed
    last = res.timeline[-1]
    crit = [r for r in last.regions if r.status == "critical"]
    if crit:
        rid = crit[0].id
        assert res.ettc[rid] is not None
        # first time it hit 100%
        t = res.ettc[rid]
        idx = int(round(t / res.delta_t_min))
        assert res.timeline[idx].regions[next(i for i, r in enumerate(res.timeline[0].regions) if r.id == rid)].water_pct >= 99.0


def test_never_critical_is_none():
    res = run_simulation(SimulationRequest(city="bengaluru", scenario="light", duration_hours=1.0, delta_t_minutes=10))
    # High park cells should typically never go critical in light rain
    parks = [r.id for r in res.city.regions if r.land_use == "park"]
    if parks:
        # at least some ETTC values should be None under light rain
        assert any(res.ettc[p] is None for p in parks) or res.summary.critical_zones == 0


def test_population_exposure_nonnegative():
    res = run_simulation(SimulationRequest(city="bengaluru", scenario="heavy", duration_hours=1.0, delta_t_minutes=10))
    assert res.summary.population_affected >= 0
    for r in res.timeline[-1].regions:
        assert 0 <= r.population_exposed <= r.population


def test_mass_balance_small_residual():
    res = run_simulation(SimulationRequest(city="bengaluru", scenario="heavy", duration_hours=2.0, delta_t_minutes=5))
    assert abs(res.validation.residual_pct) < 2.5


def test_green_reduces_runoff():
    base = run_simulation(SimulationRequest(city="bengaluru", scenario="heavy", duration_hours=1.5, delta_t_minutes=10))
    green = run_simulation(
        SimulationRequest(city="bengaluru", scenario="heavy", duration_hours=1.5, delta_t_minutes=10, green_reduction=0.4)
    )
    assert green.validation.total_runoff_m3 < base.validation.total_runoff_m3


def test_retention_does_not_raise_peak():
    base = run_simulation(SimulationRequest(city="bengaluru", scenario="heavy", duration_hours=1.5, delta_t_minutes=10))
    pond = run_simulation(
        SimulationRequest(city="bengaluru", scenario="heavy", duration_hours=1.5, delta_t_minutes=10, retention_boost_m3=20000)
    )
    assert pond.summary.peak_water_pct <= base.summary.peak_water_pct + 0.05


def test_kpis_come_from_engine():
    res = run_simulation(SimulationRequest(city="bengaluru", scenario="heavy", duration_hours=1.0, delta_t_minutes=10))
    snap = res.timeline[-1]
    assert snap.kpis["critical_zones"] == sum(1 for r in snap.regions if r.status == "critical")
    assert snap.kpis["population_at_risk"] == sum(r.population_exposed for r in snap.regions)
