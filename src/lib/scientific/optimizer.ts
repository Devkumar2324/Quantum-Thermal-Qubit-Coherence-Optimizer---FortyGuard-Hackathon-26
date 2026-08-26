// Multi-Objective Optimizer + Pareto Frontier
// =====================================================================
// Implements two optimization approaches:
//
// APPROACH A: Constrained optimization
//   - Hard constraint: coherence >= minCoherence
//   - Among feasible points, minimize cooling energy
//
// APPROACH B: Weighted objective / Pareto optimization
//   - Minimize J = w_c * (1 - coherence) + w_e * normalized_energy
//   - Pareto frontier: points where no other point dominates
//     (lower energy AND higher coherence)
//
// The optimizer also computes a baseline comparison against a fixed
// aggressive cooling strategy (cooling to baselineTargetMK).
// =====================================================================

import {
  OptimizationRequest,
  OptimizationResult,
  SweepPoint,
  QuantumSystemConfig,
  EnvironmentalConditions,
} from "./types";
import { estimateCoherence } from "./quantum";
import { calculateCoolingPower } from "./cooling";

/**
 * Run a temperature sweep and compute objective scores.
 * Optionally accepts environmental conditions (humidity, solar, wet-bulb)
 * from the FortyGuard env_params endpoint for a more realistic cooling model.
 */
export function runTemperatureSweep(
  config: QuantumSystemConfig,
  ambientC: number,
  weights: { coherence: number; energy: number },
  minCoherence: number,
  durationHours = 24,
  environment?: EnvironmentalConditions,
): SweepPoint[] {
  const points: SweepPoint[] = [];

  // First pass: compute cooling power per temperature to find max
  const raw: Array<{
    t: number;
    coherence: ReturnType<typeof estimateCoherence>;
    coolingPower: number;
    energyKWh: number;
    cop: number;
  }> = [];

  for (
    let t = config.temperatureMinMK;
    t <= config.temperatureMaxMK + 1e-6;
    t += config.temperatureStepMK
  ) {
    const coherence = estimateCoherence(t, config);
    const { power, cop } = calculateCoolingPower(ambientC, t, config, environment);
    const energyKWh = (power * durationHours) / 1000;
    raw.push({ t, coherence, coolingPower: power, energyKWh, cop });
  }

  const maxEnergy = Math.max(...raw.map((r) => r.energyKWh), 1e-9);

  for (const r of raw) {
    const coherenceLoss = 1 - r.coherence.coherenceScore;
    const normalizedEnergy = r.energyKWh / maxEnergy;
    const objectiveScore =
      weights.coherence * coherenceLoss + weights.energy * normalizedEnergy;
    const feasible = r.coherence.coherenceScore >= minCoherence;
    points.push({
      temperatureMK: r.t,
      thermalNoise: r.coherence.thermalNoise,
      thermalPopulation: r.coherence.thermalPopulation,
      T1Microseconds: r.coherence.T1Microseconds,
      T2Microseconds: r.coherence.T2Microseconds,
      T2StarMicroseconds: r.coherence.T2StarMicroseconds,
      coherenceScore: r.coherence.coherenceScore,
      decoherenceRisk: r.coherence.decoherenceRisk,
      ambientC,
      targetMK: r.t,
      coolingPowerWatts: r.coolingPower,
      energyConsumptionKWh: r.energyKWh,
      relativeEnergy: normalizedEnergy,
      carnotEfficiency: config.coolingParams.carnotEfficiency,
      cop: r.cop,
      objectiveScore,
      feasible,
    });
  }
  return points;
}

/**
 * Identify the Pareto frontier (non-dominated solutions).
 * A point p dominates q if p has higher coherence AND lower energy.
 */
export function identifyPareto(points: SweepPoint[]): SweepPoint[] {
  const pareto: SweepPoint[] = [];
  for (const p of points) {
    const dominated = points.some(
      (q) =>
        q !== p &&
        q.coherenceScore >= p.coherenceScore &&
        q.energyConsumptionKWh <= p.energyConsumptionKWh &&
        (q.coherenceScore > p.coherenceScore ||
          q.energyConsumptionKWh < p.energyConsumptionKWh),
    );
    if (!dominated) pareto.push(p);
  }
  return pareto.sort((a, b) => a.energyConsumptionKWh - b.energyConsumptionKWh);
}

/**
 * Select the optimal point: among the Pareto frontier, the one minimizing
 * the weighted objective (Approach B). Falls back to Approach A (lowest
 * energy among feasible) if no Pareto point is feasible.
 */
export function selectOptimal(
  pareto: SweepPoint[],
  feasible: SweepPoint[],
  weights: { coherence: number; energy: number },
): SweepPoint | null {
  // Prefer Pareto + feasible intersection
  const candidates = pareto.filter((p) => p.feasible);
  const pool = candidates.length > 0 ? candidates : feasible.length > 0 ? feasible : pareto;
  if (pool.length === 0) return null;
  return pool.reduce((best, p) => (p.objectiveScore < best.objectiveScore ? p : best), pool[0]);
}

/**
 * Build the baseline (fixed aggressive cooling) point.
 */
export function buildBaseline(
  config: QuantumSystemConfig,
  ambientC: number,
  durationHours = 24,
  environment?: EnvironmentalConditions,
): SweepPoint {
  const t = config.coolingParams.baselineTargetMK;
  const coherence = estimateCoherence(t, config);
  const { power, cop } = calculateCoolingPower(ambientC, t, config, environment);
  const energyKWh = (power * durationHours) / 1000;
  return {
    temperatureMK: t,
    thermalNoise: coherence.thermalNoise,
    thermalPopulation: coherence.thermalPopulation,
    T1Microseconds: coherence.T1Microseconds,
    T2Microseconds: coherence.T2Microseconds,
    T2StarMicroseconds: coherence.T2StarMicroseconds,
    coherenceScore: coherence.coherenceScore,
    decoherenceRisk: coherence.decoherenceRisk,
    ambientC,
    targetMK: t,
    coolingPowerWatts: power,
    energyConsumptionKWh: energyKWh,
    relativeEnergy: 1,
    carnotEfficiency: config.coolingParams.carnotEfficiency,
    cop,
    objectiveScore: 1 - coherence.coherenceScore,
    feasible: coherence.coherenceScore >= config.minCoherence,
  };
}

/**
 * Run the full optimization pipeline.
 */
export function runOptimization(req: OptimizationRequest): OptimizationResult {
  const minCoherence = req.minCoherence ?? req.config.minCoherence;
  const durationHours = req.durationHours ?? 24;

  const sweep = runTemperatureSweep(
    req.config,
    req.ambientC,
    req.weights,
    minCoherence,
    durationHours,
    req.environment,
  );

  const feasible = sweep.filter((p) => p.feasible);
  const pareto = identifyPareto(sweep);
  const optimal = selectOptimal(pareto, feasible, req.weights);
  const baselinePoint = buildBaseline(
    req.config,
    req.ambientC,
    durationHours,
    req.environment,
  );

  const baselineEnergy = baselinePoint.energyConsumptionKWh;
  const optimalEnergy = optimal?.energyConsumptionKWh ?? baselineEnergy;

  const energySavingPercent =
    baselineEnergy > 0
      ? ((baselineEnergy - optimalEnergy) / baselineEnergy) * 100
      : 0;

  const coherenceDelta =
    (optimal?.coherenceScore ?? 0) - baselinePoint.coherenceScore;

  const riskOrder = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 } as const;
  const riskDelta =
    (riskOrder[optimal?.decoherenceRisk ?? "LOW"]) -
    (riskOrder[baselinePoint.decoherenceRisk]);

  const noFeasibleSolution = feasible.length === 0;

  const message = noFeasibleSolution
    ? "No operating temperature in the selected range satisfies the required coherence threshold. Consider expanding the temperature range, lowering the coherence threshold, or improving cooling assumptions."
    : `Optimal operating point identified at ${optimal?.temperatureMK.toFixed(0)} mK with coherence ${(optimal?.coherenceScore ?? 0).toFixed(3)} and modeled energy ${optimalEnergy.toFixed(2)} kWh/day.`;

  return {
    sweep,
    pareto,
    optimal,
    baseline: {
      point: baselinePoint,
      energyKWh: baselineEnergy,
      coherence: baselinePoint.coherenceScore,
    },
    metrics: {
      energySavingPercent,
      coherenceDelta,
      riskDelta,
      feasibleCount: feasible.length,
      infeasibleCount: sweep.length - feasible.length,
      paretoCount: pareto.length,
      optimizationScore: optimal?.objectiveScore ?? 1,
    },
    weights: req.weights,
    minCoherence,
    noFeasibleSolution,
    message,
  };
}
