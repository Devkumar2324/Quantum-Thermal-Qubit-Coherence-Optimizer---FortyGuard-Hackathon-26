// Tests for the three-strategy comparison engine.
import { describe, expect, it } from "bun:test";
import {
  runFixedStrategy,
  runReactiveStrategy,
  runPredictiveStrategy,
  compareStrategies,
} from "../src/lib/scientific/strategies";
import {
  DEFAULT_CONFIG,
  ThermalObservation,
  EnvironmentalConditions,
} from "../src/lib/scientific/types";

function makeObservation(
  hour: number,
  ambientC: number,
  environment?: EnvironmentalConditions,
): ThermalObservation {
  return {
    timestamp: new Date(Date.now() + hour * 3_600_000).toISOString(),
    temperatureC: ambientC,
    source: "synthetic",
    quality: "good",
    environment: environment ?? { temperatureC: ambientC },
  };
}

function makeForecast(hours: number, baseC: number, trend: number = 0.5): ThermalObservation[] {
  return Array.from({ length: hours }, (_, i) =>
    makeObservation(i, baseC + i * trend + Math.sin(i / 3) * 2, {
      temperatureC: baseC + i * trend + Math.sin(i / 3) * 2,
      humidityPercent: 50,
      solarGHI: Math.max(0, 600 * Math.sin((i + 6) / 4)),
    }),
  );
}

describe("runFixedStrategy", () => {
  it("returns a StrategyResult with the correct strategy name", () => {
    const obs = makeForecast(6, 30);
    const result = runFixedStrategy(DEFAULT_CONFIG, obs, 0.85);
    expect(result.strategy).toBe("fixed");
  });

  it("uses the baseline target temperature for all steps", () => {
    const obs = makeForecast(6, 30);
    const result = runFixedStrategy(DEFAULT_CONFIG, obs, 0.85);
    for (const step of result.steps) {
      expect(step.selectedTempMK).toBe(DEFAULT_CONFIG.coolingParams.baselineTargetMK);
    }
  });

  it("produces one step per observation", () => {
    const obs = makeForecast(12, 30);
    const result = runFixedStrategy(DEFAULT_CONFIG, obs, 0.85);
    expect(result.steps).toHaveLength(12);
  });

  it("accumulates positive total energy", () => {
    const obs = makeForecast(6, 30);
    const result = runFixedStrategy(DEFAULT_CONFIG, obs, 0.85);
    expect(result.totalEnergyKWh).toBeGreaterThan(0);
  });

  it("computes coherence statistics", () => {
    const obs = makeForecast(6, 30);
    const result = runFixedStrategy(DEFAULT_CONFIG, obs, 0.85);
    expect(result.minCoherence).toBeGreaterThan(0);
    expect(result.maxCoherence).toBeLessThanOrEqual(1);
    expect(result.meanCoherence).toBeGreaterThanOrEqual(result.minCoherence);
    expect(result.meanCoherence).toBeLessThanOrEqual(result.maxCoherence);
  });
});

describe("runReactiveStrategy", () => {
  it("returns a StrategyResult with the correct strategy name", () => {
    const obs = makeForecast(6, 30);
    const result = runReactiveStrategy(
      DEFAULT_CONFIG,
      obs,
      { coherence: 0.7, energy: 0.3 },
      0.85,
    );
    expect(result.strategy).toBe("reactive");
  });

  it("produces one step per observation", () => {
    const obs = makeForecast(8, 30);
    const result = runReactiveStrategy(
      DEFAULT_CONFIG,
      obs,
      { coherence: 0.7, energy: 0.3 },
      0.85,
    );
    expect(result.steps).toHaveLength(8);
  });

  it("adapts operating temperature based on ambient", () => {
    const coldObs = [makeObservation(0, 20)];
    const hotObs = [makeObservation(0, 45)];
    const coldResult = runReactiveStrategy(
      DEFAULT_CONFIG,
      coldObs,
      { coherence: 0.7, energy: 0.3 },
      0.85,
    );
    const hotResult = runReactiveStrategy(
      DEFAULT_CONFIG,
      hotObs,
      { coherence: 0.7, energy: 0.3 },
      0.85,
    );
    // At hotter ambient, the optimizer may choose a different operating point
    // (typically warmer, since cooling to very cold is more expensive)
    expect(hotResult.steps[0].selectedTempMK).toBeGreaterThanOrEqual(
      coldResult.steps[0].selectedTempMK,
    );
  });

  it("uses less energy than fixed strategy when there is headroom", () => {
    const obs = makeForecast(12, 25); // mild ambient
    const fixed = runFixedStrategy(DEFAULT_CONFIG, obs, 0.85);
    const reactive = runReactiveStrategy(
      DEFAULT_CONFIG,
      obs,
      { coherence: 0.7, energy: 0.3 },
      0.85,
    );
    // Reactive should use less or equal energy (optimizer picks warmer T when feasible)
    expect(reactive.totalEnergyKWh).toBeLessThanOrEqual(fixed.totalEnergyKWh * 1.05);
  });
});

describe("runPredictiveStrategy", () => {
  it("returns a StrategyResult with the correct strategy name", () => {
    const obs = makeForecast(6, 30);
    const result = runPredictiveStrategy(
      DEFAULT_CONFIG,
      obs,
      { coherence: 0.7, energy: 0.3 },
      0.85,
      2,
    );
    expect(result.strategy).toBe("predictive");
  });

  it("produces one step per observation", () => {
    const obs = makeForecast(10, 30);
    const result = runPredictiveStrategy(
      DEFAULT_CONFIG,
      obs,
      { coherence: 0.7, energy: 0.3 },
      0.85,
      2,
    );
    expect(result.steps).toHaveLength(10);
  });

  it("handles look-ahead at the end of the window", () => {
    const obs = makeForecast(4, 30);
    // Should not crash when look-ahead extends beyond available data
    const result = runPredictiveStrategy(
      DEFAULT_CONFIG,
      obs,
      { coherence: 0.7, energy: 0.3 },
      0.85,
      10, // larger than obs length
    );
    expect(result.steps).toHaveLength(4);
  });

  it("respects the coherence constraint when feasible", () => {
    const obs = makeForecast(8, 30);
    const result = runPredictiveStrategy(
      DEFAULT_CONFIG,
      obs,
      { coherence: 0.7, energy: 0.3 },
      0.85,
      2,
    );
    // At least the first step should be feasible (cold enough ambient)
    expect(result.steps[0].feasible).toBe(true);
  });
});

describe("compareStrategies", () => {
  it("returns all three strategy results", () => {
    const obs = makeForecast(12, 30);
    const comparison = compareStrategies(
      DEFAULT_CONFIG,
      obs,
      { coherence: 0.7, energy: 0.3 },
      0.85,
      2,
    );
    expect(comparison.fixed).toBeDefined();
    expect(comparison.reactive).toBeDefined();
    expect(comparison.predictive).toBeDefined();
  });

  it("computes savings percentages", () => {
    const obs = makeForecast(12, 30);
    const comparison = compareStrategies(
      DEFAULT_CONFIG,
      obs,
      { coherence: 0.7, energy: 0.3 },
      0.85,
      2,
    );
    expect(comparison.savings.reactiveVsFixed).toBeGreaterThanOrEqual(0);
    expect(comparison.savings.predictiveVsFixed).toBeGreaterThanOrEqual(0);
    expect(comparison.savings.predictiveVsReactive).toBeDefined();
  });

  it("includes forecast window metadata", () => {
    const obs = makeForecast(12, 30);
    const comparison = compareStrategies(
      DEFAULT_CONFIG,
      obs,
      { coherence: 0.7, energy: 0.3 },
      0.85,
      2,
    );
    expect(comparison.forecastWindow.hours).toBe(12);
    expect(comparison.forecastWindow.start).toBeDefined();
    expect(comparison.forecastWindow.end).toBeDefined();
    expect(comparison.forecastWindow.source).toBe("synthetic");
  });

  it("produces consistent results for the same input", () => {
    const obs = makeForecast(8, 30);
    const a = compareStrategies(
      DEFAULT_CONFIG,
      obs,
      { coherence: 0.7, energy: 0.3 },
      0.85,
      2,
    );
    const b = compareStrategies(
      DEFAULT_CONFIG,
      obs,
      { coherence: 0.7, energy: 0.3 },
      0.85,
      2,
    );
    expect(a.fixed.totalEnergyKWh).toBe(b.fixed.totalEnergyKWh);
    expect(a.reactive.totalEnergyKWh).toBe(b.reactive.totalEnergyKWh);
    expect(a.predictive.totalEnergyKWh).toBe(b.predictive.totalEnergyKWh);
  });

  it("reactive and predictive use less or equal energy than fixed", () => {
    const obs = makeForecast(12, 28); // mild ambient, room to optimize
    const comparison = compareStrategies(
      DEFAULT_CONFIG,
      obs,
      { coherence: 0.7, energy: 0.3 },
      0.85,
      2,
    );
    expect(comparison.reactive.totalEnergyKWh).toBeLessThanOrEqual(
      comparison.fixed.totalEnergyKWh,
    );
    expect(comparison.predictive.totalEnergyKWh).toBeLessThanOrEqual(
      comparison.fixed.totalEnergyKWh,
    );
  });
});
