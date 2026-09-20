"""
FlowShield mathematical model — SINGLE SOURCE OF TRUTH.

These equations are implemented exactly as specified for the hackathon
digital twin. Do not duplicate flood formulas in the frontend.

Terminology (preserve these symbols):
  W_i   stored water volume in region i                    [m³]
  h_i   water depth                                        [m]
  z_i   ground elevation                                   [m]
  H_i   effective water-surface elevation = z_i + h_i      [m]
  P     rainfall intensity                                 [mm/hr]
  C     runoff coefficient                                 [-]
  A     region plan area                                   [m²]
  Q_r   surface runoff volume rate                         [m³/min]
  D     drainage removal rate                              [m³/min]
  η     drainage efficiency                                [-]
  F_ij  inter-region flow i → j                            [m³/min]
  K_ij  hydraulic conductance of connection i–j            [m²/min]
  Δt    time step                                          [min]

WATER BALANCE
  W_i(t+Δt) = W_i(t) + (Q_r,i − D_i + Σ F_j→i − Σ F_i→j) · Δt

RUNOFF
  Q_r = C × P × A     (with unit conversion mm/hr → m/min)

DRAINAGE
  D = min(available, Capacity × η × multiplier + pump)

FLOW
  H_i = z_i + h_i
  F_i→j = K_ij · max(0, H_i − H_j)
  K_ij = C_flow · A_conn / L

RETENTION (extra storage)
  A_eff = A + V_storage / h_char      h_char = 1 m
  H_pond = z + W / A_eff
  Water%_pond = 100 × W / (A · h_safe + V_storage)
  Extra volume lowers pond head, so connected cells drain into the basin.

Replace or extend functions in this module to update the entire product.
"""

from __future__ import annotations

from typing import Any

import numpy as np

# ---------------------------------------------------------------------------
# Documented constants (modelling assumptions, not city measurements)
# ---------------------------------------------------------------------------

MM_PER_M = 1000.0
MIN_PER_HR = 60.0

# Default flood classification thresholds on water_pct = 100 * h / h_safe
THRESHOLD_SAFE = 40.0
THRESHOLD_WARNING = 70.0
THRESHOLD_HIGH = 100.0

# Drainage efficiency η(water_pct) — surcharge / clogging curve
ETA_SAFE = 1.00
ETA_WARNING = 0.85
ETA_HIGH = 0.60
ETA_CRITICAL = 0.40

# Hydraulic conductance coefficient C_flow [m/min]
# Effective conveyance scale (roughness, inlet geometry, street flow lumped).
# K_ij = C_flow * A_conn / L   →   F = K * ΔH
C_FLOW = 72.0  # m/min  (~1.2 m/s lumped street-flow scale)

# Typical connection geometry used when a city does not override it
DEFAULT_INTERFACE_DEPTH_M = 0.22  # m  representative street-flow depth scale

# Risk score policy weights (design parameters, not scientific truth)
RISK_WEIGHTS = {
    "water_level": 0.35,
    "rate_of_rise": 0.20,
    "drainage_stress": 0.15,
    "elevation": 0.15,
    "rainfall": 0.10,
    "infrastructure": 0.05,
}

# Emergency priority policy weights
PRIORITY_WEIGHTS = {
    "flood_risk": 0.40,
    "population_exposure": 0.20,
    "infrastructure": 0.25,
    "ettc_urgency": 0.15,
}

# Population exposure fractions by water_pct
EXPOSURE_BREAKS = (
    (40.0, 0.00),
    (60.0, 0.10),
    (80.0, 0.40),
    (100.0, 0.70),
    (1e9, 1.00),
)

# Land-use modelling assumptions (not measured city values)
LAND_USE: dict[str, dict[str, Any]] = {
    "residential": {"C": 0.65, "infiltration_mm_hr": 4.0, "importance": 0.55, "icon": None},
    "dense_residential": {"C": 0.80, "infiltration_mm_hr": 2.0, "importance": 0.75, "icon": None},
    "commercial": {"C": 0.85, "infiltration_mm_hr": 1.0, "importance": 0.60, "icon": None},
    "main_road": {"C": 0.90, "infiltration_mm_hr": 0.5, "importance": 0.70, "icon": None},
    "secondary_road": {"C": 0.85, "infiltration_mm_hr": 0.8, "importance": 0.45, "icon": None},
    "park": {"C": 0.20, "infiltration_mm_hr": 18.0, "importance": 0.15, "icon": None},
    "open_ground": {"C": 0.35, "infiltration_mm_hr": 12.0, "importance": 0.15, "icon": None},
    "industrial": {"C": 0.80, "infiltration_mm_hr": 1.5, "importance": 0.55, "icon": None},
    "hospital": {"C": 0.88, "infiltration_mm_hr": 0.8, "importance": 1.00, "icon": "hospital"},
    "school": {"C": 0.75, "infiltration_mm_hr": 3.0, "importance": 0.90, "icon": "school"},
    "metro": {"C": 0.90, "infiltration_mm_hr": 0.5, "importance": 0.92, "icon": "metro"},
    "railway": {"C": 0.70, "infiltration_mm_hr": 2.0, "importance": 0.88, "icon": "railway"},
    "bus_terminal": {"C": 0.85, "infiltration_mm_hr": 1.0, "importance": 0.70, "icon": "bus"},
    "fire_station": {"C": 0.80, "infiltration_mm_hr": 1.5, "importance": 0.95, "icon": "fire"},
    "police_station": {"C": 0.80, "infiltration_mm_hr": 1.5, "importance": 0.85, "icon": "police"},
    "power_station": {"C": 0.85, "infiltration_mm_hr": 1.0, "importance": 0.96, "icon": "power"},
    "water_treatment": {"C": 0.70, "infiltration_mm_hr": 3.0, "importance": 0.93, "icon": "water"},
    "drainage_channel": {"C": 0.95, "infiltration_mm_hr": 0.2, "importance": 0.40, "icon": None},
    "lake": {"C": 0.05, "infiltration_mm_hr": 0.0, "importance": 0.25, "icon": "lake"},
}

SURFACE_C_PRESETS = {
    "concrete": 0.90,
    "road": 0.85,
    "buildings": 0.80,
    "soil": 0.40,
    "park": 0.20,
}


def rainfall_to_m_per_min(p_mm_hr: float) -> float:
    """Convert rainfall intensity P [mm/hr] → [m/min]."""
    return (float(p_mm_hr) / MM_PER_M) / MIN_PER_HR


def runoff_rate_m3_per_min(c: float, p_mm_hr: float, area_m2: float) -> float:
    """
    Q_r = C × P × A

    P is converted from mm/hr to m/min so Q_r is m³/min.
    Q_r [m³/min] = C [-] × (P/1000/60) [m/min] × A [m²]
    """
    c = float(np.clip(c, 0.0, 1.0))
    p = max(0.0, float(p_mm_hr))
    a = max(0.0, float(area_m2))
    return c * rainfall_to_m_per_min(p) * a


def infiltration_mm_hr(p_mm_hr: float, i_capacity_mm_hr: float) -> float:
    """I = min(I_capacity, P). Used for explainability; runoff uses C × P × A."""
    return min(max(0.0, float(i_capacity_mm_hr)), max(0.0, float(p_mm_hr)))


def drainage_efficiency(water_pct: float) -> float:
    """
    η(water_pct):
      < 40%        → 1.00
      40–70%       → 0.85
      70–100%      → 0.60
      ≥ 100%       → 0.40
    """
    w = float(water_pct)
    if w < THRESHOLD_SAFE:
        return ETA_SAFE
    if w < THRESHOLD_WARNING:
        return ETA_WARNING
    if w < THRESHOLD_HIGH:
        return ETA_HIGH
    return ETA_CRITICAL


def drainage_rate_m3_per_min(
    capacity_m3_min: float,
    eta: float,
    multiplier: float = 1.0,
    pump_m3_min: float = 0.0,
    available_m3_min: float | None = None,
) -> float:
    """
    D = min(available, Capacity × η × multiplier + pump)
    Capacity, D in m³/min.
    """
    d = max(0.0, float(capacity_m3_min)) * float(np.clip(eta, 0.0, 1.0)) * max(0.0, float(multiplier))
    d += max(0.0, float(pump_m3_min))
    if available_m3_min is not None:
        d = min(d, max(0.0, float(available_m3_min)))
    return max(0.0, d)


def water_depth_m(volume_m3: float, area_m2: float) -> float:
    """h = W / A"""
    a = max(1e-9, float(area_m2))
    return max(0.0, float(volume_m3)) / a


def water_pct(depth_m: float, h_safe_m: float) -> float:
    """Water% = (h / h_safe) × 100"""
    hs = max(1e-6, float(h_safe_m))
    return 100.0 * max(0.0, float(depth_m)) / hs


def effective_head_m(elevation_m: float, depth_m: float) -> float:
    """H = z + h"""
    return float(elevation_m) + float(depth_m)


RETENTION_CHAR_DEPTH_M = 1.0


def effective_area_m2(area_m2: float, storage_extra_m3: float) -> float:
    """A_eff = A + V_storage / h_char. Extra storage slows head rise in ponds."""
    return max(1.0, float(area_m2)) + max(0.0, float(storage_extra_m3)) / RETENTION_CHAR_DEPTH_M


def pond_capacity_m3(area_m2: float, h_safe_m: float, storage_extra_m3: float) -> float:
    """W_cap = A · h_safe + V_storage"""
    return max(1.0, float(area_m2)) * max(1e-6, float(h_safe_m)) + max(0.0, float(storage_extra_m3))


def hydraulic_conductance(
    length_m: float,
    width_m: float,
    c_flow: float = C_FLOW,
    interface_depth_m: float = DEFAULT_INTERFACE_DEPTH_M,
) -> float:
    """
    K_ij = C_flow × A_conn / L
    A_conn ≈ width × representative interface depth
    K in m²/min so that F = K × ΔH has units m³/min.
    """
    l = max(1.0, float(length_m))
    a_conn = max(0.0, float(width_m)) * max(0.02, float(interface_depth_m))
    return max(0.0, float(c_flow)) * a_conn / l


def interregion_flow_m3_per_min(k_ij: float, h_i: float, h_j: float) -> float:
    """F_i→j = K_ij × max(0, H_i − H_j)"""
    return max(0.0, float(k_ij)) * max(0.0, float(h_i) - float(h_j))


def flood_status(
    pct: float,
    t_safe: float = THRESHOLD_SAFE,
    t_warn: float = THRESHOLD_WARNING,
    t_high: float = THRESHOLD_HIGH,
) -> str:
    if pct < 5.0:
        return "normal"
    if pct < t_safe:
        return "safe"
    if pct < t_warn:
        return "warning"
    if pct < t_high:
        return "high"
    return "critical"


def exposure_fraction(water_pct_value: float) -> float:
    for limit, frac in EXPOSURE_BREAKS:
        if water_pct_value < limit:
            return frac
    return 1.0


def affected_population(population: float, water_pct_value: float) -> int:
    """AffectedPopulation = Population × ExposureFactor"""
    return int(round(max(0.0, float(population)) * exposure_fraction(water_pct_value)))


def rate_of_rise_component(dh_m_per_min: float, h_safe_m: float) -> float:
    """Map rise rate to 0–100.  Full score if rising at ≥ h_safe / 60 min."""
    ref = max(1e-4, float(h_safe_m) / 60.0)
    return float(np.clip(100.0 * max(0.0, dh_m_per_min) / ref, 0.0, 100.0))


def elevation_risk_component(elevation_m: float, z_min: float, z_max: float) -> float:
    """Lower elevation → higher risk. 100 at z_min, 0 at z_max."""
    span = max(0.5, float(z_max) - float(z_min))
    return float(np.clip(100.0 * (z_max - elevation_m) / span, 0.0, 100.0))


def rainfall_risk_component(p_mm_hr: float) -> float:
    """0 at 0 mm/hr, 100 at 160 mm/hr."""
    return float(np.clip(100.0 * max(0.0, p_mm_hr) / 160.0, 0.0, 100.0))


def drainage_stress_component(utilization: float) -> float:
    return float(np.clip(100.0 * max(0.0, utilization), 0.0, 100.0))


def infrastructure_component(importance: float) -> float:
    return float(np.clip(100.0 * max(0.0, importance), 0.0, 100.0))


def flood_risk_score(
    water_level_pct: float,
    rise_score: float,
    drain_stress: float,
    elev_score: float,
    rain_score: float,
    infra_score: float,
    weights: dict[str, float] | None = None,
) -> tuple[float, dict[str, float]]:
    """
    Risk = Σ w_k · component_k
    Default: 35% water, 20% rise, 15% drainage, 15% elevation, 10% rain, 5% infra.
    """
    w = weights or RISK_WEIGHTS
    comps = {
        "water_level": float(np.clip(water_level_pct, 0.0, 140.0)) * (100.0 / 140.0),
        "rate_of_rise": float(np.clip(rise_score, 0.0, 100.0)),
        "drainage_stress": float(np.clip(drain_stress, 0.0, 100.0)),
        "elevation": float(np.clip(elev_score, 0.0, 100.0)),
        "rainfall": float(np.clip(rain_score, 0.0, 100.0)),
        "infrastructure": float(np.clip(infra_score, 0.0, 100.0)),
    }
    score = (
        w["water_level"] * comps["water_level"]
        + w["rate_of_rise"] * comps["rate_of_rise"]
        + w["drainage_stress"] * comps["drainage_stress"]
        + w["elevation"] * comps["elevation"]
        + w["rainfall"] * comps["rainfall"]
        + w["infrastructure"] * comps["infrastructure"]
    )
    return float(np.clip(score, 0.0, 100.0)), comps


def ettc_urgency(ettc_min: float | None, horizon_min: float) -> float:
    """100 if already critical / imminent; 0 if never critical in horizon."""
    if ettc_min is None:
        return 0.0
    if ettc_min <= 0:
        return 100.0
    return float(np.clip(100.0 * (1.0 - ettc_min / max(1.0, horizon_min)), 0.0, 100.0))


def emergency_priority(
    risk: float,
    exposure_frac: float,
    importance: float,
    ettc_min: float | None,
    horizon_min: float,
    weights: dict[str, float] | None = None,
) -> float:
    """
    Priority_i = w1 Risk + w2 Exposure + w3 Infra + w4 ETTC urgency
    Weights are policy/design parameters, not physical constants.
    """
    w = weights or PRIORITY_WEIGHTS
    return float(
        np.clip(
            w["flood_risk"] * risk
            + w["population_exposure"] * 100.0 * exposure_frac
            + w["infrastructure"] * 100.0 * importance
            + w["ettc_urgency"] * ettc_urgency(ettc_min, horizon_min),
            0.0,
            100.0,
        )
    )


def apply_water_balance(
    w: float,
    q_r: float,
    drainage: float,
    inflow: float,
    outflow: float,
    dt_min: float,
) -> float:
    """W(t+Δt) = W(t) + (Q_r − D + F_in − F_out) · Δt   (floored at 0)."""
    return max(0.0, float(w) + (float(q_r) - float(drainage) + float(inflow) - float(outflow)) * float(dt_min))


def mass_balance_residual(
    initial_volume: float,
    rainfall_in: float,
    drainage_out: float,
    final_volume: float,
) -> float:
    """
    Residual = W_0 + Σ Q_r Δt − Σ D Δt − W_final
    Internal transfers cancel. ~0 proves conservation (numerical error only).
    """
    return float(initial_volume) + float(rainfall_in) - float(drainage_out) - float(final_volume)


def equation_catalog() -> list[dict[str, Any]]:
    """Public catalog for the Math Model page."""
    return [
        {
            "id": "water_balance",
            "title": "Water balance",
            "latex": "W_i(t+Δt) = W_i(t) + (Q_{r,i} - D_i + Σ F_{j→i} - Σ F_{i→j}) · Δt",
            "plain": "New stored volume = previous volume + (runoff − drainage + inflow − outflow) × time step",
            "variables": [
                {"symbol": "W_i", "name": "Stored water volume", "unit": "m³"},
                {"symbol": "Q_r,i", "name": "Surface runoff rate", "unit": "m³/min"},
                {"symbol": "D_i", "name": "Drainage removal rate", "unit": "m³/min"},
                {"symbol": "F", "name": "Inter-region flow", "unit": "m³/min"},
                {"symbol": "Δt", "name": "Time step", "unit": "min"},
            ],
        },
        {
            "id": "runoff",
            "title": "Runoff",
            "latex": "Q_r = C × P × A",
            "plain": "Runoff volume rate equals runoff coefficient × rainfall intensity × area (unit-converted to m³/min).",
            "variables": [
                {"symbol": "C", "name": "Runoff coefficient", "unit": "–"},
                {"symbol": "P", "name": "Rainfall intensity", "unit": "mm/hr"},
                {"symbol": "A", "name": "Region area", "unit": "m²"},
                {"symbol": "Q_r", "name": "Surface runoff", "unit": "m³/min"},
            ],
        },
        {
            "id": "depth",
            "title": "Water depth and flood percentage",
            "latex": "h = W / A     Water% = (h / h_safe) × 100",
            "plain": "Depth is volume over area. Percentage is depth relative to the safe depth.",
            "variables": [
                {"symbol": "h", "name": "Water depth", "unit": "m"},
                {"symbol": "h_safe", "name": "Maximum safe water depth", "unit": "m"},
            ],
        },
        {
            "id": "drainage",
            "title": "Drainage",
            "latex": "D = min(available, Capacity × η × m + pump)",
            "plain": "Drainage cannot exceed available water. Efficiency η falls as the cell floods (surcharge / clogging).",
            "variables": [
                {"symbol": "Capacity", "name": "Nominal drainage capacity", "unit": "m³/min"},
                {"symbol": "η", "name": "Drainage efficiency", "unit": "–"},
                {"symbol": "m", "name": "Capacity multiplier (failure / boost)", "unit": "–"},
                {"symbol": "pump", "name": "Emergency pump rate", "unit": "m³/min"},
            ],
        },
        {
            "id": "head",
            "title": "Effective water-surface elevation",
            "latex": "H_i = z_i + h_i",
            "plain": "Water moves according to the free surface, not ground elevation alone.",
            "variables": [
                {"symbol": "z_i", "name": "Ground elevation", "unit": "m"},
                {"symbol": "H_i", "name": "Water-surface elevation", "unit": "m"},
            ],
        },
        {
            "id": "flow",
            "title": "Inter-region flow",
            "latex": "F_{i→j} = K_{ij} · max(0, H_i − H_j)     K_{ij} = C_flow · A_conn / L",
            "plain": "Flow only from higher to lower water surface, only along unblocked connections. K is hydraulic conductance.",
            "variables": [
                {"symbol": "K_ij", "name": "Hydraulic conductance", "unit": "m²/min"},
                {"symbol": "C_flow", "name": "Conveyance coefficient", "unit": "m/min"},
                {"symbol": "A_conn", "name": "Interface area", "unit": "m²"},
                {"symbol": "L", "name": "Center-to-center length", "unit": "m"},
            ],
        },
        {
            "id": "risk",
            "title": "Flood risk score",
            "latex": "Risk = 0.35 WL + 0.20 Rise + 0.15 Drain + 0.15 Elev + 0.10 Rain + 0.05 Infra",
            "plain": "Transparent weighted sum of physical and exposure components. Weights are design parameters.",
            "variables": [
                {"symbol": "WL", "name": "Water-level component", "unit": "0–100"},
                {"symbol": "Rise", "name": "Rate-of-rise component", "unit": "0–100"},
            ],
        },
        {
            "id": "ettc",
            "title": "Estimated time to critical (ETTC)",
            "latex": "ETTC_i = min { t | Water%(i,t) ≥ 100 } − t_now",
            "plain": "First simulated time the region reaches or exceeds its safe capacity. Not an AI forecast.",
            "variables": [
                {"symbol": "ETTC", "name": "Minutes until critical", "unit": "min"},
            ],
        },
        {
            "id": "exposure",
            "title": "Population exposure",
            "latex": "Affected = Population × f(Water%)",
            "plain": "f = 0 / 0.10 / 0.40 / 0.70 / 1.00 for <40, 40–60, 60–80, 80–100, ≥100.",
            "variables": [
                {"symbol": "f", "name": "Exposure fraction", "unit": "–"},
            ],
        },
        {
            "id": "priority",
            "title": "Emergency priority",
            "latex": "Priority = 0.40 Risk + 0.20 Exposure + 0.25 Infra + 0.15 ETTC urgency",
            "plain": "Policy ranking so a hospital is not treated like a park. Weights are design parameters.",
            "variables": [
                {"symbol": "Priority", "name": "Emergency priority score", "unit": "0–100"},
            ],
        },
        {
            "id": "retention",
            "title": "Retention pond storage",
            "latex": "A_eff = A + V_storage / 1m     H = z + W/A_eff     Water% = 100 W / (A h_safe + V_storage)",
            "plain": "Extra storage slows pond-head rise so connected streets drain into the basin. Volume stays in the water balance.",
            "variables": [
                {"symbol": "V_storage", "name": "Additional retention volume", "unit": "m³"},
                {"symbol": "A_eff", "name": "Effective pond area for head", "unit": "m²"},
            ],
        },
        {
            "id": "mass",
            "title": "Mass-balance residual",
            "latex": "ε = W_0 + Σ Q_r Δt − Σ D Δt − W_final",
            "plain": "Internal transfers cancel. A near-zero residual shows the engine conserves water.",
            "variables": [
                {"symbol": "ε", "name": "Conservation residual", "unit": "m³"},
            ],
        },
    ]
