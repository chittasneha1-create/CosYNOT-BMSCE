"""Deterministic synthetic Indian city digital twins."""

from __future__ import annotations

from typing import Any

import numpy as np

from app.data.places import city_bounds, place_at
from app.models.schemas import CityModel, Connection, RegionBase
from app.services.math_model import LAND_USE

ROWS_LABEL = "ABCDEFGHIJKL"

CITY_PROFILES: dict[str, dict[str, Any]] = {
    "bengaluru": {
        "name": "Bengaluru",
        "display_name": "cosYNOT BMSCE — Bengaluru Urban Demo",
        "tagline": "Lakes, storm drains and low-lying neighbourhoods under monsoon runoff.",
        "base_z": 900.0,
        "slope": (18.0, 16.0),  # drop south, drop east
        "rain_bias": 1.0,
        "density": 1.05,
        "notes": [
            "Bengaluru flood corridor: Koramangala–Challaghatta valley, Bellandur and Varthur.",
            "Localities from mapped neighbourhoods; elevations are relative SRTM-style metres.",
        ],
    },
    "mumbai": {
        "name": "Mumbai",
        "display_name": "cosYNOT BMSCE — Mumbai Coastal Demo",
        "tagline": "Dense island wards, railway corridors and short-duration extreme rain.",
        "base_z": 8.0,
        "slope": (6.0, 4.0),
        "rain_bias": 1.15,
        "density": 1.25,
        "notes": [
            "Mumbai-inspired synthetic digital twin — Simulation Data",
            "Low coastal relief; railway and arterial roads act as conveyance.",
        ],
    },
    "chennai": {
        "name": "Chennai",
        "display_name": "cosYNOT BMSCE — Chennai Coastal Plain Demo",
        "tagline": "Low-lying wards, canals and cyclone-scale rainfall.",
        "base_z": 6.0,
        "slope": (5.0, 7.0),
        "rain_bias": 1.10,
        "density": 1.10,
        "notes": [
            "Chennai-inspired synthetic digital twin — Simulation Data",
            "Very low relief; canals and a coastal-side depression.",
        ],
    },
    "delhi": {
        "name": "Delhi",
        "display_name": "cosYNOT BMSCE — Delhi Yamuna-side Demo",
        "tagline": "East-side low ground, drain connectivity and regulator failure.",
        "base_z": 210.0,
        "slope": (4.0, 12.0),
        "rain_bias": 0.95,
        "density": 1.15,
        "notes": [
            "Delhi-inspired synthetic digital twin — Simulation Data",
            "Elevation falls toward an eastern drain corridor (Yamuna-side analogue).",
        ],
    },
    "hyderabad": {
        "name": "Hyderabad",
        "display_name": "cosYNOT BMSCE — Hyderabad Hussain Sagar Demo",
        "tagline": "Rocky high ground, lakes and rapidly sealed catchments.",
        "base_z": 540.0,
        "slope": (14.0, 10.0),
        "rain_bias": 0.90,
        "density": 1.00,
        "notes": ["Hyderabad-inspired synthetic digital twin — Simulation Data"],
    },
    "kolkata": {
        "name": "Kolkata",
        "display_name": "cosYNOT BMSCE — Kolkata Hooghly-side Demo",
        "tagline": "Flat delta city, canals and tidal-adjacent low wards.",
        "base_z": 9.0,
        "slope": (3.5, 5.0),
        "rain_bias": 1.05,
        "density": 1.20,
        "notes": ["Kolkata-inspired synthetic digital twin — Simulation Data"],
    },
    "ahmedabad": {
        "name": "Ahmedabad",
        "display_name": "cosYNOT BMSCE — Ahmedabad Sabarmati Demo",
        "tagline": "River-adjacent wards and monsoon cloudbursts on sealed streets.",
        "base_z": 53.0,
        "slope": (8.0, 6.0),
        "rain_bias": 0.85,
        "density": 0.95,
        "notes": ["Ahmedabad-inspired synthetic digital twin — Simulation Data"],
    },
    "pune": {
        "name": "Pune",
        "display_name": "cosYNOT BMSCE — Pune Mutha Corridor Demo",
        "tagline": "Basin slopes, nallahs and expanding dense residential belts.",
        "base_z": 560.0,
        "slope": (16.0, 8.0),
        "rain_bias": 0.88,
        "density": 0.98,
        "notes": ["Pune-inspired synthetic digital twin — Simulation Data"],
    },
    "guwahati": {
        "name": "Guwahati",
        "display_name": "cosYNOT BMSCE — Guwahati Brahmaputra-side Demo",
        "tagline": "Hill-to-plain drop, wetlands and flash urban runoff.",
        "base_z": 55.0,
        "slope": (22.0, 9.0),
        "rain_bias": 1.20,
        "density": 0.90,
        "notes": ["Guwahati-inspired synthetic digital twin — Simulation Data"],
    },
    "custom": {
        "name": "Custom Indian City",
        "display_name": "cosYNOT BMSCE — Custom Indian City",
        "tagline": "User-configured synthetic twin.",
        "base_z": 100.0,
        "slope": (12.0, 12.0),
        "rain_bias": 1.0,
        "density": 1.0,
        "notes": ["Custom synthetic digital twin — Simulation Data"],
    },
}

# Special cells on the 12×12 demo (row, col) — 0-indexed
SPECIALS: dict[tuple[int, int], str] = {
    (2, 3): "park",
    (2, 8): "park",
    (3, 10): "lake",
    (4, 4): "school",
    (4, 7): "metro",
    (5, 1): "fire_station",
    (5, 5): "commercial",
    (5, 6): "commercial",
    (5, 7): "main_road",
    (6, 7): "main_road",
    (7, 2): "industrial",
    (7, 7): "hospital",
    (7, 10): "lake",
    (8, 4): "dense_residential",
    (8, 5): "dense_residential",
    (8, 7): "hospital",
    (8, 8): "dense_residential",
    (9, 0): "power_station",
    (9, 3): "railway",
    (9, 4): "railway",
    (9, 5): "railway",
    (9, 9): "school",
    (10, 2): "police_station",
    (10, 6): "bus_terminal",
    (10, 8): "water_treatment",
    (11, 11): "dense_residential",
}

CHANNEL_CELLS = {(i, i) for i in range(12)} | {(i, i - 1) for i in range(1, 12)}
MAIN_ROAD_ROWS = {5, 8}
MAIN_ROAD_COLS = {3, 7}


def _cell_id(r: int, c: int) -> str:
    return f"{ROWS_LABEL[r]}{c + 1}"


def _land_use(r: int, c: int, rng: np.random.Generator) -> str:
    if (r, c) in SPECIALS:
        return SPECIALS[(r, c)]
    if (r, c) in CHANNEL_CELLS and (r, c) not in SPECIALS:
        return "drainage_channel"
    if r in MAIN_ROAD_ROWS or c in MAIN_ROAD_COLS:
        return "main_road" if (r + c) % 3 != 0 else "secondary_road"
    if r <= 2 and c <= 2:
        return "park" if (r + c) % 2 == 0 else "open_ground"
    if r >= 8 and c >= 6:
        return "dense_residential"
    roll = rng.random()
    if roll < 0.12:
        return "park" if r < 6 else "open_ground"
    if roll < 0.28:
        return "commercial"
    if roll < 0.40:
        return "industrial" if c < 3 else "commercial"
    if roll < 0.70:
        return "dense_residential" if r > 6 else "residential"
    return "residential"


def _local_name(city: str, land: str, cid: str) -> str:
    labels = {
        "hospital": "City Hospital",
        "school": "Municipal School",
        "metro": "Metro Station",
        "railway": "Suburban Railway",
        "fire_station": "Fire Station",
        "police_station": "Police Station",
        "power_station": "Power Station",
        "water_treatment": "Water Treatment",
        "bus_terminal": "Bus Terminal",
        "lake": "Retention Lake",
        "park": "Ward Park",
        "drainage_channel": "Storm Drain",
        "dense_residential": "Dense Housing",
        "commercial": "Market / Commercial",
        "main_road": "Arterial Road",
        "industrial": "Industrial Pocket",
    }
    base = labels.get(land, land.replace("_", " ").title())
    return f"{cid} · {base}"


def build_city(city_id: str = "bengaluru", rows: int = 12, cols: int = 12, seed: int = 42) -> CityModel:
    if city_id not in CITY_PROFILES:
        city_id = "custom"
    profile = CITY_PROFILES[city_id]
    rng = np.random.default_rng(seed + sum(ord(ch) for ch in city_id))
    cell_m = 180.0
    area = cell_m * cell_m
    box = city_bounds(city_id)

    regions: list[RegionBase] = []
    for r in range(rows):
        for c in range(cols):
            place = place_at(city_id, r, c)
            land = place["land"] if place["land"] in LAND_USE else "residential"
            lu = LAND_USE[land]
            z = float(place["elev"])
            pop = int(place["pop"])
            lat = box["north"] - ((r + 0.5) / rows) * (box["north"] - box["south"])
            lon = box["west"] + ((c + 0.5) / cols) * (box["east"] - box["west"])

            h_safe = 0.70 if land == "lake" else 0.16 if land in ("dense_residential", "hospital") else 0.24
            if land == "main_road":
                h_safe = 0.14
            if land == "secondary_road":
                h_safe = 0.16
            if land == "drainage_channel":
                h_safe = 0.90
            if land == "metro":
                h_safe = 0.15

            drain = {
                "drainage_channel": 42.0,
                "lake": 8.0,
                "main_road": 28.0,
                "hospital": 14.0,
                "metro": 18.0,
                "commercial": 20.0,
                "dense_residential": 12.0,
                "residential": 16.0,
                "park": 10.0,
                "industrial": 18.0,
                "power_station": 16.0,
                "school": 15.0,
                "railway": 17.0,
            }.get(land, 15.0)
            drain *= float(rng.uniform(0.92, 1.08))
            if land in ("dense_residential", "hospital", "commercial") and r >= 5:
                drain *= 0.72

            icon_map = {
                "hospital": "hospital",
                "school": "school",
                "metro": "metro",
                "railway": "railway",
                "fire": "fire",
                "police": "police",
                "power": "power",
                "water": "water",
                "bus": "bus",
                "lake": "lake",
            }
            infra = [icon_map.get(lu["icon"], lu["icon"])] if lu.get("icon") else []

            cid = _cell_id(r, c)
            regions.append(
                RegionBase(
                    id=cid,
                    name=place["name"],
                    row=r,
                    col=c,
                    lat=round(lat, 5),
                    lon=round(lon, 5),
                    elevation_m=round(z, 2),
                    area_m2=area,
                    h_safe_m=h_safe,
                    runoff_c=float(lu["C"]),
                    infiltration_mm_hr=float(lu["infiltration_mm_hr"]),
                    land_use=land,
                    surface="park" if land in ("park", "open_ground") else "concrete" if land in ("main_road", "metro") else "buildings",
                    drainage_capacity_m3_min=round(drain, 2),
                    population=pop,
                    infrastructure=infra,
                    infrastructure_importance=float(lu["importance"]),
                    neighbors=[],
                    is_retention=land == "lake",
                    storage_extra_m3=8000.0 if land == "lake" else 0.0,
                )
            )

    by_id = {reg.id: reg for reg in regions}
    connections: list[Connection] = []
    for r in range(rows):
        for c in range(cols):
            a = _cell_id(r, c)
            for dr, dc, kind in ((0, 1, "road"), (1, 0, "road")):
                rr, cc = r + dr, c + dc
                if rr >= rows or cc >= cols:
                    continue
                b = _cell_id(rr, cc)
                edge_kind = "channel" if by_id[a].land_use == "drainage_channel" or by_id[b].land_use == "drainage_channel" else "road"
                if by_id[a].is_retention or by_id[b].is_retention:
                    edge_kind = "natural"
                connections.append(
                    Connection(
                        a=a,
                        b=b,
                        kind=edge_kind,
                        length_m=cell_m,
                        width_m=36.0 if edge_kind == "channel" else 22.0,
                        blocked=False,
                    )
                )
            by_id[a].neighbors = []

    # Alternate relief channel around the hospital depression (normally closed)
    connections.append(
        Connection(a="H8", b="G10", kind="alternate", length_m=cell_m * 1.6, width_m=18.0, blocked=True)
    )
    connections.append(
        Connection(a="I8", b="H11", kind="alternate", length_m=cell_m * 1.8, width_m=18.0, blocked=True)
    )

    adj: dict[str, set[str]] = {reg.id: set() for reg in regions}
    for e in connections:
        if e.kind != "alternate":
            adj[e.a].add(e.b)
            adj[e.b].add(e.a)
    for reg in regions:
        reg.neighbors = sorted(adj[reg.id])

    return CityModel(
        id=city_id,
        name=profile["name"],
        display_name=profile["display_name"],
        tagline=profile["tagline"],
        disclaimer="Simulation Data — Synthetic Digital Twin. Not sensor or GIS measurements of the named city.",
        rows=rows,
        cols=cols,
        cell_size_m=cell_m,
        seed=seed,
        synthetic=True,
        regions=regions,
        connections=connections,
        notes=list(profile["notes"]),
    )


def list_cities() -> list[dict[str, str]]:
    return [
        {"id": k, "name": v["name"], "display_name": v["display_name"], "tagline": v["tagline"]}
        for k, v in CITY_PROFILES.items()
    ]
