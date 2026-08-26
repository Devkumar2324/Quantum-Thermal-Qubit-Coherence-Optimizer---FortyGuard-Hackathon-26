# Hackathon Alignment

## Event

**FortyGuard Global AI Hackathon '26**

## Tracks

### Primary Track: Track 05 — Model Designing

> "FortyGuard temperature intelligence is transformed into a predictive quantum-thermal model and optimization engine."

The system builds a modular, physics-inspired simulation model that ingests ambient temperature data and produces predictions of qubit coherence (T1, T2, T2*, coherence score) and cooling energy. The model is documented in `docs/scientific-model.md` and `docs/model-assumptions.md`, with every equation and assumption explicitly stated.

The model is intentionally modular so each component (thermal, quantum, cooling, optimization) can be replaced with a hardware-calibrated implementation without touching the rest of the system. This satisfies the Track 05 requirement of designing models that can be iteratively improved.

### Secondary Track: Track 02 — Future Buildings & Energy

> "The optimization explicitly targets cooling-energy efficiency."

The multi-objective optimizer explicitly minimizes modeled cooling energy alongside maximizing coherence. The baseline comparison shows the energy savings achievable (typically 30–50% in default scenarios) versus an aggressive conventional cooling strategy. The cooling model uses the Carnot-efficiency approximation with realistic cryogenic parameters, producing physically reasonable energy scales.

This aligns with Track 02's focus on energy efficiency in future computing infrastructure. Quantum computing facilities are projected to be significant energy consumers (primarily due to cryogenic cooling), so any optimization that reduces cooling energy has direct relevance to sustainable computing.

### Optional Track: Track 06 — Agentic AI

> "An autonomous thermal agent monitors conditions, evaluates risk, runs optimization, and generates mitigation recommendations."

The **Quantum Thermal Agent** (in the AI Agent section) uses the z-ai-web-dev-sdk to:
1. Monitor thermal conditions (current ambient temperature, scenario, trend).
2. Retrieve current thermal data (via the API layer).
3. Evaluate the quantum system (using the deterministic scientific code).
4. Predict coherence (using the deterministic scientific code).
5. Evaluate cooling energy (using the deterministic scientific code).
6. Run optimization (using the deterministic scientific code).
7. Recommend an operating point (LLM-generated explanation).
8. Explain the decision (LLM-generated natural language).
9. Log the decision (persisted to the database).

**Critical safety constraint**: The LLM is used ONLY for explanation, interpretation, and natural-language reporting. It NEVER performs mathematical optimization, numerical computation, or constraint checking. All numerical results come from deterministic scientific code. Agent actions are logged recommendations only — never hardware commands.

## Success Criteria Mapping

The project satisfies all 10 success criteria defined in the original specification:

| # | Success Criterion | Status |
|---|-------------------|--------|
| 1 | Ingest FortyGuard temperature data or clearly labeled simulation data | ✅ `TemperatureProvider` interface with `FortyGuardTemperatureProvider` and `SyntheticTemperatureProvider` fallback |
| 2 | Evaluate a quantum-system configuration across a temperature range | ✅ `runTemperatureSweep()` in `optimizer.ts` |
| 3 | Produce a documented coherence prediction | ✅ `docs/scientific-model.md` documents every equation; `estimateCoherence()` implements it |
| 4 | Produce a documented cooling-energy estimate | ✅ `docs/scientific-model.md` documents the Carnot model; `calculateCoolingPower()` implements it |
| 5 | Find an operating point satisfying the coherence constraint | ✅ `selectOptimal()` filters by feasibility and selects the minimum-objective candidate |
| 6 | Demonstrate the coherence/energy trade-off | ✅ Pareto frontier chart in the dashboard |
| 7 | Compare baseline vs optimized operation | ✅ Baseline comparison bars and metrics in the Results section |
| 8 | Produce reproducible experiments | ✅ Full sweep results, Pareto frontier, and config snapshot persisted to database |
| 9 | Clearly separate real data, simulated data, and model outputs | ✅ `source` field on every thermal observation; "Modeled" labels on all derived values |
| 10 | Demonstrable in under 3 minutes | ✅ Demo protocol defined in `docs/experiment-protocol.md` |

## Final Product Message

The final application communicates:

> "Quantum-Thermal Coherence Optimizer transforms temperature intelligence into a quantum-system thermal optimization problem. It predicts temperature-dependent coherence behavior and identifies operating conditions that satisfy a target coherence level while minimizing modeled cooling energy."

## Positioning Statement

This is presented as:

> "An experimental application of temperature intelligence to next-generation computing thermal optimization."

It is NOT presented as:
- An official FortyGuard quantum-computing use case.
- A proven method for controlling real quantum hardware.
- A calibrated model for any specific quantum device.

## Demo Workflow (3 Minutes)

The demo follows the protocol defined in `docs/experiment-protocol.md`:

1. **Open dashboard** (15s) — KPIs, ambient temperature, "Simulation Mode" badge.
2. **Show FortyGuard integration** (15s) — explain the live/simulation fallback.
3. **Select quantum system** (15s) — show the configurable parameters.
4. **Show current operating point** (15s) — note the lack of optimization.
5. **Increase ambient scenario** (15s) — switch to "Hot Ambient" or "Extreme Heat".
6. **Show predicted thermal impact** (15s) — thermal section shows the new ambient.
7. **Run optimizer** (30s) — click "Run Optimizer", watch the Pareto chart populate.
8. **Display results** (30s) — recommended temperature, coherence, energy, savings.
9. **Open Pareto graph** (15s) — explain the trade-off.
10. **Show baseline vs optimized** (15s) — comparison bars.
11. **Run AI Thermal Agent** (30s) — click "Run Full Analysis", get LLM explanation.

**Final message**: "Maintain required quantum coherence while minimizing modeled cooling energy."

## Differentiators

What makes this project stand out at the hackathon:

1. **Scientific honesty** — every value is labeled as real, simulated, or model output. The system explicitly disclaims that it is not a hardware control system.
2. **Documented model** — every equation and assumption is documented in `docs/`, with references to the physics literature.
3. **Modular architecture** — every model component can be replaced independently.
4. **Pareto frontier visualization** — the most important graph clearly shows the trade-off between coherence and energy.
5. **Reproducible experiments** — full sweep results and configuration snapshots are persisted to the database.
6. **AI agent with safety constraints** — the LLM explains but never computes; all numerical results come from deterministic scientific code.
7. **End-to-end workflow** — from thermal data ingestion to optimization to LLM explanation, in under 3 minutes.
