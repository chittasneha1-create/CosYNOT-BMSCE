import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { LiveSim } from "./pages/LiveSim";
import { FloodLab } from "./pages/FloodLab";
import { RiskAnalysis } from "./pages/RiskAnalysis";
import { EarlyWarning } from "./pages/EarlyWarning";
import { IndiaCases } from "./pages/IndiaCases";
import { InterventionLab } from "./pages/InterventionLab";
import { MathModel } from "./pages/MathModel";
import { ScenarioCompare } from "./pages/ScenarioCompare";
import { StaySafe } from "./pages/StaySafe";
import { api } from "./lib/api";
import type { PageId, SimRequest, SimulationResult } from "./lib/types";

export default function App() {
  const [page, setPage] = useState<PageId>("live");
  const [menu, setMenu] = useState(false);
  const [city, setCity] = useState("bengaluru");
  const [scenario, setScenario] = useState("heavy");
  const [hours, setHours] = useState(3);
  const [dt, setDt] = useState(5);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const playRef = useRef<number | null>(null);

  const request: SimRequest = useMemo(
    () => ({
      city,
      scenario,
      duration_hours: hours,
      delta_t_minutes: dt,
    }),
    [city, scenario, hours, dt],
  );

  const run = useCallback(async (override?: Partial<SimRequest>, go?: PageId) => {
    setLoading(true);
    setError(null);
    try {
      const body = { ...request, ...override };
      const sim = await api.simulate(body);
      setResult(sim);
      setIdx(0);
      setPlaying(true);
      setSelected(null);
      if (go) setPage(go);
      else setPage("live");
    } catch (e) {
      setError((e as Error).message.slice(0, 280));
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void run();
    // initial demo only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!playing || !result) return;
    const ms = 420 / speed;
    playRef.current = window.setInterval(() => {
      setIdx((i) => {
        if (i >= result.timeline.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, ms);
    return () => {
      if (playRef.current) window.clearInterval(playRef.current);
    };
  }, [playing, speed, result]);

  const onT = (t: number) => {
    if (!result) return;
    const i = Math.max(0, Math.min(result.timeline.length - 1, Math.round(t / result.delta_t_min)));
    setIdx(i);
  };

  const onStep = (d: -1 | 1) => {
    if (!result) return;
    setIdx((i) => Math.max(0, Math.min(result.timeline.length - 1, i + d)));
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar page={page} onPage={setPage} open={menu} onClose={() => setMenu(false)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <TopBar
          city={city}
          onCity={(v) => {
            setCity(v);
          }}
          onRun={() => run()}
          onMenu={() => setMenu(true)}
          loading={loading}
        />
        <main className={page === "live" || page === "dashboard" ? "relative min-h-0 flex-1 overflow-hidden" : "flex-1 overflow-auto px-3 py-3 md:px-5"}>
          {error && <div className="mb-3 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm">{error}</div>}
          {!result && loading && (
            <div className="glass rounded-xl p-8 text-sm text-slate-300">Running the water-balance engine…</div>
          )}
          {!result && !loading && <div className="text-sm text-slate-400">Run a simulation to start the flood.</div>}
          {result && (page === "live" || page === "dashboard") && (
            <LiveSim
              result={result}
              idx={idx}
              selected={null}
              onSelect={() => undefined}
              playing={playing}
              speed={speed}
              onT={onT}
              onPlay={() => setPlaying((p) => !p)}
              onReset={() => {
                setIdx(0);
                setPlaying(false);
              }}
              onSpeed={setSpeed}
              onStep={onStep}
              onReplay={() => {
                setIdx(0);
                setPlaying(true);
              }}
            />
          )}
          {page === "lab" && <FloodLab city={city} />}
          {result && page === "risk" && <RiskAnalysis result={result} idx={idx} selected={selected} onSelect={setSelected} />}
          {result && page === "warning" && (
            <EarlyWarning
              result={result}
              idx={idx}
              onSelect={(id) => {
                setSelected(id);
                setPage("live");
              }}
            />
          )}
          {page === "cases" && (
            <IndiaCases
              onApply={(c, s) => {
                setCity(c);
                setScenario(s);
                void run({ city: c, scenario: s }, "live");
              }}
            />
          )}
          {page === "intervene" && <InterventionLab base={request} />}
          {result && page === "math" && <MathModel result={result} idx={idx} selected={selected} />}
          {page === "compare" && <ScenarioCompare city={city} />}
          {page === "safety" && <StaySafe city={city} />}
        </main>
        {page !== "live" && page !== "dashboard" && (
        <footer className="border-t border-white/5 px-4 py-2 text-[10px] leading-relaxed text-slate-500">
          cosYNOT BMSCE is a simulation and decision-support prototype. Synthetic scenarios are not official forecasts or emergency
          warnings. Historical Indian flood events are provided for contextual reference. Simulation Data — Synthetic Digital Twin.
        </footer>
        )}
      </div>
    </div>
  );
}
