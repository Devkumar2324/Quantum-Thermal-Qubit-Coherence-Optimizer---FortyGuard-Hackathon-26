// Tests for the multi-objective optimizer.
import { describe, expect, it } from "bun:test";
import {
  runTemperatureSweep,
  identifyPareto,
  selectOptimal,
  buildBaseline,
  runOptimization,
} from "../src/lib/scientific/optimizer";
import { DEFAULT_CONFIG, SweepPoint } from "../src/lib/scientific/types";

describe("runTemperatureSweep", () => {
  it("returns the expected number of sweep points", () => {
    const sweep = runTemperatureSweep(
      DEFAULT_CONFIG,
      25,
      { coherence: 0.7, energy: 0.3 },
      0.85,
    );
    // (100 - 10) / 2 + 1 = 46
    expect(sweep).toHaveLength(46);
  });

  it("includes all required fields per point", () => {
    const sweep = runTemperatureSweep(
      DEFAULT_CONFIG,
      25,
      { coherence: 0.7, energy: 0.3 },
      0.85,
    );
    const p = sweep[0];
    expect(p).toHaveProperty("temperatureMK");
    expect(p).toHaveProperty("thermalNoise");
    expect(p).toHaveProperty("thermalPopulation");
    expect(p).toHaveProperty("T1Microseconds");
    expect(p).toHaveProperty("T2Microseconds");
    expect(p).toHaveProperty("T2StarMicroseconds");
    expect(p).toHaveProperty("coherenceScore");
    expect(p).toHaveProperty("decoherenceRisk");
    expect(p).toHaveProperty("coolingPowerWatts");
    expect(p).toHaveProperty("energyConsumptionKWh");
    expect(p).toHaveProperty("relativeEnergy");
    expect(p).toHaveProperty("cop");
    expect(p).toHaveProperty("objectiveScore");
    expect(p).toHaveProperty("feasible");
  });

  it("sorts points by temperature ascending", () => {
    const sweep = runTemperatureSweep(
      DEFAULT_CONFIG,
      25,
      { coherence: 0.7, energy: 0.3 },
      0.85,
    );
    for (let i = 1; i < sweep.length; i++) {
      expect(sweep[i].temperatureMK).toBeGreaterThan(sweep[i - 1].temperatureMK);
    }
  });

  it("marks points as feasible based on minCoherence", () => {
    const sweep = runTemperatureSweep(
      DEFAULT_CONFIG,
      25,
      { coherence: 0.7, energy: 0.3 },
      0.85,
    );
    for (const p of sweep) {
      expect(p.feasible).toBe(p.coherenceScore >= 0.85);
    }
  });

  it("produces objective scores in [0, 1]", () => {
    const sweep = runTemperatureSweep(
      DEFAULT_CONFIG,
      25,
      { coherence: 0.7, energy: 0.3 },
      0.85,
    );
    for (const p of sweep) {
      expect(p.objectiveScore).toBeGreaterThanOrEqual(0);
      expect(p.objectiveScore).toBeLessThanOrEqual(1);
    }
  });

  it("produces at least one feasible point in the default config", () => {
    const sweep = runTemperatureSweep(
      DEFAULT_CONFIG,
      25,
      { coherence: 0.7, energy: 0.3 },
      0.85,
    );
    const feasibleCount = sweep.filter((p) => p.feasible).length;
    expect(feasibleCount).toBeGreaterThan(0);
  });
});

describe("identifyPareto", () => {
  it("returns an empty array for empty input", () => {
    expect(identifyPareto([])).toEqual([]);
  });

  it("returns the single point for a single-point input", () => {
    const points: SweepPoint[] = [
      {
        temperatureMK: 20,
        thermalNoise: 0.1,
        thermalPopulation: 0,
        T1Microseconds: 100,
        T2Microseconds: 80,
        T2StarMicroseconds: 60,
        coherenceScore: 0.95,
        decoherenceRisk: "LOW",
        ambientC: 25,
        targetMK: 20,
        coolingPowerWatts: 1000,
        energyConsumptionKWh: 24,
        relativeEnergy: 0.5,
        carnotEfficiency: 0.12,
        cop: 0.0001,
        objectiveScore: 0.1,
        feasible: true,
      },
    ];
    expect(identifyPareto(points)).toHaveLength(1);
  });

  it("identifies non-dominated points correctly", () => {
    // Point A: high coherence, high energy
    // Point B: low coherence, low energy
    // Point C: medium coherence, medium energy (dominated by neither A nor B)
    // Point D: low coherence, high energy (dominated by both A and B)
    const points: SweepPoint[] = [
      makePoint(20, 0.95, 100),
      makePoint(80, 0.20, 20),
      makePoint(40, 0.70, 50),
      makePoint(60, 0.30, 120), // dominated
    ];
    const pareto = identifyPareto(points);
    expect(pareto).toHaveLength(3);
    // The dominated point (60 mK) should not be in the frontier
    expect(pareto.find((p) => p.temperatureMK === 60)).toBeUndefined();
  });

  it("sorts Pareto points by energy ascending", () => {
    const points: SweepPoint[] = [
      makePoint(20, 0.95, 100),
      makePoint(80, 0.20, 20),
      makePoint(40, 0.70, 50),
    ];
    const pareto = identifyPareto(points);
    for (let i = 1; i < pareto.length; i++) {
      expect(pareto[i].energyConsumptionKWh).toBeGreaterThanOrEqual(
        pareto[i - 1].energyConsumptionKWh,
      );
    }
  });
});

describe("selectOptimal", () => {
  it("returns null for empty inputs", () => {
    expect(selectOptimal([], [], { coherence: 0.7, energy: 0.3 })).toBeNull();
  });

  it("prefers feasible Pareto points", () => {
    const feasible: SweepPoint[] = [makePoint(20, 0.95, 100, true, 0.1)];
    const pareto: SweepPoint[] = [
      makePoint(20, 0.95, 100, true, 0.1),
      makePoint(80, 0.20, 20, false, 0.8),
    ];
    const optimal = selectOptimal(pareto, feasible, { coherence: 0.7, energy: 0.3 });
    expect(optimal?.temperatureMK).toBe(20);
  });

  it("falls back to feasible non-Pareto when no Pareto is feasible", () => {
    const feasible: SweepPoint[] = [makePoint(30, 0.90, 80, true, 0.2)];
    const pareto: SweepPoint[] = [makePoint(80, 0.20, 20, false, 0.8)];
    const optimal = selectOptimal(pareto, feasible, { coherence: 0.7, energy: 0.3 });
    expect(optimal?.temperatureMK).toBe(30);
  });

  it("falls back to Pareto when no feasible point exists", () => {
    const pareto: SweepPoint[] = [makePoint(80, 0.20, 20, false, 0.5)];
    const optimal = selectOptimal(pareto, [], { coherence: 0.7, energy: 0.3 });
    expect(optimal?.temperatureMK).toBe(80);
  });

  it("selects the lowest-objective point among candidates", () => {
    const feasible: SweepPoint[] = [
      makePoint(20, 0.95, 100, true, 0.3),
      makePoint(30, 0.92, 80, true, 0.15),
      makePoint(40, 0.88, 60, true, 0.25),
    ];
    const optimal = selectOptimal([], feasible, { coherence: 0.7, energy: 0.3 });
    expect(optimal?.temperatureMK).toBe(30); // lowest objective
  });
});

describe("buildBaseline", () => {
  it("returns a point at the baseline target temperature", () => {
    const baseline = buildBaseline(DEFAULT_CONFIG, 25, 24);
    expect(baseline.temperatureMK).toBe(DEFAULT_CONFIG.coolingParams.baselineTargetMK);
  });

  it("computes positive energy", () => {
    const baseline = buildBaseline(DEFAULT_CONFIG, 25, 24);
    expect(baseline.energyConsumptionKWh).toBeGreaterThan(0);
  });

  it("has a relativeEnergy of 1 (normalized to itself)", () => {
    const baseline = buildBaseline(DEFAULT_CONFIG, 25, 24);
    expect(baseline.relativeEnergy).toBe(1);
  });
});

describe("runOptimization (full pipeline)", () => {
  it("returns a complete OptimizationResult", () => {
    const result = runOptimization({
      config: DEFAULT_CONFIG,
      ambientC: 25,
      weights: { coherence: 0.7, energy: 0.3 },
      minCoherence: 0.85,
    });
    expect(result).toHaveProperty("sweep");
    expect(result).toHaveProperty("pareto");
    expect(result).toHaveProperty("optimal");
    expect(result).toHaveProperty("baseline");
    expect(result).toHaveProperty("metrics");
    expect(result).toHaveProperty("weights");
    expect(result).toHaveProperty("minCoherence");
    expect(result).toHaveProperty("noFeasibleSolution");
    expect(result).toHaveProperty("message");
  });

  it("finds a feasible solution with default config at 25°C ambient", () => {
    const result = runOptimization({
      config: DEFAULT_CONFIG,
      ambientC: 25,
      weights: { coherence: 0.7, energy: 0.3 },
      minCoherence: 0.85,
    });
    expect(result.noFeasibleSolution).toBe(false);
    expect(result.optimal).not.toBeNull();
    expect(result.optimal?.coherenceScore).toBeGreaterThanOrEqual(0.85);
  });

  it("computes energy savings vs baseline", () => {
    const result = runOptimization({
      config: DEFAULT_CONFIG,
      ambientC: 25,
      weights: { coherence: 0.7, energy: 0.3 },
      minCoherence: 0.85,
    });
    expect(result.metrics.energySavingPercent).toBeGreaterThan(0);
    // Verify the savings calculation
    const expected =
      ((result.baseline.energyKWh - (result.optimal?.energyConsumptionKWh ?? 0)) /
        result.baseline.energyKWh) *
      100;
    expect(result.metrics.energySavingPercent).toBeCloseTo(expected, 1);
  });

  it("returns no-feasible-solution when threshold is impossibly high", () => {
    const result = runOptimization({
      config: DEFAULT_CONFIG,
      ambientC: 25,
      weights: { coherence: 1, energy: 0 },
      minCoherence: 0.999, // impossible
    });
    expect(result.noFeasibleSolution).toBe(true);
    expect(result.optimal?.coherenceScore ?? 0).toBeLessThan(0.999);
  });

  it("includes the no-feasible-solution message when applicable", () => {
    const result = runOptimization({
      config: DEFAULT_CONFIG,
      ambientC: 25,
      weights: { coherence: 1, energy: 0 },
      minCoherence: 0.999,
    });
    expect(result.message).toContain("No operating temperature");
  });

  it("produces consistent results for identical inputs (reproducibility)", () => {
    const req = {
      config: DEFAULT_CONFIG,
      ambientC: 25,
      weights: { coherence: 0.7, energy: 0.3 } as const,
      minCoherence: 0.85,
    };
    const a = runOptimization(req);
    const b = runOptimization(req);
    expect(a.optimal?.temperatureMK).toBe(b.optimal?.temperatureMK);
    expect(a.optimal?.coherenceScore).toBe(b.optimal?.coherenceScore);
    expect(a.metrics.energySavingPercent).toBe(b.metrics.energySavingPercent);
  });

  it("handles extreme ambient temperatures without crashing", () => {
    const result = runOptimization({
      config: DEFAULT_CONFIG,
      ambientC: 50, // extreme heat
      weights: { coherence: 0.7, energy: 0.3 },
      minCoherence: 0.85,
    });
    expect(result.sweep.length).toBeGreaterThan(0);
  });
});

// Helper: construct a SweepPoint with minimal boilerplate
function makePoint(
  temp: number,
  coherence: number,
  energy: number,
  feasible: boolean = coherence >= 0.85,
  objective: number = 0.5,
): SweepPoint {
  return {
    temperatureMK: temp,
    thermalNoise: 0.1,
    thermalPopulation: 0,
    T1Microseconds: 100,
    T2Microseconds: 80,
    T2StarMicroseconds: 60,
    coherenceScore: coherence,
    decoherenceRisk: coherence >= 0.85 ? "LOW" : coherence >= 0.65 ? "MEDIUM" : coherence >= 0.4 ? "HIGH" : "CRITICAL",
    ambientC: 25,
    targetMK: temp,
    coolingPowerWatts: energy * 1000 / 24,
    energyConsumptionKWh: energy,
    relativeEnergy: 0.5,
    carnotEfficiency: 0.12,
    cop: 0.0001,
    objectiveScore: objective,
    feasible,
  };
}
