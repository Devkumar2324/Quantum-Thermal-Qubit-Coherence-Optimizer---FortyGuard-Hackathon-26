// Tests for the enhanced cooling model (solar + humidity + wet-bulb).
import { describe, expect, it } from "bun:test";
import {
  humidityCOPFactor,
  solarHeatGain,
  wetBulbFromRH,
  wetBulbLimitFactor,
  calculateCoolingPower,
} from "../src/lib/scientific/cooling";
import { DEFAULT_CONFIG, EnvironmentalConditions } from "../src/lib/scientific/types";

describe("humidityCOPFactor", () => {
  it("returns 1.0 when humidity is undefined", () => {
    expect(humidityCOPFactor(undefined)).toBe(1.0);
  });

  it("returns 1.0 at 0% humidity (no penalty)", () => {
    expect(humidityCOPFactor(0)).toBe(1.0);
  });

  it("returns 0.7 at 100% humidity (max penalty)", () => {
    expect(humidityCOPFactor(100)).toBe(0.7);
  });

  it("decreases monotonically with humidity", () => {
    const f0 = humidityCOPFactor(0);
    const f50 = humidityCOPFactor(50);
    const f100 = humidityCOPFactor(100);
    expect(f0).toBeGreaterThan(f50);
    expect(f50).toBeGreaterThan(f100);
  });
});

describe("solarHeatGain", () => {
  it("returns 0 when GHI is undefined", () => {
    expect(solarHeatGain(undefined, DEFAULT_CONFIG)).toBe(0);
  });

  it("returns 0 when GHI is 0 (nighttime)", () => {
    expect(solarHeatGain(0, DEFAULT_CONFIG)).toBe(0);
  });

  it("returns 0 when GHI is negative", () => {
    expect(solarHeatGain(-50, DEFAULT_CONFIG)).toBe(0);
  });

  it("computes Q_solar = alpha * GHI * area", () => {
    // alpha=0.3, area=4 m², GHI=1000 W/m² → 0.3*1000*4 = 1200 W
    expect(solarHeatGain(1000, DEFAULT_CONFIG)).toBe(1200);
  });

  it("scales linearly with GHI", () => {
    const q500 = solarHeatGain(500, DEFAULT_CONFIG);
    const q1000 = solarHeatGain(1000, DEFAULT_CONFIG);
    expect(q1000).toBe(2 * q500);
  });
});

describe("wetBulbFromRH", () => {
  it("returns undefined when humidity is undefined", () => {
    expect(wetBulbFromRH(25, undefined)).toBeUndefined();
  });

  it("returns temperature close to dry-bulb at 100% humidity", () => {
    // At 100% RH, wet-bulb ≈ dry-bulb
    const twb = wetBulbFromRH(25, 100);
    expect(twb).toBeCloseTo(25, 1);
  });

  it("returns lower temperature than dry-bulb at <100% humidity", () => {
    const twb = wetBulbFromRH(30, 40);
    expect(twb).toBeLessThan(30);
  });

  it("decreases as humidity decreases (more evaporative cooling)", () => {
    const twb90 = wetBulbFromRH(30, 90);
    const twb50 = wetBulbFromRH(30, 50);
    const twb10 = wetBulbFromRH(30, 10);
    expect(twb90).toBeGreaterThan(twb50);
    expect(twb50).toBeGreaterThan(twb10);
  });
});

describe("wetBulbLimitFactor", () => {
  it("returns 1.0 when wet-bulb is undefined", () => {
    expect(wetBulbLimitFactor(25, 20, undefined)).toBe(1.0);
  });

  it("returns a value in [0.85, 1.0]", () => {
    for (const twb of [5, 10, 15, 20, 25]) {
      const factor = wetBulbLimitFactor(30, 20, twb);
      expect(factor).toBeGreaterThanOrEqual(0.85);
      expect(factor).toBeLessThanOrEqual(1.0);
    }
  });

  it("is higher (closer to 1) when evap range is large", () => {
    const smallRange = wetBulbLimitFactor(28, 20, 26); // range = 2
    const largeRange = wetBulbLimitFactor(35, 20, 20); // range = 15
    expect(largeRange).toBeGreaterThan(smallRange);
  });
});

describe("calculateCoolingPower (enhanced)", () => {
  it("returns positive power with environment", () => {
    const env: EnvironmentalConditions = {
      temperatureC: 35,
      humidityPercent: 50,
      solarGHI: 800,
      wetBulbC: 25,
    };
    const { power, cop, qLoad, qSolar } = calculateCoolingPower(35, 20, DEFAULT_CONFIG, env);
    expect(power).toBeGreaterThan(0);
    expect(cop).toBeGreaterThan(0);
    expect(qLoad).toBeGreaterThan(0);
    expect(qSolar).toBeGreaterThan(0);
  });

  it("includes solar heat gain in Q_load", () => {
    const envNoSolar: EnvironmentalConditions = { temperatureC: 30 };
    const envSolar: EnvironmentalConditions = { temperatureC: 30, solarGHI: 1000 };
    const { qLoad: noSolar } = calculateCoolingPower(30, 20, DEFAULT_CONFIG, envNoSolar);
    const { qLoad: withSolar } = calculateCoolingPower(30, 20, DEFAULT_CONFIG, envSolar);
    expect(withSolar).toBeGreaterThan(noSolar);
  });

  it("reduces COP at high humidity", () => {
    const envDry: EnvironmentalConditions = { temperatureC: 30, humidityPercent: 10 };
    const envHumid: EnvironmentalConditions = { temperatureC: 30, humidityPercent: 90 };
    const { cop: copDry } = calculateCoolingPower(30, 20, DEFAULT_CONFIG, envDry);
    const { cop: copHumid } = calculateCoolingPower(30, 20, DEFAULT_CONFIG, envHumid);
    expect(copDry).toBeGreaterThan(copHumid);
  });

  it("requires more power with solar heat gain", () => {
    const envNoSolar: EnvironmentalConditions = { temperatureC: 30 };
    const envSolar: EnvironmentalConditions = { temperatureC: 30, solarGHI: 1000 };
    const { power: noSolar } = calculateCoolingPower(30, 20, DEFAULT_CONFIG, envNoSolar);
    const { power: withSolar } = calculateCoolingPower(30, 20, DEFAULT_CONFIG, envSolar);
    expect(withSolar).toBeGreaterThan(noSolar);
  });

  it("requires more power at high humidity (lower COP)", () => {
    const envDry: EnvironmentalConditions = { temperatureC: 30, humidityPercent: 10 };
    const envHumid: EnvironmentalConditions = { temperatureC: 30, humidityPercent: 90 };
    const { power: dryPower } = calculateCoolingPower(30, 20, DEFAULT_CONFIG, envDry);
    const { power: humidPower } = calculateCoolingPower(30, 20, DEFAULT_CONFIG, envHumid);
    expect(humidPower).toBeGreaterThan(dryPower);
  });

  it("works without environment (backward compatible)", () => {
    const { power, cop } = calculateCoolingPower(25, 20, DEFAULT_CONFIG);
    expect(power).toBeGreaterThan(0);
    expect(cop).toBeGreaterThan(0);
  });
});
