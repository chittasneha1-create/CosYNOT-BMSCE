"""Rainfall scenarios and time-varying intensity."""

from __future__ import annotations

from app.models.schemas import RainSegment

# Named rainfall programmes. Intensities in mm/hr.
SCENARIOS: dict[str, dict] = {
    "light": {
        "label": "Light rain",
        "narrative": "20 mm/hr steady — background monsoon drizzle.",
        "segments": [(0, 10_000, 20.0)],
    },
    "normal": {
        "label": "Normal monsoon",
        "narrative": "Steady 20–30 mm/hr monsoon pulse.",
        "segments": [(0, 30, 20.0), (30, 180, 28.0), (180, 10_000, 18.0)],
    },
    "moderate": {
        "label": "Moderate rain",
        "narrative": "50 mm/hr sustained rainfall.",
        "segments": [(0, 10_000, 50.0)],
    },
    "heavy": {
        "label": "Heavy monsoon",
        "narrative": "80–110 mm/hr heavy urban monsoon.",
        "segments": [(0, 15, 70.0), (15, 150, 110.0), (150, 10_000, 75.0)],
    },
    "extreme": {
        "label": "Extreme event",
        "narrative": "30 → 120 → 60 mm/hr extreme pulse.",
        "segments": [(0, 30, 30.0), (30, 90, 80.0), (90, 150, 130.0), (150, 10_000, 60.0)],
    },
    "storm_burst": {
        "label": "Storm burst",
        "narrative": "Short-duration extreme — Mumbai-style cloudburst analogue (synthetic).",
        "segments": [(0, 15, 40.0), (15, 75, 165.0), (75, 120, 90.0), (120, 10_000, 35.0)],
    },
    "increasing": {
        "label": "Increasing rainfall",
        "narrative": "Intensifying storm cell.",
        "segments": [(0, 40, 25.0), (40, 90, 60.0), (90, 160, 110.0), (160, 10_000, 140.0)],
    },
    "decreasing": {
        "label": "Decreasing rainfall",
        "narrative": "Storm passing / recession limb.",
        "segments": [(0, 40, 120.0), (40, 90, 70.0), (90, 160, 35.0), (160, 10_000, 12.0)],
    },
    "drainage_failure": {
        "label": "Drainage failure",
        "narrative": "Heavy rain plus failing drainage (Delhi regulator analogue — synthetic).",
        "segments": [(0, 20, 50.0), (20, 10_000, 95.0)],
    },
    "blocked": {
        "label": "Blocked channel",
        "narrative": "Heavy rain with a blocked storm-drain connection.",
        "segments": [(0, 20, 55.0), (20, 10_000, 95.0)],
    },
    "intervention": {
        "label": "Intervention case",
        "narrative": "Same heavy monsoon with drainage / storage interventions.",
        "segments": [(0, 20, 55.0), (20, 150, 95.0), (150, 10_000, 70.0)],
    },
    "custom": {
        "label": "Custom rainfall",
        "narrative": "User-defined hyetograph.",
        "segments": [(0, 10_000, 80.0)],
    },
}


def intensity_at(t_min: float, segments: list[tuple[float, float, float]] | list[RainSegment], fallback: float = 0.0) -> float:
    if not segments:
        return max(0.0, fallback)
    for seg in segments:
        if isinstance(seg, RainSegment):
            start, end, val = seg.start_min, seg.end_min, seg.intensity_mm_hr
        else:
            start, end, val = seg
        if start <= t_min < end:
            return max(0.0, float(val))
    last = segments[-1]
    if isinstance(last, RainSegment):
        return max(0.0, last.intensity_mm_hr)
    return max(0.0, float(last[2]))


def spatial_factor(row: int, col: int, t_min: float, rows: int, cols: int, motion: bool) -> float:
    """
    Non-uniform storm. If motion=True the cell centre drifts SE over time.
    Factors are deterministic (no RNG).
    """
    if motion:
        cr = 2.0 + (t_min / 180.0) * (rows - 4)
        cc = 2.5 + (t_min / 180.0) * (cols - 5)
    else:
        cr = rows * 0.62
        cc = cols * 0.58
    dist = ((row - cr) ** 2 + (col - cc) ** 2) ** 0.5
    return max(0.55, 1.25 - 0.085 * dist)


def scenario_segments(name: str, custom: list[RainSegment] | None, override_mm: float | None):
    if custom:
        return [(s.start_min, s.end_min, s.intensity_mm_hr) for s in custom]
    if override_mm is not None:
        return [(0.0, 10_000.0, float(override_mm))]
    spec = SCENARIOS.get(name, SCENARIOS["heavy"])
    return list(spec["segments"])
