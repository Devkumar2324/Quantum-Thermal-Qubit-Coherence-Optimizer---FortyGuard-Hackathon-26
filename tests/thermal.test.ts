// Tests for the thermal data processing module.
import { describe, expect, it } from "bun:test";
import {
  cToK,
  kToC,
  cToMK,
  processThermal,
  generateSyntheticHistory,
  simulateCustomAmbient,
} from "../src/lib/scientific/thermal";
import { ThermalObservation } from "../src/lib/scientific/types";

describe("Unit conversions", () => {
  it("cToK converts Celsius to Kelvin", () => {
    expect(cToK(0)).toBeCloseTo(273.15, 2);
    expect(cToK(25)).toBeCloseTo(298.15, 2);
    expect(cToK(-273.15)).toBeCloseTo(0, 2);
  });

  it("kToC converts Kelvin to Celsius", () => {
    expect(kToC(273.15)).toBeCloseTo(0, 2);
    expect(kToC(298.15)).toBeCloseTo(25, 2);
  });

  it("cToMK converts Celsius to milliKelvin", () => {
    expect(cToMK(0)).toBeCloseTo(273_150, 0);
    expect(cToMK(25)).toBeCloseTo(298_150, 0);
  });

  it("cToK and kToC are inverse operations", () => {
    for (const c of [-50, 0, 25, 50, 100]) {
      expect(kToC(cToK(c))).toBeCloseTo(c, 4);
    }
  });
});

describe("processThermal", () => {
  it("returns zeros for empty input", () => {
    const result = processThermal([]);
    expect(result.current).toBe(0);
    expect(result.movingAverage).toBe(0);
    expect(result.anomaly).toBe(0);
    expect(result.rateOfChange).toBe(0);
    expect(result.forecast).toBe(0);
    expect(result.history).toEqual([]);
    expect(result.forecastSeries).toEqual([]);
  });

  it("returns current temperature for single observation", () => {
    const obs: ThermalObservation[] = [
      {
        timestamp: new Date().toISOString(),
        temperatureC: 25,
        source: "synthetic",
        quality: "good",
      },
    ];
    const result = processThermal(obs);
    expect(result.current).toBe(25);
    expect(result.movingAverage).toBe(25);
  });

  it("sorts observations by timestamp", () => {
    const now = Date.now();
    const obs: ThermalObservation[] = [
      {
        timestamp: new Date(now - 1000).toISOString(),
        temperatureC: 20,
        source: "synthetic",
        quality: "good",
      },
      {
        timestamp: new Date(now).toISOString(),
        temperatureC: 25,
        source: "synthetic",
        quality: "good",
      },
    ];
    const result = processThermal(obs);
    expect(result.current).toBe(25);
  });

  it("handles missing values via forward fill", () => {
    const now = Date.now();
    const obs: ThermalObservation[] = [
      {
        timestamp: new Date(now - 2000).toISOString(),
        temperatureC: 20,
        source: "synthetic",
        quality: "good",
      },
      {
        timestamp: new Date(now - 1000).toISOString(),
        temperatureC: NaN,
        source: "synthetic",
        quality: "good",
      },
      {
        timestamp: new Date(now).toISOString(),
        temperatureC: 22,
        source: "synthetic",
        quality: "good",
      },
    ];
    const result = processThermal(obs);
    expect(result.current).toBe(22);
    // The NaN should have been forward-filled to 20
    expect(result.history[1]).toBe(20);
  });

  it("calculates moving average over 6-hour window", () => {
    const obs: ThermalObservation[] = Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(Date.now() - (10 - i) * 3_600_000).toISOString(),
      temperatureC: 20 + i,
      source: "synthetic" as const,
      quality: "good" as const,
    }));
    const result = processThermal(obs);
    // Last 6 values: 24, 25, 26, 27, 28, 29 -> mean = 26.5
    expect(result.movingAverage).toBeCloseTo(26.5, 1);
  });

  it("calculates anomaly as deviation from moving average", () => {
    const obs: ThermalObservation[] = Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(Date.now() - (10 - i) * 3_600_000).toISOString(),
      temperatureC: 20 + i,
      source: "synthetic" as const,
      quality: "good" as const,
    }));
    const result = processThermal(obs);
    // Current = 29, MA = 26.5, anomaly = 2.5
    expect(result.anomaly).toBeCloseTo(2.5, 1);
  });

  it("generates forecast series", () => {
    const obs: ThermalObservation[] = Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(Date.now() - (10 - i) * 3_600_000).toISOString(),
      temperatureC: 20 + i,
      source: "synthetic" as const,
      quality: "good" as const,
    }));
    const result = processThermal(obs);
    expect(result.forecastSeries).toHaveLength(6);
    // With a linear trend of +1/h, forecast should continue increasing
    expect(result.forecastSeries[0]).toBeGreaterThan(29);
  });
});

describe("generateSyntheticHistory", () => {
  it("generates the requested number of observations", () => {
    const obs = generateSyntheticHistory("normal", 24);
    expect(obs).toHaveLength(24);
  });

  it("includes required fields", () => {
    const obs = generateSyntheticHistory("normal", 1);
    expect(obs[0].timestamp).toBeDefined();
    expect(typeof obs[0].temperatureC).toBe("number");
    expect(obs[0].source).toBe("synthetic");
    expect(obs[0].quality).toBe("good");
    expect(obs[0].scenario).toBe("normal");
  });

  it("is deterministic for the same scenario and length", () => {
    const a = generateSyntheticHistory("normal", 24);
    const b = generateSyntheticHistory("normal", 24);
    expect(a).toEqual(b);
  });

  it("produces different data for different scenarios", () => {
    const normal = generateSyntheticHistory("normal", 24);
    const hot = generateSyntheticHistory("hot", 24);
    expect(normal[0].temperatureC).not.toBe(hot[0].temperatureC);
  });

  it("uses scenario-appropriate base temperatures", () => {
    const normal = generateSyntheticHistory("normal", 24);
    const hot = generateSyntheticHistory("hot", 24);
    const extreme = generateSyntheticHistory("extreme-heat", 24);

    const normalAvg = normal.reduce((s, o) => s + o.temperatureC, 0) / normal.length;
    const hotAvg = hot.reduce((s, o) => s + o.temperatureC, 0) / hot.length;
    const extremeAvg = extreme.reduce((s, o) => s + o.temperatureC, 0) / extreme.length;

    expect(normalAvg).toBeLessThan(hotAvg);
    expect(hotAvg).toBeLessThan(extremeAvg);
  });
});

describe("simulateCustomAmbient", () => {
  it("generates the requested number of hours", () => {
    const obs = simulateCustomAmbient(25, 5, 12);
    expect(obs).toHaveLength(12);
  });

  it("interpolates from base to base+delta", () => {
    const obs = simulateCustomAmbient(20, 10, 6);
    expect(obs[0].temperatureC).toBeCloseTo(20, 1);
    expect(obs[5].temperatureC).toBeCloseTo(30, 1);
  });

  it("labels observations as synthetic", () => {
    const obs = simulateCustomAmbient(25, 5, 6);
    expect(obs.every((o) => o.source === "synthetic")).toBe(true);
  });
});
