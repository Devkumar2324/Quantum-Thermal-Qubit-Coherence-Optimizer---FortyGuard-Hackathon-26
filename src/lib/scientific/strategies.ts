// Three-Strategy Comparison Engine
// =====================================================================
// The centerpiece research contribution:
//   Strategy A — Fixed:        Always cool to a fixed low temperature.
//   Strategy B — Reactive:     Re-optimize based on current ambient temp.
//   Strategy C — Predictive:   Use forecast to pre-optimize before heat arrives.
//
// Each strategy is evaluated over the same forecast window (default 12h).
// Energy consumption, coherence, and constraint violations are accumulated
// per hour, then compared.
//
// The Predictive strategy is expected to achieve the lowest modeled energy
// because it can choose a less aggressive operating point in anticipation
// of future cooling load — without violating the coherence constraint.
// =====================================================================

import {
  QuantumSystemConfig,
  EnvironmentalConditions,
  Strategy,
  StrategyResult,
  StrategyStep,
  StrategyComparison,
  ThermalObservation,
} from "./types";
import { runOptimization } from "./optimizer";
import { calculateCoolingPower } from "./cooling";
import { estimateCoherence } from "./quantum";

/**
 * Run the Fixed strategy.
 * Always cool to baselineTargetMK regardless of ambient or forecast.
 */
export function runFixedStrategy(
  config: QuantumSystemConfig,
  observations: ThermalObservation[],
  minCoherence: number,
): StrategyResult {
  const steps: StrategyStep[] = [];
  const targetMK = config.coolingParams.baselineTargetMK;

  for (let i = 0; i < observations.length; i++) {
    const obs = observations[i];
    const env = obs.environment;
    const coherence = estimateCoherence(targetMK, config);
    const { power } = calculateCoolingPower(
      obs.temperatureC,
      targetMK,
      config,
      env,
    );
    const energyKWh = (power * 1) / 1000; // 1 hour
    const feasible = coherence.coherenceScore >= minCoherence;
    steps.push({
      hour: i,
      timestamp: obs.timestamp,
      ambientC: obs.temperatureC,
      environment: env,
      selectedTempMK: targetMK,
      coherence: coherence.coherenceScore,
      coolingEnergyKWh: energyKWh,
      feasible,
      constraintViolated: !feasible,
    });
  }

  return summarize(steps, "fixed", config, observations);
}

/**
 * Run the Reactive strategy.
 * At each hour, run the optimizer on the CURRENT ambient and pick the optimal point.
 */
export function runReactiveStrategy(
  config: QuantumSystemConfig,
  observations: ThermalObservation[],
  weights: { coherence: number; energy: number },
  minCoherence: number,
): StrategyResult {
  const steps: StrategyStep[] = [];

  for (let i = 0; i < observations.length; i++) {
    const obs = observations[i];
    const result = runOptimization({
      config,
      ambientC: obs.temperatureC,
      weights,
      minCoherence,
      durationHours: 1,
      environment: obs.environment,
    });
    const opt = result.optimal;
    // If no feasible solution, fall back to baseline target (constraint violation logged)
    const selectedTempMK = opt?.temperatureMK ?? config.coolingParams.baselineTargetMK;
    const coherence = opt?.coherenceScore ?? result.baseline.point.coherenceScore;
    const energyKWh = opt?.energyConsumptionKWh ?? result.baseline.energyKWh;
    const feasible = coherence >= minCoherence;

    steps.push({
      hour: i,
      timestamp: obs.timestamp,
      ambientC: obs.temperatureC,
      environment: obs.environment,
      selectedTempMK,
      coherence,
      coolingEnergyKWh: energyKWh,
      feasible,
      constraintViolated: !feasible,
    });
  }

  return summarize(steps, "reactive", config, observations);
}

/**
 * Run the Predictive strategy (⭐ the novel contribution).
 *
 * At each hour, the optimizer looks AHEAD (default 2 hours) and picks the
 * operating point that will remain feasible when the forecast heat arrives.
 * This typically means picking a slightly warmer (less aggressive) operating
 * point that still satisfies the constraint, saving cooling energy.
 *
 * Concretely:
 *   - Compute the worst-case (hottest) ambient in the look-ahead window.
 *   - Run the optimizer against that worst-case ambient.
 *   - Apply the selected operating point to the CURRENT hour.
 *
 * If the forecast window extends beyond available data, use the last available
 * observation.
 */
export function runPredictiveStrategy(
  config: QuantumSystemConfig,
  observations: ThermalObservation[],
  weights: { coherence: number; energy: number },
  minCoherence: number,
  lookAheadHours = 2,
): StrategyResult {
  const steps: StrategyStep[] = [];

  for (let i = 0; i < observations.length; i++) {
    const obs = observations[i];
    // Build the look-ahead window
    const windowEnd = Math.min(observations.length - 1, i + lookAheadHours);
    const window = observations.slice(i, windowEnd + 1);

    // Find the worst-case ambient (hottest) in the window
    const worstCase = window.reduce(
      (worst, o) => (o.temperatureC > worst.temperatureC ? o : worst),
      obs,
    );

    // Optimize against the worst-case ambient + environment
    const result = runOptimization({
      config,
      ambientC: worstCase.temperatureC,
      weights,
      minCoherence,
      durationHours: 1,
      environment: worstCase.environment ?? obs.environment,
    });
    const opt = result.optimal;
    const selectedTempMK = opt?.temperatureMK ?? config.coolingParams.baselineTargetMK;

    // But compute the ACTUAL energy at the current hour's ambient
    // (we picked the temp based on forecast, but pay energy at current temp)
    const coherence = estimateCoherence(selectedTempMK, config);
    const { power } = calculateCoolingPower(
      obs.temperatureC,
      selectedTempMK,
      config,
      obs.environment,
    );
    const energyKWh = (power * 1) / 1000;
    const feasible = coherence.coherenceScore >= minCoherence;

    steps.push({
      hour: i,
      timestamp: obs.timestamp,
      ambientC: obs.temperatureC,
      environment: obs.environment,
      selectedTempMK,
      coherence,
      coolingEnergyKWh: energyKWh,
      feasible,
      constraintViolated: !feasible,
    });
  }

  return summarize(steps, "predictive", config, observations);
}

/**
 * Run all three strategies and produce a comparison.
 */
export function compareStrategies(
  config: QuantumSystemConfig,
  observations: ThermalObservation[],
  weights: { coherence: number; energy: number },
  minCoherence: number,
  lookAheadHours = 2,
): StrategyComparison {
  const fixed = runFixedStrategy(config, observations, minCoherence);
  const reactive = runReactiveStrategy(config, observations, weights, minCoherence);
  const predictive = runPredictiveStrategy(
    config,
    observations,
    weights,
    minCoherence,
    lookAheadHours,
  );

  const savingsPercent = (a: StrategyResult, b: StrategyResult) =>
    a.totalEnergyKWh > 0
      ? ((a.totalEnergyKWh - b.totalEnergyKWh) / a.totalEnergyKWh) * 100
      : 0;

  const source = observations[0]?.source === "fortyguard" ? "fortyguard" : "synthetic";
  const first = observations[0]?.timestamp ?? new Date().toISOString();
  const last = observations[observations.length - 1]?.timestamp ?? new Date().toISOString();

  return {
    fixed,
    reactive,
    predictive,
    savings: {
      reactiveVsFixed: savingsPercent(fixed, reactive),
      predictiveVsFixed: savingsPercent(fixed, predictive),
      predictiveVsReactive: savingsPercent(reactive, predictive),
    },
    forecastWindow: {
      start: first,
      end: last,
      hours: observations.length,
      source: source as "fortyguard" | "synthetic",
    },
    config,
    minCoherence,
  };
}

// ---- Helpers ----

function summarize(
  steps: StrategyStep[],
  strategy: Strategy,
  _config: QuantumSystemConfig,
  observations: ThermalObservation[],
): StrategyResult {
  const totalEnergyKWh = steps.reduce((s, p) => s + p.coolingEnergyKWh, 0);
  const coherences = steps.map((s) => s.coherence);
  const minCoherence = Math.min(...coherences);
  const maxCoherence = Math.max(...coherences);
  const meanCoherence = coherences.reduce((s, c) => s + c, 0) / coherences.length;
  const constraintViolations = steps.filter((s) => s.constraintViolated).length;

  const descriptions: Record<Strategy, string> = {
    fixed: `Fixed aggressive cooling to ${steps[0]?.selectedTempMK ?? 0} mK throughout the ${steps.length}-hour window. No adaptation to ambient conditions.`,
    reactive: `Re-optimized operating point each hour based on current ambient temperature. Total of ${steps.length} optimization runs.`,
    predictive: `Looked ahead 2 hours at each step, optimized against the worst-case forecast ambient. Pre-positioned operating point to avoid future constraint violations while saving energy.`,
  };

  return {
    strategy,
    steps,
    totalEnergyKWh,
    minCoherence,
    maxCoherence,
    meanCoherence,
    constraintViolations,
    totalHours: steps.length,
    description: descriptions[strategy],
  };
}
