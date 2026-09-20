# cosYNOT BMSCE — official demo card

**Simulation Data — Synthetic Digital Twin**  
City: Bengaluru-inspired 12×12 · seed `42` · Heavy monsoon · 3 h · Δt = 5 min

Equations used (only these):

```
Qr = C × P × A
D  = min(available, Capacity × η + pump)
H  = z + W / A_eff
F  = K × max(0, Hi − Hj)
W(t+Δt) = W + (Qr − D + Fin − Fout) × Δt
ETTC = first t with Water% ≥ 100
```

## WHERE / WHEN / WHY / WHAT

| Question | Engine answer |
| --- | --- |
| WHERE | **H8 · City Hospital** (then I8, I7 arterial) |
| WHEN | **85 minutes** to critical |
| WHY | Low depression + C = 0.88 + drainage 100% + upstream inflow |
| WHAT | Protect hospital package → **23 → 4** critical zones |

## Before / after

| Metric | Before | After |
| --- | ---: | ---: |
| Critical zones | 23 | 4 |
| Peak water | 223.9% | 150.2% |
| Population exposed | 49,477 | 21,427 |
| First critical | 85 min | 125 min |
| Hospital risk | 80.9 | 61.5 |

Full JSON: `data/demo_scorecard.json` (written by the engine, not typed by hand).
