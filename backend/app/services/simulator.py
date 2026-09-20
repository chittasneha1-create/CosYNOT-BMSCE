"""FloodSimulator — discrete-time digital twin driven by math_model."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

import numpy as np

from app.models.schemas import (
    CityModel,
    Connection,
    FlowArrow,
    RegionState,
    SimulationRequest,
    SimulationResult,
    SimulationSummary,
    TimeStepSnapshot,
    ValidationReport,
)
from app.services.city_builder import build_city
from app.services.math_model import (
    C_FLOW,
    apply_water_balance,
    affected_population,
    drainage_efficiency,
    drainage_rate_m3_per_min,
    effective_head_m,
    emergency_priority,
    exposure_fraction,
    flood_risk_score,
    flood_status,
    hydraulic_conductance,
    interregion_flow_m3_per_min,
    mass_balance_residual,
    rainfall_risk_component,
    rate_of_rise_component,
    runoff_rate_m3_per_min,
    water_depth_m,
    water_pct,
    elevation_risk_component,
    drainage_stress_component,
    infrastructure_component,
    effective_area_m2,
    pond_capacity_m3,
)
from app.services.rainfall import intensity_at, scenario_segments, spatial_factor


def _edge_key(a: str, b: str) -> str:
    return f"{a}-{b}" if a < b else f"{b}-{a}"


def _parse_blocked(raw: list[str]) -> set[str]:
    out: set[str] = set()
    for item in raw:
        parts = item.replace("→", "-").replace(">", "-").split("-")
        if len(parts) >= 2:
            out.add(_edge_key(parts[0].strip(), parts[1].strip()))
    return out


class FloodSimulator:
    """Deterministic urban flood engine. Same inputs → same outputs."""

    def __init__(self, req: SimulationRequest):
        if req.custom_city is not None:
            self.city: CityModel = req.custom_city
        else:
            self.city = build_city(req.city, seed=req.seed)
        self.req = req
        self.dt = float(req.delta_t_minutes)
        self.horizon = float(req.duration_hours) * 60.0
        self.steps = int(round(self.horizon / self.dt))
        self.segments = scenario_segments(req.scenario, req.rainfall_curve, req.rainfall_mm_hr)
        self.blocked = _parse_blocked(req.blocked_edges)
        if req.scenario == "blocked" and not self.blocked:
            # Default demo blockage on the path into the hospital depression
            self.blocked.add(_edge_key("G8", "H8"))
            self.blocked.add(_edge_key("H7", "H8"))
        self.thresholds = req.thresholds
        self.regions = list(self.city.regions)
        self.index = {r.id: i for i, r in enumerate(self.regions)}
        self.n = len(self.regions)
        self.z_min = min(r.elevation_m for r in self.regions)
        self.z_max = max(r.elevation_m for r in self.regions)

        self.edges: list[tuple[int, int, Connection, float]] = []
        for conn in self.city.connections:
            if conn.a not in self.index or conn.b not in self.index:
                continue
            if conn.kind == "alternate" and not req.open_alternate:
                continue
            i, j = self.index[conn.a], self.index[conn.b]
            k = hydraulic_conductance(conn.length_m, conn.width_m, C_FLOW)
            self.edges.append((i, j, conn, k))

        self.green = float(req.green_reduction)
        self.retention_boost = float(req.retention_boost_m3)
        self.pump = float(req.emergency_pump_m3_min)
        pump_ids = set(req.pump_region_ids)
        if not pump_ids:
            pump_ids = {r.id for r in self.regions if "hospital" in r.infrastructure or r.land_use == "hospital"}
        self.pump_idx = {self.index[i] for i in pump_ids if i in self.index}

    def _c(self, r) -> float:
        c = r.runoff_c * (1.0 - self.green)
        return float(np.clip(c, 0.05, 0.98))

    def _capacity(self, r, t_min: float) -> float:
        cap = r.drainage_capacity_m3_min
        mult = self.req.drainage_multiplier
        if self.req.scenario == "drainage_failure" and self.req.drainage_fail_after_min is None:
            # stepped failure 100 → 70 → 40 → 10 → 0 over the event
            if t_min >= 150:
                mult *= 0.0
            elif t_min >= 110:
                mult *= 0.10
            elif t_min >= 70:
                mult *= 0.40
            elif t_min >= 35:
                mult *= 0.70
        fail_after = self.req.drainage_fail_after_min
        if fail_after is not None and t_min >= fail_after:
            mult *= self.req.drainage_fail_value
        return max(0.0, cap * mult)

    def _storage(self, r) -> float:
        extra = r.storage_extra_m3 + (self.retention_boost if r.is_retention else 0.0)
        return extra

    def run(self) -> SimulationResult:
        n = self.n
        W = np.zeros(n, dtype=float)
        for i, r in enumerate(self.regions):
            W[i] = 0.02 * r.area_m2 * r.h_safe_m  # small initial moisture
            W[i] += 0.0

        initial = float(W.sum())
        total_runoff = 0.0
        total_drain = 0.0
        total_transfer = 0.0

        pct_hist = np.zeros((self.steps + 1, n), dtype=float)
        timeline: list[TimeStepSnapshot] = []
        rain_series: list[dict[str, float]] = []

        prev_h = np.array([water_depth_m(W[i], self.regions[i].area_m2) for i in range(n)])

        for s in range(self.steps + 1):
            t = s * self.dt
            p_base = intensity_at(t, self.segments)
            rain_series.append({"t_min": t, "mm_hr": p_base})

            P = np.zeros(n)
            Qr = np.zeros(n)
            for i, r in enumerate(self.regions):
                fac = spatial_factor(r.row, r.col, t, self.city.rows, self.city.cols, self.req.storm_motion)
                P[i] = p_base * fac
                Qr[i] = runoff_rate_m3_per_min(self._c(r), P[i], r.area_m2)

            h = np.zeros(n)
            H = np.zeros(n)
            pct = np.zeros(n)
            for i, r in enumerate(self.regions):
                extra = self._storage(r)
                a_eff = effective_area_m2(r.area_m2, extra) if (r.is_retention or extra > 0) else r.area_m2
                h[i] = water_depth_m(W[i], r.area_m2)
                H[i] = effective_head_m(r.elevation_m, water_depth_m(W[i], a_eff))
                if r.is_retention or extra > 0:
                    cap = pond_capacity_m3(r.area_m2, r.h_safe_m, extra)
                    pct[i] = 100.0 * W[i] / max(1e-6, cap)
                else:
                    pct[i] = water_pct(h[i], r.h_safe_m)

            eta = np.array([drainage_efficiency(pct[i]) for i in range(n)])
            D_des = np.zeros(n)
            for i, r in enumerate(self.regions):
                pump = self.pump if i in self.pump_idx else 0.0
                D_des[i] = drainage_rate_m3_per_min(self._capacity(r, t), eta[i], 1.0, pump)

            retention_sink = np.zeros(n)

            desired_F: dict[tuple[int, int], float] = {}
            out_des = np.zeros(n)
            for i, j, conn, k in self.edges:
                key = _edge_key(self.regions[i].id, self.regions[j].id)
                if key in self.blocked or conn.blocked:
                    continue
                fij = interregion_flow_m3_per_min(k, H[i], H[j])
                fji = interregion_flow_m3_per_min(k, H[j], H[i])
                if fij > 0:
                    desired_F[(i, j)] = fij
                    out_des[i] += fij
                if fji > 0:
                    desired_F[(j, i)] = fji
                    out_des[j] += fji

            avail = W / self.dt + Qr
            leave = D_des + retention_sink + out_des
            scale = np.ones(n)
            mask = leave > avail + 1e-9
            scale[mask] = avail[mask] / np.maximum(leave[mask], 1e-12)

            D = D_des * scale
            sink = retention_sink * scale
            F_act: dict[tuple[int, int], float] = {}
            Fin = np.zeros(n)
            Fout = np.zeros(n)
            for (i, j), rate in desired_F.items():
                actual = rate * scale[i]
                F_act[(i, j)] = actual
                Fout[i] += actual
                Fin[j] += actual

            if s < self.steps:
                W_next = np.array(
                    [
                        apply_water_balance(W[i], Qr[i], D[i] + sink[i], Fin[i], Fout[i], self.dt)
                        for i in range(n)
                    ]
                )
                total_runoff += float((Qr * self.dt).sum())
                total_drain += float(((D + sink) * self.dt).sum())
                total_transfer += float((Fout * self.dt).sum())
            else:
                W_next = W.copy()

            rise = (h - prev_h) / max(self.dt, 1e-9)
            prev_h = h.copy()
            pct_hist[s] = pct
            snap = self._snapshot(t, p_base, P, Qr, W, h, pct, eta, D, Fin, Fout, rise, F_act)
            timeline.append(snap)
            W = W_next

        ettc, ttw, tthr = self._times(pct_hist)
        self._apply_times(timeline, ettc, ttw, tthr)
        for snap in timeline:
            snap.kpis = _kpis(snap.regions, snap.rainfall_mm_hr)
            snap.alerts = _alerts(snap.regions)

        final_vol = float(W.sum()) if timeline else float(initial)
        # final W after last update — use last snapshot volumes
        final_vol = sum(rs.water_volume_m3 for rs in timeline[-1].regions)
        residual = mass_balance_residual(initial, total_runoff, total_drain, final_vol)
        denom = max(1.0, total_runoff)
        validation = ValidationReport(
            initial_volume_m3=round(initial, 3),
            total_runoff_m3=round(total_runoff, 3),
            total_drainage_m3=round(total_drain, 3),
            total_transferred_m3=round(total_transfer, 3),
            final_volume_m3=round(final_vol, 3),
            residual_m3=round(residual, 3),
            residual_pct=round(100.0 * residual / denom, 4),
            note="ε = W₀ + Σ Qr Δt − Σ D Δt − W_final. Internal transfers cancel. Near-zero residual means water is conserved.",
        )
        summary = self._summary(timeline, ettc)
        blocked_list = sorted(self.blocked)
        # live math trace from last step + selected hospital-ish cell
        focus = self._focus_region(timeline[-1])
        math_trace = self._math_trace(focus, timeline[-1], validation)

        # attach city blocked flags
        conns = []
        for c in self.city.connections:
            c2 = c.model_copy()
            c2.blocked = _edge_key(c.a, c.b) in self.blocked or (c.kind == "alternate" and not self.req.open_alternate)
            conns.append(c2)

        city_out = self.city.model_copy()
        city_out.connections = conns

        return SimulationResult(
            scenario=self.req.scenario,
            city=city_out,
            duration_min=self.horizon,
            delta_t_min=self.dt,
            rainfall_series=rain_series,
            timeline=timeline,
            summary=summary,
            ettc={rid: (float(v) if v is not None else None) for rid, v in ettc.items()},
            validation=validation,
            connections=conns,
            blocked_edges=blocked_list,
            math_trace=math_trace,
        )

    def _times(self, pct_hist: np.ndarray):
        ettc: dict[str, float | None] = {}
        ttw: dict[str, float | None] = {}
        tthr: dict[str, float | None] = {}
        ts, tw, th = self.thresholds.high, self.thresholds.safe, self.thresholds.warning
        for i, r in enumerate(self.regions):
            col = pct_hist[:, i]
            ettc[r.id] = self._first(col, ts)
            ttw[r.id] = self._first(col, tw)
            tthr[r.id] = self._first(col, th)
        return ettc, ttw, tthr

    def _first(self, series: np.ndarray, limit: float) -> float | None:
        hits = np.where(series >= limit)[0]
        if len(hits) == 0:
            return None
        return float(hits[0] * self.dt)

    def _apply_times(self, timeline: list[TimeStepSnapshot], ettc, ttw, tthr) -> None:
        horizon = self.horizon
        for snap in timeline:
            t = snap.t_min
            for rs in snap.regions:
                e = ettc[rs.id]
                rs.ettc_min = None if e is None else max(0.0, e - t)
                if e is None:
                    rs.ettc_min = None
                elif e <= t:
                    rs.ettc_min = 0.0
                else:
                    rs.ettc_min = e - t
                w = ttw[rs.id]
                h = tthr[rs.id]
                rs.ttw_min = None if w is None else max(0.0, w - t)
                rs.tthr_min = None if h is None else max(0.0, h - t)
                rs.priority = emergency_priority(
                    rs.risk,
                    exposure_fraction(rs.water_pct),
                    next((x.infrastructure_importance for x in self.regions if x.id == rs.id), 0.3),
                    None if e is None else max(0.0, e - t),
                    horizon,
                )

    def _snapshot(
        self,
        t,
        p_base,
        P,
        Qr,
        W,
        h,
        pct,
        eta,
        D,
        Fin,
        Fout,
        rise,
        F_act,
    ) -> TimeStepSnapshot:
        states: list[RegionState] = []
        upstream_map: dict[str, list[str]] = defaultdict(list)
        for (i, j), rate in F_act.items():
            if rate > 0.15:
                upstream_map[self.regions[j].id].append(self.regions[i].id)

        for i, r in enumerate(self.regions):
            cap = max(1e-6, self._capacity(r, t))
            util = float(np.clip(D[i] / cap, 0.0, 1.5))
            rise_score = rate_of_rise_component(float(rise[i]), r.h_safe_m)
            elev_score = elevation_risk_component(r.elevation_m, self.z_min, self.z_max)
            rain_score = rainfall_risk_component(float(P[i]))
            drain_score = drainage_stress_component(util)
            infra_score = infrastructure_component(r.infrastructure_importance)
            risk, comps = flood_risk_score(float(pct[i]), rise_score, drain_score, elev_score, rain_score, infra_score)
            status = flood_status(float(pct[i]), self.thresholds.safe, self.thresholds.warning, self.thresholds.high)
            pop_exp = affected_population(r.population, float(pct[i]))
            causes, expl = explain_region(
                r,
                float(P[i]),
                float(Qr[i]),
                float(D[i]),
                float(Fin[i]),
                float(Fout[i]),
                float(pct[i]),
                util,
                eta[i],
                upstream_map[r.id],
                self.z_min,
            )
            states.append(
                RegionState(
                    id=r.id,
                    name=r.name,
                    row=r.row,
                    col=r.col,
                    land_use=r.land_use,
                    infrastructure=r.infrastructure,
                    elevation_m=r.elevation_m,
                    area_m2=r.area_m2,
                    h_safe_m=r.h_safe_m,
                    runoff_c=self._c(r),
                    rainfall_mm_hr=round(float(P[i]), 2),
                    runoff_m3_min=round(float(Qr[i]), 3),
                    infiltration_mm_hr=r.infiltration_mm_hr,
                    water_volume_m3=round(float(W[i]), 3),
                    water_depth_m=round(float(h[i]), 4),
                    water_pct=round(float(pct[i]), 2),
                    status=status,
                    drainage_capacity_m3_min=round(cap, 2),
                    drainage_m3_min=round(float(D[i]), 3),
                    drainage_eta=round(float(eta[i]), 3),
                    drainage_utilization=round(util, 3),
                    drainage_stress=round(drain_score, 2),
                    inflow_m3_min=round(float(Fin[i]), 3),
                    outflow_m3_min=round(float(Fout[i]), 3),
                    rise_m_per_min=round(float(rise[i]), 5),
                    risk=round(risk, 2),
                    risk_components={k: round(v, 2) for k, v in comps.items()},
                    population=r.population,
                    population_exposed=pop_exp,
                    ettc_min=None,
                    ttw_min=None,
                    tthr_min=None,
                    priority=0.0,
                    explanation=expl,
                    causes=causes,
                    upstream=upstream_map[r.id],
                    is_retention=r.is_retention,
                )
            )

        flows: list[FlowArrow] = []
        seen_block: set[str] = set()
        for i, j, conn, _k in self.edges:
            key = _edge_key(self.regions[i].id, self.regions[j].id)
            blocked = key in self.blocked or conn.blocked
            rate = F_act.get((i, j), 0.0) - F_act.get((j, i), 0.0)
            if blocked:
                if key not in seen_block:
                    flows.append(
                        FlowArrow(
                            from_id=self.regions[i].id,
                            to_id=self.regions[j].id,
                            rate_m3_min=0.0,
                            blocked=True,
                            kind=conn.kind,
                        )
                    )
                    seen_block.add(key)
                continue
            if abs(rate) < 0.05:
                continue
            if rate > 0:
                flows.append(FlowArrow(from_id=self.regions[i].id, to_id=self.regions[j].id, rate_m3_min=round(rate, 3), kind=conn.kind))
            else:
                flows.append(FlowArrow(from_id=self.regions[j].id, to_id=self.regions[i].id, rate_m3_min=round(-rate, 3), kind=conn.kind))

        kpis = _kpis(states, p_base)
        alerts = _alerts(states)
        return TimeStepSnapshot(t_min=t, rainfall_mm_hr=p_base, regions=states, flows=flows, kpis=kpis, alerts=alerts)

    def _summary(self, timeline: list[TimeStepSnapshot], ettc) -> SimulationSummary:
        peak = 0.0
        max_crit = 0
        max_warn = 0
        max_high = 0
        first_crit = None
        max_pop = 0
        flood_steps = 0
        max_flow = 0.0
        util_acc = 0.0
        util_n = 0
        hosp = 0.0
        metro = 0.0
        for snap in timeline:
            crit = sum(1 for r in snap.regions if r.status == "critical")
            warn = sum(1 for r in snap.regions if r.status == "warning")
            high = sum(1 for r in snap.regions if r.status == "high")
            max_crit = max(max_crit, crit)
            max_warn = max(max_warn, warn)
            max_high = max(max_high, high)
            if crit and first_crit is None:
                first_crit = snap.t_min
            if crit:
                flood_steps += 1
            peak = max(peak, max((r.water_pct for r in snap.regions), default=0))
            max_pop = max(max_pop, sum(r.population_exposed for r in snap.regions))
            if snap.flows:
                max_flow = max(max_flow, max(f.rate_m3_min for f in snap.flows))
            util_acc += sum(r.drainage_utilization for r in snap.regions)
            util_n += len(snap.regions)
            for r in snap.regions:
                if "hospital" in r.infrastructure or r.land_use == "hospital":
                    hosp = max(hosp, r.risk)
                if "metro" in r.infrastructure or r.land_use == "metro":
                    metro = max(metro, r.risk)
        next_c = None
        ranked = [(rid, t) for rid, t in ettc.items() if t is not None]
        if ranked:
            ranked.sort(key=lambda x: x[1])
            rid, tm = ranked[0]
            name = next(r.name for r in self.regions if r.id == rid)
            next_c = {"id": rid, "name": name, "ettc_min": tm}
        return SimulationSummary(
            peak_water_pct=round(peak, 2),
            critical_zones=max_crit,
            warning_zones=max_warn,
            high_zones=max_high,
            first_critical_min=first_crit,
            population_affected=max_pop,
            flood_duration_min=round(flood_steps * self.dt, 1),
            max_flow_m3_min=round(max_flow, 2),
            mean_drainage_util=round(util_acc / max(1, util_n), 3),
            hospital_risk=round(hosp, 2),
            metro_risk=round(metro, 2),
            next_critical=next_c,
        )

    def _focus_region(self, snap: TimeStepSnapshot) -> RegionState:
        hosp = [r for r in snap.regions if "hospital" in r.infrastructure or r.land_use == "hospital"]
        if hosp:
            return max(hosp, key=lambda r: r.water_pct)
        return max(snap.regions, key=lambda r: r.risk)

    def _math_trace(self, r: RegionState, snap: TimeStepSnapshot, val: ValidationReport) -> dict[str, Any]:
        dw = (r.runoff_m3_min - r.drainage_m3_min + r.inflow_m3_min - r.outflow_m3_min) * self.dt
        return {
            "region_id": r.id,
            "t_min": snap.t_min,
            "equations": {
                "runoff": {
                    "formula": "Q_r = C × P × A",
                    "C": r.runoff_c,
                    "P_mm_hr": r.rainfall_mm_hr,
                    "A_m2": r.area_m2,
                    "Q_r_m3_min": r.runoff_m3_min,
                },
                "depth": {
                    "formula": "h = W / A ;  Water% = (h / h_safe) × 100",
                    "W_m3": r.water_volume_m3,
                    "A_m2": r.area_m2,
                    "h_m": r.water_depth_m,
                    "h_safe_m": r.h_safe_m,
                    "water_pct": r.water_pct,
                },
                "drainage": {
                    "formula": "D = min(available, Capacity × η + pump)",
                    "capacity": r.drainage_capacity_m3_min,
                    "eta": r.drainage_eta,
                    "D_m3_min": r.drainage_m3_min,
                    "utilization": r.drainage_utilization,
                },
                "head": {
                    "formula": "H = z + h",
                    "z_m": r.elevation_m,
                    "h_m": r.water_depth_m,
                    "H_m": round(r.elevation_m + r.water_depth_m, 3),
                },
                "flow": {
                    "formula": "F_i→j = K_ij · max(0, H_i − H_j)",
                    "inflow": r.inflow_m3_min,
                    "outflow": r.outflow_m3_min,
                    "upstream": r.upstream,
                },
                "balance": {
                    "formula": "ΔW = (Q_r − D + F_in − F_out) · Δt",
                    "Q_r": r.runoff_m3_min,
                    "D": r.drainage_m3_min,
                    "Fin": r.inflow_m3_min,
                    "Fout": r.outflow_m3_min,
                    "dt": self.dt,
                    "dW": round(dw, 3),
                },
                "risk": {
                    "formula": "0.35 WL + 0.20 Rise + 0.15 Drain + 0.15 Elev + 0.10 Rain + 0.05 Infra",
                    "score": r.risk,
                    "components": r.risk_components,
                },
                "ettc": {
                    "formula": "min { t | Water% ≥ 100 } − t_now",
                    "ettc_min": r.ettc_min,
                    "ttw_min": r.ttw_min,
                    "tthr_min": r.tthr_min,
                },
                "mass": val.model_dump(),
            },
        }


def explain_region(r, p, qr, d, fin, fout, pct, util, eta, upstream, z_min) -> tuple[list[str], str]:
    causes: list[str] = []
    if p >= 80:
        causes.append(f"Heavy rainfall ({p:.0f} mm/hr)")
    elif p >= 40:
        causes.append(f"Moderate-to-high rainfall ({p:.0f} mm/hr)")
    if r.runoff_c >= 0.75:
        causes.append(f"High sealed-surface runoff in {r.name}")
    if r.elevation_m <= z_min + 5.5:
        causes.append(f"Low elevation ({r.elevation_m:.1f} m) — receives downhill flow")
    if fin > qr * 0.35 and fin > 2:
        causes.append(f"Upstream inflow {fin:.1f} m³/min from {len(upstream)} connected region(s)")
    if util >= 0.85:
        causes.append(f"Drainage overload (utilization {util*100:.0f}%, η = {eta:.2f})")
    elif d < 1 and r.drainage_capacity_m3_min < 5:
        causes.append("Drainage capacity near zero / failed")
    if fout + d + 1e-6 < qr + fin and pct >= 40:
        causes.append("Net accumulation: runoff + inflow exceed drainage + outflow")

    if pct >= 100:
        head = (
            "Critical condition is predicted because the simulated water accumulation "
            "exceeds the region’s safe capacity under the current rainfall, flow and drainage conditions."
        )
    elif pct >= 70:
        head = (
            "High-risk conditions are developing because simulated storage is approaching "
            "safe capacity under the current water-balance terms."
        )
    elif pct >= 40:
        head = "Warning threshold is crossed because rainfall, runoff and connectivity are raising stored water."
    else:
        head = "No flood threshold is crossed at this time step. Water balance remains within the safe band."

    detail = (
        f" Water level is {pct:.1f}% of capacity. Rainfall is {p:.1f} mm/hr. "
        f"Runoff Qr = {qr:.2f} m³/min. Drainage D = {d:.2f} m³/min ({util*100:.0f}% utilization). "
        f"Incoming flow = {fin:.2f} m³/min. Outgoing flow = {fout:.2f} m³/min. "
        f"The locality sits {r.elevation_m - z_min:.1f} m above the lowest ground in this corridor. "
        f"{len(upstream)} upstream region(s) are contributing water."
    )
    return causes, head + detail


def _kpis(states: list[RegionState], p_base: float) -> dict[str, Any]:
    crit = [r for r in states if r.status == "critical"]
    high = [r for r in states if r.status == "high"]
    warn = [r for r in states if r.status == "warning"]
    flood = [r for r in states if r.status in ("warning", "high", "critical")]
    next_evt = None
    upcoming = [r for r in states if r.ettc_min is not None]
    upcoming.sort(key=lambda r: (r.ettc_min if r.ettc_min is not None else 1e9, -r.priority))
    if upcoming:
        u = upcoming[0]
        next_evt = {
            "id": u.id,
            "name": u.name,
            "ettc_min": u.ettc_min,
            "risk": u.risk,
            "status": u.status,
            "causes": u.causes[:4],
        }
    return {
        "rainfall_mm_hr": round(p_base, 1),
        "active_flood_zones": len(flood),
        "warning_zones": len(warn),
        "high_zones": len(high),
        "critical_zones": len(crit),
        "highest_water_pct": round(max((r.water_pct for r in states), default=0), 1),
        "next_critical": next_evt,
        "population_at_risk": int(sum(r.population_exposed for r in states)),
        "mean_risk": round(float(np.mean([r.risk for r in states])), 1) if states else 0,
    }


def _alerts(states: list[RegionState]) -> list[dict[str, Any]]:
    alerts = []
    ranked = sorted(states, key=lambda r: (-r.priority, r.ettc_min if r.ettc_min is not None else 1e9))
    for r in ranked:
        if r.status not in ("warning", "high", "critical") and (r.ettc_min is None or r.ettc_min > 180):
            continue
        if r.water_pct < 35 and r.ettc_min is None:
            continue
        level = "critical" if r.status == "critical" or (r.ettc_min is not None and r.ettc_min <= 30) else "warning"
        action = "Increase drainage capacity or activate an emergency pump."
        if r.is_retention:
            action = "Protect the retention pond outlet; do not block downstream channels."
        elif "hospital" in r.infrastructure:
            action = f"Priority: protect {r.name} — boost drainage and deploy emergency pumps."
        elif r.land_use == "metro":
            action = "Protect metro access; open alternate drainage if available."
        alerts.append(
            {
                "level": level,
                "region_id": r.id,
                "name": r.name,
                "status": r.status,
                "ettc_min": r.ettc_min,
                "risk": r.risk,
                "priority": round(r.priority, 1),
                "rise_cm_min": round(r.rise_m_per_min * 100.0, 3),
                "causes": r.causes,
                "action": action,
                "water_pct": r.water_pct,
                "infrastructure": r.infrastructure,
            }
        )
        if len(alerts) >= 16:
            break
    return alerts


def run_simulation(req: SimulationRequest) -> SimulationResult:
    return FloodSimulator(req).run()


DEFAULT_INTERVENTIONS = [
    {
        "id": "combo",
        "name": "Protect hospital package",
        "description": "Drainage +50%, hospital pumps 28 m³/min, 15% greener C, +8,000 m³ ponds, open relief channel.",
        "drainage_multiplier": 1.5,
        "emergency_pump_m3_min": 28.0,
        "green_reduction": 0.15,
        "retention_boost_m3": 8_000.0,
        "open_alternate": True,
        "estimated_cost_inr": 9_800_000,
    },
    {
        "id": "drain_boost",
        "name": "Increase drainage +50%",
        "description": "Raise every region’s drainage capacity by 50%.",
        "drainage_multiplier": 1.5,
        "estimated_cost_inr": 4_800_000,
    },
    {
        "id": "pump",
        "name": "Emergency pumps at hospital",
        "description": "Add 40 m³/min emergency pumping at hospital cells.",
        "emergency_pump_m3_min": 40.0,
        "estimated_cost_inr": 1_600_000,
    },
    {
        "id": "green",
        "name": "Increase green / permeable surface",
        "description": "Reduce runoff coefficient C by 25% (more infiltration).",
        "green_reduction": 0.25,
        "estimated_cost_inr": 3_200_000,
    },
    {
        "id": "pond",
        "name": "Expand retention ponds",
        "description": "Add 12,000 m³ storage at lake / retention cells.",
        "retention_boost_m3": 12_000.0,
        "estimated_cost_inr": 6_500_000,
    },
    {
        "id": "alternate",
        "name": "Open alternate drainage route",
        "description": "Open the relief channel around the hospital depression.",
        "open_alternate": True,
        "estimated_cost_inr": 2_100_000,
    },
    {
        "id": "unblock",
        "name": "Clear blocked channel",
        "description": "Remove blocked-edge constraints.",
        "blocked_edges": [],
        "estimated_cost_inr": 400_000,
    },
]
