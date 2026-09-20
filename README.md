# cosYNOT BMSCE

**Predict the flood. Protect the future.**

India-focused urban flood **digital twin**: a FastAPI simulation engine plus a React control room. The home view is a **Live Flood Map** — satellite imagery of real Indian river / valley corridors, with engine-computed water painted on top as the event unfolds.

This is **not** a weather map, **not** an official forecast, and **not** an AI black box. Water levels come from a deterministic discrete-time water-balance model in one Python file.

---

## What it does

1. **Where** flooding happens — neighbourhoods along real corridors (Bellandur–Varthur, Mithi, Adyar, Yamuna, …).
2. **When** a place becomes critical — **ETTC** (estimated time to critical).
3. **Why** it floods — runoff, drainage, inflow / outflow, elevation.
4. **What** you can change — pumps, drainage, greener surfaces, ponds, relief channels.

Named Indian cities are **inspirational twins**: OSM-style locality names and SRTM-style relative elevations on a 12×12 grid, overlaid on real satellite terrain. They are **not** GIS reconstructions or IMD/NDMA forecasts.

Historical events (Bengaluru 2022, Delhi 2023, Chennai / Michaung 2023, Mumbai 2024, and others) are **contextual references** only.

---

## Features

| Area | What you get |
| --- | --- |
| **Live Flood Map** | Leaflet + Esri World Imagery; flood canvas + flowing river overlay from the engine |
| **City twins** | Bengaluru, Mumbai, Chennai, Delhi, Hyderabad, Kolkata, Ahmedabad, Pune, Guwahati (+ custom = Bengaluru frame) |
| **Risk Analysis** | Places aggregated by neighbourhood name: risk, water %, ETTC, exposed people, elevation |
| **Early Warning** | Priority list of localities the engine flags first |
| **Flood Lab** | Six canned infrastructure / rainfall cases |
| **Intervention Lab** | Before / after packages (drainage, pumps, green cover, ponds, channels) |
| **Math Model** | Equations and risk weights served from the backend |
| **Scenario Comparison** | Side-by-side rainfall / failure cases |
| **India Cases** | Documented Indian flood events as narrative context |
| **Stay Safe** | NDMA / NIDM public flood-safety steps, kit, helplines, city tips |

The top bar keeps a **city selector** and **Run flood**. The frontend never invents flood numbers; it only displays API results.

---

## Architecture

```
React (Vite) control room
        │  /api  proxy
        ▼
FastAPI  (api/index.py on Vercel)
        ▼
FloodSimulator
  ├ RainfallModel
  ├ Runoff     Qr = C × P × A
  ├ Drainage   D  = min(avail, Cap × η)
  ├ Flow       F  = K · max(0, Hi − Hj)
  └ Water balance → risk → ETTC → alerts
```

Mathematics live in **`backend/app/services/math_model.py`**. City locality grids live in **`backend/app/data/places.py`**. Map frames (bbox, river, lakes) live in **`frontend/src/lib/indiaGeo.ts`**.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 18, TypeScript, Vite 6, Tailwind CSS 3 |
| Map | Leaflet, react-leaflet, Esri World Imagery tiles |
| Charts / motion | Recharts, Framer Motion |
| Icons | Lucide |
| API | FastAPI, Uvicorn, Pydantic v2 |
| Numerics | NumPy |
| Tests | pytest, httpx |
| Hosting | Vercel (static `public/` SPA + Python serverless `api/index.py`) |

Python **3.11 or 3.12** is required (see `.python-version`). Python 3.14 often cannot install the pinned `pydantic-core` / NumPy wheels.

---

## Project layout

```
flowshield/
├── api/index.py              Vercel Python entry (re-exports FastAPI app)
├── backend/
│   ├── app/
│   │   ├── main.py           FastAPI app + CORS
│   │   ├── api/routes.py     REST routes
│   │   ├── data/places.py    12×12 locality grids per city
│   │   ├── data/cases.py     India historical case narratives
│   │   ├── models/schemas.py request / response models
│   │   └── services/         city_builder, simulator, math_model, rainfall, intervention
│   ├── tests/                pytest
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/       SatelliteFloodMap, TopBar, Sidebar, …
│   │   ├── pages/            LiveSim, RiskAnalysis, EarlyWarning, StaySafe, …
│   │   └── lib/              api, types, places, indiaGeo
│   └── package.json
├── data/demo_scorecard.json
├── vercel.json
├── requirements.txt          Vercel Python deps
└── README.md
```

---

## Run locally

You need **two terminals**: API on port **8765**, UI on port **43217**. Vite proxies `/api` to FastAPI.

### 1. Backend

```bash
cd backend
python3.11 -m venv .venv          # or python3.12
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8765
```

- App: [http://127.0.0.1:8765](http://127.0.0.1:8765)
- OpenAPI: [http://127.0.0.1:8765/docs](http://127.0.0.1:8765/docs)
- Health: [http://127.0.0.1:8765/api/v1/health](http://127.0.0.1:8765/api/v1/health)

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: [http://127.0.0.1:43217](http://127.0.0.1:43217)

### 3. Tests

```bash
cd backend
source .venv/bin/activate
python -m pytest -q
```

### Production-style frontend build

```bash
cd frontend
npm run build
npm run preview
```

---

## Deploy (Vercel)

The repo is wired for a **hybrid** Vercel project:

- `installCommand` / `buildCommand` in `vercel.json` build the Vite app into `public/`
- Python function `api/index.py` serves FastAPI; `/api/*` is rewritten to that function
- Function timeout is 60s; `backend/**` and `data/**` are bundled with the function

Redeploy from the GitHub connection, or:

```bash
npx vercel --prod
```

Public URL: [https://bmsce-hack-vaishnavi.vercel.app](https://bmsce-hack-vaishnavi.vercel.app)

Do not commit `.env`, credentials, or `.vercel` auth files.

---

## API

Prefix: `/api/v1` (also mounted at `/api`).

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/cities` | City list |
| GET | `/city` | Build a synthetic twin (`?name=&seed=`) |
| POST | `/city/custom` | Validate a custom grid |
| GET | `/scenarios` | Rainfall + default interventions |
| GET | `/land-use` | Runoff coefficients / land-use table |
| POST | `/simulate` | Full trajectory |
| POST | `/intervene` | Before / after one package |
| POST | `/compare` | Multi-scenario table |
| POST | `/optimize` | Intervention catalog vs baseline |
| GET | `/flood-lab` | Six lab cases |
| GET | `/math` | Equation catalog + risk weights |
| GET | `/demo` | Locked demo scorecard |
| GET | `/cases` | Indian historical references |

Example:

```bash
curl -s http://127.0.0.1:8765/api/v1/simulate \
  -H 'Content-Type: application/json' \
  -d '{"city":"bengaluru","scenario":"heavy","duration_hours":3,"delta_t_minutes":5}'
```

---

## Equations (source of truth)

Replace functions in `backend/app/services/math_model.py` to change the entire product.

- **Balance:** \(W(t+\Delta t)=W+(Q_r-D+F_\mathrm{in}-F_\mathrm{out})\Delta t\)
- **Runoff:** \(Q_r=C\times P\times A\) (P converted mm/hr → m/min)
- **Head / flow:** \(H=z+h,\quad F_{ij}=K_{ij}\max(0,H_i-H_j),\quad K=C_\mathrm{flow}A_\mathrm{conn}/L\)
- **Drainage efficiency** falls as water % rises (1.00 / 0.85 / 0.60 / 0.40)
- **ETTC** = first simulated time water % ≥ 100
- **Risk** = 0.35 WL + 0.20 rise + 0.15 drainage + 0.15 elevation + 0.10 rain + 0.05 infra

---

## Locked demo numbers

Engine run: **Bengaluru synthetic twin · seed 42 · Heavy monsoon · 3 hours · Δt = 5 min**. Simulation outputs, not city measurements.

| | BEFORE (current infrastructure) | AFTER (Protect hospital package) |
| --- | ---: | ---: |
| Critical zones | **23** | **4** |
| Peak water | **223.9%** | **150.2%** |
| Population exposed | **49,477** | **21,427** |
| First critical event | **85 min** | **125 min** |
| Hospital risk | **80.9 / 100** | **61.5 / 100** |
| Flood duration | **100 min** | **60 min** |

Mass-balance residual **−0.001 m³ (0.000%)**.

Protect hospital package = drainage ×1.5 + hospital pumps 28 m³/min + 15% greener C + 8,000 m³ pond storage + open relief channel.

---

## Open-source libraries (credits)

cosYNOT BMSCE is built on these open-source projects. Thank you to their authors and communities. Licenses below are the upstream licenses; check each project for the exact text.

### Frontend (runtime)

| Library | Use in this project | License |
| --- | --- | --- |
| [React](https://react.dev/) + [react-dom](https://www.npmjs.com/package/react-dom) | UI | MIT |
| [Leaflet](https://leafletjs.com/) | Interactive map | BSD-2-Clause |
| [react-leaflet](https://react-leaflet.js.org/) | React bindings for Leaflet | Hippocratic License 2.1 |
| [Recharts](https://recharts.org/) | Charts (risk, compare, lab) | MIT |
| [Framer Motion](https://www.framer.com/motion/) | Motion | MIT |
| [Lucide React](https://lucide.dev/) | Icons | ISC |

### Frontend (build / tooling)

| Library | Use in this project | License |
| --- | --- | --- |
| [Vite](https://vite.dev/) | Dev server + bundler | MIT |
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | React Fast Refresh | MIT |
| [TypeScript](https://www.typescriptlang.org/) | Typed UI | Apache-2.0 |
| [Tailwind CSS](https://tailwindcss.com/) | Styling | MIT |
| [PostCSS](https://postcss.org/) | CSS pipeline | MIT |
| [Autoprefixer](https://github.com/postcss/autoprefixer) | Vendor prefixes | MIT |
| [@types/react](https://www.npmjs.com/package/@types/react), [@types/react-dom](https://www.npmjs.com/package/@types/react-dom), [@types/leaflet](https://www.npmjs.com/package/@types/leaflet) | Type stubs | MIT |

### Backend

| Library | Use in this project | License |
| --- | --- | --- |
| [FastAPI](https://fastapi.tiangolo.com/) | REST API | MIT |
| [Starlette](https://www.starlette.io/) | ASGI (via FastAPI) | BSD-3-Clause |
| [Uvicorn](https://www.uvicorn.org/) | ASGI server | BSD-3-Clause |
| [Pydantic](https://docs.pydantic.dev/) | Request / response models | MIT |
| [NumPy](https://numpy.org/) | Numeric water-balance | BSD-3-Clause |
| [httpx](https://www.python-httpx.org/) | HTTP client (tests) | BSD-3-Clause |
| [pytest](https://docs.pytest.org/) | Tests | MIT |
| [python-multipart](https://github.com/Kludex/python-multipart) | Form parsing | Apache-2.0 |

Pinned versions: `frontend/package.json` and `backend/requirements.txt`.

---

## Data, maps, and public guidance (credits)

These are **not** code dependencies, but the product would not exist without them. Attribution is required where noted.

| Source | How this project uses it | Notes |
| --- | --- | --- |
| [Esri World Imagery](https://www.esri.com/) (Esri, Maxar, Earthstar Geographics, and the GIS User Community) | Satellite basemap tiles on the Live Flood Map | Tile usage and attribution per Esri / ArcGIS Online terms. Attribution is shown on the map. |
| [OpenStreetMap](https://www.openstreetmap.org/) contributors | Neighbourhood / locality names along flood corridors | © OpenStreetMap contributors, [ODbL](https://opendatacommons.org/licenses/odbl/). Names are commonly mapped labels, not a full OSM extract. |
| NASA SRTM (style) | Relative cell elevations so water runs toward low ground | **Not** official survey marks or a downloaded DEM product. Elevations are rounded, relative, for the twin only. |
| [NDMA](https://ndma.gov.in/) — [Floods](https://ndma.gov.in/Natural-Hazards/Floods), [Do’s & Don’ts](https://ndma.gov.in/Natural-Hazards/Floods/Do-Donts) | Stay Safe kit, before / during / after steps | Public IEC. Follow NDMA / state authorities over this app. |
| [NIDM](https://nidm.gov.in/) IEC | Stay Safe guidance | Public awareness material. |
| [IMD](https://mausam.imd.gov.in/) | Cited as the weather authority to listen to | This app does **not** ingest live IMD feeds. |
| India helplines (112, 108, 1078, 1070, 100, 101) | Stay Safe call list | Official public numbers. |

**Leaflet map credit line (as implemented):**  
Satellite © Esri · Maxar · Earthstar Geographics · Map © Leaflet

If you fork this project, **keep map attribution visible**.

---

## Disclaimer

cosYNOT BMSCE is a **simulation and decision-support prototype** (hackathon / teaching digital twin).

- Synthetic scenarios are **not** official forecasts, inundation maps, or emergency warnings.
- Satellite view shows **real terrain**; flood colour is **engine water**, not observed flood GIS.
- Historical Indian flood events are for **context**, not replay of measured hydrographs.
- In a real flood, follow **police, fire, NDRF/SDRF, municipal, IMD, and NDMA** instructions — not this screen.

---

## License (this repository)

Project source is published at [adarshu21/cosYNOT-BMSCE](https://github.com/adarshu21/cosYNOT-BMSCE). Third-party libraries and map tiles remain under **their own** licenses and terms; this README does not relicense them.
