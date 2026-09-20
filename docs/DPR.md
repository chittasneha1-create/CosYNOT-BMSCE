# cosYNOT BMSCE — Detailed Project Report (hackathon)

## Objective

Build an explainable mathematical digital twin of an Indian urban catchment that converts rainfall into runoff, drainage, inter-region flow, flood state, time-to-critical and intervention deltas.

## What is simulated

A 12×12 (144-cell) synthetic city with Indian land-use types, a NW→SE slope, a hospital-centred depression, lakes, a storm-drain diagonal and an optional relief channel.

## What is not claimed

The grid is **not** Bengaluru / Mumbai GIS. Historical cards are references, not reconstructions.

## Engine

Discrete Δt = 5 min. State is volume \(W_i\). Depth \(h=W/A\). All UI KPIs are slices of the same trajectory.

## Limitations

Lumped 2D cells, no full SWE / SWMM pipe network, policy risk weights, illustrative ₹ costs, no live IMD ingest.

## Roadmap

Verified DEM + drain graphs, radar rainfall, sensor assimilation, ML nowcasts as **inputs** to the same water-balance core.
