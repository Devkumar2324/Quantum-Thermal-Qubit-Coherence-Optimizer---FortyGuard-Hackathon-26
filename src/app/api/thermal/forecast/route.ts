import { NextRequest, NextResponse } from "next/server";
import { FortyGuardTemperatureProvider } from "@/lib/scientific/providers";
import { getCity } from "@/lib/scientific/types";

// GET /api/thermal/forecast?hours=12&city=phoenix
// Returns a forecast of ambient temperature + environmental conditions.
// Uses FortyGuard's 12-hour-ahead heatmap forecast when API key is set.
// Falls back to synthetic forecast otherwise.
export async function GET(req: NextRequest) {
  const hours = parseInt(req.nextUrl.searchParams.get("hours") ?? "12", 10);
  const cityId = req.nextUrl.searchParams.get("city") ?? "phoenix";
  const city = getCity(cityId);

  const provider = new FortyGuardTemperatureProvider();
  if (!provider.available) {
    // Synthetic forecast fallback
    const synthetic = await provider.fetchForecast(hours, city.name, city.lat, city.lon);
    return NextResponse.json({
      provider: "Synthetic (Simulation Mode)",
      available: false,
      city: city.name,
      observations: synthetic,
    });
  }

  try {
    const observations = await provider.fetchForecast(
      hours,
      city.name,
      city.lat,
      city.lon,
    );
    return NextResponse.json({
      provider: "FortyGuard",
      available: true,
      city: city.name,
      observations,
    });
  } catch (err: any) {
    console.error("Forecast error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Forecast failed" },
      { status: 500 },
    );
  }
}
