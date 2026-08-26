# Research Methodology

## Research Question

**Primary**: Can we optimize the operating temperature of a quantum system to maximize qubit coherence while minimizing the energy required for cooling?

**Secondary**:

- **RQ1**: How does modeled temperature-dependent thermal noise affect qubit coherence?
- **RQ2**: Can a physics-informed or hybrid ML model predict coherence degradation under different thermal conditions?
- **RQ3**: Can multi-objective optimization identify an operating temperature that satisfies a minimum coherence requirement while minimizing cooling energy?
- **RQ4**: How does the optimized strategy compare with a conventional fixed/aggressive cooling strategy?
- **RQ5**: How does changing ambient temperature affect the optimal operating point and cooling-energy requirement?

## Hypotheses

- **H1**: Thermal conditions have a measurable modeled relationship with qubit coherence/decoherence.
- **H2**: A temperature-aware optimization strategy can maintain a specified minimum coherence threshold while using less modeled cooling energy than a conservative/aggressive fixed-cooling strategy.
- **H3**: External temperature intelligence (FortyGuard) can improve the optimization of thermal operating conditions under changing environmental conditions.

These hypotheses are **not** claimed to be true a priori. The system is designed to test them empirically by running controlled experiments across scenarios and reporting metrics.

## Variables

### Independent Variables

| Variable | Symbol | Range | Unit |
|----------|--------|-------|------|
| Operating temperature | T_op | 10 – 100 | mK |
| Ambient temperature | T_amb | -10 – 50 | °C |
| Coherence weight | w_c | 0 – 1 | dimensionless |
| Energy weight | w_e | 0 – 1 | dimensionless (w_c + w_e = 1) |
| Minimum coherence threshold | C_min | 0.40 – 0.95 | dimensionless |
| Scenario | — | normal, hot, extreme-heat, rapid-increase, anomaly | — |

### Dependent Variables

| Variable | Symbol | Unit |
|----------|--------|------|
| Coherence score | C | 0..1 |
| T1 (energy relaxation) | T1 | microseconds |
| T2 (Ramsey dephasing) | T2 | microseconds |
| T2* (inhomogeneous) | T2* | microseconds |
| Thermal noise | N_th | 0..1 |
| Thermal photon population | n̄ | dimensionless |
| Cooling power | P_cool | watts |
| Modeled cooling energy | E | kWh/day |
| Decoherence risk | — | LOW / MEDIUM / HIGH / CRITICAL |
| Objective score | J | dimensionless |
| Energy savings | — | % |

### Controlled Variables

The quantum system configuration (qubit type, qubit count, qubit frequency, target T1/T2, noise parameters, cooling parameters) is held constant within a single experiment but can be varied across experiments. The baseline strategy (aggressive cooling to a fixed low temperature) is held constant across all comparisons.

## Methodology

### Step 1 — Thermal Data Ingestion

Retrieve ambient temperature data from the FortyGuard Temperature API when credentials are available. If the API is unavailable, fall back to clearly-labeled synthetic data generated from documented scenario presets (normal, hot, extreme-heat, rapid-increase, temperature-anomaly). The data source is always recorded alongside each observation so downstream consumers can distinguish real from synthetic data.

### Step 2 — Thermal Data Processing

Apply missing-value handling (forward fill), outlier smoothing (cap to ±4 stdev of rolling mean), rolling 6-hour moving average, anomaly detection (deviation from MA), rate-of-change calculation, and a baseline linear-regression forecast for the next 6 hours. The forecasting model is intentionally simple — it can be replaced with a more sophisticated model (Random Forest, Gradient Boosting, LSTM) without changing the downstream pipeline.

### Step 3 — Cooling Requirement Modeling

Convert the ambient temperature into a cooling requirement using the Carnot-efficiency approximation. The Carnot coefficient of performance is `COP_carnot = T_cold / (T_hot - T_cold)`, and the real COP is `COP_real = η · COP_carnot` where η is the realistic efficiency fraction (0.05–0.20 typical for cryogenic systems). The cooling power required is `P = Q_load / COP_real`, where Q_load is the sum of the base heat load and a conductive leak proportional to the temperature differential.

### Step 4 — Quantum Thermal/Noise Modeling

For each candidate operating temperature, compute the Bose-Einstein thermal photon occupation `n̄(T) = 1 / (exp(ℏω / k_B·T) - 1)`. This drives the thermal noise component of the model. Additional noise channels (1/f flux noise, charge noise, photon shot noise) contribute weighted terms to a normalized thermal noise score in the range 0..1.

### Step 5 — Coherence Prediction

Estimate T1 using a Purcell-coupled decay model: `T1(T) = T1_ref · exp(α·(T_ref - T)/T_ref) / (1 + γ·n̄(T))`. Estimate T2 using `1/T2 = 1/(2·T1) + 1/T_phi` where `T_phi` captures pure dephasing from low-frequency noise. Compute a normalized coherence score `C = clip(0.05 + 0.95 · normalizedT2 · (1 - 0.4·N_th), 0, 1)`. Classify decoherence risk as LOW (C ≥ 0.85), MEDIUM (0.65 ≤ C < 0.85), HIGH (0.40 ≤ C < 0.65), or CRITICAL (C < 0.40).

### Step 6 — Multi-Objective Optimization

Run a temperature sweep across the configured range (default 10–100 mK, 2 mK step). For each candidate, compute the objective score `J = w_c · (1 - C) + w_e · E_norm`, where `E_norm` is energy normalized to the maximum in the sweep. Identify the Pareto frontier — the set of non-dominated solutions where no other candidate has both higher coherence AND lower energy. Select the optimal point as the Pareto-feasible candidate with the lowest objective score.

### Step 7 — Baseline Comparison

Compute the baseline (aggressive cooling to a fixed low temperature, default 15 mK) using the same models. Compare against the optimized operating point to determine modeled energy savings `saving = (E_baseline - E_optimized) / E_baseline · 100%`, coherence delta, and risk delta.

### Step 8 — Reporting

Display results in an interactive dashboard with KPI cards, Pareto frontier visualization, temperature sweep charts, baseline-vs-optimized comparison, and an optional LLM-generated explanation of the recommendation. Persist the full experiment (including sweep results, Pareto frontier, weights, threshold, configuration snapshot, and ambient scenario) to the database for reproducibility.

## Evaluation Metrics

### Prediction Quality

- **MAE** (Mean Absolute Error) — between predicted and reference T1/T2 (when reference data is available).
- **RMSE** (Root Mean Square Error) — penalizes large prediction errors more heavily.
- **R²** (Coefficient of Determination) — fraction of variance explained by the model.

### Optimization Quality

- **Coherence constraint satisfaction** — does the optimal point meet `C ≥ C_min`?
- **Energy consumption** — absolute kWh/day of the optimized point.
- **Energy savings** — percentage reduction vs baseline.
- **Optimization objective** — the J value at the optimal point.
- **Number of feasible solutions** — count of candidates satisfying `C ≥ C_min`.
- **Pareto frontier size** — count of non-dominated candidates.

### Robustness

Performance under:
- Normal ambient conditions (~25°C)
- Hot ambient conditions (~38°C)
- Extreme heat (~46°C)
- Rapid temperature increase (+8°C over 6 hours)
- Temperature anomaly (spike +6°C above baseline)

### Statistical Reporting

For repeated experiments, report mean, median, standard deviation, and 95% confidence intervals where appropriate. Do not manufacture statistical significance — only report significance tests when enough independent samples exist to support them.

## Reproducibility

Every experiment stores:
- Model version (currently `0.1.0`)
- Quantum configuration snapshot (qubit type, frequency, target T1/T2, noise/cooling parameters)
- Input thermal dataset version (scenario, ambient temperature, observation timestamps)
- Optimization settings (weights, threshold, temperature range, step)
- Full sweep results (per-candidate T1, T2, coherence, energy, objective, feasibility)
- Pareto frontier
- Selected optimal point
- Baseline comparison
- Timestamp

Any past experiment can be loaded by ID and its full results inspected in the Results view.
