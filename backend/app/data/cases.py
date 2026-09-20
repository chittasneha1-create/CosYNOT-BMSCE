"""Historical Indian flood events — contextual references only."""

CASES = [
    {
        "id": "bengaluru-2022",
        "city": "Bengaluru",
        "year": 2022,
        "month": "September",
        "title": "Bengaluru Urban Flooding — September 2022",
        "label": "HISTORICAL REFERENCE",
        "what_happened": [
            "Heavy / torrential rainfall over Bengaluru",
            "Extensive urban waterlogging across low-lying neighbourhoods",
            "Traffic disruption on major corridors",
            "Low-lying areas becoming especially vulnerable",
        ],
        "why_it_matters": (
            "Shows how intense rainfall, sealed urban surfaces and stressed storm drains "
            "combine to waterlog a city even without a major river overflow."
        ),
        "flowshield_connection": [
            "High rainfall",
            "Urban surface runoff",
            "Low-lying accumulation",
            "Drainage stress",
            "Early warning on ETTC",
        ],
        "scenario": "heavy",
        "mechanism": "HIGH RAINFALL + URBAN SURFACE RUNOFF + LOW-LYING AREAS + DRAINAGE STRESS",
        "do_not": "Do not treat the synthetic Bengaluru twin as a reconstruction of 2022 depths or counts.",
    },
    {
        "id": "delhi-2023",
        "city": "Delhi",
        "year": 2023,
        "month": "July",
        "title": "Delhi-Yamuna Flooding — July 2023",
        "label": "HISTORICAL REFERENCE",
        "what_happened": [
            "Heavy rainfall in Delhi and northern catchments",
            "Rising Yamuna levels",
            "Flooding in parts of Delhi",
            "Water entering urban areas through a damaged / broken drain regulator",
        ],
        "why_it_matters": (
            "Infrastructure failure and drainage connectivity can import flood water into the city "
            "even when local rainfall is only part of the story."
        ),
        "flowshield_connection": [
            "Blocked / failed drainage",
            "Backflow and connectivity",
            "Regulator / channel failure",
            "Priority protection of urban wards",
        ],
        "scenario": "drainage_failure",
        "mechanism": "BLOCKED / FAILED DRAINAGE",
        "do_not": "The Delhi twin does not recreate Yamuna gauge readings.",
    },
    {
        "id": "chennai-2023",
        "city": "Chennai",
        "year": 2023,
        "month": "December",
        "title": "Chennai Flooding — Cyclone Michaung, December 2023",
        "label": "HISTORICAL REFERENCE",
        "what_happened": [
            "Intense rainfall preceding / associated with Cyclone Michaung",
            "Widespread urban flooding",
            "Low-lying areas becoming inundated",
            "Roads and residential areas affected",
        ],
        "why_it_matters": (
            "Cyclone-scale rainfall overwhelms runoff, drainage and low-lying storage at the same time — "
            "exactly the chain an early-warning digital twin must compute."
        ),
        "flowshield_connection": [
            "Extreme rainfall hyetograph",
            "Runoff on sealed catchments",
            "Low-lying inundation",
            "Need for rainfall + runoff + drainage + ETTC",
        ],
        "scenario": "extreme",
        "mechanism": "EXTREME RAINFALL",
        "do_not": "Synthetic Chennai results are not a Michaung reconstruction.",
    },
    {
        "id": "mumbai-2024",
        "city": "Mumbai",
        "year": 2024,
        "month": "July",
        "title": "Mumbai Urban Flooding — July 2024",
        "label": "HISTORICAL REFERENCE",
        "what_happened": [
            "Extremely heavy rainfall",
            "More than 300 mm of rainfall reported within approximately six hours",
            "Roads and railway tracks flooded",
            "Major transport disruption",
            "Schools / colleges closed as a precaution",
        ],
        "why_it_matters": (
            "A short, extreme pulse can flood transport corridors faster than daily-mean rainfall would suggest. "
            "Duration and intensity both matter."
        ),
        "flowshield_connection": [
            "Storm-burst hyetograph",
            "Railway / road conveyance",
            "Short-duration extreme rainfall",
            "Time-to-critical on transport cells",
        ],
        "scenario": "storm_burst",
        "mechanism": "SHORT-DURATION EXTREME RAINFALL",
        "do_not": "The Mumbai twin does not replay the July 2024 gauge network.",
    },
]

DISCLAIMER = (
    "Historical events are shown as contextual references. "
    "cosYNOT BMSCE simulations use synthetic data unless explicitly connected to verified datasets."
)
