import {
  Activity,
  AlertTriangle,
  Beaker,
  BookOpen,
  Calculator,
  Gauge,
  GitCompare,
  HeartPulse,
  Map,
  Shield,
} from "lucide-react";
import type { PageId } from "../lib/types";

const ITEMS: { id: PageId; label: string; icon: typeof Map }[] = [
  { id: "live", label: "Live Flood Map", icon: Map },
  { id: "lab", label: "Flood Lab", icon: Beaker },
  { id: "risk", label: "Risk Analysis", icon: Gauge },
  { id: "warning", label: "Early Warning", icon: AlertTriangle },
  { id: "cases", label: "India Cases", icon: BookOpen },
  { id: "intervene", label: "Intervention Lab", icon: Shield },
  { id: "math", label: "Math Model", icon: Calculator },
  { id: "compare", label: "Scenario Comparison", icon: GitCompare },
  { id: "safety", label: "Stay Safe", icon: HeartPulse },
];

export function Sidebar({
  page,
  onPage,
  open,
  onClose,
}: {
  page: PageId;
  onPage: (p: PageId) => void;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed z-40 flex h-full w-60 flex-col border-r border-violetx-500/15 bg-ink-900/95 px-3 py-4 backdrop-blur-xl transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violetx-600/20 text-violetx-300">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-sm font-bold tracking-wide">cosYNOT BMSCE</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">India flood twin</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            const active = page === it.id;
            return (
              <button
                key={it.id}
                onClick={() => {
                  onPage(it.id);
                  onClose();
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] ${
                  active ? "bg-violetx-600/20 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </button>
            );
          })}
        </nav>
        <p className="px-2 pt-4 text-[10px] leading-relaxed text-slate-500">
          Simulation Data — Synthetic Digital Twin. Not an official forecast.
        </p>
      </aside>
    </>
  );
}
