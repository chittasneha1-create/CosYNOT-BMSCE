import { useMemo } from "react";
import type { FlowArrow, RegionState } from "../lib/types";
import { fmtMin, infraIcon } from "../lib/format";

const COLS = 12;

export function CityGrid({
  regions,
  flows,
  selected,
  onSelect,
  compact = false,
}: {
  regions: RegionState[];
  flows: FlowArrow[];
  selected: string | null;
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  const byId = useMemo(() => Object.fromEntries(regions.map((r) => [r.id, r])), [regions]);
  const cell = compact ? 22 : 36;

  return (
    <div className="relative overflow-auto rounded-xl border border-white/10 bg-ink-950/80 p-2">
      <div className="relative mx-auto" style={{ width: COLS * cell + 8, height: COLS * cell + 8 }}>
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${COLS}, ${cell}px)`, gridTemplateRows: `repeat(${COLS}, ${cell}px)` }}
        >
          {regions.map((r) => (
            <button
              key={r.id}
              title={`${r.name} · ${r.water_pct.toFixed(0)}% · ${r.status}`}
              onClick={() => onSelect(r.id)}
              className={`map-cell relative rounded-sm status-${r.status} ${selected === r.id ? "selected" : ""} ${
                r.is_retention ? "ring-1 ring-sky-300/50" : ""
              }`}
              style={{
                opacity: 0.55 + Math.min(0.45, r.water_pct / 180),
              }}
            >
              <span className="absolute left-0.5 top-0.5 font-mono text-[8px] text-white/70">{r.id}</span>
              {r.infrastructure[0] && (
                <span className="absolute bottom-0 right-0 text-[9px] leading-none">{infraIcon(r.infrastructure[0])}</span>
              )}
            </button>
          ))}
        </div>
        <svg className="pointer-events-none absolute inset-0" width={COLS * cell + 8} height={COLS * cell + 8}>
          {flows.map((f, i) => {
            const a = byId[f.from_id];
            const b = byId[f.to_id];
            if (!a || !b) return null;
            const x1 = a.col * cell + cell / 2 + 4;
            const y1 = a.row * cell + cell / 2 + 4;
            const x2 = b.col * cell + cell / 2 + 4;
            const y2 = b.row * cell + cell / 2 + 4;
            if (f.blocked) {
              const mx = (x1 + x2) / 2;
              const my = (y1 + y2) / 2;
              return (
                <g key={`${f.from_id}-${f.to_id}-${i}`}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fb7185" strokeWidth={1.4} strokeDasharray="3 3" />
                  <text x={mx} y={my} fill="#fda4af" fontSize="10" textAnchor="middle">
                    ✕
                  </text>
                </g>
              );
            }
            const w = Math.min(3.2, 0.4 + f.rate_m3_min / 40);
            return (
              <line
                key={`${f.from_id}-${f.to_id}-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(125,211,252,0.75)"
                strokeWidth={w}
                markerEnd="url(#arrow)"
              />
            );
          })}
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="rgba(125,211,252,0.9)" />
            </marker>
          </defs>
        </svg>
      </div>
      {selected && byId[selected] && (
        <div className="mt-2 text-[11px] text-slate-400">
          {byId[selected].name} · {byId[selected].water_pct.toFixed(0)}% · ETTC {fmtMin(byId[selected].ettc_min)}
        </div>
      )}
    </div>
  );
}

export function FloodLegend() {
  const items = [
    ["normal", "Normal / water"],
    ["safe", "Safe"],
    ["warning", "Warning"],
    ["high", "High risk"],
    ["critical", "Critical"],
  ];
  return (
    <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
      {items.map(([k, lab]) => (
        <span key={k} className="inline-flex items-center gap-1">
          <i className={`inline-block h-2.5 w-2.5 rounded-sm status-${k}`} />
          {lab}
        </span>
      ))}
      <span>🏥 Hospital 🚇 Metro 🏫 School 🚒 Fire ⚡ Power 🚉 Railway 🟦 Lake</span>
    </div>
  );
}
