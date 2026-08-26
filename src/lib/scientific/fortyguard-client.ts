// FortyGuard API Client
// =====================================================================
// Typed client for the FortyGuard Temperature API®.
// Docs: https://docs-api.fortyguard.com/docs/introduction
//
// API pattern (async):
//   1. POST to an analysis endpoint -> returns { data: { activity_id } }
//   2. Poll GET /v1/status/{activity_id} until status === "Completed"
//   3. Result payload is in data.result
//
// Auth: api-key header (no OAuth)
// Base URL: https://api.fortyguard.com/v1
// Coverage: United States only (lat 24-50, lon -125 to -66 roughly)
// Credits: deducted only on Completed status
// =====================================================================

const FORTYGUARD_DEFAULT_BASE_URL = "https://api.fortyguard.com";

// Read env vars dynamically (in constructor) so tests can change them.

// ---- Types ----

export interface HeatmapRequest {
  polygon_aoi: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      properties: Record<string, unknown>;
      geometry: {
        type: "Polygon";
        coordinates: number[][][];
      };
    }>;
  };
  date_time: {
    start_date: string; // YYYY-MM-DD
    start_time?: string; // HH:MM 24h
    end_time?: string;
    end_date?: string;
    filter_type: 1 | 2 | 3 | 4;
  };
  granularity: 60 | 80 | 100;
  analytic_type?: "tcm" | "time_of_measure" | "exceedance" | "persistence";
  threshold?: number;
  direction?: "above" | "below";
}

export interface HeatmapStats {
  // Actual API returns lowercase fields
  minimum?: number;
  maximum?: number;
  mean?: number;
  standard_deviation?: number;
  // Documentation uses capitalized fields (forward compat)
  Minimum?: number;
  Maximum?: number;
  Mean?: number;
  Standard_deviation?: number;
  Overall_temperature_distribution?: number[];
  Normal_temperature_distribution?: { x_axis: number[]; y_axis: number[] };
  Temperature_frequency?: Record<string, number>;
}

export interface HeatmapResult {
  map_data: unknown; // GeoJSON FeatureCollection
  stats_data: {
    temperature_stats?: HeatmapStats;     // actual API field (lowercase)
    Temperature_stats?: HeatmapStats;     // documented field (capitalized)
    units?: string;
  };
}

export interface EnvParamsRequest {
  latitude: number;
  longitude: number;
  temperature: number; // °C, from heatmap
  date_time: {
    start_date: string;
    start_time?: string;
    end_time?: string;
    end_date?: string;
    filter_type: 1 | 2 | 3;
  };
  analysis?: string[]; // optional param whitelist
}

export interface EnvironmentalResult {
  metadata: {
    timezone: string;
    timezone_offset_hours: number;
    time_range: {
      start: string;
      end: string;
      interval: string;
      count: number;
    };
    timestamps: string[];
  };
  locations: Array<{
    lat: number;
    lon: number;
    elevation: number;
    temperature: number;
    parameters: {
      heat_index_celsius?: Array<number | null>;
      apparent_temperature_celsius?: Array<number | null>;
      wet_bulb_temperature_celsius?: Array<number | null>;
      relative_humidity_percent?: Array<number | null>;
      precipitation_mm?: Array<number | null>;
      cloud_cover_octas?: Array<number | null>;
      "air_quality:idx"?: Array<number | null>;
      "air_quality_pm2p5:idx"?: Array<number | null>;
      "air_quality_pm10:idx"?: Array<number | null>;
      "air_quality_no2:idx"?: Array<number | null>;
      aqi_us_co?: Array<number | null>;
      "air_quality_o3:idx"?: Array<number | null>;
      "air_quality_so2:idx"?: Array<number | null>;
      methane_ppb?: Array<number | null>;
      co2_ppm?: Array<number | null>;
    };
    solar_irradiance?: {
      clear_sky: { ghi: number; dni: number; dhi: number };
      description?: string;
    };
  }>;
}

export interface ActivityStatus {
  activity_id: string;
  status: "Processing" | "Completed" | "Failed" | string;
  result?: unknown;
  error?: string;
}

export interface CreditUsage {
  plan?: string;
  credits_remaining?: number;
  credits_used?: number;
  credits_total?: number;
  credits_reset_date?: string;
  [key: string]: unknown;
}

// ---- Client ----

export class FortyGuardClient {
  readonly baseUrl: string;
  readonly apiKey: string | undefined;
  readonly available: boolean;

  constructor() {
    this.baseUrl = process.env.FORTYGUARD_BASE_URL || FORTYGUARD_DEFAULT_BASE_URL;
    this.apiKey = process.env.FORTYGUARD_API_KEY;
    this.available = Boolean(this.apiKey);
  }

  private headers(): Record<string, string> {
    return {
      "api-key": this.apiKey || "",
      "Content-Type": "application/json",
    };
  }

  // ---- Activity submission ----

  async submitHeatmap(req: HeatmapRequest): Promise<string> {
    if (!this.available) throw new Error("FortyGuard API key not configured");
    const res = await fetch(`${this.baseUrl}/v1/heatmap`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(req),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(
        `FortyGuard heatmap submission failed: ${data.message || res.status}`,
      );
    }
    return data.data.activity_id as string;
  }

  async submitEnvParams(req: EnvParamsRequest): Promise<string> {
    if (!this.available) throw new Error("FortyGuard API key not configured");
    const res = await fetch(`${this.baseUrl}/v1/env_params`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(req),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(
        `FortyGuard env_params submission failed: ${data.message || res.status}`,
      );
    }
    return data.data.activity_id as string;
  }

  async submitHeatIntelligence(req: {
    latitude: number;
    longitude: number;
    temperature: number; // °F (note: Fahrenheit for this endpoint!)
    date: string;
    analysis: string[];
  }): Promise<string> {
    if (!this.available) throw new Error("FortyGuard API key not configured");
    const res = await fetch(`${this.baseUrl}/v1/heat_intelligence`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(req),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(
        `FortyGuard heat_intelligence submission failed: ${data.message || res.status}`,
      );
    }
    return data.data.activity_id as string;
  }

  // ---- Status polling ----

  async getStatus(activity_id: string): Promise<ActivityStatus> {
    if (!this.available) throw new Error("FortyGuard API key not configured");
    const res = await fetch(
      `${this.baseUrl}/v1/status/${activity_id}`,
      { headers: { "api-key": this.apiKey || "" } },
    );
    const data = await res.json();
    // 404 "Activity not found" is expected immediately after submission
    // (documented behavior). Treat as "Processing" and retry.
    if (res.status === 404 || data.status_code === 404) {
      return {
        activity_id,
        status: "Processing",
      };
    }
    if (!res.ok || data.error) {
      throw new Error(
        `FortyGuard status check failed: ${data.message || res.status}`,
      );
    }
    return {
      activity_id: data.data.activity_id,
      status: data.data.status,
      result: data.data.result,
      error: data.data.error,
    };
  }

  /**
   * Poll until status is Completed or Failed, with bounded retries.
   * Default: poll every 5s for up to 5 minutes (60 attempts).
   * Includes an initial 2s delay to let FortyGuard register the activity.
   */
  async pollUntilDone(
    activity_id: string,
    opts: { intervalMs?: number; maxAttempts?: number } = {},
  ): Promise<ActivityStatus> {
    const intervalMs = opts.intervalMs ?? 5000;
    const maxAttempts = opts.maxAttempts ?? 60;
    // Initial delay — FortyGuard may return 404 immediately after submission
    await new Promise((r) => setTimeout(r, 2000));
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getStatus(activity_id);
      if (status.status === "Completed") return status;
      if (status.status === "Failed") {
        throw new Error(`FortyGuard activity ${activity_id} failed`);
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(
      `FortyGuard activity ${activity_id} timed out after ${maxAttempts * intervalMs / 1000}s`,
    );
  }

  // ---- High-level convenience methods ----

  /**
   * Fetch ambient temperature for a US location.
   * Submits a small heatmap task and returns the mean temperature.
   */
  async fetchAmbientTemperature(
    lat: number,
    lon: number,
    date: string,
    time: string,
  ): Promise<{ temperatureC: number; stats: HeatmapStats; raw: HeatmapResult }> {
    // Build a tiny polygon (0.01° ~ 1km box) around the point
    const dLat = 0.005;
    const dLon = 0.005;
    const polygon: HeatmapRequest = {
      polygon_aoi: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [lon - dLon, lat - dLat],
                  [lon + dLon, lat - dLat],
                  [lon + dLon, lat + dLat],
                  [lon - dLon, lat + dLat],
                  [lon - dLon, lat - dLat],
                ],
              ],
            },
          },
        ],
      },
      date_time: {
        start_date: date,
        start_time: time,
        filter_type: 1,
      },
      granularity: 100,
      analytic_type: "tcm",
    };

    const activityId = await this.submitHeatmap(polygon);
    const status = await this.pollUntilDone(activityId, {
      intervalMs: 4000,
      maxAttempts: 75, // 5 min
    });
    const result = status.result as HeatmapResult;
    // API returns "temperature_stats" (lowercase); docs use "Temperature_stats"
    // Handle both for forward compatibility.
    const stats =
      result?.stats_data?.temperature_stats ??
      (result?.stats_data as any)?.Temperature_stats;
    // API returns lowercase "mean"; docs use "Mean". Handle both.
    const mean = stats?.mean ?? stats?.Mean;
    if (!stats || typeof mean !== "number") {
      throw new Error("FortyGuard returned no temperature statistics");
    }
    return { temperatureC: mean, stats, raw: result };
  }

  /**
   * Fetch full environmental parameters for a US location.
   * Returns humidity, solar irradiance, wet-bulb, heat index, etc.
   */
  async fetchEnvironmentalParams(
    lat: number,
    lon: number,
    temperatureC: number,
    date: string,
    time: string,
  ): Promise<EnvironmentalResult> {
    const req: EnvParamsRequest = {
      latitude: lat,
      longitude: lon,
      temperature: temperatureC,
      date_time: {
        start_date: date,
        start_time: time,
        filter_type: 1,
      },
      // Omit `analysis` to get all params (Premium plan)
    };
    const activityId = await this.submitEnvParams(req);
    const status = await this.pollUntilDone(activityId, {
      intervalMs: 4000,
      maxAttempts: 75,
    });
    return status.result as EnvironmentalResult;
  }

  // ---- Credits ----

  async getCredits(): Promise<CreditUsage> {
    if (!this.available) throw new Error("FortyGuard API key not configured");
    const res = await fetch(`${this.baseUrl}/v1/system/fetch-api-key-usage`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(
        `FortyGuard credits check failed: ${data.message || res.status}`,
      );
    }
    return data.data as CreditUsage;
  }
}

// ---- Helpers ----

/**
 * Build a date+time string pair for "now" or a future offset.
 * Returns { date: "YYYY-MM-DD", time: "HH:MM" } in local time.
 */
export function buildDateTime(offsetHours: number = 0): {
  date: string;
  time: string;
} {
  const d = new Date(Date.now() + offsetHours * 3_600_000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
}

/**
 * Validate that a lat/lon falls within the United States (rough bbox).
 * FortyGuard rejects non-US coordinates with 400.
 */
export function isUSLocation(lat: number, lon: number): boolean {
  // Rough continental US + Alaska + Hawaii bbox
  // Continental: lat 24-50, lon -125 to -66
  // Alaska: lat 55-71, lon -180 to -130
  // Hawaii: lat 18-23, lon -160 to -154
  const continental = lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66;
  const alaska = lat >= 55 && lat <= 71 && lon >= -180 && lon <= -130;
  const hawaii = lat >= 18 && lat <= 23 && lon >= -160 && lon <= -154;
  return continental || alaska || hawaii;
}

/**
 * Celsius -> Fahrenheit (Heat Intelligence endpoint uses °F).
 */
export function cToF(c: number): number {
  return c * 9 / 5 + 32;
}

// Singleton
let _client: FortyGuardClient | null = null;
export function getFortyGuardClient(): FortyGuardClient {
  if (!_client) _client = new FortyGuardClient();
  return _client;
}

/** Reset the singleton (used in tests when env vars change). */
export function _resetFortyGuardClient(): void {
  _client = null;
}
