# Experiments Guide

## Overview

The Experiment Engine is the reproducibility backbone of the Quantum-Thermal Qubit Coherence Optimizer. Every optimization run can be persisted as an experiment, storing the complete input configuration, full sweep results, Pareto frontier, and baseline comparison. This allows any past experiment to be inspected, compared, and reproduced.

## Creating Experiments

### Method 1: Via the Optimizer UI

1. Navigate to the **Optimizer** section.
2. Configure the optimization setup:
   - Coherence weight (0–1)
   - Energy weight (0–1, automatically 1 − coherence weight)
   - Minimum coherence threshold (40%–95%)
   - Experiment name (optional, auto-generated if blank)
   - "Persist as experiment" toggle (on by default)
3. Click **Run Optimizer**.

The experiment is automatically persisted to the database and its ID is stored in the application state for navigation to the Results section.

### Method 2: Via the API

Send a POST request to `/api/optimize` with `persist: true`:

```bash
curl -X POST http://localhost:3000/api/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "config": { ... },
    "ambientC": 25,
    "weights": { "coherence": 0.7, "energy": 0.3 },
    "minCoherence": 0.85,
    "persist": true,
    "experimentName": "My Custom Experiment"
  }'
```

### Method 3: Manual Creation

Send a POST request to `/api/experiments` with a pre-computed experiment payload. This is useful for importing experiments from external systems.

## Viewing Experiments

### Experiment List

Navigate to the **Experiments** section to see all persisted experiments, most recent first. The list shows:

- Name and configuration name
- Scenario
- Ambient temperature
- Optimal temperature
- Coherence
- Energy savings
- Status (completed / infeasible)
- Created timestamp
- View button

### Experiment Details

Click the view icon to navigate to the **Results** section, which displays:

- Experiment metadata (name, configuration, scenario, timestamp)
- Status badge (COMPLETED or INFEASIBLE)
- KPI cards (optimal temp, coherence, energy, savings)
- Baseline vs Optimized comparison charts (energy and coherence)
- Pareto frontier chart
- Full sweep table

## Reproducibility

Every experiment stores the following:

### Input Configuration
- Quantum system configuration (full parameters, not just an ID reference)
- Ambient scenario identifier
- Ambient temperature
- Temperature range and step
- Optimization weights
- Minimum coherence threshold

### Output Results
- Full sweep results (per-candidate T1, T2, T2*, coherence, energy, objective, feasibility)
- Pareto frontier (set of non-dominated candidates)
- Optimal point (selected candidate)
- Baseline comparison (energy, coherence, risk deltas)
- Computed metrics (energy savings, feasible count, Pareto count, etc.)

### Metadata
- Experiment ID (auto-generated cuid)
- Experiment name
- Status (completed / infeasible)
- Timestamp
- Model version

## Comparing Experiments

To compare two experiments:

1. Open the first experiment in the Results section.
2. Note the KPIs and Pareto frontier.
3. Return to the Experiments list.
4. Open the second experiment.
5. Compare the KPIs and charts.

The dashboard does not currently support side-by-side comparison of two experiments in a single view, but the persisted data is structured to enable this feature in a future iteration.

## Scenario-Based Experiments

The five predefined scenarios are designed for systematic comparison:

| Scenario | Ambient | Volatility | Trend | Use Case |
|----------|---------|------------|-------|----------|
| Normal | 25°C | ±1.5°C | none | Baseline operating condition |
| Hot | 38°C | ±2.0°C | +0.05°C/h | Sustained heat stress |
| Extreme Heat | 46°C | ±3.0°C | +0.15°C/h | Heat-wave conditions |
| Rapid Increase | 32°C | ±2.5°C | +1.2°C/h | Thermal transient |
| Anomaly | 33°C | ±4.0°C | none | Sudden anomaly |

**Recommended experiment matrix**: Run the same quantum configuration across all five scenarios to evaluate robustness. The optimizer should find feasible operating points in all scenarios, with energy savings decreasing as ambient temperature increases.

## Custom Experiments

### Custom Ambient Scenarios

Use the **Thermal** section's "Custom Simulation" tab to generate custom ambient data:
- Base temperature (−10 to 50°C)
- Delta over 12 hours (−10 to +15°C)

The custom simulation generates 12 hours of synthetic data with the specified parameters. After running, the ambient temperature is updated, and the next optimization run will use this custom ambient.

### Custom Quantum Configurations

Use the **Quantum System** section to create custom configurations:
- Edit qubit type, count, frequency
- Adjust target T1/T2 and minimum coherence
- Tune noise parameters (flux, charge, photon, impurity)
- Tune cooling parameters (Carnot efficiency, heat load, conductance, baseline target)

Click **Apply Configuration** to save changes to the active configuration. The next optimization run will use these parameters.

## Experiment Status

### Completed

The optimizer found at least one feasible operating point (coherence ≥ minimum threshold). The experiment record includes the optimal temperature, coherence, energy, and savings.

### Infeasible

No candidate temperature in the configured range satisfies the minimum coherence threshold. The experiment record includes a guidance message suggesting remediations:
- Expand the temperature range (lower T_min)
- Lower the coherence threshold
- Improve cooling assumptions (increase Carnot efficiency)
- Review quantum parameters (increase target T1/T2, reduce noise)

## Database Schema

Experiments are stored in the SQLite database (production: PostgreSQL) via Prisma. The schema is defined in `prisma/schema.prisma`:

```prisma
model Experiment {
  id              String   @id @default(cuid())
  name            String
  scenario        String   @default("normal")
  ambientTemp     Float    @default(25.0)
  configId        String
  config          QuantumConfiguration @relation(fields: [configId], references: [id])
  tempMin         Float
  tempMax         Float
  tempStep        Float
  coherenceWeight Float
  energyWeight    Float
  minCoherence    Float
  status          String   @default("completed")
  optimalTemp     Float?
  optimalCoherence Float?
  optimalEnergy   Float?
  baselineEnergy  Float?
  energySavings   Float?
  paretoFrontier  String?  // JSON
  sweepResults    String?  // JSON
  createdAt       DateTime @default(now())
  agentDecisions  AgentDecision[]
}
```

## Exporting Experiments

To export an experiment's full data:

```bash
curl http://localhost:3000/api/experiments/EXPERIMENT_ID > experiment.json
```

The JSON response includes the complete experiment record with sweep results and Pareto frontier, suitable for external analysis or archival.

## Best Practices

1. **Use descriptive experiment names** — include the scenario and configuration name for easy identification.
2. **Vary one parameter at a time** — when running comparison studies, change only the ambient scenario or only the configuration to isolate effects.
3. **Run all five scenarios** — for robustness evaluation, run the same configuration across all predefined scenarios.
4. **Check the feasibility count** — if the feasible count is low (1–3), the optimization is on the edge of infeasibility and small parameter changes may push it over.
5. **Inspect the Pareto frontier** — a rich Pareto frontier (many points) indicates a well-defined trade-off space. A sparse frontier suggests the model is highly constrained.
6. **Use the AI Agent for interpretation** — after running an experiment, click "Run Full Analysis" in the AI Agent section to get an LLM-generated explanation of the result.
