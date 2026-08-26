# Quantum-Thermal Qubit Coherence Optimizer

> An AI/physics-based research and simulation framework for temperature-aware quantum-system optimization.

Built for the **FortyGuard Global AI Hackathon '26** — Track 05 (Model Designing), Track 02 (Future Buildings & Energy), and Track 06 (Agentic AI).

## What It Does

The system investigates a single research question:

> **Can we optimize the operating temperature of a quantum system to maximize qubit coherence while minimizing the energy required for cooling?**

It combines:
1. FortyGuard Temperature API / thermal intelligence
2. Quantum thermal/noise modeling (Bose-Einstein, Purcell decay, dephasing)
3. Qubit coherence/decoherence prediction (T1, T2, T2*, coherence score)
4. Cooling-energy modeling (Carnot-efficiency approximation)
5. Multi-objective optimization (constrained + weighted objective)
6. Pareto frontier identification
7. Visualization and analytics (7 research charts)
8. Optional AI thermal optimization agent (LLM explanation only — never math)
9. Experiment management and reproducible research results

## Live Demo Results

With the default configuration (superconducting qubits, 25°C ambient, 70/30 coherence/energy weights, 85% minimum coherence):

- **Optimal operating temperature**: 28 mK
- **Predicted coherence**: 95.9%
- **Modeled cooling energy**: 772 kWh/day (vs 1410 kWh/day baseline)
- **Modeled energy savings**: 45.2%
- **Decoherence risk**: LOW
- **Feasible solutions**: 13 of 46 candidates

## Quick Start

### Prerequisites

- Node.js 20+ or Bun
- npm/bun package manager

### Local Development

```bash
# 1. Install dependencies
bun install

# 2. Copy environment template
cp .env.example .env.local

# 3. Initialize the database
bun run db:push

# 4. Start the dev server
bun run dev
```

Open `http://localhost:3000` in your browser.

### Docker Deployment

```bash
# 1. Copy environment template and edit if needed
cp .env.example .env

# 2. Build and start all services
docker compose up -d

# 3. Check status
docker compose ps

# 4. View logs
docker compose logs -f web
```

The app runs on `http://localhost:3000`. Health check: `http://localhost:3000/api/health`.

## Project Structure

```
quantum-thermal-optimizer/
├── docs/                          # Research documentation (11 files)
│   ├── architecture.md
│   ├── research-methodology.md
│   ├── model-assumptions.md
│   ├── scientific-model.md
│   ├── optimization-methodology.md
│   ├── experiment-protocol.md
│   ├── limitations.md
│   ├── hackathon-alignment.md
│   ├── api.md
│   └── experiments.md
├── prisma/
│   └── schema.prisma              # Database schema (5 models)
├── src/
│   ├── app/
│   │   ├── api/                   # 10 API route handlers
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Single-page dashboard
│   │   └── globals.css
│   ├── components/
│   │   ├── charts/                # Recharts visualizations
│   │   ├── dashboard/             # 9 section components
│   │   └── ui/                    # shadcn/ui primitives
│   ├── lib/
│   │   ├── db.ts                  # Prisma client
│   │   ├── scientific/            # Physics + optimization core
│   │   │   ├── types.ts
│   │   │   ├── thermal.ts
│   │   │   ├── quantum.ts
│   │   │   ├── cooling.ts
│   │   │   ├── optimizer.ts
│   │   │   └── providers.ts
│   │   └── store/
│   │       └── app-store.ts       # Zustand store
│   └── hooks/
├── tests/                         # Test suite (5 files, 107 tests)
│   ├── thermal.test.ts
│   ├── quantum.test.ts
│   ├── cooling.test.ts
│   ├── optimizer.test.ts
│   └── providers.test.ts
├── docker/
│   └── Dockerfile.web             # Multi-stage production build
├── scripts/
│   └── test-model.ts              # Standalone model verification
├── docker-compose.yml
├── .env.example
├── .dockerignore
└── package.json
```

## Dashboard Sections

The single-page dashboard has 9 sections accessible from the sidebar:

| Section | Purpose |
|---------|---------|
| **Dashboard** | Real-time KPIs, ambient trend, Pareto preview, optimization summary |
| **Thermal** | FortyGuard data, history/forecast, 5 scenario presets, custom simulation |
| **Quantum System** | Qubit configuration editor with live coherence preview |
| **Optimizer** | Weight sliders, Pareto chart, temperature sweep table |
| **Experiments** | Reproducible run history with full metadata |
| **Results** | Baseline vs optimized comparison charts |
| **Research** | 7 scientific charts + limitations section |
| **AI Agent** | LLM-powered thermal analyst (explanation only) |
| **Settings** | API credentials, weights, project info |

## Scientific Model

The physics-inspired simulation model is fully documented in [`docs/scientific-model.md`](docs/scientific-model.md). Key equations:

### Thermal Population (Bose-Einstein)
```
n̄(T) = 1 / (exp(ℏω / k_B·T) - 1)
```

### T1 (Purcell-coupled)
```
T1(T) = T1_ref · exp(α·(T_ref - T)/T_ref) / (1 + γ·n̄(T))
```

### T2 (with dephasing)
```
1/T2 = 1/(2·T1) + 1/T_phi_effective
T_phi = T_phi_ref / (1 + η·N_th)
```

### Coherence Score
```
C = clip(0.05 + 0.95 · norm_T2 · (1 - 0.4·N_th), 0, 1)
```

### Cooling Energy (Carnot)
```
COP_carnot = T_cold / (T_hot - T_cold)
COP_real = η · COP_carnot
P = Q_load / COP_real + P_baseline
```

### Multi-Objective Optimization
```
minimize    J(T) = w_c · (1 - C(T)) + w_e · E_norm(T)
subject to  C(T) ≥ C_min
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Service status |
| GET | `/api/thermal/current` | Current temperature |
| GET | `/api/thermal/history` | Historical series |
| POST | `/api/thermal/simulate` | Custom ambient scenario |
| GET/POST | `/api/quantum/configurations` | Qubit configurations |
| POST | `/api/optimize` | Run optimization |
| GET/POST | `/api/experiments` | List/create experiments |
| GET | `/api/experiments/[id]` | Fetch single experiment |
| POST | `/api/agent/explain` | LLM explanation |
| GET/POST | `/api/agent/analyze` | Agent decision logging |

See [`docs/api.md`](docs/api.md) for full API reference.

## Testing

The project includes a comprehensive test suite covering all scientific models and the optimizer:

```bash
# Run all tests
bun run test

# Run a specific test file
bun test tests/quantum.test.ts

# Run tests matching a pattern
bun test --filter "Pareto"
```

Test coverage:
- **`tests/thermal.test.ts`** — Unit conversions, thermal processing, synthetic history generation
- **`tests/quantum.test.ts`** — Bose-Einstein population, T1/T2/T2*, coherence, risk classification
- **`tests/cooling.test.ts`** — Carnot COP, cooling power, energy consumption, relative energy
- **`tests/optimizer.test.ts`** — Temperature sweep, Pareto identification, optimal selection, baseline comparison, full pipeline
- **`tests/providers.test.ts`** — FortyGuard/Synthetic/Mock providers, fallback behavior

**107 tests, all passing.**

## FortyGuard Integration

The system integrates with the FortyGuard Temperature API via the `TemperatureProvider` interface:

```typescript
const provider = getProvider();
// Returns FortyGuardTemperatureProvider if FORTYGUARD_API_KEY is set
// Otherwise returns SyntheticTemperatureProvider (clearly labeled)
```

To enable real FortyGuard data:
1. Set `FORTYGUARD_API_KEY` and `FORTYGUARD_BASE_URL` in `.env.local`
2. Restart the dev server
3. The dashboard status badge switches from "Simulation Mode" to "FortyGuard Live"

When the API is unavailable or no key is set, the system falls back to clearly-labeled synthetic data generated from documented scenario presets.

## Scientific Honesty

This system is a **research and simulation framework**, not a control system for real quantum hardware. All numerical outputs are model-derived approximations, not measurements.

- **REAL DATA**: FortyGuard temperature observations (when API key is set)
- **SIMULATED DATA**: Qubit parameters, T1/T2, coherence, cooling energy
- **MODEL OUTPUT**: Predicted coherence, optimized temperature, energy savings

The application uses "modeled" language throughout ("modeled energy savings", "predicted coherence", "estimated T1") and never claims results are real hardware measurements.

See [`docs/limitations.md`](docs/limitations.md) for the complete limitations and honesty guidelines.

## AI Agent Safety

The Quantum Thermal Agent uses a large language model (via z-ai-web-dev-sdk) for explanation and interpretation only:

- ✅ The LLM **explains** optimization decisions in natural language
- ✅ The LLM **recommends** next actions
- ✅ The LLM **interprets** numerical results
- ❌ The LLM **never** performs mathematical optimization
- ❌ The LLM **never** issues hardware commands
- ❌ The LLM **never** executes user-provided code

All numerical results come from deterministic scientific code. Agent actions are logged recommendations only.

## Documentation

| Document | Description |
|----------|-------------|
| [architecture.md](docs/architecture.md) | System architecture and component overview |
| [research-methodology.md](docs/research-methodology.md) | Research questions, hypotheses, variables, methodology |
| [model-assumptions.md](docs/model-assumptions.md) | All model assumptions and their physical motivation |
| [scientific-model.md](docs/scientific-model.md) | Complete mathematical specification |
| [optimization-methodology.md](docs/optimization-methodology.md) | Multi-objective optimization formulation |
| [experiment-protocol.md](docs/experiment-protocol.md) | Experiment execution protocol |
| [limitations.md](docs/limitations.md) | Limitations and scientific honesty |
| [hackathon-alignment.md](docs/hackathon-alignment.md) | Hackathon track alignment |
| [api.md](docs/api.md) | Full API reference |
| [experiments.md](docs/experiments.md) | Experiments guide |

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **State**: Zustand
- **Database**: Prisma ORM + SQLite (PostgreSQL-ready)
- **Charts**: Recharts
- **AI**: z-ai-web-dev-sdk
- **Testing**: Bun test

## Hackathon Alignment

### Track 05 — Model Designing (Primary)
> "FortyGuard temperature intelligence is transformed into a predictive quantum-thermal model and optimization engine."

### Track 02 — Future Buildings & Energy (Secondary)
> "The optimization explicitly targets cooling-energy efficiency."

### Track 06 — Agentic AI (Optional)
> "An autonomous thermal agent monitors conditions, evaluates risk, runs optimization, and generates mitigation recommendations."

See [`docs/hackathon-alignment.md`](docs/hackathon-alignment.md) for full alignment details.

## License

Research prototype built for the FortyGuard Global AI Hackathon '26. All simulated values are research approximations, not measurements from real quantum hardware.

## Final Message

> "Quantum-Thermal Coherence Optimizer transforms temperature intelligence into a quantum-system thermal optimization problem. It predicts temperature-dependent coherence behavior and identifies operating conditions that satisfy a target coherence level while minimizing modeled cooling energy."
