# Experiment Protocol

## Overview

This document defines the protocol for running reproducible experiments with the Quantum-Thermal Qubit Coherence Optimizer. Every experiment follows the same procedure to ensure results are comparable across runs, scenarios, and configurations.

## Experiment Definition

An experiment is a single execution of the optimization pipeline with a fixed set of inputs. Each experiment is uniquely identified by an auto-generated ID and stores the complete input configuration and output results.

### Required Inputs

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | auto-generated | Human-readable experiment name |
| `scenario` | enum | "normal" | Ambient temperature scenario |
| `ambientC` | number | 25.0 | Ambient temperature in °C (overridden by scenario) |
| `config` | QuantumSystemConfig | DEFAULT_CONFIG | Quantum system configuration |
| `tempMin` | number | 10 | Minimum operating temperature (mK) |
| `tempMax` | number | 100 | Maximum operating temperature (mK) |
| `tempStep` | number | 2 | Temperature step (mK) |
| `coherenceWeight` | number | 0.7 | Weight for coherence in objective |
| `energyWeight` | number | 0.3 | Weight for energy in objective |
| `minCoherence` | number | 0.85 | Minimum coherence threshold |

## Experiment Procedure

### Step 1: Configuration

The user selects or creates a quantum system configuration in the **Quantum System** section. The configuration specifies the qubit type, count, frequency, target T1/T2, minimum coherence, temperature range, and noise/cooling parameters.

### Step 2: Scenario Selection

The user selects an ambient temperature scenario from the top bar:
- **Normal Ambient** (25°C, ±1.5°C volatility)
- **Hot Ambient** (38°C, ±2.0°C volatility)
- **Extreme Heat** (46°C, ±3.0°C volatility)
- **Rapid Temperature Increase** (32°C base, +1.2°C/h trend)
- **Temperature Anomaly** (33°C, ±4.0°C volatility)

Or the user can run a custom simulation with a specified base temperature and delta over time.

### Step 3: Thermal Data Acquisition

The system retrieves thermal data via:
1. **FortyGuard API** (if `FORTYGUARD_API_KEY` is set) — real ambient temperature observations.
2. **Synthetic generator** (fallback) — clearly-labeled synthetic data generated from the selected scenario.

The data source is recorded in the experiment metadata.

### Step 4: Thermal Processing

The thermal observations are processed:
- Missing values are forward-filled.
- Outliers are smoothed (cap to ±4 stdev of rolling mean).
- 6-hour rolling moving average is computed.
- Anomaly (deviation from MA) is calculated.
- Rate of change per hour is computed.
- 6-hour linear-regression forecast is generated.

### Step 5: Temperature Sweep

For each candidate temperature `T ∈ [T_min, T_max]` with step `ΔT`:

1. Compute Bose-Einstein thermal population `n̄(T)`.
2. Compute normalized thermal noise score `N_th(T)`.
3. Estimate T1: `T1(T) = T1_ref · exp(α·(T_ref - T)/T_ref) / (1 + γ·n̄(T))`.
4. Estimate T2: `1/T2 = 1/(2·T1) + 1/T_phi_effective`.
5. Estimate T2*: `T2* = T2 / (1 + ξ·√N_th)`.
6. Compute coherence score `C(T)`.
7. Classify decoherence risk.
8. Compute cooling power `P(T) = Q_load / COP_real + P_baseline`.
9. Compute daily energy `E(T) = P · 24 / 1000`.
10. Compute objective `J(T) = w_c · (1 - C) + w_e · E_norm(T)`.
11. Check feasibility: `C(T) ≥ C_min`.

### Step 6: Pareto Frontier Identification

Identify the set of non-dominated candidate solutions. A point is on the Pareto frontier if no other point has both higher coherence AND lower energy.

### Step 7: Optimal Selection

Select the optimal point as the feasible Pareto candidate with the lowest objective score. If no feasible Pareto point exists, fall back to any feasible point. If no feasible point exists, mark the experiment as "infeasible".

### Step 8: Baseline Comparison

Compute the baseline (aggressive cooling to 15 mK) using the same models. Calculate:
- Energy saving %: `(E_baseline - E_optimized) / E_baseline · 100`
- Coherence delta: `C_optimized - C_baseline`
- Risk delta: `risk(optimal) - risk(baseline)`

### Step 9: Persistence

The experiment is persisted to the database with:
- Full input configuration snapshot
- Ambient scenario and temperature
- All sweep results (per-candidate T1, T2, coherence, energy, objective, feasibility)
- Pareto frontier
- Optimal point
- Baseline comparison
- Timestamp

### Step 10: Reporting

Results are displayed in the dashboard with:
- KPI cards (recommended temperature, coherence, energy, savings, risk)
- Pareto frontier chart
- Temperature sweep chart (T vs coherence, T vs energy)
- Candidate sweep table (sortable, with status badges)
- Optional LLM-generated explanation (via the AI Agent section)

## Per-Candidate Recorded Fields

For every candidate temperature in the sweep, the experiment records:

| Field | Type | Unit |
|-------|------|------|
| `temperatureMK` | number | mK |
| `thermalNoise` | number | 0..1 |
| `thermalPopulation` | number | dimensionless |
| `T1Microseconds` | number | µs |
| `T2Microseconds` | number | µs |
| `T2StarMicroseconds` | number | µs |
| `coherenceScore` | number | 0..1 |
| `decoherenceRisk` | enum | LOW/MEDIUM/HIGH/CRITICAL |
| `coolingPowerWatts` | number | W |
| `energyConsumptionKWh` | number | kWh/day |
| `relativeEnergy` | number | 0..1 |
| `cop` | number | dimensionless |
| `objectiveScore` | number | dimensionless |
| `feasible` | boolean | — |

## Predefined Scenarios

The five predefined scenarios are designed to test the optimizer under different thermal stress conditions:

### Scenario 1: Normal Ambient
- **Purpose**: Baseline operating condition.
- **Ambient**: 25°C, ±1.5°C volatility, no trend.
- **Expected behavior**: Optimizer should find a comfortable operating point well above the coherence threshold with moderate energy savings.

### Scenario 2: Hot Ambient
- **Purpose**: Sustained heat stress.
- **Ambient**: 38°C, ±2.0°C volatility.
- **Expected behavior**: Cooling energy increases due to larger ΔT. Optimizer may select a slightly higher operating temperature to maintain energy savings while meeting the coherence constraint.

### Scenario 3: Extreme Heat
- **Purpose**: Heat-wave conditions.
- **Ambient**: 46°C, ±3.0°C volatility.
- **Expected behavior**: Cooling energy rises sharply. Optimizer should still find a feasible point but with reduced energy savings.

### Scenario 4: Rapid Temperature Increase
- **Purpose**: Thermal transient.
- **Ambient**: 32°C base, +1.2°C/h trend.
- **Expected behavior**: Forecasting predicts continued warming. Optimizer may recommend a more conservative operating point to maintain margin.

### Scenario 5: Temperature Anomaly
- **Purpose**: Sudden thermal anomaly.
- **Ambient**: 33°C, ±4.0°C volatility.
- **Expected behavior**: High volatility increases uncertainty. Optimizer should select a robust operating point.

## Custom Scenarios

Users can create custom ambient scenarios via the **POST /api/thermal/simulate** endpoint or the **Thermal** section's "Custom Simulation" tab. Custom scenarios specify:
- `baseC`: Base ambient temperature (°C)
- `deltaC`: Temperature delta over the simulation period (°C)
- `hours`: Number of hours to simulate

Custom scenarios are always labeled as `source: "synthetic"`.

## Evaluation Metrics

### Prediction Quality

When reference data is available (e.g., from a hardware-calibrated model), evaluate prediction quality using:
- **MAE**: Mean Absolute Error between predicted and reference T1/T2.
- **RMSE**: Root Mean Square Error.
- **R²**: Coefficient of determination.

### Optimization Quality

- **Coherence constraint satisfaction**: Does `C_optimal ≥ C_min`?
- **Energy consumption**: Absolute kWh/day of the optimal point.
- **Energy savings**: Percentage reduction vs baseline.
- **Optimization objective**: The `J` value at the optimal point.
- **Number of feasible solutions**: Count of candidates meeting the constraint.
- **Pareto frontier size**: Count of non-dominated candidates.

### Robustness

Run the same configuration across all five predefined scenarios and report:
- Mean and standard deviation of energy savings.
- Worst-case coherence.
- Failure rate (experiments that return "no feasible solution").

### Statistical Reporting

For repeated experiments with the same configuration:
- Report mean, median, standard deviation, and 95% confidence intervals.
- Do not manufacture statistical significance — only report significance tests when enough independent samples exist (typically n ≥ 30).

## Reproducibility

Every experiment stores:
- Model version (currently `0.1.0`)
- Quantum configuration snapshot (full parameters, not just an ID reference)
- Ambient scenario identifier and ambient temperature
- Optimization weights, threshold, temperature range, step
- Full sweep results (per-candidate)
- Pareto frontier
- Optimal point
- Baseline comparison
- Timestamp

Any past experiment can be loaded by ID via the **GET /api/experiments/[id]** endpoint and inspected in the **Results** section of the dashboard.

## Demo Protocol (3-minute Hackathon Demo)

1. **Open dashboard** (15s) — show KPIs, ambient temperature, "Simulation Mode" badge.
2. **Show FortyGuard integration** (15s) — explain that real API data would be shown if credentials were set.
3. **Select quantum system** (15s) — show configuration in the Quantum System section.
4. **Show current operating point** (15s) — note the lack of optimization.
5. **Increase ambient scenario** (15s) — switch to "Hot Ambient" or "Extreme Heat".
6. **Show predicted thermal impact** (15s) — thermal section shows the new ambient.
7. **Run optimizer** (30s) — click "Run Optimizer", watch the Pareto chart populate.
8. **Display results** (30s) — recommended temperature, coherence, energy, savings.
9. **Open Pareto graph** (15s) — explain the trade-off.
10. **Show baseline vs optimized** (15s) — comparison bars.
11. **Run AI Thermal Agent** (30s) — click "Run Full Analysis", get LLM explanation.

**Final message**: "Maintain required quantum coherence while minimizing modeled cooling energy."
