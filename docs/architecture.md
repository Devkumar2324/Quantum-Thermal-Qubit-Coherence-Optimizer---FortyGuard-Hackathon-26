# Architecture

## Overview

The **Quantum-Thermal Qubit Coherence Optimizer** is a research-oriented, production-quality prototype that investigates whether the operating temperature of a quantum system can be optimized to maximize qubit coherence while minimizing the energy required for cooling. The system combines thermal intelligence from the FortyGuard Temperature API with a physics-inspired simulation model and a multi-objective optimization engine.

The architecture follows a strict separation of concerns: scientific modeling code is isolated from business logic, business logic is isolated from the presentation layer, and external data providers are abstracted behind a clean interface so they can be replaced without touching the rest of the system.

## High-Level Data Flow

```
                    FORTYGUARD
                 TEMPERATURE API
                       |
                       v
              +------------------+
              | Thermal Data     |
              | Ingestion        |
              +--------+---------+
                       |
                       v
              +------------------+
              | Data Processing   |
              +--------+---------+
                       |
             +---------+---------+
             |                   |
             v                   v
    +----------------+   +------------------+
    | Thermal        |   | Quantum System   |
    | Forecast Model |   | Parameters       |
    +-------+--------+   +--------+---------+
            |                     |
            +----------+----------+
                       |
                       v
             +--------------------+
             | Quantum Thermal    |
             | / Noise Model      |
             +---------+----------+
                       |
                       v
             +--------------------+
             | Coherence Model    |
             | T1 / T2 / Score     |
             +---------+----------+
                       |
             +---------+---------+
             |                   |
             v                   v
    +----------------+   +------------------+
    | Cooling Energy |   | Risk / Constraint|
    | Model          |   | Evaluation       |
    +-------+--------+   +--------+---------+
            |                     |
            +----------+----------+
                       |
                       v
             +--------------------+
             | Multi-objective    |
             | Optimizer           |
             +---------+----------+
                       |
                       v
             +--------------------+
             | Optimal Operating  |
             | Temperature         |
             +---------+----------+
                       |
                       v
             +--------------------+
             | Results / Agent /  |
             | Dashboard           |
             +--------------------+
```

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript 5 | Server-rendered React with strong typing, ideal for data-heavy dashboards |
| Styling | Tailwind CSS 4 + shadcn/ui | Utility-first styling with accessible component primitives |
| State | Zustand | Lightweight client-side state without boilerplate |
| Charts | Recharts | Composable React charting library with good TypeScript support |
| Database | Prisma ORM + SQLite | Schema-first migration workflow, easy to swap to PostgreSQL for production |
| AI | z-ai-web-dev-sdk | LLM access for agent explanations (never for math) |
| Testing | Bun test | Fast native test runner with TypeScript support |

## Repository Structure

```
quantum-thermal-optimizer/
├── docs/                          # Research documentation
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
│   └── schema.prisma              # Database schema
├── public/                        # Static assets
├── src/
│   ├── app/
│   │   ├── api/                   # Next.js API routes
│   │   │   ├── health/
│   │   │   ├── thermal/{current,history,simulate}/
│   │   │   ├── optimize/
│   │   │   ├── experiments/[id]/
│   │   │   ├── quantum/configurations/
│   │   │   └── agent/{analyze,explain}/
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Single-page dashboard
│   │   └── globals.css
│   ├── components/
│   │   ├── charts/                # Recharts visualizations
│   │   ├── dashboard/             # Section components
│   │   └── ui/                    # shadcn/ui primitives
│   ├── hooks/
│   ├── lib/
│   │   ├── db.ts                  # Prisma client
│   │   ├── scientific/            # Physics + optimization core
│   │   │   ├── types.ts
│   │   │   ├── thermal.ts
│   │   │   ├── quantum.ts
│   │   │   ├── cooling.ts
│   │   │   ├── optimizer.ts
│   │   │   ├── providers.ts
│   │   │   └── index.ts
│   │   ├── store/
│   │   │   └── app-store.ts       # Zustand store
│   │   └── utils.ts
│   └── tests/                     # Test files
├── scripts/
│   └── test-model.ts              # Standalone model verification
├── docker/
│   ├── Dockerfile.web             # Frontend container
├── docker-compose.yml
├── .env.example
└── package.json
```

## Component Architecture

### Scientific Core (`src/lib/scientific/`)

This is the heart of the system — a modular, replaceable physics-inspired simulation engine. Every equation is isolated here, with no business or UI concerns leaking in. The models can be replaced one at a time with hardware-calibrated implementations without touching the rest of the codebase.

- **`types.ts`** — Shared TypeScript interfaces for quantum configurations, thermal observations, coherence estimates, cooling estimates, and optimization results.
- **`thermal.ts`** — Thermal data processing: missing-value handling, outlier detection, rolling averages, anomaly calculation, linear-regression forecasting.
- **`quantum.ts`** — Bose-Einstein thermal population, T1 estimation (Purcell-coupled), T2 (1/T2 = 1/(2·T1) + 1/T_phi), T2*, coherence score, decoherence risk classification.
- **`cooling.ts`** — Carnot-efficiency cooling power approximation with realistic cryogenic parameters.
- **`optimizer.ts`** — Temperature sweep, Pareto frontier identification, optimal selection, baseline comparison.
- **`providers.ts`** — `TemperatureProvider` interface with `FortyGuardTemperatureProvider`, `SyntheticTemperatureProvider`, and `MockTemperatureProvider` implementations.

### API Layer (`src/app/api/`)

All API routes are Next.js Route Handlers running on the same process as the frontend. They follow REST conventions and validate inputs explicitly. The FortyGuard API key is read server-side from environment variables and never exposed to the client.

### Presentation Layer (`src/components/`)

The dashboard is a single-page application with section-based navigation managed by Zustand. Each section (Dashboard, Thermal, Quantum System, Optimizer, Experiments, Results, Research, AI Agent, Settings) is a self-contained component that reads from the global store and dispatches API calls as needed.

## Data Persistence

Experiments are stored in SQLite via Prisma with the following models:

- **`QuantumConfiguration`** — Saved qubit configurations (qubit type, frequency, target T1/T2, noise/cooling parameters).
- **`ThermalObservation`** — Time-series of ambient temperature readings with source attribution (FortyGuard / synthetic).
- **`Experiment`** — A complete optimization run: name, scenario, ambient temperature, weights, threshold, full sweep results, Pareto frontier, optimal point, baseline energy, savings.
- **`AgentDecision`** — Logged AI agent decisions with full input observation and recommendation text.
- **`OptimizationCache`** — Optional cache for repeated identical optimization requests.

## Security Boundaries

- API keys are read from server-side environment variables only — never sent to the browser.
- All API inputs are validated; invalid parameters return HTTP 400 with a descriptive error.
- The LLM agent never executes user-provided code or dynamically evaluates mathematical expressions.
- Agent actions are simulation/recommendation only — no real hardware commands are issued.

## Performance Considerations

- The temperature sweep evaluates 46 candidates by default (10–100 mK, 2 mK step), computing T1, T2, T2*, coherence, thermal noise, and cooling energy per candidate in well under 100ms.
- Repeated model calculations can be cached via the `OptimizationCache` table.
- Chart rendering uses Recharts' responsive container with memoized data transformations.
- No premature Kubernetes or microservices — the entire system runs as a single Next.js process, suitable for a hackathon prototype.

## Deployment Strategy

The application ships with a Dockerfile for the web service and a `docker-compose.yml` that orchestrates the web service and a PostgreSQL database. Local development uses SQLite via Prisma; production can switch to PostgreSQL by changing the `DATABASE_URL` environment variable.
