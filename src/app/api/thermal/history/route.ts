import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/scientific/providers";
import { generateSyntheticHistory, processThermal } from "@/lib/scientific/thermal";
import { Scenario, getCity } from "@/lib/scientific/types";

// GET /api/thermal/history?hours=24&scenario=normal&city=phoenix
// Returns a historical series + processed summary.
export async function GET(req: NextRequest) {
  const provider = getProvider();
  const hours = parseInt(req.nextUrl.searchParams.get("hours") ?? "24", 10);
  const scenario = (req.nextUrl.searchParams.get("scenario") ?? "normal") as Scenario;
  const cityId = req.nextUrl.searchParams.get("city") ?? "phoenix";
  const city = getCity(cityId);

  // If a non-default scenario is requested, generate synthetic history for it.
  // Otherwise, use the provider (FortyGuard if available).
  const observations =
    scenario !== "normal"
      ? generateSyntheticHistory(scenario, hours).map((o) => ({
          ...o,
          city: city.name,
          latitude: city.lat,
          longitude: city.lon,
        }))
      : await provider.fetchHistory(city.name, hours, city.lat, city.lon);

  const processed = processThermal(observations);

  return NextResponse.json({
    provider: provider.name,
    available: provider.available,
    city: city.name,
    observations,
    processed,
    scenario,
  });
}
