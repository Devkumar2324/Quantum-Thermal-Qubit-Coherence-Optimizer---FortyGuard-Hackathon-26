import { NextRequest, NextResponse } from "next/server";
import { simulateCustomAmbient } from "@/lib/scientific/thermal";
import { processThermal } from "@/lib/scientific/thermal";

// POST /api/thermal/simulate
// Body: { baseC, deltaC, hours }
// Returns a custom ambient scenario.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const baseC = Number(body.baseC ?? 25);
    const deltaC = Number(body.deltaC ?? 0);
    const hours = Number(body.hours ?? 6);
    const observations = simulateCustomAmbient(baseC, deltaC, hours);
    const processed = processThermal(observations);
    return NextResponse.json({
      observations,
      processed,
      provider: "Custom Simulation",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }
}
