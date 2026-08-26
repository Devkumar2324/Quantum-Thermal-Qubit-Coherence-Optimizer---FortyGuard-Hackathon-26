# Model Assumptions

## Important Disclaimer

**All values produced by this system are SIMULATION / RESEARCH APPROXIMATION unless explicitly labeled otherwise.**

This is **not** a claim that ambient temperature directly equals the physical temperature of a qubit. The system clearly distinguishes:

```
Ambient/environmental temperature (FortyGuard)
        ↓
Thermal management / cooling model (Carnot approximation)
        ↓
Estimated quantum operating conditions (qubit temperature in mK)
        ↓
Quantum thermal/noise model (Bose-Einstein, Purcell, dephasing)
        ↓
Coherence prediction (T1, T2, T2*, score)
```

## Quantum System Assumptions

### A1: Two-Level System Approximation

The qubit is modeled as a two-level system (|0⟩, |1⟩) with transition frequency ω_q = 2π · f_qubit. Real superconducting qubits are weakly anharmonic oscillators — the two-level approximation is valid when `k_B · T ≪ ℏ · ω_q` and the anharmonicity is large compared to the linewidth. For a 5 GHz transmon at 20 mK, `ℏω/k_B ≈ 240 mK ≫ T`, so the approximation holds.

### A2: Bose-Einstein Thermal Population

The thermal photon occupation of the qubit mode is approximated by the Bose-Einstein distribution:

```
n̄(T) = 1 / (exp(ℏω / k_B·T) - 1)
```

This assumes the qubit mode is in thermal equilibrium with a bosonic bath. In reality, the qubit is coupled to multiple baths (resonator, transmission line, two-level system defects) with non-thermal spectra. The Bose-Einstein model is the standard first-order approximation in the literature.

### A3: Purcell-Coupled T1 Decay

T1 (energy relaxation time) is modeled as:

```
T1(T) = T1_ref · exp(α · (T_ref - T) / T_ref) / (1 + γ · n̄(T))
```

where:
- `T1_ref` is the reference T1 at `T_ref = 20 mK` (configurable, default 100 µs)
- `α = 0.6` is the temperature sensitivity exponent
- `γ = 8.0` is the Purcell-like coupling strength

The exponential factor captures the temperature dependence of quasiparticle density in superconducting circuits. The `1 + γ·n̄` factor captures Purcell decay enhanced by thermal photon population. Real devices exhibit more complex behavior (e.g., quasiparticle bursts, dielectric loss), but this is a reasonable first-order model.

### A4: Dephasing Model

T2 (Ramsey dephasing time) is modeled via:

```
1/T2 = 1/(2·T1) + 1/T_phi
T_phi(T) = T_phi_ref / (1 + η · N_th)
T_phi_effective = 1 / (1/T_phi + impurity_rate · N_th)
```

where:
- `T_phi_ref = 3 · target_T2` (anchor at low temperature)
- `η = 4.0` is the dephasing sensitivity to thermal noise
- `N_th` is the normalized thermal noise score (0..1)
- `impurity_rate = 1000 s⁻¹` is the baseline material impurity dephasing rate

T2* (inhomogeneous broadening) is `T2* = T2 / (1 + ξ · √N_th)` with `ξ = 1.5`.

### A5: Coherence Score Definition

The coherence score is a normalized operational metric:

```
C = clip(0.05 + 0.95 · normalized_T2 · (1 - 0.4 · N_th), 0, 1)
```

where `normalized_T2 = (T2 - T2_min) / (T2_max - T2_min)` with `T2_min = 5 µs` (assumed minimum viable) and `T2_max = target_T2`. The thermal noise penalty reduces coherence by up to 40% at maximum noise. The 0.05 floor ensures non-zero baseline.

This is **not** a directly measurable quantity — it is a derived research metric intended to capture the operational quality of the qubit state. It should not be presented as a hardware-measured value.

### A6: Decoherence Risk Classification

| Coherence Score | Risk Level |
|-----------------|------------|
| C ≥ 0.85 | LOW |
| 0.65 ≤ C < 0.85 | MEDIUM |
| 0.40 ≤ C < 0.65 | HIGH |
| C < 0.40 | CRITICAL |

These thresholds are configurable and represent operational risk levels, not physical phase transitions.

## Noise Model Assumptions

### N1: Thermal Noise Composition

The normalized thermal noise score combines four components:

```
N_th = 0.45 · thermal_component + 0.20 · photon + 0.20 · flux + 0.15 · charge
```

where:
- `thermal_component = 1 - exp(-n̄ · 2)` — saturating Bose-Einstein contribution
- `photon = min(1, photon_occupation · (1 + T/50))` — photon shot noise
- `flux = min(0.3, flux_amplitude · 10⁶ · log10(1 + T))` — 1/f flux noise
- `charge = min(0.3, charge_factor · 5 · √(T/20))` — charge noise

The weighting coefficients are heuristic and reflect the relative importance of each noise channel in typical superconducting qubit systems.

### N2: 1/f Flux Noise

The flux noise amplitude is calibrated to typical values for superconducting qubits (~10⁻⁶ Φ₀/√Hz). The logarithmic temperature dependence captures the weak coupling of flux noise to thermal fluctuations.

### N3: Charge Noise

Charge noise scales with √T, reflecting the thermal activation of charge fluctuators in the dielectric environment. This is a simplified model; real charge noise exhibits complex non-monotonic temperature dependence.

## Cooling Model Assumptions

### C1: Carnot Efficiency Approximation

The cooling system is modeled using the Carnot efficiency limit, scaled by a realistic efficiency fraction:

```
COP_carnot = T_cold / (T_hot - T_cold)
COP_real = η · COP_carnot
P_cooling = Q_load / COP_real + P_baseline
```

where:
- `T_cold` is the qubit operating temperature (K)
- `T_hot` is the ambient temperature (K)
- `η = 0.12` is the Carnot efficiency fraction (real cryogenic systems achieve 5–20%)
- `Q_load = base_heat_load + conductance · ΔT` is the heat load
- `P_baseline = 1500 W` is the compressor/circulator overhead

This is a first-order model. Real dilution refrigerators have complex multi-stage behavior with different efficiencies at each temperature stage.

### C2: Baseline Aggressive Cooling

The baseline strategy cools to a fixed low temperature (`baseline_target_MK = 15 mK` by default) regardless of coherence requirements. This represents the conventional "colder is always better" assumption that the optimizer is designed to challenge.

## Thermal Data Assumptions

### T1: Ambient ≠ Qubit Temperature

The ambient temperature from FortyGuard is the **environmental** temperature (e.g., datacenter room temperature). It is **not** the physical temperature of any qubit. The cooling model converts ambient temperature into a cooling requirement; the qubit operating temperature is a separate controlled variable.

### T2: Synthetic Data Generation

When the FortyGuard API is unavailable, synthetic thermal data is generated using a seeded pseudo-random generator with documented scenario presets:
- **Normal**: 25°C base, ±1.5°C volatility, diurnal cycle
- **Hot**: 38°C base, ±2.0°C volatility
- **Extreme Heat**: 46°C base, ±3.0°C volatility
- **Rapid Increase**: 32°C base, +1.2°C/h trend
- **Temperature Anomaly**: 33°C base, ±4.0°C volatility

Synthetic data is always labeled with `source: "synthetic"` and never presented as real FortyGuard data.

## Model Replacement Strategy

Every model component is intentionally modular and replaceable. The system is designed so that any individual component (e.g., the T1 model, the cooling model, the forecasting model) can be replaced with a hardware-calibrated implementation without touching the rest of the system. The interfaces are defined in `src/lib/scientific/types.ts` and the implementations are isolated in separate files.

## References (Conceptual)

The following references informed the model design. They are cited for conceptual grounding only — the specific equations used here are simplified research approximations, not direct quotations.

- Krantz, P. et al. "A quantum engineer's guide to superconducting qubits." *Applied Physics Reviews* 6, 021318 (2019).
- Clerk, A. A. et al. "Introduction to quantum noise, measurement, and amplification." *Reviews of Modern Physics* 82, 1155 (2010).
- Pobell, F. *Matter and Methods at Low Temperatures*. Springer (2007).
- Carnot, S. *Reflections on the Motive Power of Fire*. (1824).
- Orzarem, C. et al. "Decoherence in superconducting qubits." (review).
