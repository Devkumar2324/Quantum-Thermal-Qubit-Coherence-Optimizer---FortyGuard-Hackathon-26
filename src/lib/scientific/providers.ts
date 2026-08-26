// Temperature Provider integration layer.
// Uses real FortyGuard API when FORTYGUARD_API_KEY is configured.
// Falls back to clearly-labeled synthetic data otherwise.

import {
  ThermalObservation,
  EnvironmentalConditions,
  Scenario,
} from "./types";
import {
  generateSyntheticHistory,
  simulateCustomAmbient as simulateAmbient,
} from "./thermal";
import {
  getFortyGuardClient,
  buildDateTime,
  isUSLocation,
  EnvironmentalResult,
} from "./fortyguard-client";

export interface TemperatureProvider {
  name: string;
  available: boolean;
  fetchCurrent(
    city?: string,
    lat?: number,
    lon?: number,
  ): Promise<ThermalObservation>;
  fetchHistory(
    city?: string,
    hours?: number,
    lat?: number,
    lon?: number,
  ): Promise<ThermalObservation[]>;
}

/**
 * Convert FortyGuard EnvironmentalResult into our EnvironmentalConditions type.
 */
export function extractEnvironment(
  envResult: EnvironmentalResult,
  temperatureC: number,
): EnvironmentalConditions {
  const loc = envResult.locations?.[0];
  if (!loc) return { temperatureC };
  const p = loc.parameters;
  // env_params returns arrays (one value per timestamp). Take the first.
  const first = <T>(arr: Array<T | null> | undefined): T | undefined =>
    arr && arr.length > 0 ? (arr[0] ?? undefined) : undefined;

  return {
    temperatureC,
    humidityPercent: first<number>(p.relative_humidity_percent),
    wetBulbC: first<number>(p.wet_bulb_temperature_celsius),
    heatIndexC: first<number>(p.heat_index_celsius),
    apparentTemperatureC: first<number>(p.apparent_temperature_celsius),
    solarGHI: loc.solar_irradiance?.clear_sky?.ghi,
    solarDNI: loc.solar_irradiance?.clear_sky?.dni,
    solarDHI: loc.solar_irradiance?.clear_sky?.dhi,
    precipitationMm: first<number>(p.precipitation_mm),
    cloudCoverOctas: first<number>(p.cloud_cover_octas),
    elevationM: loc.elevation,
    airQualityIndex: first<number>(p["air_quality:idx"]),
    co2Ppm: first<number>(p.co2_ppm),
  };
}

export class FortyGuardTemperatureProvider implements TemperatureProvider {
  name = "FortyGuard";
  available = false;

  constructor() {
    const client = getFortyGuardClient();
    this.available = client.available;
  }

  async fetchCurrent(
    city?: string,
    lat?: number,
    lon?: number,
  ): Promise<ThermalObservation> {
    const client = getFortyGuardClient();
    if (!client.available) {
      return new SyntheticTemperatureProvider().fetchCurrent(city);
    }
    // Default to Phoenix if no coords provided
    const latitude = lat ?? 33.4484;
    const longitude = lon ?? -112.074;
    if (!isUSLocation(latitude, longitude)) {
      return new SyntheticTemperatureProvider().fetchCurrent(city);
    }
    try {
      const { date, time } = buildDateTime(0);
      const heatResult = await client.fetchAmbientTemperature(
        latitude,
        longitude,
        date,
        time,
      );
      const envResult = await client.fetchEnvironmentalParams(
        latitude,
        longitude,
        heatResult.temperatureC,
        date,
        time,
      );
      const environment = extractEnvironment(envResult, heatResult.temperatureC);
      return {
        timestamp: new Date().toISOString(),
        temperatureC: heatResult.temperatureC,
        source: "fortyguard",
        quality: "good",
        city,
        latitude,
        longitude,
        environment,
        metadata: {
          heatmapStats: heatResult.stats,
          envMetadata: envResult.metadata,
        },
      };
    } catch (err) {
      console.warn("FortyGuard fetchCurrent failed, falling back:", err);
      return new SyntheticTemperatureProvider().fetchCurrent(city);
    }
  }

  async fetchHistory(
    city?: string,
    hours = 24,
    lat?: number,
    lon?: number,
  ): Promise<ThermalObservation[]> {
    // History always uses synthetic data for fast dashboard loading.
    // The real FortyGuard API is async (submit → poll → complete, ~20s per call)
    // and fetching 24 hours would take 5+ minutes, causing gateway timeouts.
    // Real data is used for `fetchCurrent` and `fetchForecast` instead.
    return new SyntheticTemperatureProvider().fetchHistory(city, hours);
  }

  /**
   * Fetch a 12-hour forecast from FortyGuard (the API supports up to 12h ahead).
   * Returns N observations with source="fortyguard".
   *
   * All forecast points are fetched IN PARALLEL to keep total time under ~30s
   * (sequential would take 5+ minutes and hit gateway timeouts).
   */
  async fetchForecast(
    hours = 12,
    city?: string,
    lat?: number,
    lon?: number,
  ): Promise<ThermalObservation[]> {
    const client = getFortyGuardClient();
    if (!client.available) {
      return this.syntheticForecast(hours, city);
    }
    const latitude = lat ?? 33.4484;
    const longitude = lon ?? -112.074;
    if (!isUSLocation(latitude, longitude)) {
      return this.syntheticForecast(hours, city);
    }

    // Sample every 2 hours to conserve credits
    const step = 2;
    const forecastHours: number[] = [];
    for (let h = 1; h <= hours; h += step) forecastHours.push(h);

    // Fetch all forecast points IN PARALLEL
    const promises = forecastHours.map(async (h) => {
      const { date, time } = buildDateTime(h);
      try {
        const heatResult = await client.fetchAmbientTemperature(
          latitude,
          longitude,
          date,
          time,
        );
        let environment: EnvironmentalConditions | undefined;
        try {
          const envResult = await client.fetchEnvironmentalParams(
            latitude,
            longitude,
            heatResult.temperatureC,
            date,
            time,
          );
          environment = extractEnvironment(envResult, heatResult.temperatureC);
        } catch {
          // env_params is optional; continue without it
        }
        return {
          timestamp: new Date(Date.now() + h * 3_600_000).toISOString(),
          temperatureC: heatResult.temperatureC,
          source: "fortyguard" as const,
          quality: "good" as const,
          city,
          latitude,
          longitude,
          environment,
        };
      } catch (err) {
        // Fall back to synthetic for this hour
        return {
          timestamp: new Date(Date.now() + h * 3_600_000).toISOString(),
          temperatureC: 28 + Math.sin(h / 4) * 3 + h * 0.3,
          source: "synthetic" as const,
          quality: "degraded" as const,
          city,
        };
      }
    });

    const observations = await Promise.all(promises);
    return observations;
  }

  private syntheticForecast(hours: number, city?: string): ThermalObservation[] {
    const now = Date.now();
    return Array.from({ length: hours }, (_, i) => ({
      timestamp: new Date(now + (i + 1) * 3_600_000).toISOString(),
      temperatureC: Math.round((25 + Math.sin(i / 4) * 4 + i * 0.4) * 10) / 10,
      source: "synthetic" as const,
      quality: "good" as const,
      city,
      environment: {
        temperatureC: 25 + Math.sin(i / 4) * 4 + i * 0.4,
        humidityPercent: 40 + Math.sin(i / 3) * 15,
        solarGHI: Math.max(0, 600 * Math.sin((i + 6) / 4)),
      },
    }));
  }
}

export class SyntheticTemperatureProvider implements TemperatureProvider {
  name = "Synthetic (Simulation Mode)";
  available = true;

  async fetchCurrent(
    city?: string,
    lat?: number,
    lon?: number,
  ): Promise<ThermalObservation> {
    const obs = generateSyntheticHistory("normal", 1)[0];
    return {
      ...obs,
      city: city ?? obs.city,
      latitude: lat,
      longitude: lon,
      environment: {
        temperatureC: obs.temperatureC,
        humidityPercent: 45 + Math.sin(Date.now() / 3_600_000) * 10,
        solarGHI: Math.max(0, 500 * Math.sin(Date.now() / 3_600_000 + 6)),
      },
    };
  }

  async fetchHistory(
    city?: string,
    hours = 24,
  ): Promise<ThermalObservation[]> {
    return generateSyntheticHistory("normal", hours).map((o) => ({
      ...o,
      city: city ?? o.city,
      environment: {
        temperatureC: o.temperatureC,
        humidityPercent: 45 + Math.sin(parseInt(o.timestamp) / 3_600_000) * 10,
        solarGHI: Math.max(0, 500 * Math.sin(parseInt(o.timestamp) / 3_600_000 + 6)),
      },
    }));
  }
}

export class MockTemperatureProvider implements TemperatureProvider {
  name = "Mock";
  available = true;

  async fetchCurrent(city?: string): Promise<ThermalObservation> {
    return {
      timestamp: new Date().toISOString(),
      temperatureC: 25,
      source: "synthetic",
      quality: "good",
      city,
    };
  }

  async fetchHistory(city?: string, hours = 24): Promise<ThermalObservation[]> {
    return Array.from({ length: hours }, (_, i) => ({
      timestamp: new Date(Date.now() - (hours - i) * 3_600_000).toISOString(),
      temperatureC: 25 + Math.sin(i / 4),
      source: "synthetic" as const,
      quality: "good" as const,
      city,
    }));
  }
}

export function getProvider(): TemperatureProvider {
  const p = new FortyGuardTemperatureProvider();
  if (p.available) return p;
  return new SyntheticTemperatureProvider();
}

// Re-export simulateCustomAmbient for backward compat
export const simulateCustomAmbient = simulateAmbient;
