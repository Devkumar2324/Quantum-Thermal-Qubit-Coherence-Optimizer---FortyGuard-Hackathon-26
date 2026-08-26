// Quantum Thermal / Coherence Model
// =====================================================================
// SIMULATION / RESEARCH APPROXIMATION
// All equations below are documented physics-inspired approximations.
// They are NOT measurements from real quantum hardware.
//
// Key references (conceptual):
//   - Bose-Einstein distribution for thermal population of harmonic modes
//     n_bar(T) = 1 / (exp(hbar*omega / k_B*T) - 1)
//   - Orzalem et al., "Decoherence in superconducting qubits" (review)
//   - Krantz et al., "A quantum engineer's guide to superconducting qubits",
//     Applied Physics Reviews 6, 021318 (2019)
//   - Clerk et al., "Introduction to quantum noise, measurement, and amplification"
//
// The model is intentionally modular so each piece may be replaced
// later with a more accurate, hardware-calibrated implementation.
// =====================================================================

import {
  CoherenceEstimate,
  QuantumSystemConfig,
} from "./types";

const H_BAR = 1.054571817e-34;     // J·s
const K_B = 1.380649e-23;          // J/K
const E = Math.E;

/** milliKelvin -> Kelvin */
export function mkToK(mk: number): number {
  return mk / 1000;
}

/**
 * Bose-Einstein thermal photon occupation at qubit frequency.
 * n_bar = 1 / (exp(hbar*omega / k_B*T) - 1)
 */
export function thermalPopulation(
  temperatureMK: number,
  qubitFrequencyGHz: number,
): number {
  const T = Math.max(1e-9, mkToK(temperatureMK));
  const omega = 2 * Math.PI * qubitFrequencyGHz * 1e9; // rad/s
  const exponent = (H_BAR * omega) / (K_B * T);
  // Guard against overflow for very low T
  if (exponent > 700) return 0;
  return 1 / (Math.exp(exponent) - 1);
}

/**
 * Normalized thermal noise score 0..1.
 * Combines thermal population with charge/flux noise and photon shot noise.
 *
 * SIMULATION / RESEARCH APPROXIMATION:
 * - At T << hbar*omega/k_B (very cold), n_bar ~ 0, thermal noise is dominated
 *   by residual impurity and photon shot noise.
 * - At T ~ hbar*omega/k_B, n_bar grows and thermal population noise dominates.
 * - At T >> hbar*omega/k_B, noise saturates to ~1.
 */
export function calculateThermalNoise(
  temperatureMK: number,
  config: QuantumSystemConfig,
): number {
  const nBar = thermalPopulation(temperatureMK, config.qubitFrequencyGHz);
  // Thermal photon noise: saturates as n_bar grows
  const thermalComponent = 1 - Math.exp(-nBar * 2);
  // Photon shot noise (calibrated to remain small)
  const photon = Math.min(1, config.noiseParams.photonOccupation * (1 + temperatureMK / 50));
  // 1/f flux noise: scales weakly (log) with T, small magnitude
  const flux = Math.min(0.3,
    config.noiseParams.fluxNoiseAmplitude * 1e6 * Math.log10(1 + temperatureMK));
  // Charge noise: scales with sqrt(T)
  const charge = Math.min(0.3,
    config.noiseParams.chargeNoiseFactor * 5 * Math.sqrt(temperatureMK / 20));

  // Weighted combination
  const raw =
    0.45 * thermalComponent +
    0.20 * photon +
    0.20 * flux +
    0.15 * charge;
  return Math.max(0, Math.min(1, raw));
}

/**
 * Estimate T1 (energy relaxation time).
 *
 * SIMULATION MODEL:
 *   T1(T) = T1_ref * exp(alpha * (T_ref - T)/T_ref) / (1 + gamma*n_bar(T))
 *
 * At very low T (n_bar ~ 0), T1 approaches an idealized T1_ref.
 * At higher T, thermal population drives Purcell-like decay channels.
 */
export function estimateT1(
  temperatureMK: number,
  config: QuantumSystemConfig,
): number {
  const T_ref = 20; // mK reference
  const T1_ref = config.targetT1Microseconds;
  const alpha = 0.6; // sensitivity exponent
  const gamma = 8.0; // Purcell-like coupling
  const nBar = thermalPopulation(temperatureMK, config.qubitFrequencyGHz);
  const thermalFactor = Math.exp((alpha * (T_ref - temperatureMK)) / T_ref);
  const t1 = (T1_ref * thermalFactor) / (1 + gamma * nBar);
  return Math.max(0.1, t1);
}

/**
 * Estimate T2 (Ramsey dephasing time).
 * SIMULATION MODEL:
 *   1/T2 = 1/(2*T1) + 1/T_phi
 *   T_phi(T) = T_phi_ref / (1 + eta*thermalNoise(T))
 *   T_phi_effective = 1 / (1/T_phi + impurityRate*thermalNoise)
 *
 * At low T (thermalNoise → 0), T_phi_effective → T_phi_ref, giving high T2.
 * At high T, thermal noise drives T_phi down and impurity contribution grows.
 */
export function estimateT2(
  temperatureMK: number,
  config: QuantumSystemConfig,
): number {
  const T1 = estimateT1(temperatureMK, config);
  const thermalNoise = calculateThermalNoise(temperatureMK, config);
  // T_phi_ref is anchored at ~3x target T2 to ensure T2 approaches target at low T
  const T_phi_ref = config.targetT2Microseconds * 3;
  const eta = 4.0;
  const T_phi = T_phi_ref / (1 + eta * thermalNoise);
  // Impurity dephasing contribution scales with thermal noise
  const impurityContribution =
    (config.noiseParams.impurityDephasingRate * thermalNoise) / 1e6;
  const T_phi_effective = 1 / (1 / T_phi + impurityContribution);
  const T2 = 1 / (1 / (2 * T1) + 1 / T_phi_effective);
  return Math.max(0.05, T2);
}

/**
 * T2* includes inhomogeneous broadening.
 * SIMULATION MODEL: T2* = T2 / (1 + xi * sqrt(thermalNoise))
 */
export function estimateT2Star(
  temperatureMK: number,
  config: QuantumSystemConfig,
): number {
  const T2 = estimateT2(temperatureMK, config);
  const thermalNoise = calculateThermalNoise(temperatureMK, config);
  const xi = 1.5;
  return T2 / (1 + xi * Math.sqrt(thermalNoise));
}

/**
 * Coherence score 0..1 - normalized operational metric.
 *
 * SIMULATION MODEL:
 *   coherence = clip(0.05 + 0.95 * normalizedT2 * (1 - 0.4*thermalNoise), 0, 1)
 *
 * - Normalized T2 ratio: 0 at T2_min, 1 at T2_max (target).
 * - Thermal noise penalty: up to 40% reduction at maximum noise.
 * - Floor of 0.05 ensures non-zero baseline.
 *
 * At very low T (n_bar ~ 0, low noise), coherence approaches 1.
 * At high T (n_bar large, noise saturated), coherence drops to floor.
 */
export function calculateCoherence(
  temperatureMK: number,
  config: QuantumSystemConfig,
): number {
  const T2 = estimateT2(temperatureMK, config);
  const T2_max = config.targetT2Microseconds;
  const T2_min = 5; // microseconds, assumed minimum viable
  const normalizedT2 = Math.max(0, Math.min(1, (T2 - T2_min) / (T2_max - T2_min)));
  const thermalNoise = calculateThermalNoise(temperatureMK, config);
  const raw = 0.05 + 0.95 * normalizedT2 * (1 - 0.4 * thermalNoise);
  return Math.max(0, Math.min(1, raw));
}

/**
 * Decoherence risk classification based on coherence score.
 */
export function calculateRisk(
  coherence: number,
): CoherenceEstimate["decoherenceRisk"] {
  if (coherence >= 0.85) return "LOW";
  if (coherence >= 0.65) return "MEDIUM";
  if (coherence >= 0.4) return "HIGH";
  return "CRITICAL";
}

/**
 * Full coherence estimate for a given operating temperature.
 */
export function estimateCoherence(
  temperatureMK: number,
  config: QuantumSystemConfig,
): CoherenceEstimate {
  const thermalNoise = calculateThermalNoise(temperatureMK, config);
  const thermalPopulationN = thermalPopulation(temperatureMK, config.qubitFrequencyGHz);
  const T1 = estimateT1(temperatureMK, config);
  const T2 = estimateT2(temperatureMK, config);
  const T2Star = estimateT2Star(temperatureMK, config);
  const coherenceScore = calculateCoherence(temperatureMK, config);
  const decoherenceRisk = calculateRisk(coherenceScore);
  return {
    temperatureMK,
    thermalNoise,
    thermalPopulation: thermalPopulationN,
    T1Microseconds: T1,
    T2Microseconds: T2,
    T2StarMicroseconds: T2Star,
    coherenceScore,
    decoherenceRisk,
  };
}
