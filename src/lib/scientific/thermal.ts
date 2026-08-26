// Thermal data processing — baseline forecasting + anomaly detection.
// SIMULATION / RESEARCH APPROXIMATION model.

import { ThermalObservation, ThermalProcessed, Scenario, SCENARIOS } from "./types";

const KELVIN_OFFSET = 273.15;

/** Celsius -> Kelvin */
export function cToK(c: number): number {
  return c + KELVIN_OFFSET;
}

/** Kelvin -> Celsius */
export function kToC(k: number): number {
  return k - KELVIN_OFFSET;
}

/** Celsius -> milliKelvin */
export function cToMK(c: number): number {
  return (c + KELVIN_OFFSET) * 1000;
}

/**
 * Process a series of thermal observations into a structured summary.
 * Implements: missing-value handling, normalization, rolling average,
 * anomaly detection, rate-of-change, and a simple linear-regression forecast.
 */
export function processThermal(
  observations: ThermalObservation[],
  windowSize = 6,
): ThermalProcessed {
  if (observations.length === 0) {
    return {
      current: 0,
      movingAverage: 0,
      anomaly: 0,
      rateOfChange: 0,
      forecast: 0,
      history: [],
      forecastSeries: [],
    };
  }

  // sort ascending by timestamp
  const sorted = [...observations].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  // Missing value handling: forward-fill nulls/NaN
  const filled: number[] = [];
  for (const obs of sorted) {
    if (typeof obs.temperatureC !== "number" || Number.isNaN(obs.temperatureC)) {
      filled.push(filled.length ? filled[filled.length - 1] : 0);
    } else {
      filled.push(obs.temperatureC);
    }
  }

  // Outlier smoothing: cap to within 4 stdev of rolling mean
  const smoothed = filled.map((v, i) => {
    if (i < 2) return v;
    const window = filled.slice(Math.max(0, i - windowSize), i);
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const std = Math.sqrt(
      window.reduce((s, x) => s + (x - mean) ** 2, 0) / window.length,
    );
    const limit = 4 * (std || 1);
    return Math.max(mean - limit, Math.min(mean + limit, v));
  });

  const current = smoothed[smoothed.length - 1];
  const maWindow = smoothed.slice(-windowSize);
  const movingAverage = maWindow.reduce((a, b) => a + b, 0) / maWindow.length;
  const anomaly = current - movingAverage;

  // Rate of change per hour (assume sorted points spaced 1h; if not, normalize by ts)
  const lastTs = new Date(sorted[sorted.length - 1].timestamp).getTime();
  const prevTs = new Date(sorted[sorted.length - 2]?.timestamp ?? sorted[sorted.length - 1].timestamp).getTime();
  const hours = Math.max(1, (lastTs - prevTs) / 3_600_000);
  const rateOfChange = (smoothed[smoothed.length - 1] - smoothed[smoothed.length - 2]) / hours;

  // Linear regression forecast (least squares over last `windowSize` points)
  const forecastSeries = linearRegressionForecast(smoothed, windowSize, 6);
  const forecast = forecastSeries[0];

  return {
    current,
    movingAverage,
    anomaly,
    rateOfChange,
    forecast,
    history: smoothed,
    forecastSeries,
  };
}

function linearRegressionForecast(
  series: number[],
  window: number,
  steps: number,
): number[] {
  const data = series.slice(-window);
  if (data.length < 2) return Array(steps).fill(data[0] ?? 0);
  const n = data.length;
  const xs = Array.from({ length: n }, (_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = data.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - meanX) * (data[i] - meanY), 0);
  const den = xs.reduce((s, x) => s + (x - meanX) ** 2, 0) || 1;
  const slope = num / den;
  const intercept = meanY - slope * meanX;
  return Array.from({ length: steps }, (_, i) => intercept + slope * (n + i));
}

/**
 * Generate a synthetic thermal history for the given scenario.
 * Used when FortyGuard API is unavailable.
 */
export function generateSyntheticHistory(
  scenario: Scenario,
  points = 24,
): ThermalObservation[] {
  const cfg = SCENARIOS[scenario];
  const now = Date.now();
  const out: ThermalObservation[] = [];
  let temp = cfg.ambientC - cfg.volatility;
  // Seeded pseudo-random for reproducibility per scenario
  let seed = scenario.length * 1000 + points;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = points - 1; i >= 0; i--) {
    const ts = new Date(now - i * 3_600_000).toISOString();
    // Add diurnal cycle + noise + trend
    const diurnal = Math.sin((points - i) / 6) * cfg.volatility;
    const noise = (rand() - 0.5) * cfg.volatility;
    temp = cfg.ambientC + diurnal + noise + (points - i) * cfg.trend * 0.1;
    out.push({
      timestamp: ts,
      temperatureC: Math.round(temp * 10) / 10,
      source: "synthetic",
      quality: "good",
      scenario,
      city: "Demo Site",
    });
  }
  return out;
}

/**
 * Simulate a custom ambient condition (POST /api/thermal/simulate).
 * Interpolates linearly from baseC at hour 0 to baseC + deltaC at the final hour.
 */
export function simulateCustomAmbient(
  baseC: number,
  deltaC: number,
  hours = 6,
): ThermalObservation[] {
  const now = Date.now();
  const out: ThermalObservation[] = [];
  const denom = Math.max(1, hours - 1);
  for (let i = 0; i < hours; i++) {
    out.push({
      timestamp: new Date(now + i * 3_600_000).toISOString(),
      temperatureC: Math.round((baseC + deltaC * (i / denom)) * 10) / 10,
      source: "synthetic",
      quality: "good",
      scenario: "custom",
    });
  }
  return out;
}
