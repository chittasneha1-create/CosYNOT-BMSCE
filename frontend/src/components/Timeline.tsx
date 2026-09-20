import { Pause, Play, RotateCcw, StepBack, StepForward } from "lucide-react";

export function Timeline({
  t,
  max,
  playing,
  speed,
  onT,
  onPlay,
  onReset,
  onSpeed,
  onStep,
}: {
  t: number;
  max: number;
  playing: boolean;
  speed: number;
  onT: (v: number) => void;
  onPlay: () => void;
  onReset: () => void;
  onSpeed: (v: number) => void;
  onStep: (dir: -1 | 1) => void;
}) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="section-title">Time machine · Flood replay</div>
        <div className="font-mono text-xs text-violetx-200">
          {t.toFixed(0)} / {max.toFixed(0)} min
        </div>
      </div>
      <input className="w-full" type="range" min={0} max={max} step={1} value={t} onChange={(e) => onT(Number(e.target.value))} />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button className="rounded-md bg-white/10 p-1.5" onClick={onPlay} aria-label="Play or pause">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button className="rounded-md bg-white/10 p-1.5" onClick={() => onStep(-1)}>
          <StepBack className="h-4 w-4" />
        </button>
        <button className="rounded-md bg-white/10 p-1.5" onClick={() => onStep(1)}>
          <StepForward className="h-4 w-4" />
        </button>
        <button className="rounded-md bg-white/10 p-1.5" onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
        </button>
        <label className="ml-auto flex items-center gap-1 text-[11px] text-slate-400">
          Speed
          <select value={speed} onChange={(e) => onSpeed(Number(e.target.value))} className="rounded bg-ink-800 px-1 py-0.5">
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
            <option value={8}>8×</option>
          </select>
        </label>
      </div>
    </div>
  );
}
