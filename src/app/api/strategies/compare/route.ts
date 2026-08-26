import { NextRequest, NextResponse } from "next/server";
import { compareStrategies } from "@/lib/scientific/strategies";
import { DEFAULT_CONFIG, getCity } from "@/lib/scientific/types";
import { FortyGuardTemperatureProvider } from "@/lib/scientific/providers";
import { generateSyntheticHistory } from "@/lib/scientific/thermal";

// POST /api/strategies/compare
// Body: {
//   cityId?: string,           // default "phoenix"
//   hours?: number,            // default 12
//   config?: QuantumSystemConfig,
//   weights?: {coherence, energy},
//   minCoherence?: number,
//   useForecast?: boolean,     // default true (use FortyGuard forecast)
//   lookAheadHours?: number,   // default 2 (for predictive strategy)
// }
// Returns a StrategyComparison with all 3 strategies evaluated.
//
// Includes a 120s server-side timeout — if FortyGuard is slow, falls back to
// synthetic data so the UI never hangs.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cityId = body.cityId ?? "phoenix";
    const hours = body.hours ?? 12;
    const config = body.config ?? DEFAULT_CONFIG;
    const weights = body.weights ?? { coherence: 0.7, energy: 0.3 };
    const minCoherence = body.minCoherence ?? config.minCoherence;
    const useForecast = body.useForecast ?? true;
    const lookAheadHours = body.lookAheadHours ?? 2;

    const city = getCity(cityId);

    // Get observations (either forecast or synthetic) with 120s timeout
    let observations;
    let forecastSource: "fortyguard" | "synthetic" = "synthetic";
    const provider = new FortyGuardTemperatureProvider();

    if (useForecast && provider.available) {
      try {
        // Race the forecast fetch against a 120s timeout
        observations = await Promise.race([
          provider.fetchForecast(hours, city.name, city.lat, city.lon),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("FortyGuard forecast timeout")),
              120_000,
            ),
          ),
        ]);
        forecastSource = "fortyguard";
      } catch (err) {
        console.warn(
          "FortyGuard forecast failed/timed out, using synthetic:",
          err,
        );
        observations = generateSyntheticHistory("hot", hours).map((o) => ({
          ...o,
          city: city.name,
          latitude: city.lat,
          longitude: city.lon,
        }));
        forecastSource = "synthetic";
      }
    } else {
      observations = generateSyntheticHistory("hot", hours).map((o) => ({
        ...o,
        city: city.name,
        latitude: city.lat,
        longitude: city.lon,
      }));
      forecastSource = "synthetic";
    }

    const comparison = compareStrategies(
      config,
      observations,
      weights,
      minCoherence,
      lookAheadHours,
    );

    // Override the forecast source to reflect what actually happened
    comparison.forecastWindow.source = forecastSource;

    return NextResponse.json({
      ...comparison,
      city: { name: city.name, state: city.state, lat: city.lat, lon: city.lon },
    });
  } catch (err: any) {
    console.error("Strategy comparison error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Strategy comparison failed" },
      { status: 500 },
    );
  }
}
