import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/lib/scientific/providers";
import { getCity } from "@/lib/scientific/types";

// GET /api/thermal/current?city=phoenix
// Returns the latest thermal observation from FortyGuard (or synthetic fallback).
// Includes a 60s server-side timeout to prevent gateway 502 errors.
export async function GET(req: NextRequest) {
  const provider = getProvider();
  const cityId = req.nextUrl.searchParams.get("city") ?? "phoenix";
  const city = getCity(cityId);

  try {
    // Race the fetch against a 60s timeout
    const obs = await Promise.race([
      provider.fetchCurrent(city.name, city.lat, city.lon),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("FortyGuard timeout")), 60_000),
      ),
    ]);
    return NextResponse.json({
      provider: provider.name,
      available: provider.available,
      city: city.name,
      observation: obs,
    });
  } catch (err: any) {
    // Fall back to synthetic on timeout or error
    const { SyntheticTemperatureProvider } = await import(
      "@/lib/scientific/providers"
    );
    const fallback = await new SyntheticTemperatureProvider().fetchCurrent(
      city.name,
      city.lat,
      city.lon,
    );
    return NextResponse.json({
      provider: "Synthetic (FortyGuard timeout fallback)",
      available: false,
      city: city.name,
      observation: { ...fallback, source: "synthetic", quality: "degraded" },
      error: err?.message ?? "FortyGuard call timed out",
    });
  }
}
