# Limitations & Scientific Honesty

## Core Principle

This system is a **research and simulation framework**, not a control system for real quantum hardware. All numerical outputs are model-derived approximations, not measurements. The application is designed to investigate research questions about the trade-off between coherence and cooling energy — it does not claim to provide operationally valid settings for any specific quantum computer.

## Data Source Classification

The application clearly distinguishes three categories of data:

### REAL DATA
- **FortyGuard temperature API observations** — when `FORTYGUARD_API_KEY` is configured, ambient temperature readings are retrieved from the live FortyGuard API. These observations represent environmental temperature (e.g., datacenter room temperature), NOT the physical temperature of any qubit.

### SIMULATED DATA
- **Quantum system parameters** — qubit count, frequency, target T1/T2, noise parameters, cooling parameters. These are configurable research inputs, not measurements from a specific device.
- **Synthetic thermal data** — when the FortyGuard API is unavailable, thermal observations are generated from documented scenario presets using a seeded pseudo-random generator. Synthetic data is always labeled with `source: "synthetic"`.
- **T1, T2, T2* estimates** — produced by the physics-inspired simulation model, not measured from hardware.
- **Coherence score** — a derived operational metric, not a directly measurable quantity.
- **Cooling energy** — produced by the Carnot-efficiency approximation model, not measured from a real cryostat.

### MODEL OUTPUT
- **Predicted coherence** at a candidate operating temperature.
- **Estimated cooling energy** at a candidate operating temperature.
- **Optimized operating temperature** — the output of the multi-objective optimizer.
- **Energy savings** — comparison between optimized and baseline modeled energy.
- **Pareto frontier** — set of non-dominated (coherence, energy) trade-off points.

## Specific Limitations

### L1: Bose-Einstein Approximation

The thermal population model uses the Bose-Einstein distribution, which assumes the qubit mode is in thermal equilibrium with a bosonic bath. Real superconducting qubits are coupled to multiple baths (resonator, transmission line, two-level system defects) with non-thermal spectra. The Bose-Einstein model is the standard first-order approximation in the literature but does not capture all the physics.

### L2: Two-Level System Approximation

The qubit is modeled as a perfect two-level system. Real superconducting qubits (transmons) are weakly anharmonic oscillators with higher levels (|2⟩, |3⟩, ...). The two-level approximation is valid when `k_B·T ≪ ℏ·ω_anharmonicity`, which holds at typical operating temperatures but breaks down at higher temperatures.

### L3: Simplified T1 Model

The T1 model `T1(T) = T1_ref · exp(α·(T_ref - T)/T_ref) / (1 + γ·n̄(T))` captures the dominant temperature dependence (quasiparticle density and Purcell decay) but omits:
- Quasiparticle bursts and recombination dynamics
- Dielectric loss with non-monotonic temperature dependence
- Surface two-level system defects with complex spectra
- Photon-assisted quasiparticle generation

A hardware-calibrated T1 model would replace this with measured data or a more sophisticated microscopic model.

### L4: Simplified T_phi Model

The pure dephasing model `T_phi(T) = T_phi_ref / (1 + η·N_th)` captures the gross temperature dependence but omits:
- 1/f noise spectral density with non-trivial temperature scaling
- Critical current noise
- Surface flux noise with geometric dependence
- Non-Markovian dephasing dynamics

### L5: Coherence Score is Derived

The coherence score `C = clip(0.05 + 0.95·norm_T2·(1 - 0.4·N_th), 0, 1)` is a derived operational metric, not a directly measurable quantity. It should not be presented as a hardware-measured fidelity, gate fidelity, or state fidelity. It is intended to provide a single scalar for optimization comparison.

### L6: Carnot Cooling Approximation

The cooling model uses the Carnot efficiency limit scaled by a realistic efficiency fraction. Real dilution refrigerators have:
- Multiple cooling stages with different efficiencies
- Non-ideal heat exchangers
- Mixing chamber, still, and continuous circulation losses
- Pulse tube cooler for the 50K and 4K stages

The Carnot approximation provides correct scaling but not absolute accuracy. Real cryogenic energy consumption is typically 2–5× higher than the Carnot limit suggests.

### L7: Baseline Strategy Simplification

The baseline (aggressive cooling to 15 mK) is a simplification. Real quantum computing facilities may use different baseline strategies (e.g., 20 mK with adaptive pulse tube cooling). The baseline is configurable but should not be interpreted as a universal industry standard.

### L8: Ambient ≠ Qubit Temperature

The ambient temperature from FortyGuard is the environmental temperature. The qubit operating temperature is a separate controlled variable. The application explicitly does NOT claim that ambient temperature directly equals qubit temperature. The relationship between them is mediated by the cooling model.

### L9: No Real Hardware Validation

The model has not been validated against any specific quantum hardware. The default parameters are calibrated to produce physically reasonable values consistent with published literature on superconducting qubits, but they are not device-specific. Any deployment to real hardware would require model calibration against measured T1, T2, and coherence data.

### L10: LLM Agent Cannot Perform Math

The AI Thermal Agent uses a large language model (via the z-ai-web-dev-sdk) for explanation and interpretation only. The LLM is explicitly prohibited from performing mathematical optimization, numerical computation, or constraint checking. All numerical results come from deterministic scientific code. The LLM's role is to translate numerical results into natural language and recommend next actions — never to compute the results themselves.

### L11: No Statistical Significance Claims

The application does not perform statistical significance testing by default. Repeated experiments may show variation due to scenario randomness, but the system does not claim statistical significance for any observed difference. Users who need significance testing should run controlled batches and apply appropriate statistical tests externally.

### L12: Single-Process Architecture

The application runs as a single Next.js process. It is not designed for high-throughput production workloads, multi-tenant access, or real-time control of physical hardware. The architecture is intentionally simple for the hackathon prototype.

## Wording Standards

To maintain scientific honesty, the application uses specific wording:

| Use | Do NOT Use |
|-----|-----------|
| "modeled energy savings" | "actual energy savings" |
| "predicted coherence" | "measured coherence" |
| "estimated T1" | "measured T1" |
| "modeled cooling energy" | "actual quantum computer energy" |
| "simulation / research approximation" | (no qualifier) |
| "FortyGuard temperature data" | "qubit temperature data" |
| "recommended operating point" | "optimal hardware setting" |

## Safety Boundaries

- The LLM agent never issues commands to physical hardware.
- Agent actions are logged recommendations only.
- If a real hardware integration is ever added, it must require human approval and safety constraints (not present in this prototype).
- The system does not execute arbitrary user-provided code.
- The system does not dynamically evaluate LLM-generated mathematical expressions.

## What This System Is

> "An AI/physics-based research and simulation framework for temperature-aware quantum-system optimization."

## What This System Is Not

- A control system for real quantum hardware.
- A claim that the model is calibrated to any specific device.
- A claim that the optimized temperature should be used on real hardware without validation.
- A claim that energy savings will materialize in practice without measurement.
- An official FortyGuard quantum-computing use case.

## Final Message

The final application communicates:

> "Quantum-Thermal Coherence Optimizer transforms temperature intelligence into a quantum-system thermal optimization problem. It predicts temperature-dependent coherence behavior and identifies operating conditions that satisfy a target coherence level while minimizing modeled cooling energy."

It does NOT describe the project as a proven method for controlling real quantum hardware.
