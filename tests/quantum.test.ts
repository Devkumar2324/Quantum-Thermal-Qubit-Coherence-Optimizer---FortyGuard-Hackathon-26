// Tests for the quantum thermal/coherence model.
import { describe, expect, it } from "bun:test";
import {
  mkToK,
  thermalPopulation,
  calculateThermalNoise,
  estimateT1,
  estimateT2,
  estimateT2Star,
  calculateCoherence,
  calculateRisk,
  estimateCoherence,
} from "../src/lib/scientific/quantum";
import { DEFAULT_CONFIG } from "../src/lib/scientific/types";

describe("mkToK", () => {
  it("converts milliKelvin to Kelvin", () => {
    expect(mkToK(0)).toBe(0);
    expect(mkToK(1000)).toBe(1);
    expect(mkToK(20)).toBe(0.020);
  });
});

describe("thermalPopulation (Bose-Einstein)", () => {
  it("returns ~0 at very low temperature", () => {
    // For a 5 GHz qubit at 1 mK (ℏω/k_B ≈ 240 mK), n̄ should be ~0
    const n = thermalPopulation(1, 5);
    expect(n).toBeLessThan(1e-10);
  });

  it("returns ~0 at moderate cold temperature", () => {
    // At 20 mK with 5 GHz qubit, n̄ should still be tiny
    const n = thermalPopulation(20, 5);
    expect(n).toBeLessThan(0.001);
  });

  it("increases with temperature", () => {
    const n20 = thermalPopulation(20, 5);
    const n100 = thermalPopulation(100, 5);
    const n500 = thermalPopulation(500, 5);
    expect(n20).toBeLessThan(n100);
    expect(n100).toBeLessThan(n500);
  });

  it("returns 0 when exponent overflows (extreme cold)", () => {
    const n = thermalPopulation(0.001, 100);
    expect(n).toBe(0);
  });

  it("decreases with higher qubit frequency at same temperature", () => {
    const nLowFreq = thermalPopulation(100, 1);
    const nHighFreq = thermalPopulation(100, 10);
    expect(nLowFreq).toBeGreaterThan(nHighFreq);
  });
});

describe("calculateThermalNoise", () => {
  it("returns a value in [0, 1]", () => {
    for (const t of [10, 20, 50, 100, 200]) {
      const n = calculateThermalNoise(t, DEFAULT_CONFIG);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(1);
    }
  });

  it("is lower at cold temperatures than at warm temperatures", () => {
    const cold = calculateThermalNoise(10, DEFAULT_CONFIG);
    const warm = calculateThermalNoise(100, DEFAULT_CONFIG);
    expect(cold).toBeLessThan(warm);
  });

  it("increases monotonically with temperature (broadly)", () => {
    const t10 = calculateThermalNoise(10, DEFAULT_CONFIG);
    const t50 = calculateThermalNoise(50, DEFAULT_CONFIG);
    const t100 = calculateThermalNoise(100, DEFAULT_CONFIG);
    expect(t10).toBeLessThanOrEqual(t50);
    expect(t50).toBeLessThanOrEqual(t100);
  });
});

describe("estimateT1", () => {
  it("returns a positive value", () => {
    for (const t of [10, 20, 50, 100]) {
      const t1 = estimateT1(t, DEFAULT_CONFIG);
      expect(t1).toBeGreaterThan(0);
    }
  });

  it("is higher at cold temperatures (less thermal decay)", () => {
    const cold = estimateT1(10, DEFAULT_CONFIG);
    const warm = estimateT1(80, DEFAULT_CONFIG);
    expect(cold).toBeGreaterThan(warm);
  });

  it("respects the minimum floor of 0.1 µs", () => {
    const t1 = estimateT1(1000, DEFAULT_CONFIG);
    expect(t1).toBeGreaterThanOrEqual(0.1);
  });

  it("approaches or exceeds T1_ref at the reference temperature", () => {
    // At T_ref = 20 mK, T1 should be ~T1_ref = 100 µs
    const t1 = estimateT1(20, DEFAULT_CONFIG);
    expect(t1).toBeGreaterThan(50);
    expect(t1).toBeLessThan(150);
  });
});

describe("estimateT2", () => {
  it("returns a positive value", () => {
    for (const t of [10, 20, 50, 100]) {
      const t2 = estimateT2(t, DEFAULT_CONFIG);
      expect(t2).toBeGreaterThan(0);
    }
  });

  it("is higher at cold temperatures", () => {
    const cold = estimateT2(10, DEFAULT_CONFIG);
    const warm = estimateT2(80, DEFAULT_CONFIG);
    expect(cold).toBeGreaterThan(warm);
  });

  it("satisfies 1/T2 ≥ 1/(2·T1)", () => {
    for (const t of [10, 20, 50, 100]) {
      const t1 = estimateT1(t, DEFAULT_CONFIG);
      const t2 = estimateT2(t, DEFAULT_CONFIG);
      // 1/T2 should be >= 1/(2*T1), so T2 <= 2*T1
      expect(t2).toBeLessThanOrEqual(2 * t1 + 0.001);
    }
  });

  it("respects the minimum floor of 0.05 µs", () => {
    const t2 = estimateT2(1000, DEFAULT_CONFIG);
    expect(t2).toBeGreaterThanOrEqual(0.05);
  });
});

describe("estimateT2Star", () => {
  it("is less than or equal to T2 (inhomogeneous broadening)", () => {
    for (const t of [10, 20, 50, 100]) {
      const t2 = estimateT2(t, DEFAULT_CONFIG);
      const t2s = estimateT2Star(t, DEFAULT_CONFIG);
      expect(t2s).toBeLessThanOrEqual(t2 + 0.001);
    }
  });
});

describe("calculateCoherence", () => {
  it("returns a value in [0, 1]", () => {
    for (const t of [10, 20, 50, 100, 200]) {
      const c = calculateCoherence(t, DEFAULT_CONFIG);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });

  it("is higher at cold temperatures than at warm temperatures", () => {
    const cold = calculateCoherence(10, DEFAULT_CONFIG);
    const warm = calculateCoherence(80, DEFAULT_CONFIG);
    expect(cold).toBeGreaterThan(warm);
  });

  it("exceeds 0.85 at very cold temperatures (LOW risk)", () => {
    const c = calculateCoherence(10, DEFAULT_CONFIG);
    expect(c).toBeGreaterThan(0.85);
  });

  it("drops below 0.40 at very warm temperatures (CRITICAL risk)", () => {
    const c = calculateCoherence(100, DEFAULT_CONFIG);
    expect(c).toBeLessThan(0.40);
  });
});

describe("calculateRisk", () => {
  it("returns LOW for coherence ≥ 0.85", () => {
    expect(calculateRisk(0.85)).toBe("LOW");
    expect(calculateRisk(0.95)).toBe("LOW");
    expect(calculateRisk(1.0)).toBe("LOW");
  });

  it("returns MEDIUM for 0.65 ≤ coherence < 0.85", () => {
    expect(calculateRisk(0.65)).toBe("MEDIUM");
    expect(calculateRisk(0.75)).toBe("MEDIUM");
    expect(calculateRisk(0.84)).toBe("MEDIUM");
  });

  it("returns HIGH for 0.40 ≤ coherence < 0.65", () => {
    expect(calculateRisk(0.40)).toBe("HIGH");
    expect(calculateRisk(0.50)).toBe("HIGH");
    expect(calculateRisk(0.64)).toBe("HIGH");
  });

  it("returns CRITICAL for coherence < 0.40", () => {
    expect(calculateRisk(0.39)).toBe("CRITICAL");
    expect(calculateRisk(0.20)).toBe("CRITICAL");
    expect(calculateRisk(0)).toBe("CRITICAL");
  });
});

describe("estimateCoherence (full estimate)", () => {
  it("returns all required fields", () => {
    const e = estimateCoherence(20, DEFAULT_CONFIG);
    expect(e).toHaveProperty("temperatureMK");
    expect(e).toHaveProperty("thermalNoise");
    expect(e).toHaveProperty("thermalPopulation");
    expect(e).toHaveProperty("T1Microseconds");
    expect(e).toHaveProperty("T2Microseconds");
    expect(e).toHaveProperty("T2StarMicroseconds");
    expect(e).toHaveProperty("coherenceScore");
    expect(e).toHaveProperty("decoherenceRisk");
  });

  it("returns the input temperature", () => {
    const e = estimateCoherence(42, DEFAULT_CONFIG);
    expect(e.temperatureMK).toBe(42);
  });

  it("classifies cold temperatures as LOW risk", () => {
    const e = estimateCoherence(20, DEFAULT_CONFIG);
    expect(e.decoherenceRisk).toBe("LOW");
  });

  it("classifies very warm temperatures as CRITICAL risk", () => {
    const e = estimateCoherence(100, DEFAULT_CONFIG);
    expect(e.decoherenceRisk).toBe("CRITICAL");
  });
});
