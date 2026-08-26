// Tests for the cooling energy model.
import { describe, expect, it } from "bun:test";
import {
  calculateCoolingPower,
  calculateEnergyConsumption,
  calculateRelativeEnergy,
  estimateCooling,
} from "../src/lib/scientific/cooling";
import { DEFAULT_CONFIG } from "../src/lib/scientific/types";

describe("calculateCoolingPower", () => {
  it("returns positive power for valid inputs", () => {
    const { power, cop, carnotCop } = calculateCoolingPower(25, 20, DEFAULT_CONFIG);
    expect(power).toBeGreaterThan(0);
    expect(cop).toBeGreaterThan(0);
    expect(carnotCop).toBeGreaterThan(0);
  });

  it("Carnot COP is less than 1 for cryogenic temperatures", () => {
    // T_cold = 20 mK = 0.020 K, T_hot = 298 K
    // COP_carnot = 0.020 / 298 ≈ 6.7e-5
    const { carnotCop } = calculateCoolingPower(25, 20, DEFAULT_CONFIG);
    expect(carnotCop).toBeLessThan(1);
    expect(carnotCop).toBeGreaterThan(0);
  });

  it("real COP is less than Carnot COP", () => {
    const { cop, carnotCop } = calculateCoolingPower(25, 20, DEFAULT_CONFIG);
    expect(cop).toBeLessThan(carnotCop);
  });

  it("requires more power at colder target temperatures (smaller COP)", () => {
    const warm = calculateCoolingPower(25, 50, DEFAULT_CONFIG);
    const cold = calculateCoolingPower(25, 20, DEFAULT_CONFIG);
    // Cooling to 20 mK should require more power than cooling to 50 mK
    expect(cold.power).toBeGreaterThan(warm.power);
  });

  it("requires more power at higher ambient temperatures", () => {
    const cool_ambient = calculateCoolingPower(20, 20, DEFAULT_CONFIG);
    const hot_ambient = calculateCoolingPower(40, 20, DEFAULT_CONFIG);
    expect(hot_ambient.power).toBeGreaterThan(cool_ambient.power);
  });

  it("includes the baseline overhead of 1500 W", () => {
    // At any temperature, power should be at least 1500 W (baseline overhead)
    const { power } = calculateCoolingPower(25, 100, DEFAULT_CONFIG);
    expect(power).toBeGreaterThanOrEqual(1500);
  });
});

describe("calculateEnergyConsumption", () => {
  it("returns positive energy for valid inputs", () => {
    const e = calculateEnergyConsumption(25, 20, DEFAULT_CONFIG, 24);
    expect(e).toBeGreaterThan(0);
  });

  it("scales linearly with duration", () => {
    const e24 = calculateEnergyConsumption(25, 20, DEFAULT_CONFIG, 24);
    const e48 = calculateEnergyConsumption(25, 20, DEFAULT_CONFIG, 48);
    expect(e48).toBeCloseTo(2 * e24, 1);
  });

  it("produces values in kWh/day in a realistic range", () => {
    const e = calculateEnergyConsumption(25, 20, DEFAULT_CONFIG, 24);
    // Should be on the order of hundreds to thousands of kWh/day for cryogenic systems
    expect(e).toBeGreaterThan(100);
    expect(e).toBeLessThan(10000);
  });
});

describe("calculateRelativeEnergy", () => {
  it("returns 0 when max is 0", () => {
    expect(calculateRelativeEnergy(50, 0)).toBe(0);
  });

  it("returns 1 when energy equals max", () => {
    expect(calculateRelativeEnergy(100, 100)).toBe(1);
  });

  it("returns the correct ratio", () => {
    expect(calculateRelativeEnergy(50, 100)).toBe(0.5);
    expect(calculateRelativeEnergy(25, 100)).toBe(0.25);
  });

  it("is clamped to [0, 1]", () => {
    expect(calculateRelativeEnergy(150, 100)).toBe(1);
    expect(calculateRelativeEnergy(-10, 100)).toBe(0);
  });
});

describe("estimateCooling (full estimate)", () => {
  it("returns all required fields", () => {
    const e = estimateCooling(25, 20, DEFAULT_CONFIG, 1000, 24);
    expect(e).toHaveProperty("ambientC");
    expect(e).toHaveProperty("targetMK");
    expect(e).toHaveProperty("coolingPowerWatts");
    expect(e).toHaveProperty("energyConsumptionKWh");
    expect(e).toHaveProperty("relativeEnergy");
    expect(e).toHaveProperty("carnotEfficiency");
    expect(e).toHaveProperty("cop");
  });

  it("echoes back the input temperatures", () => {
    const e = estimateCooling(28, 30, DEFAULT_CONFIG);
    expect(e.ambientC).toBe(28);
    expect(e.targetMK).toBe(30);
  });

  it("calculates relative energy when max is provided", () => {
    const e = estimateCooling(25, 20, DEFAULT_CONFIG, 2000, 24);
    expect(e.relativeEnergy).toBeGreaterThan(0);
    expect(e.relativeEnergy).toBeLessThanOrEqual(1);
  });

  it("returns 0 relative energy when no max is provided", () => {
    const e = estimateCooling(25, 20, DEFAULT_CONFIG);
    expect(e.relativeEnergy).toBe(0);
  });

  it("uses the config's Carnot efficiency", () => {
    const e = estimateCooling(25, 20, DEFAULT_CONFIG);
    expect(e.carnotEfficiency).toBe(DEFAULT_CONFIG.coolingParams.carnotEfficiency);
  });
});
