# Scientific Model

## Overview

This document provides the complete mathematical specification of the physics-inspired simulation model used by the Quantum-Thermal Qubit Coherence Optimizer. Every equation is documented with its physical motivation, assumptions, and limitations.

**All values produced by this model are SIMULATION / RESEARCH APPROXIMATION.**

## Constants

| Constant | Symbol | Value | Unit |
|----------|--------|-------|------|
| Reduced Planck constant | ℏ | 1.054571817 × 10⁻³⁴ | J·s |
| Boltzmann constant | k_B | 1.380649 × 10⁻²³ | J/K |
| Kelvin offset | — | 273.15 | — |

## Unit Conversions

```
T(K) = T(°C) + 273.15
T(K) = T(mK) / 1000
T(mK) = T(K) × 1000
```

## 1. Thermal Population Model

### Bose-Einstein Distribution

For a qubit with transition frequency `ω_q = 2π · f_qubit` (rad/s) at temperature `T` (Kelvin), the thermal photon occupation is:

```
n̄(T) = 1 / (exp(ℏω / k_B·T) - 1)
```

**Implementation**: `src/lib/scientific/quantum.ts:thermalPopulation()`

**Assumptions**:
- The qubit mode is in thermal equilibrium with a bosonic bath.
- The two-level approximation holds (`k_B·T ≪ ℏω` for the validity of the truncation).
- For a 5 GHz qubit at 20 mK: `ℏω/k_B ≈ 240 mK ≫ T = 20 mK`, so `n̄ ≈ exp(-12) ≈ 6 × 10⁻⁶` (essentially zero).

**At higher temperatures**:
- At 100 mK with 5 GHz qubit: `n̄ ≈ exp(-2.4) ≈ 0.09`
- At 200 mK: `n̄ ≈ 0.46`
- At 500 mK: `n̄ ≈ 5.4`

## 2. Thermal Noise Model

The normalized thermal noise score `N_th ∈ [0, 1]` combines four noise channels:

```
N_th = 0.45 · N_thermal + 0.20 · N_photon + 0.20 · N_flux + 0.15 · N_charge
```

where:

### N_thermal: Bose-Einstein Saturation
```
N_thermal = 1 - exp(-n̄ · 2)
```
Saturates to 1 as `n̄` grows large. At low T (n̄ → 0), this term vanishes.

### N_photon: Photon Shot Noise
```
N_photon = min(1, photon_occupation · (1 + T/50))
```
Scales linearly with temperature above the 50 mK reference. Default `photon_occupation = 0.1`.

### N_flux: 1/f Flux Noise
```
N_flux = min(0.3, flux_amplitude · 10⁶ · log10(1 + T))
```
Logarithmic temperature dependence. Capped at 0.3. Default `flux_amplitude = 10⁻⁶`.

### N_charge: Charge Noise
```
N_charge = min(0.3, charge_factor · 5 · √(T/20))
```
Square-root temperature dependence. Capped at 0.3. Default `charge_factor = 0.02`.

**Implementation**: `src/lib/scientific/quantum.ts:calculateThermalNoise()`

## 3. T1 Estimation (Energy Relaxation)

T1 is modeled as a Purcell-coupled decay enhanced by thermal photon population:

```
T1(T) = T1_ref · exp(α · (T_ref - T) / T_ref) / (1 + γ · n̄(T))
```

where:
- `T1_ref = target_T1 = 100 µs` (configurable)
- `T_ref = 20 mK` (reference temperature)
- `α = 0.6` (temperature sensitivity exponent)
- `γ = 8.0` (Purcell coupling strength)
- `n̄(T)` is the Bose-Einstein thermal population

**Behavior**:
- At T ≪ T_ref: `exp(α·(T_ref-T)/T_ref) > 1` → T1 exceeds reference (improvement)
- At T = T_ref: `exp(0) = 1` → T1 = T1_ref (by definition)
- At T > T_ref: exponential factor decreases AND `n̄` grows → T1 drops rapidly

**Floor**: T1 is clamped to a minimum of 0.1 µs to prevent division-by-zero artifacts.

**Implementation**: `src/lib/scientific/quantum.ts:estimateT1()`

## 4. T2 Estimation (Ramsey Dephasing)

T2 is computed via the standard relationship:

```
1/T2 = 1/(2·T1) + 1/T_phi_effective
```

where the pure dephasing time `T_phi_effective` is:

```
T_phi = T_phi_ref / (1 + η · N_th)
T_phi_effective = 1 / (1/T_phi + impurity_rate · N_th / 10⁶)
```

with:
- `T_phi_ref = 3 · target_T2 = 240 µs` (anchor at low T)
- `η = 4.0` (dephasing sensitivity)
- `impurity_rate = 1000 s⁻¹` (baseline material impurity)
- `N_th` is the normalized thermal noise score

**Behavior**:
- At low T (N_th → 0): `T_phi → T_phi_ref`, so `T2 ≈ 1/(1/(2·T1) + 1/T_phi_ref) ≈ T_phi_ref` when T1 is large.
- At high T (N_th → 1): `T_phi` shrinks 5×, and impurity contribution grows.

**Floor**: T2 is clamped to a minimum of 0.05 µs.

**Implementation**: `src/lib/scientific/quantum.ts:estimateT2()`

## 5. T2* Estimation (Inhomogeneous Broadening)

T2* includes inhomogeneous broadening from quasi-static noise:

```
T2*(T) = T2(T) / (1 + ξ · √N_th)
```

where `ξ = 1.5` is the inhomogeneous broadening factor.

**Implementation**: `src/lib/scientific/quantum.ts:estimateT2Star()`

## 6. Coherence Score

The coherence score is a derived operational metric in [0, 1]:

```
C(T) = clip(0.05 + 0.95 · norm_T2 · (1 - 0.4 · N_th), 0, 1)
```

where:
```
norm_T2 = clip((T2 - T2_min) / (T2_max - T2_min), 0, 1)
T2_min = 5 µs
T2_max = target_T2 = 80 µs
```

**Behavior**:
- At low T: `norm_T2 ≈ 1`, `N_th ≈ 0.1` → `C ≈ 0.05 + 0.95·1·0.96 ≈ 0.96`
- At high T: `norm_T2 → 0`, `N_th → 1` → `C ≈ 0.05 + 0.95·0·0.6 ≈ 0.05`

**Floor of 0.05** ensures non-zero baseline even at extreme temperatures.

**This is NOT a directly measurable quantity.** It is a research metric intended to capture operational quality. It should never be presented as a hardware-measured value.

**Implementation**: `src/lib/scientific/quantum.ts:calculateCoherence()`

## 7. Decoherence Risk Classification

| Coherence Score | Risk Level | Operational Meaning |
|-----------------|------------|---------------------|
| C ≥ 0.85 | LOW | Qubit suitable for high-fidelity operations |
| 0.65 ≤ C < 0.85 | MEDIUM | Qubit usable with error mitigation |
| 0.40 ≤ C < 0.65 | HIGH | Qubit marginal; only short circuits feasible |
| C < 0.40 | CRITICAL | Qubit unsuitable for useful computation |

**Implementation**: `src/lib/scientific/quantum.ts:calculateRisk()`

## 8. Cooling Power Model

Cooling power is computed via the Carnot efficiency approximation:

```
T_cold = T(mK) / 1000  (in Kelvin)
T_hot = T(°C) + 273.15  (in Kelvin)
ΔT = max(0.001, T_hot - T_cold)

COP_carnot = T_cold / ΔT
COP_real = η · COP_carnot
Q_load = base_heat_load + thermal_conductance · ΔT
P_carnot = Q_load / COP_real
P_total = P_baseline + P_carnot
```

with defaults:
- `η = 0.12` (Carnot efficiency fraction)
- `base_heat_load = 0.05 W`
- `thermal_conductance = 0.001 W/K`
- `P_baseline = 1500 W` (compressor/circulator overhead)

**Behavior**:
- At T_cold = 20 mK, T_hot = 298 K: `COP_carnot = 0.020/298 ≈ 6.7×10⁻⁵`, `COP_real ≈ 8×10⁻⁶`. Heat load `Q ≈ 0.35 W`. Carnot power `P_carnot ≈ 44 kW`. Total power `P ≈ 45.5 kW`. Daily energy `E ≈ 1092 kWh`.
- At T_cold = 50 mK, T_hot = 298 K: `COP_carnot ≈ 1.7×10⁻⁴`, `COP_real ≈ 2×10⁻⁵`. Carnot power `P_carnot ≈ 17.5 kW`. Total `P ≈ 19 kW`. Daily `E ≈ 456 kWh`.

This produces physically reasonable energy scales for cryogenic systems.

**Implementation**: `src/lib/scientific/cooling.ts:calculateCoolingPower()`

## 9. Cooling Energy

```
E(daily) = (P_total · 24) / 1000  (kWh/day)
```

**Implementation**: `src/lib/scientific/cooling.ts:calculateEnergyConsumption()`

## 10. Multi-Objective Optimization

### Objective Function

```
J = w_c · (1 - C) + w_e · E_norm
```

where:
- `w_c + w_e = 1` (weights)
- `C` is the coherence score
- `E_norm = E / max(E across sweep)` is the normalized energy

### Feasibility Constraint

A candidate operating point is **feasible** if `C ≥ C_min` where `C_min` is the minimum coherence threshold (default 0.85).

### Pareto Frontier Identification

A point `p` dominates `q` if:
```
p.coherence ≥ q.coherence AND p.energy ≤ q.energy
AND (p.coherence > q.coherence OR p.energy < q.energy)
```

The Pareto frontier is the set of all non-dominated points.

### Optimal Selection

1. Filter Pareto frontier to feasible points (`C ≥ C_min`).
2. If any feasible Pareto points exist, select the one with minimum `J`.
3. Otherwise, fall back to feasible points (if any) or all Pareto points.
4. If no feasible points exist, return "no feasible solution" with guidance.

**Implementation**: `src/lib/scientific/optimizer.ts:runOptimization()`

## 11. Baseline Comparison

The baseline strategy cools to a fixed low temperature (`baseline_target_MK = 15 mK`) representing aggressive conventional cooling.

```
saving_percent = (E_baseline - E_optimized) / E_baseline · 100
coherence_delta = C_optimized - C_baseline
risk_delta = risk_level(optimal) - risk_level(baseline)
```

**Implementation**: `src/lib/scientific/optimizer.ts:buildBaseline()`

## Model Validation

The model has been verified to produce physically reasonable behavior:

| T (mK) | Coherence | T1 (µs) | T2 (µs) | Risk |
|--------|-----------|---------|---------|------|
| 10 | 96.4% | 135.0 | 104.8 | LOW |
| 20 | 96.1% | 100.0 | 91.0 | LOW |
| 30 | 92.9% | 73.9 | 77.6 | LOW |
| 40 | 76.4% | 53.8 | 64.2 | MEDIUM |
| 50 | 60.2% | 38.1 | 51.0 | HIGH |
| 60 | 45.2% | 26.2 | 38.7 | HIGH |
| 70 | 32.4% | 17.6 | 28.2 | CRITICAL |
| 80 | 22.4% | 11.6 | 19.8 | CRITICAL |
| 90 | 15.1% | 7.7 | 13.7 | CRITICAL |
| 100 | 9.9% | 5.0 | 9.3 | CRITICAL |

**Default optimization result** (25°C ambient, w_c=0.7, w_e=0.3, C_min=0.85):
- Optimal: T = 28 mK, C = 95.9%, E = 772 kWh/day, savings = 45.2% vs baseline (1409 kWh/day)
- 13 feasible solutions out of 46 candidates
